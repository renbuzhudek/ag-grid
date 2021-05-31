import { templatePlaceholder } from './chart-vanilla-src-parser';
import { isInstanceMethod, convertFunctionToProperty } from './parser-utils';
import { convertTemplate, getImport } from './react-utils';
import { wrapOptionsUpdateCode } from './chart-utils';

export function processFunction(code: string): string {
    return wrapOptionsUpdateCode(
        convertFunctionToProperty(code),
        'const options = cloneDeep(this.state.options);',
        'this.setState({ options });');
}

function getImports(componentFilenames: string[]): string[] {
    const imports = [
        "import React, { Component } from 'react';",
        "import { cloneDeep } from 'lodash';",
        "import { render } from 'react-dom';",
        "import * as agCharts from 'ag-charts-community';",
        "import { AgChartsReact } from 'ag-charts-react';",
    ];

    if (componentFilenames) {
        imports.push(...componentFilenames.map(getImport));
    }

    return imports;
}

function getTemplate(bindings: any, componentAttributes: string[]): string {
    const agChartTag = `<AgChartsReact
    ${componentAttributes.join('\n')}
/>`;

    const template = bindings.template ? bindings.template.replace(templatePlaceholder, agChartTag) : agChartTag;

    return convertTemplate(template);
}

export function vanillaToReact(bindings: any, componentFilenames: string[]): () => string {
    return () => {
        const { properties } = bindings;
        const imports = getImports(componentFilenames);
        const stateProperties = [];
        const componentAttributes = [];
        const instanceBindings = [];

        properties.forEach(property => {
            if (componentFilenames.length > 0 && property.name === 'components') {
                property.name = 'frameworkComponents';
            }

            if (property.value === 'true' || property.value === 'false') {
                componentAttributes.push(`${property.name}={${property.value}}`);
            } else if (property.value === null) {
                componentAttributes.push(`${property.name}={this.${property.name}}`);
            } else {
                // for when binding a method
                // see javascript-grid-keyboard-navigation for an example
                // tabToNextCell needs to be bound to the react component
                if (isInstanceMethod(bindings.instanceMethods, property)) {
                    instanceBindings.push(`this.${property.name}=${property.value}`);
                } else {
                    stateProperties.push(`${property.name}: ${property.value}`);
                    componentAttributes.push(`${property.name}={this.state.${property.name}}`);
                }
            }
        });

        const template = getTemplate(bindings, componentAttributes);
        const externalEventHandlers = bindings.externalEventHandlers.map(handler => processFunction(handler.body));
        const instanceMethods = bindings.instanceMethods.map(processFunction);

        return `'use strict'

${imports.join('\n')}

class ChartExample extends Component {
    constructor(props) {
        super(props);

        this.state = {
            ${stateProperties.join(',\n            ')}
        };

        ${instanceBindings.join(';\n        ')}
    }

    componentDidMount() {
        ${bindings.init.join(';\n        ')}
    }

    ${instanceMethods.concat(externalEventHandlers).join('\n\n    ')}

    render() {
        return ${template};
    }
}

${bindings.globals.join('\n')}

render(
    <ChartExample />,
    document.querySelector('#root')
)
`;
    };
}

if (typeof window !== 'undefined') {
    (<any>window).vanillaToReact = vanillaToReact;
}
