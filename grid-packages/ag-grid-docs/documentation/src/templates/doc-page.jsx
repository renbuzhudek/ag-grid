import React, { useState } from 'react';
import { graphql } from 'gatsby';
import rehypeReact from 'rehype-react';
import classnames from 'classnames';
import ExampleRunner from 'components/example-runner/ExampleRunner';
import SideMenu from 'components/SideMenu';
import processFrameworkSpecificSections from 'utils/framework-specific-sections';
import { ApiDocumentation } from 'components/ApiDocumentation';
import { Snippet } from 'components/snippet/Snippet';
import FeatureOverview from 'components/FeatureOverview';
import IconsPanel from 'components/IconsPanel';
import ImageCaption from 'components/ImageCaption';
import MatrixTable from 'components/MatrixTable';
import VideoSection from 'components/VideoSection';
import VideoLink from 'components/VideoLink';
import ChartGallery from 'components/chart-gallery/ChartGallery';
import ChartsApiExplorer from 'components/charts-api-explorer/ChartsApiExplorer';
import Changelog from 'components/changelog/Changelog';
import { ListItem } from 'components/ListItem';
import DocumentationLink from '../components/DocumentationLink';
import Gif from 'components/Gif';
import { SEO } from 'components/SEO';
import { getHeaderTitle } from 'utils/page-header';
import stripHtml from 'utils/strip-html';
import styles from './doc-page.module.scss';

/**
 * This template is used for documentation pages, i.e. those generated from Markdown files.
 */
const DocPageTemplate = ({ data, pageContext: { framework, pageName } }) => {
  const { markdownRemark: page } = data;
  const [showSideMenu, setShowSideMenu] = useState(true);

  if (!page) { return null; }

  // handles [[only-xxxx blocks
  const ast = processFrameworkSpecificSections(page.htmlAst, framework);

  const getExampleRunnerProps = (props, library) => ({
    ...props,
    framework,
    pageName,
    library,
    options: props.options != null ? JSON.parse(props.options) : undefined
  });

  // This configures which components will be used for the specified HTML tags
  const renderAst = new rehypeReact({
    createElement: React.createElement,
    components: {
      'a': props => DocumentationLink({ ...props, framework }),
      'li': ListItem,
      'gif': props => Gif({ ...props, pageName, autoPlay: props.autoPlay != null ? JSON.parse(props.autoPlay) : false }),
      'grid-example': props => ExampleRunner(getExampleRunnerProps(props, 'grid')),
      'chart-example': props => ExampleRunner(getExampleRunnerProps(props, 'charts')),
      'api-documentation': props => ApiDocumentation({
        ...props,
        pageName,
        framework,
        sources: props.sources != null ? JSON.parse(props.sources) : undefined,
        config: props.config != null ? JSON.parse(props.config) : undefined
      }),
      'snippet': props => Snippet({ ...props, framework }),
      'feature-overview': props => FeatureOverview({ ...props, framework }),
      'icons-panel': IconsPanel,
      'image-caption': props => ImageCaption({ ...props, pageName }),
      'matrix-table': props => MatrixTable({ ...props, framework }),
      'video-section': VideoSection,
      'video-link': VideoLink,
      'chart-gallery': ChartGallery,
      'charts-api-explorer': props => ChartsApiExplorer({ ...props, framework }),
      'changelog': Changelog,
    },
  }).Compiler;

  let { title, description, version } = page.frontmatter;

  version = version ? ` ${version}` : '';

  if (!description) {
    // If no description is provided in the Markdown, we create one from the lead paragraph
    const firstParagraphNode = ast.children.filter(child => child.tagName === 'p')[0];

    if (firstParagraphNode) {
      description = stripHtml(firstParagraphNode);
    }
  }

  const pageTitle = getHeaderTitle(title, framework, pageName.startsWith('charts-'), page.frontmatter.rootPage, version);

  return (
    <div id="doc-page-wrapper" className={styles['doc-page-wrapper']}>
      <div id="doc-content" className={classnames(styles['doc-page'], { [styles['doc-page--with-side-menu']]: showSideMenu })}>
        <SEO title={title} description={description} framework={framework} pageName={pageName} />
        <h1 id="top" className={classnames(styles['doc-page__title'], { [styles['doc-page__title--enterprise']]: page.frontmatter.enterprise })}>{pageTitle}</h1>
        {renderAst(ast)}
      </div>
      <SideMenu headings={page.headings || []} pageName={pageName} pageTitle={title} hideMenu={() => setShowSideMenu(false)} />
    </div>
  );
};

export const pageQuery = graphql`
  query DocPageByPath($srcPath: String!) {
    markdownRemark(fields: { path: { eq: $srcPath } }) {
      htmlAst
      frontmatter {
        title
        version
        enterprise
        description
        rootPage
      }
      headings {
        id
        depth
        value
      }
    }
  }
`;

export default DocPageTemplate;
