/**
 * This script is used to update our Algolia instance. It loads the HTML from the statically-rendered website, processes
 * it into records, and pushes these records to Algolia. It should be run whenever the website is deployed.
 */

require('dotenv').config();

const fs = require('fs-extra');
const {JSDOM} = require('jsdom');
const algoliasearch = require('algoliasearch');
const commander = require("commander");

const menu = require('./doc-pages/licensing/menu.json');
const supportedFrameworks = require('./src/utils/supported-frameworks');
const convertToFrameworkUrl = require('./src/utils/convert-to-framework-url');

const options = commander
    .option('-d, --debug <debug>', 'if debug = true, the script writes the records it would upload into JSON files for inspection', true)
    .option("-i, --indexNamePrefix <prefix>", 'if indexNamePrefix = "ag-grid-dev" we\'ll update development indices, and for "ag-grid" production', 'ag-grid-dev')
    .parse(process.argv)
    .opts();


const clearIndices = true; // to ensure a clean index, you should clear existing records before inserting new ones
const debug = options.debug === true;
const indexNamePrefix = options.indexNamePrefix;

console.log("Updating Algolia Indices");
console.log(`debug: ${debug}, indexNamePrefix: ${indexNamePrefix}`);
console.log(`Updating Algolia using App ID ${process.env.GATSBY_ALGOLIA_APP_ID} and admin key ${process.env.ALGOLIA_ADMIN_KEY}`);

const algoliaClient = algoliasearch(process.env.GATSBY_ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);

const disallowedTags = ['style', 'pre'];
const disallowedClasses = ['gatsby-highlight', 'code-tab'];

const cleanContents = contents => {
    // remove all content from disallowed tags
    disallowedTags.forEach(tag => contents = contents.replace(new RegExp(`<${tag}(\\s.*?)?>.*?</${tag}>`, 'gs'), ''));

    return contents
        .replace(/<.*?>/gs, ' ') // remove tags
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&.*?;/g, '') // remove HTML characters
        .replace(/\s+/g, ' ') // compress whitespace
        .replace(/\s+([.,?!:)])/g, '$1').replace(/\(\s+/g, '(')  // neaten punctuation
        .trim();
};

const createRecords = async (url, framework, breadcrumb, rank) => {
    const records = [];
    const path = convertToFrameworkUrl(url, framework);
    const filePath = `public${path}index.html`;

    if (!fs.existsSync(filePath)) {
        return records;
    }

    const dom = await JSDOM.fromFile(filePath);

    let key = undefined;
    let heading = undefined;
    let subHeading = undefined;
    let text = '';

    const titleTag = dom.window.document.querySelector('h1');
    let positionInPage = 0;

    const createRecord = () => {
        if (['next-up', 'next-steps'].includes(key)) {
            // don't index Next Up/Next Steps sections
            return;
        }

        const cleanText = cleanContents(text);

        if (cleanText === '') {
            return;
        }

        const hashPath = `${path}${key ? `#${key}` : ''}`;

        records.push({
            objectID: hashPath,
            breadcrumb,
            title: titleTag.textContent,
            heading,
            subHeading,
            path: hashPath,
            text: cleanText,
            rank,
            positionInPage,
        });

        subHeading = undefined;
        text = '';
        positionInPage++;
    };

    /**
     * We split the page into sections based on H2 and H3 tags, which keeps the record size manageable and returns
     * more accurate results for users, as they will be taken to specific parts of a page.
     */
    const parseContent = startingElement => {
        for (let currentTag = startingElement; currentTag != null; currentTag = currentTag.nextElementSibling) {
            try {
                if (disallowedTags.includes(currentTag.nodeName.toLowerCase()) ||
                    (typeof currentTag.className === 'string' && currentTag.className.split(' ').some(className => disallowedClasses.includes(className)))) {
                    // ignore this tag
                    continue;
                }

                switch (currentTag.nodeName) {
                    // split records based on H2 and H3 tags
                    case 'H2': {
                        createRecord();

                        key = currentTag.id;
                        heading = currentTag.textContent;
                        break;
                    }

                    case 'H3': {
                        createRecord();

                        key = currentTag.id;
                        subHeading = currentTag.textContent;
                        break;
                    }

                    case 'DIV': {
                        // process content inside div containers
                        parseContent(currentTag.firstChild);
                        break;
                    }

                    default: {
                        const contents = currentTag.innerHTML || currentTag.textContent;

                        if (currentTag.nodeName === 'A' && contents.includes('Example: <!-- -->')) {
                            // exclude example runner titles
                            continue;
                        }

                        // append all HTML content
                        text += `\n${currentTag.innerHTML || currentTag.textContent}`;
                    }
                }
            } catch (e) {
                console.error(`Unable to parse content, got stuck at element: `, currentTag, e);
            }
        }
    };

    parseContent(titleTag.nextElementSibling);
    createRecord();

    return records;
};

const processIndexForFramework = async framework => {
    let rank = 10000; // using this rank ensures that pages that are earlier in the menu will rank higher in results
    const records = [];
    const indexName = `${indexNamePrefix}_${framework}`;

    console.log(`Generating records for ${indexName}...`);

    const iterateItems = async (items, prefix) => {
        if (!items) {
            return;
        }

        const breadcrumbPrefix = prefix ? `${prefix} > ` : '';

        for (const item of items) {
            const breadcrumb = breadcrumbPrefix + item.title;

            if (item.url) {
                records.push(...await createRecords(item.url, framework, breadcrumb, rank));

                rank -= 10;
            }

            await iterateItems(item.items, breadcrumb);
        }
    };

    for (const item of menu) {
        await iterateItems(item.items);
    }

    if (debug) {
        const fileName = `algolia-${indexName}.json`;
        fs.writeFileSync(fileName, JSON.stringify(records, null, 2));

        console.log(`Wrote Algolia records for ${indexName} to ${fileName}`);
    } else {
        console.log(`Pushing records for ${indexName} to Algolia...`);

        const index = algoliaClient.initIndex(indexName);

        index.setSettings({
            searchableAttributes: ['title', 'heading', 'subHeading', 'text'], // attributes used for searching
            disableExactOnAttributes: ['text'], // don't allow "exact matches" in the text
            attributesToSnippet: ['text:40'], // configure snippet length shown in results
            distinct: 1, // only allow each page to appear in the results once
            attributeForDistinct: 'breadcrumb', // configure what is used to decide if a page is the same
            customRanking: ['desc(rank)', 'asc(positionInPage)'], // custom tweaks to the ranking
            camelCaseAttributes: ['heading', 'subHeading', 'text'], // split camelCased text so it can match regular text
            hitsPerPage: 10, // how many results should be returned per page
            snippetEllipsisText: '…', // the character used when truncating content for snippets
        });

        try {
            if (clearIndices) {
                await index.clearObjects();
            }

            const result = await index.saveObjects(records);

            console.log(`Response from Algolia:`, result);
        } catch (e) {
            console.error(`Failed to save records.`, e);
        }
    }
};

const run = async () => {
    for (const framework of supportedFrameworks) {
        await processIndexForFramework(framework);
    }
};

run();
