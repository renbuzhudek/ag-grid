import { Component } from './component';
import { Autowired } from '../context/context';
import { RefSelector } from './componentAnnotations';
import { ManagedFocusComponent } from './managedFocusComponent';
import { addCssClass, containsClass } from '../utils/dom';
import { getAriaPosInSet, setAriaSetSize, setAriaPosInSet, setAriaSelected, setAriaChecked } from '../utils/aria';
import { KeyCode } from '../constants/keyCode';
import { ResizeObserverService } from "../misc/resizeObserverService";
import { waitUntil } from '../utils/function';

export interface VirtualListModel {
    getRowCount(): number;
    getRow(index: number): any;
    isRowSelected?(index: number): boolean | undefined;
}

export class VirtualList extends ManagedFocusComponent {
    private model: VirtualListModel;
    private renderedRows = new Map<number, { rowComponent: Component, eDiv: HTMLDivElement; }>();
    private componentCreator: (value: any, listItemElement: HTMLElement) => Component;
    private rowHeight = 20;
    private lastFocusedRowIndex: number | null;
    private isDestroyed = false;

    @Autowired('resizeObserverService') private readonly resizeObserverService: ResizeObserverService;
    @RefSelector('eContainer') private readonly eContainer: HTMLElement;

    constructor(private readonly cssIdentifier = 'default', private readonly ariaRole = 'listbox') {
        super(VirtualList.getTemplate(cssIdentifier), true);
    }

    protected postConstruct(): void {
        this.addScrollListener();
        this.rowHeight = this.getItemHeight();
        this.addResizeObserver();

        super.postConstruct();
    }

    private addResizeObserver(): void {
        const listener = this.drawVirtualRows.bind(this);
        const destroyObserver = this.resizeObserverService.observeResize(this.getGui(), listener);
        this.addDestroyFunc(destroyObserver);
    }

    protected focusInnerElement(fromBottom: boolean): void {
        this.focusRow(fromBottom ? this.model.getRowCount() - 1 : 0);
    }

    protected onFocusIn(e: FocusEvent): void {
        super.onFocusIn(e);
        const target = e.target as HTMLElement;

        if (containsClass(target, 'ag-virtual-list-item')) {
            this.lastFocusedRowIndex = getAriaPosInSet(target) - 1;
        }
    }

    protected onFocusOut(e: FocusEvent) {
        super.onFocusOut(e);

        if (!this.getFocusableElement().contains(e.relatedTarget as HTMLElement)) {
            this.lastFocusedRowIndex = null;
        }
    }

    protected handleKeyDown(e: KeyboardEvent): void {
        switch (e.keyCode) {
            case KeyCode.UP:
            case KeyCode.DOWN:
                if (this.navigate(e.keyCode === KeyCode.UP)) {
                    e.preventDefault();
                }

                break;
        }
    }

    protected onTabKeyDown(e: KeyboardEvent): void {
        if (this.navigate(e.shiftKey)) {
            e.preventDefault();
        } else {
            // focus on the first or last focusable element to ensure that any other handlers start from there
            this.focusService.focusInto(this.getGui(), !e.shiftKey);
        }
    }

    private navigate(up: boolean): boolean {
        if (this.lastFocusedRowIndex == null) { return false; }

        const nextRow = this.lastFocusedRowIndex + (up ? -1 : 1);

        if (nextRow < 0 || nextRow >= this.model.getRowCount()) { return false; }

        this.focusRow(nextRow);

        return true;
    }

    public getLastFocusedRow(): number | null {
        return this.lastFocusedRowIndex;
    }

    public focusRow(rowNumber: number): void {
        this.ensureIndexVisible(rowNumber);

        window.setTimeout(() => {
            const renderedRow = this.renderedRows.get(rowNumber);

            if (renderedRow) {
                renderedRow.eDiv.focus();
            }
        }, 10);
    }

    public getComponentAt(rowIndex: number): Component | undefined {
        const comp = this.renderedRows.get(rowIndex);

        return comp && comp.rowComponent;
    }

    private static getTemplate(cssIdentifier: string) {
        return /* html */`
            <div class="ag-virtual-list-viewport ag-${cssIdentifier}-virtual-list-viewport" role="listbox">
                <div class="ag-virtual-list-container ag-${cssIdentifier}-virtual-list-container" ref="eContainer"></div>
            </div>`;
    }

    private getItemHeight(): number {
        return this.gridOptionsWrapper.getListItemHeight();
    }

    public ensureIndexVisible(index: number): void {
        const lastRow = this.model.getRowCount();

        if (typeof index !== 'number' || index < 0 || index >= lastRow) {
            console.warn('invalid row index for ensureIndexVisible: ' + index);
            return;
        }

        const rowTopPixel = index * this.rowHeight;
        const rowBottomPixel = rowTopPixel + this.rowHeight;
        const eGui = this.getGui();

        const viewportTopPixel = eGui.scrollTop;
        const viewportHeight = eGui.offsetHeight;
        const viewportBottomPixel = viewportTopPixel + viewportHeight;

        const viewportScrolledPastRow = viewportTopPixel > rowTopPixel;
        const viewportScrolledBeforeRow = viewportBottomPixel < rowBottomPixel;

        if (viewportScrolledPastRow) {
            // if row is before, scroll up with row at top
            eGui.scrollTop = rowTopPixel;
        } else if (viewportScrolledBeforeRow) {
            // if row is below, scroll down with row at bottom
            const newScrollPosition = rowBottomPixel - viewportHeight;
            eGui.scrollTop = newScrollPosition;
        }
    }

    public setComponentCreator(componentCreator: (value: any, listItemElement: HTMLElement) => Component): void {
        this.componentCreator = componentCreator;
    }

    public getRowHeight(): number {
        return this.rowHeight;
    }

    public getScrollTop(): number {
        return this.getGui().scrollTop;
    }

    public setRowHeight(rowHeight: number): void {
        this.rowHeight = rowHeight;
        this.refresh();
    }

    public refresh(): void {
        if (this.model == null || this.isDestroyed) { return; }

        const rowCount = this.model.getRowCount();
        this.eContainer.style.height = `${rowCount * this.rowHeight}px`;

        // ensure height is applied before attempting to redraw rows
        waitUntil(() => this.eContainer.clientHeight >= rowCount * this.rowHeight,
            () => {
                if (this.isDestroyed) { return; }

                this.clearVirtualRows();
                this.drawVirtualRows();
            }
        );
    }

    private clearVirtualRows() {
        this.renderedRows.forEach((_, rowIndex) => this.removeRow(rowIndex));
    }

    private drawVirtualRows() {
        const gui = this.getGui();
        const topPixel = gui.scrollTop;
        const bottomPixel = topPixel + gui.offsetHeight;
        const firstRow = Math.floor(topPixel / this.rowHeight);
        const lastRow = Math.floor(bottomPixel / this.rowHeight);

        this.ensureRowsRendered(firstRow, lastRow);
    }

    private ensureRowsRendered(start: number, finish: number) {
        // remove any rows that are no longer required
        this.renderedRows.forEach((_, rowIndex) => {
            if ((rowIndex < start || rowIndex > finish) && rowIndex !== this.lastFocusedRowIndex) {
                this.removeRow(rowIndex);
            }
        });

        // insert any required new rows
        for (let rowIndex = start; rowIndex <= finish; rowIndex++) {
            if (this.renderedRows.has(rowIndex)) { continue; }

            // check this row actually exists (in case overflow buffer window exceeds real data)
            if (rowIndex < this.model.getRowCount()) {
                this.insertRow(rowIndex);
            }
        }
    }

    private insertRow(rowIndex: number): void {
        const value = this.model.getRow(rowIndex);
        const eDiv = document.createElement('div');

        addCssClass(eDiv, 'ag-virtual-list-item');
        addCssClass(eDiv, `ag-${this.cssIdentifier}-virtual-list-item`);

        eDiv.setAttribute('role', this.ariaRole === 'tree' ? 'treeitem' : 'option');
        setAriaSetSize(eDiv, this.model.getRowCount());
        setAriaPosInSet(eDiv, rowIndex + 1);
        eDiv.setAttribute('tabindex', '-1');

        if (typeof this.model.isRowSelected === 'function') {
            const isSelected = this.model.isRowSelected(rowIndex);

            setAriaSelected(eDiv, !!isSelected);
            setAriaChecked(eDiv, isSelected);
        }

        eDiv.style.height = `${this.rowHeight}px`;
        eDiv.style.top = `${this.rowHeight * rowIndex}px`;

        const rowComponent = this.componentCreator(value, eDiv);

        rowComponent.addGuiEventListener('focusin', () => this.lastFocusedRowIndex = rowIndex);

        eDiv.appendChild(rowComponent.getGui());

        // keep the DOM order consistent with the order of the rows
        if (this.renderedRows.has(rowIndex - 1)) {
            this.renderedRows.get(rowIndex - 1)!.eDiv.insertAdjacentElement('afterend', eDiv);
        } else if (this.renderedRows.has(rowIndex + 1)) {
            this.renderedRows.get(rowIndex + 1)!.eDiv.insertAdjacentElement('beforebegin', eDiv);
        } else {
            this.eContainer.appendChild(eDiv);
        }

        this.renderedRows.set(rowIndex, { rowComponent, eDiv });
    }

    private removeRow(rowIndex: number) {
        const component = this.renderedRows.get(rowIndex)!;

        this.eContainer.removeChild(component.eDiv);
        this.destroyBean(component.rowComponent);
        this.renderedRows.delete(rowIndex);
    }

    private addScrollListener() {
        this.addGuiEventListener('scroll', () => this.drawVirtualRows());
    }

    public setModel(model: VirtualListModel): void {
        this.model = model;
    }

    public destroy(): void {
        if (this.isDestroyed) { return; }

        this.clearVirtualRows();
        this.isDestroyed = true;

        super.destroy();
    }
}
