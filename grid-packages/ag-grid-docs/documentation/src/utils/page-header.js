import { agGridVersion, agChartsVersion } from 'utils/consts';

export const getHeaderTitle = (title, framework = 'javascript', isCharts = false, isRootPage = false, version = '') =>
    isRootPage ? title : `${getProductType(framework, isCharts, version)}: ${title}`;

const getProductType = (framework, isCharts = false, version = '') =>
    `${getFrameworkName(framework)}${version} ${isCharts ? 'Charts' : 'Grid'}`;

export const getFrameworkName = framework => {
    const mappings = {
        javascript: 'JavaScript',
        angular: 'Angular',
        react: 'React',
        vue: 'Vue',
    };

    return mappings[framework];
};

export const getGridVersionMessage = framework => `Download v${agGridVersion.split('.')[0]} of the best ${getProductType(framework, false)} in the world now.`;
export const getChartsVersionMessage = framework => `Download v${agChartsVersion.split('.')[0]} of our ${getProductType(framework, true)} now.`;
