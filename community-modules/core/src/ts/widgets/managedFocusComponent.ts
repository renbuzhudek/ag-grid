import { PostConstruct, Autowired } from '../context/context';
import { Component } from './component';
import { FocusService } from '../focusService';
import { isNodeOrElement, addCssClass, clearElement } from '../utils/dom';
import { KeyCode } from '../constants/keyCode';
import { isStopPropagationForAgGrid, stopPropagationForAgGrid } from '../utils/event';

/**
 * This provides logic to override the default browser focus logic.
 *
 * When the component gets focus, it uses the grid logic to find out what should be focused,
 * and then focuses that instead.
 *
 * This is how we ensure when user tabs into the relevant section, we focus the correct item.
 * For example GridCore extends ManagedFocusComponent, and it ensures when it receives focus
 * that focus goes to the first cell of the first header row.
 */
export class ManagedFocusComponent extends Component {

    protected handleKeyDown?(e: KeyboardEvent): void;

    public static FOCUS_MANAGED_CLASS = 'ag-focus-managed';

    private topTabGuard: HTMLElement;
    private bottomTabGuard: HTMLElement;
    private skipTabGuardFocus: boolean = false;

    @Autowired('focusService') protected readonly focusService: FocusService;

    /*
     * Set isFocusableContainer to true if this component will contain multiple focus-managed
     * elements within. When set to true, this component will add tabGuards that will be responsible
     * for receiving focus from outside and focusing an internal element using the focusInnerElementMethod
     */
    constructor(template?: string, private readonly isFocusableContainer = false) {
        super(template);
    }

    @PostConstruct
    protected postConstruct(): void {
        const focusableElement = this.getFocusableElement();

        if (!focusableElement) { return; }

        addCssClass(focusableElement, ManagedFocusComponent.FOCUS_MANAGED_CLASS);

        if (this.isFocusableContainer) {
            this.topTabGuard = this.createTabGuard('top');
            this.bottomTabGuard = this.createTabGuard('bottom');
            this.addTabGuards();
            this.activateTabGuards();
            this.forEachTabGuard(guard => this.addManagedListener(guard, 'focus', this.onFocus.bind(this)));
        }

        this.addKeyDownListeners(focusableElement);

        this.addManagedListener(focusableElement, 'focusin', this.onFocusIn.bind(this));
        this.addManagedListener(focusableElement, 'focusout', this.onFocusOut.bind(this));
    }

    /*
     * Override this method if focusing the default element requires special logic.
     */
    protected focusInnerElement(fromBottom = false): void {
        const focusable = this.focusService.findFocusableElements(this.getFocusableElement());

        if (this.isFocusableContainer && this.tabGuardsAreActive()) {
            // remove tab guards from this component from list of focusable elements
            focusable.splice(0, 1);
            focusable.splice(focusable.length - 1, 1);
        }

        if (!focusable.length) { return; }

        focusable[fromBottom ? focusable.length - 1 : 0].focus();
    }

    /**
     * By default this will tab though the elements in the default order. Override if you require special logic.
     */
    protected onTabKeyDown(e: KeyboardEvent) {
        if (e.defaultPrevented) { return; }

        const tabGuardsAreActive = this.tabGuardsAreActive();

        if (this.isFocusableContainer && tabGuardsAreActive) {
            this.deactivateTabGuards();
        }

        const nextRoot = this.focusService.findNextFocusableElement(this.getFocusableElement(), false, e.shiftKey);

        if (this.isFocusableContainer && tabGuardsAreActive) {
            // ensure the tab guards are only re-instated once the event has finished processing, to avoid the browser
            // tabbing to the tab guard from inside the component
            setTimeout(() => this.activateTabGuards(), 0);
        }

        if (!nextRoot) { return; }

        nextRoot.focus();
        e.preventDefault();
    }

    protected onFocusIn(e: FocusEvent): void {
        if (this.isFocusableContainer) {
            this.deactivateTabGuards();
        }
    }

    protected onFocusOut(e: FocusEvent): void {
        if (this.isFocusableContainer && !this.getFocusableElement().contains(e.relatedTarget as HTMLElement)) {
            this.activateTabGuards();
        }
    }

    public forceFocusOutOfContainer(up = false): void {
        if (!this.isFocusableContainer) { return; }

        this.activateTabGuards();
        this.skipTabGuardFocus = true;

        const tabGuardToFocus = up ? this.topTabGuard : this.bottomTabGuard;

        if (tabGuardToFocus) { tabGuardToFocus.focus(); }
    }

    public appendChild(newChild: HTMLElement | Component, container?: HTMLElement): void {
        if (this.isFocusableContainer) {
            if (!isNodeOrElement(newChild)) {
                newChild = (newChild as Component).getGui();
            }

            const { bottomTabGuard } = this;

            if (bottomTabGuard) {
                bottomTabGuard.insertAdjacentElement('beforebegin', newChild as HTMLElement);
            } else {
                super.appendChild(newChild, container);
            }
        } else {
            super.appendChild(newChild, container);
        }
    }

    private createTabGuard(side: 'top' | 'bottom'): HTMLElement {
        const tabGuard = document.createElement('div');

        tabGuard.classList.add('ag-tab-guard');
        tabGuard.classList.add(`ag-tab-guard-${side}`);
        tabGuard.setAttribute('role', 'presentation');

        return tabGuard;
    }

    private addTabGuards(): void {
        const focusableEl = this.getFocusableElement();

        focusableEl.insertAdjacentElement('afterbegin', this.topTabGuard);
        focusableEl.insertAdjacentElement('beforeend', this.bottomTabGuard);
    }

    private forEachTabGuard(callback: (tabGuard: HTMLElement) => void) {
        if (this.topTabGuard) { callback(this.topTabGuard); }
        if (this.bottomTabGuard) { callback(this.bottomTabGuard); }
    }

    private addKeyDownListeners(eGui: HTMLElement): void {
        this.addManagedListener(eGui, 'keydown', (e: KeyboardEvent) => {
            if (e.defaultPrevented || isStopPropagationForAgGrid(e)) { return; }

            if (this.shouldStopEventPropagation(e)) {
                stopPropagationForAgGrid(e);
                return;
            }

            if (e.keyCode === KeyCode.TAB) {
                this.onTabKeyDown(e);
            } else if (this.handleKeyDown) {
                this.handleKeyDown(e);
            }
        });
    }

    protected shouldStopEventPropagation(e: KeyboardEvent): boolean {
        return false;
    }

    private onFocus(e: FocusEvent): void {
        if (this.skipTabGuardFocus) {
            this.skipTabGuardFocus = false;
            return;
        }

        this.focusInnerElement(e.target === this.bottomTabGuard);
    }

    private activateTabGuards(): void {
        this.forEachTabGuard(guard => guard.setAttribute('tabIndex', this.gridOptionsWrapper.getGridTabIndex()));
    }

    private deactivateTabGuards(): void {
        this.forEachTabGuard(guard => guard.removeAttribute('tabIndex'));
    }

    private tabGuardsAreActive(): boolean {
        return !!this.topTabGuard && this.topTabGuard.hasAttribute('tabIndex');
    }

    protected clearGui(): void {
        const tabGuardsAreActive = this.tabGuardsAreActive();

        clearElement(this.getFocusableElement());

        if (this.isFocusableContainer) {
            this.addTabGuards();

            if (tabGuardsAreActive) {
                this.activateTabGuards();
            }
        }
    }
}
