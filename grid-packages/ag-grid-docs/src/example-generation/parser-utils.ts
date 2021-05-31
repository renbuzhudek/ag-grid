export type ImportType = 'packages' | 'modules';

const moduleMapping = require('../../documentation/doc-pages/modules/modules.json');

export function modulesProcessor(modules: string[]) {
    const moduleImports = [];
    const suppliedModules = [];

    const requiredModules = [];
    modules.forEach(module => {
        let found = false;
        moduleMapping.forEach(moduleConfig => {
            if (moduleConfig.shortname && moduleConfig.shortname == module) {
                requiredModules.push(moduleConfig);
                found = true;
            }
        });
        if (!found) {
            console.error(`Could not find module ${module} in modules.json`);
        }
    });

    requiredModules.forEach(requiredModule => {
        moduleImports.push(`import { ${requiredModule.exported} } from '${requiredModule.module}';`);
        suppliedModules.push(requiredModule.exported);
    });

    return { moduleImports, suppliedModules };
}

export function removeFunctionKeyword(code: string): string {
    return code.replace(/^function /, '');
}

export function getFunctionName(code: string): string {
    let matches = /function\s+([^\(]+)/.exec(code);
    return matches && matches.length === 2 ? matches[1].trim() : null;
}

export const convertFunctionToProperty = (code: string) =>
    code.replace(/^function\s+([^\(\s]+)\s*\(([^\)]*)\)/, '$1 = ($2) =>');

export const convertFunctionToConstProperty = (code: string) =>
    code.replace(/^function\s+([^\(\s]+)\s*\(([^\)]*)\)/, 'const $1 = ($2) =>');

export function isInstanceMethod(methods: string[], property: any): boolean {
    return methods.map(getFunctionName).filter(name => name === property.name).length > 0;
}

export const enum NodeType {
    Variable = 'VariableDeclaration',
    Function = 'FunctionDeclaration',
    Expression = 'ExpressionStatement',
};

export function collect(iterable: any[], initialBindings: any, collectors: any[]): any {
    return iterable.reduce((bindings, value) => {
        collectors.filter(c => c.matches(value)).forEach(c => c.apply(bindings, value));

        return bindings;
    }, initialBindings);
}

export function nodeIsVarWithName(node: any, name: string): boolean {
    // eg: var currentRowHeight = 10;
    return node.type === NodeType.Variable && node.declarations[0].id.name === name;
}

export function nodeIsPropertyWithName(node: any, name: string) {
    // we skip { property: variable } - SPL why??
    // and get only inline property assignments
    return node.key.name == name && node.value.type != 'Identifier';
}

export function nodeIsFunctionWithName(node: any, name: string): boolean {
    // eg: function someFunction() { }
    return node.type === NodeType.Function && node.id.name === name;
}

export function nodeIsInScope(node: any, unboundInstanceMethods: string[]): boolean {
    return unboundInstanceMethods &&
        node.type === NodeType.Function &&
        unboundInstanceMethods.indexOf(node.id.name) >= 0;
}

export function nodeIsUnusedFunction(node: any, used: string[], unboundInstanceMethods: string[]): boolean {
    return !nodeIsInScope(node, unboundInstanceMethods) &&
        node.type === NodeType.Function &&
        used.indexOf(node.id.name) < 0;
}

export function nodeIsFunctionCall(node: any): boolean {
    return node.type === NodeType.Expression && node.expression.type === 'CallExpression';
}

export function nodeIsGlobalFunctionCall(node: any): boolean {
    if (!nodeIsFunctionCall(node)) {
        return false;
    }

    const { callee } = node.expression;

    return callee && callee.type === 'Identifier';
}

export const recognizedDomEvents = ['click', 'change', 'input', 'dragover', 'dragstart', 'drop'];

function flatMap<T>(array: T[], callback: (value: T) => T): T[] {
    return Array.prototype.concat.apply([], array.map(callback));
};

const extractEventHandlerBody = (code: string) => code.match(/^(\w+)\((.*)\)/);

/*
 * for each of the recognised events (click, change etc) extract the corresponding event handler, with (optional) params
 * eg: onclick="refreshEvenRowsCurrencyData()"
 */
export function extractEventHandlers(tree: any, eventNames: string[]) {
    const getHandlerAttributes = (event: string) => {
        const handlerName = `on${event}`;

        return Array.prototype.map.call(tree.find(`[${handlerName}]`), el => el.getAttribute(handlerName));
    };

    return flatMap(eventNames, (event: string) => getHandlerAttributes(event).map(extractEventHandlerBody));
}

// functions marked with an "inScope" comment will be handled as "instance" methods, as opposed to (global/unused)
// "util" ones
export function extractUnboundInstanceMethods(tree) {
    const inScopeRegex = /inScope\[([\w-].*)]/;

    return tree.comments
        .map(comment => comment.value ? comment.value.trim() : '')
        .filter(commentValue => commentValue.indexOf('inScope') === 0)
        .map(commentValue => {
            const result = commentValue.match(inScopeRegex);

            return result && result.length > 0 ? result[1] : '';
        });
};
