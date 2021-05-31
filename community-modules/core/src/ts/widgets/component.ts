import { AgEvent } from "../events";
import { Autowired, PostConstruct, PreConstruct } from "../context/context";
import { AgStackComponentsRegistry } from "../components/agStackComponentsRegistry";
import { BeanStub } from "../context/beanStub";
import { NumberSequence } from "../utils";
import {
    isNodeOrElement,
    copyNodeList,
    iterateNamedNodeMap,
    loadTemplate,
    setVisible,
    setDisplayed,
    addCssClass,
    removeCssClass,
    addOrRemoveCssClass
} from '../utils/dom';
import { forEach } from '../utils/array';
import { getFunctionName } from '../utils/function';
import { TooltipFeature } from "./tooltipFeature";
import { ITooltipParams } from "../rendering/tooltipComponent";

const compIdSequence = new NumberSequence();

export interface VisibleChangedEvent extends AgEvent {
    visible: boolean;
}

export let elementGettingCreated: HTMLElement;

export class Component extends BeanStub {

    public static EVENT_DISPLAYED_CHANGED = 'displayedChanged';
    private eGui: HTMLElement;
    private annotatedGuiListeners: any[] = [];

    @Autowired('agStackComponentsRegistry') protected readonly agStackComponentsRegistry: AgStackComponentsRegistry;

    // if false, then CSS class "ag-hidden" is applied, which sets "display: none"
    private displayed = true;

    // if false, then CSS class "ag-invisible" is applied, which sets "visibility: hidden"
    private visible = true;

    protected parentComponent: Component | undefined;

    // unique id for this row component. this is used for getting a reference to the HTML dom.
    // we cannot use the RowNode id as this is not unique (due to animation, old rows can be lying
    // around as we create a new rowComp instance for the same row node).
    private compId = compIdSequence.next();

    // to minimise DOM hits, we only apply CSS classes if they have changed. as addding a CSS class that is already
    // there, or removing one that wasn't present, all takes CPU.
    private cssClassStates: {[cssClass: string]: boolean } = {};

    protected usingBrowserTooltips: boolean;
    private tooltipText: string | undefined;
    private tooltipFeature: TooltipFeature | undefined;

    constructor(template?: string) {
        super();

        if (template) {
            this.setTemplate(template);
        }
    }

    @PreConstruct
    private preConstructOnComponent(): void {
        this.usingBrowserTooltips = this.gridOptionsWrapper.isEnableBrowserTooltips();
    }

    public getCompId(): number {
        return this.compId;
    }

    public getTooltipParams(): ITooltipParams {
        return {
            value: this.tooltipText,
            location: 'UNKNOWN'
        };
    }

    public setTooltip(newTooltipText?: string | null): void {

        const removeTooltip = () => {
            if (this.usingBrowserTooltips) {
                this.getGui().removeAttribute('title');
            } else {
                this.tooltipFeature = this.destroyBean(this.tooltipFeature);
            }
        };

        const addTooltip = () => {
            if (this.usingBrowserTooltips) {
                this.getGui().setAttribute('title', this.tooltipText!);
            } else {
                this.tooltipFeature = this.createBean(new TooltipFeature(this));
            }
        };

        if (this.tooltipText != newTooltipText) {
            if (this.tooltipText) {
                removeTooltip();
            }

            if (newTooltipText != null) {
                this.tooltipText = newTooltipText;

                if (this.tooltipText) {
                    addTooltip();
                }
            }
        }
    }

    // for registered components only, eg creates AgCheckbox instance from ag-checkbox HTML tag
    private createChildComponentsFromTags(parentNode: Element, paramsMap?: { [key: string]: any; }): void {
        // we MUST take a copy of the list first, as the 'swapComponentForNode' adds comments into the DOM
        // which messes up the traversal order of the children.
        const childNodeList: Node[] = copyNodeList(parentNode.childNodes);

        forEach(childNodeList, childNode => {
            if (!(childNode instanceof HTMLElement)) {
                return;
            }

            const childComp = this.createComponentFromElement(childNode, comp => {
                // copy over all attributes, including css classes, so any attributes user put on the tag
                // wll be carried across
                this.copyAttributesFromNode(childNode, comp.getGui());
            }, paramsMap);

            if (childComp) {
                if ((childComp as any).addItems && childNode.children.length) {
                    this.createChildComponentsFromTags(childNode, paramsMap);

                    // converting from HTMLCollection to Array
                    const items = Array.prototype.slice.call(childNode.children);

                    (childComp as any).addItems(items);
                }
                // replace the tag (eg ag-checkbox) with the proper HTMLElement (eg 'div') in the dom
                this.swapComponentForNode(childComp, parentNode, childNode);
            } else if (childNode.childNodes) {
                this.createChildComponentsFromTags(childNode, paramsMap);
            }
        });
    }

    public createComponentFromElement(
        element: HTMLElement,
        afterPreCreateCallback?: (comp: Component) => void,
        paramsMap?: { [key: string]: any; }
    ): Component | null {
        const key = element.nodeName;
        const componentParams = paramsMap ? paramsMap[element.getAttribute('ref')!] : undefined;
        const ComponentClass = this.agStackComponentsRegistry.getComponentClass(key);

        if (ComponentClass) {
            elementGettingCreated = element;
            const newComponent = new ComponentClass(componentParams) as Component;
            newComponent.setParentComponent(this);

            this.createBean(newComponent, null, afterPreCreateCallback);
            return newComponent;
        }
        return null;
    }

    private copyAttributesFromNode(source: Element, dest: Element): void {
        iterateNamedNodeMap(source.attributes, (name, value) => dest.setAttribute(name, value));
    }

    private swapComponentForNode(newComponent: Component, parentNode: Element, childNode: Node): void {
        const eComponent = newComponent.getGui();
        parentNode.replaceChild(eComponent, childNode);
        parentNode.insertBefore(document.createComment(childNode.nodeName), eComponent);
        this.addDestroyFunc(this.destroyBean.bind(this, newComponent));
        this.swapInComponentForQuerySelectors(newComponent, childNode);
    }

    private swapInComponentForQuerySelectors(newComponent: Component, childNode: Node): void {
        const thisNoType = this as any;

        this.iterateOverQuerySelectors((querySelector: any) => {
            if (thisNoType[querySelector.attributeName] === childNode) {
                thisNoType[querySelector.attributeName] = newComponent;
            }
        });
    }

    private iterateOverQuerySelectors(action: (querySelector: any) => void): void {
        let thisPrototype: any = Object.getPrototypeOf(this);

        while (thisPrototype != null) {
            const metaData = thisPrototype.__agComponentMetaData;
            const currentProtoName = getFunctionName(thisPrototype.constructor);

            if (metaData && metaData[currentProtoName] && metaData[currentProtoName].querySelectors) {
                forEach(metaData[currentProtoName].querySelectors, (querySelector: any) => action(querySelector));
            }

            thisPrototype = Object.getPrototypeOf(thisPrototype);
        }
    }

    public setTemplate(template: string | null, paramsMap?: { [key: string]: any; }): void {
        const eGui = loadTemplate(template as string);
        this.setTemplateFromElement(eGui, paramsMap);
    }

    public setTemplateFromElement(element: HTMLElement, paramsMap?: { [key: string]: any; }): void {
        this.eGui = element;
        (this.eGui as any).__agComponent = this;
        this.addAnnotatedGuiEventListeners();
        this.wireQuerySelectors();

        // context will not be available when user sets template in constructor
        if (!!this.getContext()) {
            this.createChildComponentsFromTags(this.getGui(), paramsMap);
        }
    }

    @PreConstruct
    private createChildComponentsPreConstruct(): void {
        // ui exists if user sets template in constructor. when this happens, we have to wait for the context
        // to be autoWired first before we can create child components.
        if (!!this.getGui()) {
            this.createChildComponentsFromTags(this.getGui());
        }
    }

    protected wireQuerySelectors(): void {
        if (!this.eGui) {
            return;
        }

        const thisNoType = this as any;

        this.iterateOverQuerySelectors((querySelector: any) => {
            const setResult = (result: any) => thisNoType[querySelector.attributeName] = result;

            // if it's a ref selector, and match is on top level component, we return
            // the element. otherwise no way of components putting ref=xxx on the top
            // level element as querySelector only looks at children.
            const topLevelRefMatch = querySelector.refSelector
                && this.eGui.getAttribute('ref') === querySelector.refSelector;
            if (topLevelRefMatch) {
                setResult(this.eGui);
            } else {
                // otherwise use querySelector, which looks at children
                const resultOfQuery = this.eGui.querySelector(querySelector.querySelector);
                if (resultOfQuery) {
                    setResult(resultOfQuery.__agComponent || resultOfQuery);
                }
            }

        });
    }

    private addAnnotatedGuiEventListeners(): void {
        this.removeAnnotatedGuiEventListeners();

        if (!this.eGui) {
            return;
        }

        const listenerMethods = this.getAgComponentMetaData('guiListenerMethods');

        if (!listenerMethods) { return; }

        if (!this.annotatedGuiListeners) {
            this.annotatedGuiListeners = [];
        }

        listenerMethods.forEach(meta => {
            const element = this.getRefElement(meta.ref);
            if (!element) { return; }
            const listener = (this as any)[meta.methodName].bind(this);
            element.addEventListener(meta.eventName, listener);
            this.annotatedGuiListeners.push({ eventName: meta.eventName, listener, element });
        });
    }

    @PostConstruct
    private addAnnotatedGridEventListeners(): void {
        const listenerMetas = this.getAgComponentMetaData('gridListenerMethods');

        if (!listenerMetas) { return; }

        listenerMetas.forEach(meta => {

            const listener = (this as any)[meta.methodName].bind(this);
            this.addManagedListener(this.eventService, meta.eventName, listener);
        });
    }

    private getAgComponentMetaData(key: string): any[] {
        let res: any[] = [];

        let thisProto: any = Object.getPrototypeOf(this);

        while (thisProto != null) {
            const metaData = thisProto.__agComponentMetaData;
            const currentProtoName = getFunctionName(thisProto.constructor);

            if (metaData && metaData[currentProtoName] && metaData[currentProtoName][key]) {
                res = res.concat(metaData[currentProtoName][key]);
            }

            thisProto = Object.getPrototypeOf(thisProto);
        }

        return res;
    }

    private removeAnnotatedGuiEventListeners(): void {
        if (!this.annotatedGuiListeners) {
            return;
        }

        forEach(this.annotatedGuiListeners, e => {
            e.element.removeEventListener(e.eventName, e.listener);
        });

        this.annotatedGuiListeners = [];
    }

    public getGui(): HTMLElement {
        return this.eGui;
    }

    public getFocusableElement(): HTMLElement {
        return this.eGui;
    }

    public setParentComponent(component: Component) {
        this.parentComponent = component;
    }

    public getParentComponent(): Component | undefined {
        return this.parentComponent;
    }

    // this method is for older code, that wants to provide the gui element,
    // it is not intended for this to be in ag-Stack
    protected setGui(eGui: HTMLElement): void {
        this.eGui = eGui;
    }

    protected queryForHtmlElement(cssSelector: string): HTMLElement {
        return this.eGui.querySelector(cssSelector) as HTMLElement;
    }

    protected queryForHtmlInputElement(cssSelector: string): HTMLInputElement {
        return this.eGui.querySelector(cssSelector) as HTMLInputElement;
    }

    public appendChild(newChild: HTMLElement | Component, container?: HTMLElement): void {
        if (!container) {
            container = this.eGui;
        }

        if (newChild == null) { return; }

        if (isNodeOrElement(newChild)) {
            container.appendChild(newChild as HTMLElement);
        } else {
            const childComponent = newChild as Component;
            container.appendChild(childComponent.getGui());
            this.addDestroyFunc(this.destroyBean.bind(this, childComponent));
        }
    }

    public isDisplayed(): boolean {
        return this.displayed;
    }

    public setVisible(visible: boolean): void {
        if (visible !== this.visible) {
            this.visible = visible;

            setVisible(this.eGui, visible);
        }
    }

    public setDisplayed(displayed: boolean): void {
        if (displayed !== this.displayed) {
            this.displayed = displayed;

            setDisplayed(this.eGui, displayed);

            const event: VisibleChangedEvent = {
                type: Component.EVENT_DISPLAYED_CHANGED,
                visible: this.displayed
            };

            this.dispatchEvent(event);
        }
    }

    protected destroy(): void {
        this.removeAnnotatedGuiEventListeners();
        if (this.tooltipFeature) {
            this.tooltipFeature = this.destroyBean(this.tooltipFeature);
        }
        super.destroy();
    }

    public addGuiEventListener(event: string, listener: (event: any) => void): void {
        this.eGui.addEventListener(event, listener);
        this.addDestroyFunc(() => this.eGui.removeEventListener(event, listener));
    }

    public addCssClass(className: string): void {
        const updateNeeded = this.cssClassStates[className] !== true;
        if (updateNeeded) {
            addCssClass(this.eGui, className);
            this.cssClassStates[className] = true;
        }
    }

    public removeCssClass(className: string): void {
        const updateNeeded = this.cssClassStates[className] !== false;
        if (updateNeeded) {
            removeCssClass(this.eGui, className);
            this.cssClassStates[className] = false;
        }
    }

    public addOrRemoveCssClass(className: string, addOrRemove: boolean): void {
        const updateNeeded = this.cssClassStates[className] !== addOrRemove;
        if (updateNeeded) {
            addOrRemoveCssClass(this.eGui, className, addOrRemove);
            this.cssClassStates[className] = addOrRemove;
        }
    }

    public getAttribute(key: string): string | null {
        const { eGui } = this;
        return eGui ? eGui.getAttribute(key) : null;
    }

    public getRefElement(refName: string): HTMLElement {
        return this.queryForHtmlElement(`[ref="${refName}"]`);
    }
}
