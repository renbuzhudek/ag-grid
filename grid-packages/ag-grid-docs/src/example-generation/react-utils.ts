import { recognizedDomEvents } from './parser-utils';

const toTitleCase = (value: string) => value[0].toUpperCase() + value.slice(1);
const toCamelCase = (value: string) => value.replace(/(?:-)(\w)/g, (_, c: string) => c ? c.toUpperCase() : '');

function convertStyles(code: string) {
    return code.replace(/style=['"](.+?);?['"]/g, (_, styles) => {
        const parsed = styles.split(';').reduce((obj, declaration) => {
            const [property, value] = declaration.split(':');
            obj[toCamelCase(property.trim())] = value.trim();
            return obj;
        }, {});

        return `style={${JSON.stringify(parsed)}}`;
    });
}

export function convertTemplate(template: string) {
    // React events are case sensitive, so need to ensure casing is correct
    const caseSensitiveEvents =
    {
        dragover: 'onDragOver',
        dragstart: 'onDragStart',
    };

    recognizedDomEvents.forEach(event => {
        const jsEvent = caseSensitiveEvents[event] || `on${toTitleCase(event)}`;
        const matcher = new RegExp(`on${event}="(\\w+)\\((.*?)\\)"`, 'g');

        template = template.replace(matcher, `${jsEvent}={() => this.$1($2)}`);
    });

    template = template
        .replace(/,\s+event([),])/g, '$1')
        .replace(/<input (.+?[^=])>/g, '<input $1 />')
        .replace(/<input (.*)value=/g, '<input $1defaultValue=')
        .replace(/ class=/g, ' className=')
        .replace(/ \<option (.*)selected=\"\"/g, '<option $1selected={true}')

    return convertStyles(template);
}

export function convertFunctionalTemplate(template: string) {
    // React events are case sensitive, so need to ensure casing is correct
    const caseSensitiveEvents =
    {
        dragover: 'onDragOver',
        dragstart: 'onDragStart',
    };

    recognizedDomEvents.forEach(event => {
        const jsEvent = caseSensitiveEvents[event] || `on${toTitleCase(event)}`;
        const matcher = new RegExp(`on${event}="(\\w+)\\((.*?)\\)"`, 'g');

        template = template.replace(matcher, `${jsEvent}={() => $1($2)}`);
    });

    template = template
        .replace(/,\s+event([),])/g, '$1')
        .replace(/<input (.+?[^=])>/g, '<input $1 />')
        .replace(/ class=/g, ' className=')
        // when using fontawesome just use "class" instead - it's always the case that we're treating it as a raw value
        // I had some fancy regex here to exclude rows with <i class but I thought this was easier to grok and maintain
        .replace(/<i className=/g, '<i class=')
        .replace(/ \<option (.*)selected=\"\"/g, '<option $1selected={true}');

    return convertStyles(template);
}

export const getImport = (filename: string) => `import ${toTitleCase(filename.split('.')[0])} from './${filename}';`;
