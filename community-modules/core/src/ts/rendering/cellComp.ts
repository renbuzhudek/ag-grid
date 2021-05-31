import { Column } from "../entities/column";
import { CellChangedEvent, RowNode } from "../entities/rowNode";
import { Constants } from "../constants/constants";
import {
    CellClickedEvent,
    CellContextMenuEvent,
    CellDoubleClickedEvent,
    CellEditingStartedEvent,
    CellEvent,
    CellMouseOutEvent,
    CellMouseOverEvent,
    Events,
    FlashCellsEvent
} from "../events";
import { Beans } from "./beans";
import { Component } from "../widgets/component";
import { ICellEditorComp, ICellEditorParams } from "../interfaces/iCellEditor";
import { ICellRendererComp, ICellRendererParams } from "./cellRenderers/iCellRenderer";
import { CheckboxSelectionComponent } from "./checkboxSelectionComponent";
import { CellClassParams, ColDef, NewValueParams } from "../entities/colDef";
import { CellPosition } from "../entities/cellPosition";
import { CellRangeType, ISelectionHandle, SelectionHandleType } from "../interfaces/IRangeService";
import { RowCtrl } from "./row/rowCtrl";
import { RowDragComp } from "./row/rowDragComp";
import { PopupEditorWrapper } from "./cellEditors/popupEditorWrapper";
import { AgPromise } from "../utils";
import { IFrameworkOverrides } from "../interfaces/iFrameworkOverrides";
import { DndSourceComp } from "./dndSourceComp";
import { TooltipFeature } from "../widgets/tooltipFeature";
import { TooltipParentComp } from '../widgets/tooltipFeature';
import { setAriaColIndex, setAriaDescribedBy, setAriaSelected } from "../utils/aria";
import { get, getValueUsingField } from "../utils/object";
import { escapeString } from "../utils/string";
import { exists, missing } from "../utils/generic";
import { addOrRemoveCssClass, clearElement, addStylesToElement, isElementChildOfClass, isFocusableFormField } from "../utils/dom";
import { last, areEqual, pushAll, includes } from "../utils/array";
import { cssStyleObjectToMarkup } from "../utils/general";
import { isStopPropagationForAgGrid, getTarget, isEventSupported } from "../utils/event";
import { isEventFromPrintableCharacter } from "../utils/keyboard";
import { isBrowserEdge, isBrowserIE, isIOSUserAgent } from "../utils/browser";
import { doOnce } from "../utils/function";
import { KeyCode } from '../constants/keyCode';
import { ITooltipParams } from "./tooltipComponent";
import { RowPosition } from "../entities/rowPosition";

const CSS_CELL = 'ag-cell';
const CSS_CELL_VALUE = 'ag-cell-value';
const CSS_AUTO_HEIGHT = 'ag-cell-auto-height';

const CSS_RANGE_TOP = 'ag-cell-range-top';
const CSS_RANGE_RIGHT = 'ag-cell-range-right';
const CSS_RANGE_BOTTOM = 'ag-cell-range-bottom';
const CSS_RANGE_LEFT = 'ag-cell-range-left';

const CSS_CELL_FOCUS = 'ag-cell-focus';

const CSS_FIRST_RIGHT_PINNED = 'ag-cell-first-right-pinned';
const CSS_LAST_LEFT_PINNED = 'ag-cell-last-left-pinned';

const CSS_NOT_INLINE_EDITING = 'ag-cell-not-inline-editing';
const CSS_INLINE_EDITING = 'ag-cell-inline-editing';
const CSS_POPUP_EDITING = 'ag-cell-popup-editing';

const CSS_RANGE_SELECTED = 'ag-cell-range-selected';
const CSS_COLUMN_HOVER = 'ag-column-hover';
const CSS_CELL_WRAP_TEXT = 'ag-cell-wrap-text';

const CSS_RANGE_CHART = 'ag-cell-range-chart';
const CSS_RANGE_SINGLE_CELL = 'ag-cell-range-single-cell';
const CSS_RANGE_CHART_CATEGORY = 'ag-cell-range-chart-category';
const CSS_RANGE_HANDLE = 'ag-cell-range-handle';

export class CellComp extends Component implements TooltipParentComp {

    public static DOM_DATA_KEY_CELL_COMP = 'cellComp';

    private static CELL_RENDERER_TYPE_NORMAL = 'cellRenderer';
    private static CELL_RENDERER_TYPE_PINNED = 'pinnedRowCellRenderer';

    private eCellWrapper: HTMLElement;
    private eCellValue: HTMLElement;

    private beans: Beans;
    private column: Column;
    private rowNode: RowNode;
    private eRow: HTMLElement;
    private cellPosition: CellPosition;
    private rangeCount: number;
    private hasChartRange = false;

    private usingWrapper: boolean;
    private wrapText: boolean;

    private includeSelectionComponent: boolean;
    private includeRowDraggingComponent: boolean;
    private includeDndSourceComponent: boolean;

    private rowDraggingComp: RowDragComp | undefined;

    private cellFocused: boolean;
    private editingCell = false;
    private cellEditorInPopup: boolean;
    private hideEditorPopup: Function | null;

    private createCellRendererFunc: (() => void) | null;

    private lastIPadMouseClickEvent: number;

    // true if we are using a cell renderer
    private usingCellRenderer: boolean;
    // the cellRenderer class to use - this is decided once when the grid is initialised
    private cellRendererType: string;

    // instance of the cellRenderer class
    private cellRenderer: ICellRendererComp | null | undefined;
    // the GUI is initially element or string, however once the UI is created, it becomes UI
    private cellRendererGui: HTMLElement | null;
    private cellEditor: ICellEditorComp | null;
    private selectionHandle: ISelectionHandle | null | undefined;

    private autoHeightCell: boolean;

    private firstRightPinned: boolean;
    private lastLeftPinned: boolean;

    private rowComp: RowCtrl | null;

    private rangeSelectionEnabled: boolean;

    private value: any;
    private valueFormatted: any;
    private colsSpanning: Column[];
    private rowSpan: number;

    private suppressRefreshCell = false;

    private tooltipFeatureEnabled = false;
    private tooltip: any;

    private scope: any = null;

    private readonly printLayout: boolean;

    // every time we go into edit mode, or back again, this gets incremented.
    // it's the components way of dealing with the async nature of framework components,
    // so if a framework component takes a while to be created, we know if the object
    // is still relevant when creating is finished. eg we could click edit / un-edit 20
    // times before the first React edit component comes back - we should discard
    // the first 19.
    private cellEditorVersion = 0;
    private cellRendererVersion = 0;

    constructor(scope: any, beans: Beans, column: Column, rowNode: RowNode, rowComp: RowCtrl | null,
        autoHeightCell: boolean, printLayout: boolean, eRow: HTMLElement, editingRow: boolean) {
        super();
        this.scope = scope;
        this.beans = beans;
        this.column = column;
        this.rowNode = rowNode;
        this.rowComp = rowComp;
        this.autoHeightCell = autoHeightCell;
        this.printLayout = printLayout;
        this.eRow = eRow;

        this.createGridCellVo();

        this.rangeSelectionEnabled = this.beans.rangeService && beans.gridOptionsWrapper.isEnableRangeSelection();
        this.cellFocused = this.beans.focusService.isCellFocused(this.cellPosition);
        this.firstRightPinned = this.column.isFirstRightPinned();
        this.lastLeftPinned = this.column.isLastLeftPinned();

        if (this.rangeSelectionEnabled && this.beans.rangeService) {
            const { rangeService } = this.beans;
            this.rangeCount = rangeService.getCellRangeCount(this.cellPosition);
            this.hasChartRange = this.getHasChartRange();
        }

        this.getValueAndFormat();
        this.setUsingWrapper();
        this.chooseCellRenderer();
        this.setupColSpan();
        this.rowSpan = this.column.getRowSpan(this.rowNode);

        this.setTemplate(this.getCreateTemplate());

        this.afterAttached();

        // if we are editing the row, then the cell needs to turn
        // into edit mode
        if (editingRow) {
            this.startEditingIfEnabled();
        }
    }

    private getCreateTemplate(): string {
        const unselectable = !this.beans.gridOptionsWrapper.isEnableCellTextSelection() ? ' unselectable="on"' : '';
        const templateParts: string[] = [];
        const col = this.column;

        const width = this.getCellWidth();
        const left = this.modifyLeftForPrintLayout(this.getCellLeft());

        const valueToRender = this.getInitialValueToRender();
        const valueSanitised = get(this.column, 'colDef.template', null) ? valueToRender : escapeString(valueToRender);
        this.tooltip = this.getToolTip();
        const tooltipSanitised = escapeString(this.tooltip);
        const colIdSanitised = escapeString(col.getId());

        const stylesFromColDef = this.preProcessStylesFromColDef();
        const cssClasses = this.getInitialCssClasses();

        const stylesForRowSpanning = this.getStylesForRowSpanning();
        const colIdxSanitised = escapeString(this.beans.columnModel.getAriaColumnIndex(this.column).toString());

        templateParts.push(`<div`);
        templateParts.push(` tabindex="-1"`);
        templateParts.push(`${unselectable}`); // THIS IS FOR IE ONLY so text selection doesn't bubble outside of the grid
        templateParts.push(` role="gridcell"`);
        templateParts.push(` aria-colindex="${colIdxSanitised}"`);

        templateParts.push(` comp-id="${this.getCompId()}" `);
        templateParts.push(` col-id="${colIdSanitised}"`);
        templateParts.push(` class="${escapeString(cssClasses.join(' '))}"`);

        if (this.beans.gridOptionsWrapper.isEnableBrowserTooltips() && exists(tooltipSanitised)) {
            templateParts.push(` title="${tooltipSanitised}"`);
        }

        if (this.rangeSelectionEnabled) {
            templateParts.push(` aria-selected="${this.rangeCount ? 'true' : 'false'}"`);
        }

        templateParts.push(` style="width: ${Number(width)}px; left: ${Number(left)}px; ${escapeString(stylesFromColDef)} ${escapeString(stylesForRowSpanning)}">`);

        if (this.usingWrapper) {
            templateParts.push(this.getCellWrapperString(valueSanitised));
        } else if (valueSanitised != null) {
            templateParts.push(valueSanitised);
        }

        templateParts.push(`</div>`);

        return templateParts.join('');
    }

    private getCellWrapperString(value: string | null = ''): string {
        const unselectable = !this.beans.gridOptionsWrapper.isEnableCellTextSelection() ? ' unselectable="on"' : '';
        const wrapper = /* html */
        `<div ref="eCellWrapper" class="ag-cell-wrapper" role="presentation">
            <span ref="eCellValue" role="presentation" class="${CSS_CELL_VALUE}"${unselectable}>
                ${value != null ? value : ''}
            </span>
        </div>`;

        return wrapper;
    }

    private getStylesForRowSpanning(): string {
        if (this.rowSpan === 1) { return ''; }

        const singleRowHeight = this.beans.gridOptionsWrapper.getRowHeightAsNumber();
        const totalRowHeight = singleRowHeight * this.rowSpan;

        return `height: ${totalRowHeight}px; z-index: 1;`;
    }

    public afterAttached(): void {

        // all of these have dependencies on the eGui, so only do them after eGui is set
        this.addDomData();
        this.populateTemplate();
        this.createCellRendererInstance(true);
        this.angular1Compile();
        this.refreshHandle();

        if (exists(this.tooltip)) {
            this.createTooltipFeatureIfNeeded();
        }
    }

    private createTooltipFeatureIfNeeded(): void {
        if (
            this.beans.gridOptionsWrapper.isEnableBrowserTooltips() ||
            this.tooltipFeatureEnabled
        ) { return; }

        this.createManagedBean(new TooltipFeature(this), this.beans.context);
        this.tooltipFeatureEnabled = true;
    }

    public onColumnHover(): void {
        const isHovered = this.beans.columnHoverService.isHovered(this.column);
        this.addOrRemoveCssClass(CSS_COLUMN_HOVER, isHovered);
    }

    public onCellChanged(event: CellChangedEvent): void {
        const eventImpactsThisCell = event.column === this.column;
        if (eventImpactsThisCell) {
            this.refreshCell({});
        }
    }

    private getCellLeft(): number | null {
        let mostLeftCol: Column;

        if (this.beans.gridOptionsWrapper.isEnableRtl() && this.colsSpanning) {
            mostLeftCol = last(this.colsSpanning);
        } else {
            mostLeftCol = this.column;
        }

        return mostLeftCol.getLeft();
    }

    private getCellWidth(): number {
        if (!this.colsSpanning) {
            return this.column.getActualWidth();
        }

        return this.colsSpanning.reduce((width, col) => width + col.getActualWidth(), 0);
    }

    public onFlashCells(event: FlashCellsEvent): void {
        const cellId = this.beans.cellPositionUtils.createId(this.cellPosition);
        const shouldFlash = event.cells[cellId];
        if (shouldFlash) {
            this.animateCell('highlight');
        }
    }

    private setupColSpan(): void {
        // if no col span is active, then we don't set it up, as it would be wasteful of CPU
        if (missing(this.getComponentHolder().colSpan)) { return; }

        // because we are col spanning, a reorder of the cols can change what cols we are spanning over
        this.addManagedListener(this.beans.eventService, Events.EVENT_DISPLAYED_COLUMNS_CHANGED, this.onDisplayColumnsChanged.bind(this));
        // because we are spanning over multiple cols, we check for width any time any cols width changes.
        // this is expensive - really we should be explicitly checking only the cols we are spanning over
        // instead of every col, however it would be tricky code to track the cols we are spanning over, so
        // because hardly anyone will be using colSpan, am favouring this easier way for more maintainable code.
        this.addManagedListener(this.beans.eventService, Events.EVENT_DISPLAYED_COLUMNS_WIDTH_CHANGED, this.onWidthChanged.bind(this));

        this.colsSpanning = this.getColSpanningList();
    }

    public getColSpanningList(): Column[] {
        const colSpan = this.column.getColSpan(this.rowNode);
        const colsSpanning: Column[] = [];

        // if just one col, the col span is just the column we are in
        if (colSpan === 1) {
            colsSpanning.push(this.column);
        } else {
            let pointer: Column | null = this.column;
            const pinned = this.column.getPinned();
            for (let i = 0; pointer && i < colSpan; i++) {
                colsSpanning.push(pointer);
                pointer = this.beans.columnModel.getDisplayedColAfter(pointer);
                if (!pointer || missing(pointer)) {
                    break;
                }
                // we do not allow col spanning to span outside of pinned areas
                if (pinned !== pointer.getPinned()) {
                    break;
                }
            }
        }

        return colsSpanning;
    }

    private onDisplayColumnsChanged(): void {
        const colsSpanning: Column[] = this.getColSpanningList();

        if (!areEqual(this.colsSpanning, colsSpanning)) {
            this.colsSpanning = colsSpanning;
            this.onWidthChanged();
            this.onLeftChanged(); // left changes when doing RTL
        }
    }

    private refreshAriaIndex(): void {
        const colIdx = this.beans.columnModel.getAriaColumnIndex(this.column);
        setAriaColIndex(this.getGui(), colIdx);
    }

    private getInitialCssClasses(): string[] {
        const cssClasses = [CSS_CELL, CSS_NOT_INLINE_EDITING];

        // if we are putting the cell into a dummy container, to work out it's height,
        // then we don't put the height css in, as we want cell to fit height in that case.
        if (!this.autoHeightCell) {
            cssClasses.push(CSS_AUTO_HEIGHT);
        }

        const doingFocusCss = !this.beans.gridOptionsWrapper.isSuppressCellSelection();

        if (doingFocusCss && this.cellFocused) {
            // otherwise the class depends on the focus state
            cssClasses.push(CSS_CELL_FOCUS);
        }

        if (this.firstRightPinned) {
            cssClasses.push(CSS_FIRST_RIGHT_PINNED);
        }

        if (this.lastLeftPinned) {
            cssClasses.push(CSS_LAST_LEFT_PINNED);
        }

        if (this.beans.columnHoverService.isHovered(this.column)) {
            cssClasses.push(CSS_COLUMN_HOVER);
        }

        pushAll(cssClasses, this.preProcessClassesFromColDef());
        pushAll(cssClasses, this.preProcessCellClassRules());
        pushAll(cssClasses, this.getInitialRangeClasses());

        // if using the wrapper, this class goes on the wrapper instead
        if (!this.usingWrapper) {
            cssClasses.push(CSS_CELL_VALUE);
        }

        this.wrapText = this.column.getColDef().wrapText == true;
        if (this.wrapText) {
            cssClasses.push(CSS_CELL_WRAP_TEXT);
        }

        return cssClasses;
    }

    public getInitialValueToRender(): string {
        // if using a cellRenderer, then render the html from the cell renderer if it exists
        if (this.usingCellRenderer) {
            if (typeof this.cellRendererGui === 'string') {
                return this.cellRendererGui as string;
            }
            return '';
        }

        const colDef = this.getComponentHolder();

        if (colDef.template) {
            // template is really only used for angular 1 - as people using ng1 are used to providing templates with
            // bindings in it. in ng2, people will hopefully want to provide components, not templates.
            return colDef.template;
        }

        if (colDef.templateUrl) {
            // likewise for templateUrl - it's for ng1 really - when we move away from ng1, we can take these out.
            // niall was pro angular 1 when writing template and templateUrl, if writing from scratch now, would
            // not do these, but would follow a pattern that was friendly towards components, not templates.
            const template = this.beans.templateService.getTemplate(colDef.templateUrl, this.refreshCell.bind(this, true));

            return template || '';
        }

        return this.getValueToUse();
    }

    public getRenderedRow(): RowCtrl | null {
        return this.rowComp;
    }

    public isSuppressNavigable(): boolean {
        return this.column.isSuppressNavigable(this.rowNode);
    }

    public getCellRenderer(): ICellRendererComp | null | undefined {
        return this.cellRenderer;
    }

    public getCellEditor(): ICellEditorComp | null {
        return this.cellEditor;
    }

    public onNewColumnsLoaded(): void {
        this.postProcessWrapText();
        this.postProcessCellClassRules();
    }

    private postProcessWrapText(): void {
        const newValue = this.column.getColDef().wrapText == true;
        if (newValue !== this.wrapText) {
            this.wrapText = newValue;
            this.addOrRemoveCssClass(CSS_CELL_WRAP_TEXT, this.wrapText);
        }
    }

    // + stop editing {forceRefresh: true, suppressFlash: true}
    // + event cellChanged {}
    // + cellRenderer.params.refresh() {} -> method passes 'as is' to the cellRenderer, so params could be anything
    // + rowComp: event dataChanged {animate: update, newData: !update}
    // + rowComp: api refreshCells() {animate: true/false}
    // + rowRenderer: api softRefreshView() {}
    public refreshCell(params?: { suppressFlash?: boolean, newData?: boolean, forceRefresh?: boolean; }) {
        // if we are in the middle of 'stopEditing', then we don't refresh here, as refresh gets called explicitly
        if (this.suppressRefreshCell || this.editingCell) { return; }

        const colDef = this.getComponentHolder();
        const newData = params && params.newData;
        const suppressFlash = (params && params.suppressFlash) || colDef.suppressCellFlash;
        // we always refresh if cell has no value - this can happen when user provides Cell Renderer and the
        // cell renderer doesn't rely on a value, instead it could be looking directly at the data, or maybe
        // printing the current time (which would be silly)???. Generally speaking
        // non of {field, valueGetter, showRowGroup} is bad in the users application, however for this edge case, it's
        // best always refresh and take the performance hit rather than never refresh and users complaining in support
        // that cells are not updating.
        const noValueProvided = colDef.field == null && colDef.valueGetter == null && colDef.showRowGroup == null;
        const forceRefresh = (params && params.forceRefresh) || noValueProvided || newData;

        const oldValue = this.value;

        // get latest value without invoking the value formatter as we may not be updating the cell
        this.value = this.getValue();

        // for simple values only (not objects), see if the value is the same, and if it is, skip the refresh.
        // when never allow skipping after an edit, as after editing, we need to put the GUI back to the way
        // if was before the edit.
        const valuesDifferent = !this.valuesAreEqual(oldValue, this.value);
        const dataNeedsUpdating = forceRefresh || valuesDifferent;

        if (dataNeedsUpdating) {
            // now invoke the value formatter as we are going to update cell
            this.valueFormatted = this.beans.valueFormatterService.formatValue(this.column, this.rowNode, this.scope, this.value);

            // if it's 'new data', then we don't refresh the cellRenderer, even if refresh method is available.
            // this is because if the whole data is new (ie we are showing stock price 'BBA' now and not 'SSD')
            // then we are not showing a movement in the stock price, rather we are showing different stock.
            const cellRendererRefreshed = newData ? false : this.attemptCellRendererRefresh();

            // we do the replace if not doing refresh, or if refresh was unsuccessful.
            // the refresh can be unsuccessful if we are using a framework (eg ng2 or react) and the framework
            // wrapper has the refresh method, but the underlying component doesn't
            if (!cellRendererRefreshed) {
                this.replaceContentsAfterRefresh();
            }

            // we don't want to flash the cells when processing a filter change, as otherwise the UI would
            // be to busy. see comment in FilterManager with regards processingFilterChange
            const processingFilterChange = this.beans.filterManager.isSuppressFlashingCellsBecauseFiltering();

            const flashCell = !suppressFlash && !processingFilterChange &&
                (this.beans.gridOptionsWrapper.isEnableCellChangeFlash() || colDef.enableCellChangeFlash);

            if (flashCell) {
                this.flashCell();
            }

            // need to check rules. note, we ignore colDef classes and styles, these are assumed to be static
            this.postProcessStylesFromColDef();
            this.postProcessClassesFromColDef();
        }

        // we can't readily determine if the data in an angularjs template has changed, so here we just update
        // and recompile (if applicable)
        this.updateAngular1ScopeAndCompile();

        this.refreshToolTip();
        // we do cellClassRules even if the value has not changed, so that users who have rules that
        // look at other parts of the row (where the other part of the row might of changed) will work.
        this.postProcessCellClassRules();
    }

    // user can also call this via API
    public flashCell(delays?: { flashDelay?: number | null; fadeDelay?: number | null; }): void {
        const flashDelay = delays && delays.flashDelay;
        const fadeDelay = delays && delays.fadeDelay;

        this.animateCell('data-changed', flashDelay, fadeDelay);
    }

    private animateCell(cssName: string, flashDelay?: number | null, fadeDelay?: number | null): void {
        const fullName = `ag-cell-${cssName}`;
        const animationFullName = `ag-cell-${cssName}-animation`;
        const element = this.getGui();
        const { gridOptionsWrapper } = this.beans;

        if (!flashDelay) {
            flashDelay = gridOptionsWrapper.getCellFlashDelay();
        }

        if (!exists(fadeDelay)) {
            fadeDelay = gridOptionsWrapper.getCellFadeDelay();
        }

        // we want to highlight the cells, without any animation
        this.addCssClass(fullName);
        this.removeCssClass(animationFullName);

        // then once that is applied, we remove the highlight with animation
        window.setTimeout(() => {
            this.removeCssClass(fullName);
            this.addCssClass(animationFullName);
            element.style.transition = `background-color ${fadeDelay}ms`;
            window.setTimeout(() => {
                // and then to leave things as we got them, we remove the animation
                this.removeCssClass(animationFullName);
                element.style.removeProperty('transition');
            }, fadeDelay!);
        }, flashDelay);
    }

    private replaceContentsAfterRefresh(): void {
        this.setUsingWrapper();
        clearElement(this.eCellValue);

        // remove old renderer component if it exists
        this.cellRenderer = this.beans.context.destroyBean(this.cellRenderer);
        this.cellRendererGui = null;

        // populate
        this.putDataIntoCellAfterRefresh();
        this.updateAngular1ScopeAndCompile();
    }

    private updateAngular1ScopeAndCompile() {
        if (this.beans.gridOptionsWrapper.isAngularCompileRows() && this.scope) {
            this.scope.data = { ...this.rowNode.data };
            this.angular1Compile();
        }
    }

    private angular1Compile(): void {
        // if angular compiling, then need to also compile the cell again (angular compiling sucks, please wait...)
        if (this.beans.gridOptionsWrapper.isAngularCompileRows()) {
            const eGui = this.getGui();

            // only compile the node if it hasn't already been done
            // this prevents "orphaned" node leaks
            if (!eGui.classList.contains('ng-scope') || eGui.childElementCount === 0) {
                const compiledElement = this.beans.$compile(eGui)(this.scope);
                this.addDestroyFunc(() => compiledElement.remove());
            }
        }
    }

    private postProcessStylesFromColDef() {
        const stylesToUse = this.processStylesFromColDef();

        if (stylesToUse) {
            addStylesToElement(this.getGui(), stylesToUse);
        }
    }

    private preProcessStylesFromColDef(): string {
        return cssStyleObjectToMarkup(this.processStylesFromColDef());
    }

    private processStylesFromColDef(): any {
        const colDef = this.getComponentHolder();

        if (colDef.cellStyle) {
            let cssToUse: any;

            if (typeof colDef.cellStyle === 'function') {
                const cellStyleParams = {
                    column: this.column,
                    value: this.value,
                    colDef: colDef,
                    data: this.rowNode.data,
                    node: this.rowNode,
                    rowIndex: this.rowNode.rowIndex!,
                    $scope: this.scope,
                    api: this.beans.gridOptionsWrapper.getApi()!,
                    columnApi: this.beans.gridOptionsWrapper.getColumnApi()!,
                    context: this.beans.gridOptionsWrapper.getContext(),
                } as CellClassParams;
                const cellStyleFunc = colDef.cellStyle as Function;
                cssToUse = cellStyleFunc(cellStyleParams);
            } else {
                cssToUse = colDef.cellStyle;
            }

            return cssToUse;
        }
    }

    private postProcessClassesFromColDef() {
        this.processClassesFromColDef(className => this.addCssClass(className));
    }

    private preProcessClassesFromColDef(): string[] {
        const res: string[] = [];

        this.processClassesFromColDef(className => res.push(className));

        return res;
    }

    private processClassesFromColDef(onApplicableClass: (className: string) => void): void {
        const colDef = this.getComponentHolder();
        const cellClassParams: CellClassParams = {
            value: this.value,
            data: this.rowNode.data,
            node: this.rowNode,
            colDef: colDef,
            rowIndex: this.rowNode.rowIndex!,
            $scope: this.scope,
            api: this.beans.gridOptionsWrapper.getApi()!,
            columnApi: this.beans.gridOptionsWrapper.getColumnApi()!,
            context: this.beans.gridOptionsWrapper.getContext()
        };

        this.beans.stylingService.processStaticCellClasses(
            colDef,
            cellClassParams,
            onApplicableClass
        );
    }

    private putDataIntoCellAfterRefresh() {
        // template gets preference, then cellRenderer, then do it ourselves
        const colDef = this.getComponentHolder();

        if (colDef.template) {
            // template is really only used for angular 1 - as people using ng1 are used to providing templates with
            // bindings in it. in ng2, people will hopefully want to provide components, not templates.
            this.eCellValue.innerHTML = colDef.template;
        } else if (colDef.templateUrl) {
            // likewise for templateUrl - it's for ng1 really - when we move away from ng1, we can take these out.
            // niall was pro angular 1 when writing template and templateUrl, if writing from scratch now, would
            // not do these, but would follow a pattern that was friendly towards components, not templates.
            const template = this.beans.templateService.getTemplate(colDef.templateUrl, this.refreshCell.bind(this, true));

            if (template) {
                this.eCellValue.innerHTML = template;
            }
        } else {
            // we can switch from using a cell renderer back to the default if a user
            // is using cellRendererSelect
            this.chooseCellRenderer();

            if (this.usingCellRenderer) {
                this.createCellRendererInstance();
            } else {
                const valueToUse = this.getValueToUse();

                if (valueToUse != null) {
                    this.eCellValue.innerHTML = escapeString(valueToUse) || '';
                }
            }
        }
    }

    public attemptCellRendererRefresh(): boolean {
        if (missing(this.cellRenderer) || !this.cellRenderer || missing(this.cellRenderer.refresh)) {
            return false;
        }

        // if the cell renderer has a refresh method, we call this instead of doing a refresh
        const params = this.createCellRendererParams();

        // take any custom params off of the user
        const finalParams = this.beans.userComponentFactory.createFinalParams(this.getComponentHolder(), this.cellRendererType, params);

        const result: boolean | void = this.cellRenderer.refresh(finalParams);

        // NOTE on undefined: previous version of the cellRenderer.refresh() interface
        // returned nothing, if the method existed, we assumed it refreshed. so for
        // backwards compatibility, we assume if method exists and returns nothing,
        // that it was successful.
        return result === true || result === undefined;
    }

    private refreshToolTip() {
        const newTooltip = this.getToolTip();

        if (this.tooltip === newTooltip) { return; }

        this.createTooltipFeatureIfNeeded();

        const hasNewTooltip = exists(newTooltip);

        if (hasNewTooltip && this.tooltip === newTooltip!.toString()) { return; }

        this.tooltip = newTooltip;

        if (this.beans.gridOptionsWrapper.isEnableBrowserTooltips()) {
            if (hasNewTooltip) {
                this.eCellValue.setAttribute('title', this.tooltip);
            } else {
                this.eCellValue.removeAttribute('title');
            }
        }
    }

    private valuesAreEqual(val1: any, val2: any): boolean {
        // if the user provided an equals method, use that, otherwise do simple comparison
        const colDef = this.getComponentHolder();
        const equalsMethod = colDef ? colDef.equals : null;

        return equalsMethod ? equalsMethod(val1, val2) : val1 === val2;
    }

    private getToolTip(): string | null {
        const colDef = this.getComponentHolder();
        const data = this.rowNode.data;

        if (colDef.tooltipField && exists(data)) {
            return getValueUsingField(data, colDef.tooltipField, this.column.isTooltipFieldContainsDots());
        }

        const valueGetter = colDef.tooltipValueGetter;

        if (valueGetter) {
            return valueGetter({
                api: this.beans.gridOptionsWrapper.getApi(),
                columnApi: this.beans.gridOptionsWrapper.getColumnApi(),
                context: this.beans.gridOptionsWrapper.getContext(),
                ...this.getTooltipParams(),
                value: this.value
            });
        }

        return null;
    }

    public getTooltipParams(): ITooltipParams {
        return {
            location: 'cell',
            colDef: this.getComponentHolder(),
            column: this.getColumn(),
            rowIndex: this.cellPosition.rowIndex,
            node: this.rowNode,
            data: this.rowNode.data,
            value: this.getTooltipText(),
            valueFormatted: this.valueFormatted,
        };
    }

    private getTooltipText(escape: boolean = true) {
        return escape ? escapeString(this.tooltip) : this.tooltip;
    }

    private processCellClassRules(onApplicableClass: (className: string) => void, onNotApplicableClass?: (className: string) => void): void {
        const colDef = this.getComponentHolder();
        const cellClassParams: CellClassParams = {
            value: this.value,
            data: this.rowNode.data,
            node: this.rowNode,
            colDef: colDef,
            rowIndex: this.cellPosition.rowIndex,
            api: this.beans.gridOptionsWrapper.getApi()!,
            columnApi: this.beans.gridOptionsWrapper.getColumnApi()!,
            $scope: this.scope,
            context: this.beans.gridOptionsWrapper.getContext()
        };

        this.beans.stylingService.processClassRules(
            colDef.cellClassRules,
            cellClassParams,
            onApplicableClass,
            onNotApplicableClass
        );
    }

    private postProcessCellClassRules(): void {
        this.processCellClassRules(
            className => this.addCssClass(className),
            className => this.removeCssClass(className)
        );
    }

    private preProcessCellClassRules(): string[] {
        const res: string[] = [];

        this.processCellClassRules(
            className => res.push(className),
            _ => {
                // not catered for, if creating, no need
                // to remove class as it was never there
            }
        );

        return res;
    }

    // a wrapper is used when we are putting a selection checkbox in the cell with the value
    public setUsingWrapper(): void {
        const colDef = this.getComponentHolder();

        // never allow selection or dragging on pinned rows
        if (this.rowNode.rowPinned) {
            this.usingWrapper = false;
            this.includeSelectionComponent = false;
            this.includeRowDraggingComponent = false;
            this.includeDndSourceComponent = false;
            return;
        }

        const cbSelectionIsFunc = typeof colDef.checkboxSelection === 'function';
        const rowDraggableIsFunc = typeof colDef.rowDrag === 'function';
        const dndSourceIsFunc = typeof colDef.dndSource === 'function';

        this.includeSelectionComponent = cbSelectionIsFunc || colDef.checkboxSelection === true;
        this.includeRowDraggingComponent = rowDraggableIsFunc || colDef.rowDrag === true;
        this.includeDndSourceComponent = dndSourceIsFunc || colDef.dndSource === true;

        const enableTextSelection = this.beans.gridOptionsWrapper.isEnableCellTextSelection();

        this.usingWrapper = enableTextSelection || this.includeRowDraggingComponent || this.includeSelectionComponent || this.includeDndSourceComponent;
    }

    private chooseCellRenderer(): void {
        // template gets preference, then cellRenderer, then do it ourselves
        const colDef = this.getComponentHolder();

        // templates are for ng1, ideally we wouldn't have these, they are ng1 support
        // inside the core which is bad
        if (colDef.template || colDef.templateUrl) {
            this.usingCellRenderer = false;
            return;
        }

        const params = this.createCellRendererParams();

        if (this.rowNode.rowPinned &&
            this.beans.userComponentFactory.lookupComponentClassDef(colDef, 'pinnedRowCellRenderer', params)) {
            this.cellRendererType = CellComp.CELL_RENDERER_TYPE_PINNED;
            this.usingCellRenderer = true;
        } else if (this.beans.userComponentFactory.lookupComponentClassDef(colDef, 'cellRenderer', params)) {
            this.cellRendererType = CellComp.CELL_RENDERER_TYPE_NORMAL;
            this.usingCellRenderer = true;
        } else {
            this.usingCellRenderer = false;
        }
    }

    private createCellRendererInstance(useTaskService = false): void {
        if (!this.usingCellRenderer) { return; }

        // never use task service if angularCompileRows=true, as that assume the cell renderers
        // are finished when the row is created. also we never use it if animation frame service
        // is turned off.
        // and lastly we never use it if doing auto-height, as the auto-height service checks the
        // row height directly after the cell is created, it doesn't wait around for the tasks to complete
        const angularCompileRows = this.beans.gridOptionsWrapper.isAngularCompileRows();
        const suppressAnimationFrame = this.beans.gridOptionsWrapper.isSuppressAnimationFrame();

        if (angularCompileRows || suppressAnimationFrame || this.autoHeightCell) { useTaskService = false; }

        const params = this.createCellRendererParams();

        this.cellRendererVersion++;

        const callback = this.afterCellRendererCreated.bind(this, this.cellRendererVersion);
        const cellRendererTypeNormal = this.cellRendererType === CellComp.CELL_RENDERER_TYPE_NORMAL;

        this.createCellRendererFunc = () => {
            this.createCellRendererFunc = null;
            // this can return null in the event that the user has switched from a renderer component to nothing, for example
            // when using a cellRendererSelect to return a component or null depending on row data etc
            const componentPromise = this.beans.userComponentFactory.newCellRenderer(
                this.getComponentHolder(), params, !cellRendererTypeNormal);

            if (componentPromise) {
                componentPromise.then(callback);
            }
        };

        if (useTaskService) {
            this.beans.taskQueue.createTask(this.createCellRendererFunc, this.rowNode.rowIndex!, 'createTasksP2');
        } else {
            this.createCellRendererFunc();
        }
    }

    private afterCellRendererCreated(cellRendererVersion: number, cellRenderer: ICellRendererComp): void {
        const cellRendererNotRequired = !this.isAlive() || cellRendererVersion !== this.cellRendererVersion;

        if (cellRendererNotRequired) {
            this.beans.context.destroyBean(cellRenderer);
            return;
        }

        this.cellRenderer = cellRenderer;
        this.cellRendererGui = this.cellRenderer.getGui();

        if (missing(this.cellRendererGui)) {
            return;
        }

        // if async components, then it's possible the user started editing since this call was made
        if (!this.editingCell) {
            this.eCellValue.appendChild(this.cellRendererGui);
        }
    }

    private createCellRendererParams(): ICellRendererParams {
        return {
            value: this.value,
            valueFormatted: this.valueFormatted,
            getValue: this.getValue.bind(this),
            setValue: value => this.beans.valueService.setValue(this.rowNode, this.column, value),
            formatValue: this.formatValue.bind(this),
            data: this.rowNode.data,
            node: this.rowNode,
            colDef: this.getComponentHolder(),
            column: this.column,
            $scope: this.scope,
            rowIndex: this.cellPosition.rowIndex,
            api: this.beans.gridOptionsWrapper.getApi(),
            columnApi: this.beans.gridOptionsWrapper.getColumnApi(),
            context: this.beans.gridOptionsWrapper.getContext(),
            refreshCell: this.refreshCell.bind(this),

            eGridCell: this.getGui(),
            eParentOfValue: this.eCellValue,

            registerRowDragger: (rowDraggerElement, dragStartPixels) => this.addRowDragging(rowDraggerElement, dragStartPixels),

            // these bits are not documented anywhere, so we could drop them?
            // it was in the olden days to allow user to register for when rendered
            // row was removed (the row comp was removed), however now that the user
            // can provide components for cells, the destroy method gets call when this
            // happens so no longer need to fire event.
            addRowCompListener: this.rowComp ? this.rowComp.addEventListener.bind(this.rowComp) : null,
            addRenderedRowListener: (eventType: string, listener: Function) => {
                console.warn('AG Grid: since AG Grid .v11, params.addRenderedRowListener() is now params.addRowCompListener()');
                if (this.rowComp) {
                    this.rowComp.addEventListener(eventType, listener);
                }
            }
        } as ICellRendererParams;
    }

    private formatValue(value: any): any {
        const valueFormatted = this.beans.valueFormatterService.formatValue(this.column, this.rowNode, this.scope, value);

        return valueFormatted != null ? valueFormatted : value;
    }

    private getValueToUse(): any {
        return this.valueFormatted != null ? this.valueFormatted : this.value;
    }

    private getValueAndFormat(): void {
        this.value = this.getValue();
        this.valueFormatted = this.beans.valueFormatterService.formatValue(this.column, this.rowNode, this.scope, this.value);
    }

    private getValue(): any {
        // if we don't check this, then the grid will render leaf groups as open even if we are not
        // allowing the user to open leaf groups. confused? remember for pivot mode we don't allow
        // opening leaf groups, so we have to force leafGroups to be closed in case the user expanded
        // them via the API, or user user expanded them in the UI before turning on pivot mode
        const lockedClosedGroup = this.rowNode.leafGroup && this.beans.columnModel.isPivotMode();

        const isOpenGroup = this.rowNode.group && this.rowNode.expanded && !this.rowNode.footer && !lockedClosedGroup;

        // are we showing group footers
        const groupFootersEnabled = this.beans.gridOptionsWrapper.isGroupIncludeFooter();

        // if doing footers, we normally don't show agg data at group level when group is open
        const groupAlwaysShowAggData = this.beans.gridOptionsWrapper.isGroupSuppressBlankHeader();

        // if doing grouping and footers, we don't want to include the agg value
        // in the header when the group is open
        const ignoreAggData = (isOpenGroup && groupFootersEnabled) && !groupAlwaysShowAggData;

        const value = this.beans.valueService.getValue(this.column, this.rowNode, false, ignoreAggData);

        return value;
    }

    public onMouseEvent(eventName: string, mouseEvent: MouseEvent): void {
        if (isStopPropagationForAgGrid(mouseEvent)) { return; }

        switch (eventName) {
            case 'click':
                this.onCellClicked(mouseEvent);
                break;
            case 'mousedown':
                this.onMouseDown(mouseEvent);
                break;
            case 'dblclick':
                this.onCellDoubleClicked(mouseEvent);
                break;
            case 'mouseout':
                this.onMouseOut(mouseEvent);
                break;
            case 'mouseover':
                this.onMouseOver(mouseEvent);
                break;
        }
    }

    public dispatchCellContextMenuEvent(event: Event | null) {
        const colDef = this.getComponentHolder();
        const cellContextMenuEvent: CellContextMenuEvent = this.createEvent(event, Events.EVENT_CELL_CONTEXT_MENU);
        this.beans.eventService.dispatchEvent(cellContextMenuEvent);

        if (colDef.onCellContextMenu) {
            // to make the callback async, do in a timeout
            window.setTimeout(() => (colDef.onCellContextMenu as any)(cellContextMenuEvent), 0);
        }
    }

    public createEvent(domEvent: Event | null, eventType: string): CellEvent {
        const event: CellEvent = {
            type: eventType,
            node: this.rowNode,
            data: this.rowNode.data,
            value: this.value,
            column: this.column,
            colDef: this.getComponentHolder(),
            context: this.beans.gridOptionsWrapper.getContext(),
            api: this.beans.gridApi,
            columnApi: this.beans.columnApi,
            rowPinned: this.rowNode.rowPinned,
            event: domEvent,
            rowIndex: this.rowNode.rowIndex!
        };

        // because we are hacking in $scope for angular 1, we have to de-reference
        if (this.scope) {
            (event as any).$scope = this.scope;
        }

        return event;
    }

    private onMouseOut(mouseEvent: MouseEvent): void {
        const cellMouseOutEvent: CellMouseOutEvent = this.createEvent(mouseEvent, Events.EVENT_CELL_MOUSE_OUT);
        this.beans.eventService.dispatchEvent(cellMouseOutEvent);
        this.beans.columnHoverService.clearMouseOver();
    }

    private onMouseOver(mouseEvent: MouseEvent): void {
        const cellMouseOverEvent: CellMouseOverEvent = this.createEvent(mouseEvent, Events.EVENT_CELL_MOUSE_OVER);
        this.beans.eventService.dispatchEvent(cellMouseOverEvent);
        this.beans.columnHoverService.setMouseOver([this.column]);
    }

    private onCellDoubleClicked(mouseEvent: MouseEvent) {
        const colDef = this.getComponentHolder();
        // always dispatch event to eventService
        const cellDoubleClickedEvent: CellDoubleClickedEvent = this.createEvent(mouseEvent, Events.EVENT_CELL_DOUBLE_CLICKED);
        this.beans.eventService.dispatchEvent(cellDoubleClickedEvent);

        // check if colDef also wants to handle event
        if (typeof colDef.onCellDoubleClicked === 'function') {
            // to make the callback async, do in a timeout
            window.setTimeout(() => (colDef.onCellDoubleClicked as any)(cellDoubleClickedEvent), 0);
        }

        const editOnDoubleClick = !this.beans.gridOptionsWrapper.isSingleClickEdit()
            && !this.beans.gridOptionsWrapper.isSuppressClickEdit();
        if (editOnDoubleClick) {
            this.startRowOrCellEdit();
        }
    }

    // called by rowRenderer when user navigates via tab key
    public startRowOrCellEdit(keyPress?: number | null, charPress?: string | null): void {
        if (this.beans.gridOptionsWrapper.isFullRowEdit()) {
            this.rowComp!.startRowEditing(keyPress, charPress, this);
        } else {
            this.startEditingIfEnabled(keyPress, charPress, true);
        }
    }

    public isCellEditable() {
        return this.column.isCellEditable(this.rowNode);
    }

    // either called internally if single cell editing, or called by rowRenderer if row editing
    public startEditingIfEnabled(keyPress: number | null = null, charPress: string | null = null, cellStartedEdit = false): void {
        // don't do it if not editable
        if (!this.isCellEditable()) { return; }

        // don't do it if already editing
        if (this.editingCell) { return; }

        this.editingCell = true;

        this.cellEditorVersion++;
        const callback = this.afterCellEditorCreated.bind(this, this.cellEditorVersion);

        const params = this.createCellEditorParams(keyPress, charPress, cellStartedEdit);
        this.createCellEditor(params).then(callback);

        // if we don't do this, and editor component is async, then there will be a period
        // when the component isn't present and keyboard navigation won't work - so example
        // of user hitting tab quickly (more quickly than renderers getting created) won't work
        const cellEditorAsync = missing(this.cellEditor);

        if (cellEditorAsync && cellStartedEdit) {
            this.focusCell(true);
        }
    }

    private createCellEditor(params: ICellEditorParams): AgPromise<ICellEditorComp> {
        const cellEditorPromise = this.beans.userComponentFactory.newCellEditor(this.column.getColDef(), params);

        return cellEditorPromise!.then(cellEditor => {
            const cellEditorComp = cellEditor!;
            const isPopup = cellEditorComp.isPopup && cellEditorComp.isPopup();

            if (!isPopup) { return cellEditorComp; }

            if (this.beans.gridOptionsWrapper.isFullRowEdit()) {
                console.warn('AG Grid: popup cellEditor does not work with fullRowEdit - you cannot use them both ' +
                    '- either turn off fullRowEdit, or stop using popup editors.');
            }

            // if a popup, then we wrap in a popup editor and return the popup
            const popupEditorWrapper = new PopupEditorWrapper(cellEditorComp);
            this.beans.context.createBean(popupEditorWrapper);
            popupEditorWrapper.init(params);

            return popupEditorWrapper;
        });
    }

    private afterCellEditorCreated(cellEditorVersion: number, cellEditor: ICellEditorComp): void {

        // if editingCell=false, means user cancelled the editor before component was ready.
        // if versionMismatch, then user cancelled the edit, then started the edit again, and this
        //   is the first editor which is now stale.
        const versionMismatch = cellEditorVersion !== this.cellEditorVersion;

        const cellEditorNotNeeded = versionMismatch || !this.editingCell;
        if (cellEditorNotNeeded) {
            this.beans.context.destroyBean(cellEditor);
            return;
        }

        const editingCancelledByUserComp = cellEditor.isCancelBeforeStart && cellEditor.isCancelBeforeStart();
        if (editingCancelledByUserComp) {
            this.beans.context.destroyBean(cellEditor);
            this.editingCell = false;
            return;
        }

        if (!cellEditor.getGui) {
            console.warn(`AG Grid: cellEditor for column ${this.column.getId()} is missing getGui() method`);

            // no getGui, for React guys, see if they attached a react component directly
            if ((cellEditor as any).render) {
                console.warn(`AG Grid: we found 'render' on the component, are you trying to set a React renderer but added it as colDef.cellEditor instead of colDef.cellEditorFmk?`);
            }

            this.beans.context.destroyBean(cellEditor);
            this.editingCell = false;

            return;
        }

        this.cellEditor = cellEditor;

        this.cellEditorInPopup = cellEditor.isPopup !== undefined && cellEditor.isPopup();
        this.setInlineEditingClass();

        if (this.cellEditorInPopup) {
            this.addPopupCellEditor();
        } else {
            this.addInCellEditor();
        }

        if (cellEditor.afterGuiAttached) {
            cellEditor.afterGuiAttached();
        }

        const event: CellEditingStartedEvent = this.createEvent(null, Events.EVENT_CELL_EDITING_STARTED);
        this.beans.eventService.dispatchEvent(event);
    }

    private addInCellEditor(): void {
        const eGui = this.getGui();

        // if focus is inside the cell, we move focus to the cell itself
        // before removing it's contents, otherwise errors could be thrown.
        if (eGui.contains(document.activeElement)) {
            eGui.focus();
        }

        this.clearCellElement();

        if (this.cellEditor) {
            eGui.appendChild(this.cellEditor.getGui());
        }

        this.angular1Compile();
    }

    private addPopupCellEditor(): void {
        const ePopupGui = this.cellEditor && this.cellEditor.getGui();

        if (!ePopupGui) { return; }

        const popupService = this.beans.popupService;

        const useModelPopup = this.beans.gridOptionsWrapper.isStopEditingWhenCellsLoseFocus();

        const position = this.cellEditor && this.cellEditor.getPopupPosition ? this.cellEditor.getPopupPosition() : 'over';

        const params = {
            column: this.column,
            rowNode: this.rowNode,
            type: 'popupCellEditor',
            eventSource: this.getGui(),
            ePopup: ePopupGui,
            keepWithinBounds: true
        };

        const positionCallback = position === 'under' ?
            popupService.positionPopupUnderComponent.bind(popupService, params)
            : popupService.positionPopupOverComponent.bind(popupService, params);

        const addPopupRes = popupService.addPopup({
            modal: useModelPopup,
            eChild: ePopupGui,
            closeOnEsc: true,
            closedCallback: () => { this.onPopupEditorClosed(); },
            anchorToElement: this.getGui(),
            positionCallback
        });
        if (addPopupRes) {
            this.hideEditorPopup = addPopupRes.hideFunc;
        }

        this.angular1Compile();
    }

    private onPopupEditorClosed(): void {
        // we only call stopEditing if we are editing, as
        // it's possible the popup called 'stop editing'
        // before this, eg if 'enter key' was pressed on
        // the editor.

        if (!this.editingCell) { return; }
        // note: this only happens when use clicks outside of the grid. if use clicks on another
        // cell, then the editing will have already stopped on this cell
        this.stopRowOrCellEdit();
    }

    // if we are editing inline, then we don't have the padding in the cell (set in the themes)
    // to allow the text editor full access to the entire cell
    private setInlineEditingClass(): void {
        if (!this.isAlive()) { return; }

        // ag-cell-inline-editing - appears when user is inline editing
        // ag-cell-not-inline-editing - appears when user is no inline editing
        // ag-cell-popup-editing - appears when user is editing cell in popup (appears on the cell, not on the popup)

        // note: one of {ag-cell-inline-editing, ag-cell-not-inline-editing} is always present, they toggle.
        //       however {ag-cell-popup-editing} shows when popup, so you have both {ag-cell-popup-editing}
        //       and {ag-cell-not-inline-editing} showing at the same time.

        const editingInline = this.editingCell && !this.cellEditorInPopup;
        const popupEditorShowing = this.editingCell && this.cellEditorInPopup;

        this.addOrRemoveCssClass(CSS_INLINE_EDITING, editingInline);
        this.addOrRemoveCssClass(CSS_NOT_INLINE_EDITING, !editingInline);
        this.addOrRemoveCssClass(CSS_POPUP_EDITING, popupEditorShowing);
        addOrRemoveCssClass(this.getGui().parentNode as HTMLElement, "ag-row-inline-editing", editingInline);
        addOrRemoveCssClass(this.getGui().parentNode as HTMLElement, "ag-row-not-inline-editing", !editingInline);
    }

    private createCellEditorParams(keyPress: number | null, charPress: string | null, cellStartedEdit: boolean): ICellEditorParams {
        return {
            value: this.getValue(),
            keyPress: keyPress,
            charPress: charPress,
            column: this.column,
            colDef: this.column.getColDef(),
            rowIndex: this.cellPosition.rowIndex,
            node: this.rowNode,
            data: this.rowNode.data,
            api: this.beans.gridOptionsWrapper.getApi(),
            cellStartedEdit: cellStartedEdit,
            columnApi: this.beans.gridOptionsWrapper.getColumnApi(),
            context: this.beans.gridOptionsWrapper.getContext(),
            $scope: this.scope,
            onKeyDown: this.onKeyDown.bind(this),
            stopEditing: this.stopEditingAndFocus.bind(this),
            eGridCell: this.getGui(),
            parseValue: this.parseValue.bind(this),
            formatValue: this.formatValue.bind(this)
        };
    }

    // cell editors call this, when they want to stop for reasons other
    // than what we pick up on. eg selecting from a dropdown ends editing.
    private stopEditingAndFocus(suppressNavigateAfterEdit = false): void {
        this.stopRowOrCellEdit();
        this.focusCell(true);

        if (!suppressNavigateAfterEdit) {
            this.navigateAfterEdit();
        }
    }

    private parseValue(newValue: any): any {
        const colDef = this.getComponentHolder();
        const params: NewValueParams = {
            node: this.rowNode,
            data: this.rowNode.data,
            oldValue: this.value,
            newValue: newValue,
            colDef: colDef,
            column: this.column,
            api: this.beans.gridOptionsWrapper.getApi(),
            columnApi: this.beans.gridOptionsWrapper.getColumnApi(),
            context: this.beans.gridOptionsWrapper.getContext()
        };

        const valueParser = colDef.valueParser;

        return exists(valueParser) ? this.beans.expressionService.evaluate(valueParser, params) : newValue;
    }

    public focusCell(forceBrowserFocus = false): void {
        this.beans.focusService.setFocusedCell(this.cellPosition.rowIndex, this.column, this.rowNode.rowPinned, forceBrowserFocus);
    }

    public setFocusInOnEditor(): void {
        if (this.editingCell) {
            if (this.cellEditor && this.cellEditor.focusIn) {
                // if the editor is present, then we just focus it
                this.cellEditor.focusIn();
            } else {
                // if the editor is not present, it means async cell editor (eg React fibre)
                // and we are trying to set focus before the cell editor is present, so we
                // focus the cell instead
                this.focusCell(true);
            }
        }
    }

    public isEditing(): boolean {
        return this.editingCell;
    }

    public onKeyDown(event: KeyboardEvent): void {
        const key = event.which || event.keyCode;

        switch (key) {
            case KeyCode.ENTER:
                this.onEnterKeyDown(event);
                break;
            case KeyCode.F2:
                this.onF2KeyDown();
                break;
            case KeyCode.ESCAPE:
                this.onEscapeKeyDown();
                break;
            case KeyCode.TAB:
                this.onTabKeyDown(event);
                break;
            case KeyCode.BACKSPACE:
            case KeyCode.DELETE:
                this.onBackspaceOrDeleteKeyPressed(key);
                break;
            case KeyCode.DOWN:
            case KeyCode.UP:
            case KeyCode.RIGHT:
            case KeyCode.LEFT:
                this.onNavigationKeyPressed(event, key);
                break;
        }
    }

    public setFocusOutOnEditor(): void {
        if (this.editingCell && this.cellEditor && this.cellEditor.focusOut) {
            this.cellEditor.focusOut();
        }
    }

    private onNavigationKeyPressed(event: KeyboardEvent, key: number): void {
        if (this.editingCell) { return; }

        if (event.shiftKey && this.rangeSelectionEnabled) {
            this.onShiftRangeSelect(key);
        } else {
            this.beans.rowRenderer.navigateToNextCell(event, key, this.cellPosition, true);
        }

        // if we don't prevent default, the grid will scroll with the navigation keys
        event.preventDefault();
    }

    private onShiftRangeSelect(key: number): void {
        if (!this.beans.rangeService) { return; }

        const endCell = this.beans.rangeService.extendLatestRangeInDirection(key);

        if (endCell) {
            this.beans.rowRenderer.ensureCellVisible(endCell);
        }
    }

    private onTabKeyDown(event: KeyboardEvent): void {
        this.beans.rowRenderer.onTabKeyDown(this, event);
    }

    private onBackspaceOrDeleteKeyPressed(key: number): void {
        if (!this.editingCell) {
            this.startRowOrCellEdit(key);
        }
    }

    private onEnterKeyDown(e: KeyboardEvent): void {
        if (this.editingCell || this.rowComp!.isEditing()) {
            this.stopEditingAndFocus();
        } else {
            if (this.beans.gridOptionsWrapper.isEnterMovesDown()) {
                this.beans.rowRenderer.navigateToNextCell(null, KeyCode.DOWN, this.cellPosition, false);
            } else {
                this.startRowOrCellEdit(KeyCode.ENTER);
                if (this.editingCell) {
                    // if we started editing, then we need to prevent default, otherwise the Enter action can get
                    // applied to the cell editor. this happened, for example, with largeTextCellEditor where not
                    // preventing default results in a 'new line' character getting inserted in the text area
                    // when the editing was started
                    e.preventDefault();
                }
            }
        }
    }

    private navigateAfterEdit(): void {
        const fullRowEdit = this.beans.gridOptionsWrapper.isFullRowEdit();

        if (fullRowEdit) { return; }

        const enterMovesDownAfterEdit = this.beans.gridOptionsWrapper.isEnterMovesDownAfterEdit();

        if (enterMovesDownAfterEdit) {
            this.beans.rowRenderer.navigateToNextCell(null, KeyCode.DOWN, this.cellPosition, false);
        }
    }

    private onF2KeyDown(): void {
        if (!this.editingCell) {
            this.startRowOrCellEdit(KeyCode.F2);
        }
    }

    private onEscapeKeyDown(): void {
        if (this.editingCell) {
            this.stopRowOrCellEdit(true);
            this.focusCell(true);
        }
    }

    public onKeyPress(event: KeyboardEvent): void {
        // check this, in case focus is on a (for example) a text field inside the cell,
        // in which cse we should not be listening for these key pressed
        const eventTarget = getTarget(event);
        const eventOnChildComponent = eventTarget !== this.getGui();

        if (eventOnChildComponent || this.editingCell) { return; }

        const pressedChar = String.fromCharCode(event.charCode);
        if (pressedChar === ' ') {
            this.onSpaceKeyPressed(event);
        } else if (isEventFromPrintableCharacter(event)) {
            this.startRowOrCellEdit(null, pressedChar);
            // if we don't prevent default, then the keypress also gets applied to the text field
            // (at least when doing the default editor), but we need to allow the editor to decide
            // what it wants to do. we only do this IF editing was started - otherwise it messes
            // up when the use is not doing editing, but using rendering with text fields in cellRenderer
            // (as it would block the the user from typing into text fields).
            event.preventDefault();
        }
    }

    private onSpaceKeyPressed(event: KeyboardEvent): void {
        const { gridOptionsWrapper } = this.beans;

        if (!this.editingCell && gridOptionsWrapper.isRowSelection()) {
            const currentSelection = this.rowNode.isSelected();
            const newSelection = !currentSelection;
            if (newSelection || !gridOptionsWrapper.isSuppressRowDeselection()) {
                const groupSelectsFiltered = this.beans.gridOptionsWrapper.isGroupSelectsFiltered();
                const updatedCount = this.rowNode.setSelectedParams({
                    newValue: newSelection,
                    rangeSelect: event.shiftKey,
                    groupSelectsFiltered: groupSelectsFiltered
                });
                if (currentSelection === undefined && updatedCount === 0) {
                    this.rowNode.setSelectedParams({
                        newValue: false,
                        rangeSelect: event.shiftKey,
                        groupSelectsFiltered: groupSelectsFiltered
                    });
                }
            }
        }

        // prevent default as space key, by default, moves browser scroll down
        event.preventDefault();
    }

    private onMouseDown(mouseEvent: MouseEvent): void {
        const { ctrlKey, metaKey, shiftKey } = mouseEvent;
        const target = mouseEvent.target as HTMLElement;
        const { eventService, rangeService } = this.beans;

        // do not change the range for right-clicks inside an existing range
        if (this.isRightClickInExistingRange(mouseEvent)) {
            return;
        }

        if (!shiftKey || (rangeService && !rangeService.getCellRanges().length)) {
            // We only need to pass true to focusCell when the browser is IE/Edge and we are trying
            // to focus the cell itself. This should never be true if the mousedown was triggered
            // due to a click on a cell editor for example.
            const forceBrowserFocus = (isBrowserIE() || isBrowserEdge()) && !this.editingCell && !isFocusableFormField(target);

            this.focusCell(forceBrowserFocus);
        } else if (rangeService) {
            // if a range is being changed, we need to make sure the focused cell does not change.
            mouseEvent.preventDefault();
        }

        // if we are clicking on a checkbox, we need to make sure the cell wrapping that checkbox
        // is focused but we don't want to change the range selection, so return here.
        if (this.containsWidget(target)) { return; }

        if (rangeService) {
            const thisCell = this.cellPosition;

            if (shiftKey) {
                rangeService.extendLatestRangeToCell(thisCell);
            } else {
                const ctrlKeyPressed = ctrlKey || metaKey;
                rangeService.setRangeToCell(thisCell, ctrlKeyPressed);
            }
        }

        eventService.dispatchEvent(this.createEvent(mouseEvent, Events.EVENT_CELL_MOUSE_DOWN));
    }

    private isRightClickInExistingRange(mouseEvent: MouseEvent): boolean {
        const { rangeService } = this.beans;

        if (rangeService) {
            const cellInRange = rangeService.isCellInAnyRange(this.getCellPosition());

            if (cellInRange && mouseEvent.button === 2) {
                return true;
            }
        }

        return false;
    }

    private containsWidget(target: HTMLElement): boolean {
        return isElementChildOfClass(target, 'ag-selection-checkbox', 3);
    }

    // returns true if on iPad and this is second 'click' event in 200ms
    private isDoubleClickOnIPad(): boolean {
        if (!isIOSUserAgent() || isEventSupported('dblclick')) { return false; }

        const nowMillis = new Date().getTime();
        const res = nowMillis - this.lastIPadMouseClickEvent < 200;
        this.lastIPadMouseClickEvent = nowMillis;

        return res;
    }

    private onCellClicked(mouseEvent: MouseEvent): void {
        // iPad doesn't have double click - so we need to mimic it to enable editing for iPad.
        if (this.isDoubleClickOnIPad()) {
            this.onCellDoubleClicked(mouseEvent);
            mouseEvent.preventDefault(); // if we don't do this, then iPad zooms in

            return;
        }

        const { eventService, gridOptionsWrapper } = this.beans;

        const cellClickedEvent: CellClickedEvent = this.createEvent(mouseEvent, Events.EVENT_CELL_CLICKED);
        eventService.dispatchEvent(cellClickedEvent);

        const colDef = this.getComponentHolder();

        if (colDef.onCellClicked) {
            // to make callback async, do in a timeout
            window.setTimeout(() => colDef.onCellClicked!(cellClickedEvent), 0);
        }

        const editOnSingleClick = (gridOptionsWrapper.isSingleClickEdit() || colDef.singleClickEdit)
            && !gridOptionsWrapper.isSuppressClickEdit();

        if (editOnSingleClick) {
            this.startRowOrCellEdit();
        }
    }

    private createGridCellVo(): void {
        this.cellPosition = {
            rowIndex: this.rowNode.rowIndex!,
            rowPinned: this.rowNode.rowPinned,
            column: this.column
        };
    }

    public getRowPosition(): RowPosition {
        return {
            rowIndex: this.cellPosition.rowIndex,
            rowPinned: this.cellPosition.rowPinned
        };
    }

    public getCellPosition(): CellPosition {
        return this.cellPosition;
    }

    public getParentRow(): HTMLElement {
        return this.eRow;
    }

    public setParentRow(eParentRow: HTMLElement): void {
        this.eRow = eParentRow;
    }

    public getColumn(): Column {
        return this.column;
    }

    public getComponentHolder(): ColDef {
        return this.column.getColDef();
    }

    public detach(): void {
        this.eRow.removeChild(this.getGui());
    }

    // if the row is also getting destroyed, then we don't need to remove from dom,
    // as the row will also get removed, so no need to take out the cells from the row
    // if the row is going (removing is an expensive operation, so only need to remove
    // the top part)
    //
    // note - this is NOT called by context, as we don't wire / unwire the CellComp for performance reasons.
    public destroy(): void {
        if (this.createCellRendererFunc) {
            this.beans.taskQueue.cancelTask(this.createCellRendererFunc);
        }

        this.stopEditing();
        this.cellRenderer = this.beans.context.destroyBean(this.cellRenderer);
        this.beans.context.destroyBean(this.selectionHandle);

        super.destroy();
    }

    public onLeftChanged(): void {
        const left = this.modifyLeftForPrintLayout(this.getCellLeft());
        this.getGui().style.left = left + 'px';
        this.refreshAriaIndex();
    }

    private modifyLeftForPrintLayout(leftPosition: number | null): number | null {
        if (!this.printLayout || this.column.getPinned() === Constants.PINNED_LEFT) {
            return leftPosition;
        }

        const leftWidth = this.beans.columnModel.getDisplayedColumnsLeftWidth();

        if (this.column.getPinned() === Constants.PINNED_RIGHT) {
            const bodyWidth = this.beans.columnModel.getBodyContainerWidth();
            return leftWidth + bodyWidth + (leftPosition || 0);
        }

        // is in body
        return leftWidth + (leftPosition || 0);
    }

    public onWidthChanged(): void {
        const width = this.getCellWidth();
        this.getGui().style.width = `${width}px`;
    }

    private getRangeBorders(): {
        top: boolean,
        right: boolean,
        bottom: boolean,
        left: boolean;
    } {
        const isRtl = this.beans.gridOptionsWrapper.isEnableRtl();

        let top = false;
        let right = false;
        let bottom = false;
        let left = false;

        const thisCol = this.cellPosition.column;
        const { rangeService, columnModel } = this.beans;

        let leftCol: Column | null;
        let rightCol: Column | null;

        if (isRtl) {
            leftCol = columnModel.getDisplayedColAfter(thisCol);
            rightCol = columnModel.getDisplayedColBefore(thisCol);
        } else {
            leftCol = columnModel.getDisplayedColBefore(thisCol);
            rightCol = columnModel.getDisplayedColAfter(thisCol);
        }

        const ranges = rangeService.getCellRanges().filter(
            range => rangeService.isCellInSpecificRange(this.cellPosition, range)
        );

        // this means we are the first column in the grid
        if (!leftCol) {
            left = true;
        }

        // this means we are the last column in the grid
        if (!rightCol) {
            right = true;
        }

        for (let i = 0; i < ranges.length; i++) {
            if (top && right && bottom && left) { break; }

            const range = ranges[i];
            const startRow = rangeService.getRangeStartRow(range);
            const endRow = rangeService.getRangeEndRow(range);

            if (!top && this.beans.rowPositionUtils.sameRow(startRow, this.cellPosition)) {
                top = true;
            }

            if (!bottom && this.beans.rowPositionUtils.sameRow(endRow, this.cellPosition)) {
                bottom = true;
            }

            if (!left && leftCol && range.columns.indexOf(leftCol) < 0) {
                left = true;
            }

            if (!right && rightCol && range.columns.indexOf(rightCol) < 0) {
                right = true;
            }
        }

        return { top, right, bottom, left };
    }

    private getInitialRangeClasses(): string[] {
        const classes: string[] = [];

        if (!this.rangeSelectionEnabled || !this.rangeCount) {
            return classes;
        }

        classes.push(CSS_RANGE_SELECTED);

        if (this.hasChartRange) {
            classes.push(CSS_RANGE_CHART);
        }

        const count = Math.min(this.rangeCount, 4);

        classes.push(`${CSS_RANGE_SELECTED}-${count}`);

        if (this.isSingleCell()) {
            classes.push(CSS_RANGE_SINGLE_CELL);
        }

        if (this.rangeCount > 0) {
            const borders = this.getRangeBorders();

            if (borders.top) { classes.push(CSS_RANGE_TOP); }
            if (borders.right) { classes.push(CSS_RANGE_RIGHT); }
            if (borders.bottom) { classes.push(CSS_RANGE_BOTTOM); }
            if (borders.left) { classes.push(CSS_RANGE_LEFT); }
        }

        if (!!this.selectionHandle) {
            classes.push(CSS_RANGE_HANDLE);
        }

        return classes;
    }

    public onRowIndexChanged(): void {
        // when index changes, this influences items that need the index, so we update the
        // grid cell so they are working off the new index.
        this.createGridCellVo();
        // when the index of the row changes, ie means the cell may have lost or gained focus
        this.onCellFocused();
        // check range selection
        this.onRangeSelectionChanged();
    }

    public onRangeSelectionChanged(): void {
        const { rangeService } = this.beans;

        if (!rangeService) { return; }

        const { cellPosition, rangeCount } = this;

        const newRangeCount = rangeService.getCellRangeCount(cellPosition);
        const element = this.getGui();

        if (rangeCount !== newRangeCount) {
            this.addOrRemoveCssClass(CSS_RANGE_SELECTED, newRangeCount !== 0);
            this.addOrRemoveCssClass(`${CSS_RANGE_SELECTED}-1`, newRangeCount === 1);
            this.addOrRemoveCssClass(`${CSS_RANGE_SELECTED}-2`, newRangeCount === 2);
            this.addOrRemoveCssClass(`${CSS_RANGE_SELECTED}-3`, newRangeCount === 3);
            this.addOrRemoveCssClass(`${CSS_RANGE_SELECTED}-4`, newRangeCount >= 4);
            this.rangeCount = newRangeCount;
        }

        setAriaSelected(element, this.rangeCount > 0);

        const hasChartRange = this.getHasChartRange();

        if (hasChartRange !== this.hasChartRange) {
            this.hasChartRange = hasChartRange;
            this.addOrRemoveCssClass(CSS_RANGE_CHART, this.hasChartRange);
        }

        this.updateRangeBorders();

        this.addOrRemoveCssClass(CSS_RANGE_SINGLE_CELL, this.isSingleCell());

        this.refreshHandle();
    }

    private getHasChartRange(): boolean {
        const { rangeService } = this.beans;

        if (!this.rangeCount || !rangeService) {
            return false;
        }

        const cellRanges = rangeService.getCellRanges();

        return cellRanges.length > 0 && cellRanges.every(range => includes([CellRangeType.DIMENSION, CellRangeType.VALUE], range.type));
    }

    private shouldHaveSelectionHandle(): boolean {
        const { gridOptionsWrapper, rangeService } = this.beans;
        const cellRanges = rangeService.getCellRanges();
        const rangesLen = cellRanges.length;

        if (this.rangeCount < 1 || rangesLen < 1) {
            return false;
        }

        const cellRange = last(cellRanges);
        const cellPosition = this.getCellPosition();
        let fillHandleIsAvailable = rangesLen === 1 &&
            (gridOptionsWrapper.isEnableFillHandle() || gridOptionsWrapper.isEnableRangeHandle()) &&
            !this.editingCell;

        if (this.hasChartRange) {
            const hasCategoryRange = cellRanges[0].type === CellRangeType.DIMENSION;
            const isCategoryCell = hasCategoryRange && rangeService.isCellInSpecificRange(cellPosition, cellRanges[0]);

            this.addOrRemoveCssClass(CSS_RANGE_CHART_CATEGORY, isCategoryCell);
            fillHandleIsAvailable = cellRange.type === CellRangeType.VALUE;
        }

        return fillHandleIsAvailable &&
            cellRange.endRow != null &&
            rangeService.isContiguousRange(cellRange) &&
            rangeService.isBottomRightCell(cellRange, cellPosition);
    }

    private addSelectionHandle() {
        const { gridOptionsWrapper, rangeService } = this.beans;
        const cellRangeType = last(rangeService.getCellRanges()).type;
        const selectionHandleFill = gridOptionsWrapper.isEnableFillHandle() && missing(cellRangeType);
        const type = selectionHandleFill ? SelectionHandleType.FILL : SelectionHandleType.RANGE;

        if (this.selectionHandle && this.selectionHandle.getType() !== type) {
            this.selectionHandle = this.beans.context.destroyBean(this.selectionHandle);
        }

        if (!this.selectionHandle) {
            this.selectionHandle = this.beans.selectionHandleFactory.createSelectionHandle(type);
        }

        this.selectionHandle.refresh(this);
    }

    public updateRangeBordersIfRangeCount(): void {
        // we only need to update range borders if we are in a range
        if (this.rangeCount > 0) {
            this.updateRangeBorders();
            this.refreshHandle();
        }
    }

    private refreshHandle(): void {
        if (!this.beans.rangeService) { return; }

        const shouldHaveSelectionHandle = this.shouldHaveSelectionHandle();

        if (this.selectionHandle && !shouldHaveSelectionHandle) {
            this.selectionHandle = this.beans.context.destroyBean(this.selectionHandle);
        }

        if (shouldHaveSelectionHandle) {
            this.addSelectionHandle();
        }

        this.addOrRemoveCssClass(CSS_RANGE_HANDLE, !!this.selectionHandle);
    }

    private updateRangeBorders(): void {
        const rangeBorders = this.getRangeBorders();
        const isSingleCell = this.isSingleCell();
        const isTop = !isSingleCell && rangeBorders.top;
        const isRight = !isSingleCell && rangeBorders.right;
        const isBottom = !isSingleCell && rangeBorders.bottom;
        const isLeft = !isSingleCell && rangeBorders.left;

        this.addOrRemoveCssClass(CSS_RANGE_TOP, isTop);
        this.addOrRemoveCssClass(CSS_RANGE_RIGHT, isRight);
        this.addOrRemoveCssClass(CSS_RANGE_BOTTOM, isBottom);
        this.addOrRemoveCssClass(CSS_RANGE_LEFT, isLeft);
    }

    public onFirstRightPinnedChanged(): void {
        const firstRightPinned = this.column.isFirstRightPinned();

        if (this.firstRightPinned !== firstRightPinned) {
            this.firstRightPinned = firstRightPinned;
            this.addOrRemoveCssClass(CSS_FIRST_RIGHT_PINNED, firstRightPinned);
        }
    }

    public onLastLeftPinnedChanged(): void {
        const lastLeftPinned = this.column.isLastLeftPinned();

        if (this.lastLeftPinned !== lastLeftPinned) {
            this.lastLeftPinned = lastLeftPinned;
            this.addOrRemoveCssClass(CSS_LAST_LEFT_PINNED, lastLeftPinned);
        }
    }

    public refreshShouldDestroy(): boolean {
        const isUsingWrapper = this.usingWrapper;
        const isIncludingRowDragging = this.includeRowDraggingComponent;
        const isIncludingDndSource = this.includeDndSourceComponent;
        const isIncludingSelection = this.includeSelectionComponent;

        this.setUsingWrapper();

        return isUsingWrapper !== this.usingWrapper ||
            isIncludingRowDragging !== this.includeRowDraggingComponent ||
            isIncludingDndSource !== this.includeDndSourceComponent ||
            isIncludingSelection !== this.includeSelectionComponent;
    }

    private populateTemplate(): void {
        if (this.usingWrapper) {

            this.eCellValue = this.getRefElement('eCellValue');
            this.eCellWrapper = this.getRefElement('eCellWrapper');
            this.eCellValue.id = `cell-${this.getCompId()}`;
            let describedByIds = '';

            if (this.includeRowDraggingComponent) {
                this.addRowDragging();
            }

            if (this.includeDndSourceComponent) {
                this.addDndSource();
            }

            if (this.includeSelectionComponent) {
                describedByIds += this.addSelectionCheckbox().getCheckboxId();
            }

            setAriaDescribedBy(this.getGui(), `${describedByIds} ${this.eCellValue.id}`.trim());
        } else {
            this.eCellValue = this.getGui();
            this.eCellWrapper = this.eCellValue;
        }
    }

    protected getFrameworkOverrides(): IFrameworkOverrides {
        return this.beans.frameworkOverrides;
    }

    private addRowDragging(customElement?: HTMLElement, dragStartPixels?: number): void {
        const pagination = this.beans.gridOptionsWrapper.isPagination();
        const rowDragManaged = this.beans.gridOptionsWrapper.isRowDragManaged();
        const clientSideRowModelActive = this.beans.gridOptionsWrapper.isRowModelDefault();

        if (rowDragManaged) {
            // row dragging only available in default row model
            if (!clientSideRowModelActive) {
                doOnce(() => console.warn('AG Grid: managed row dragging is only allowed in the Client Side Row Model'),
                    'CellComp.addRowDragging');

                return;
            }

            if (pagination) {
                doOnce(() => console.warn('AG Grid: managed row dragging is not possible when doing pagination'),
                    'CellComp.addRowDragging');

                return;
            }
        }
        if (!this.rowDraggingComp) {
            this.rowDraggingComp = new RowDragComp(() => this.value, this.rowNode, this.column, customElement, dragStartPixels);
            this.createManagedBean(this.rowDraggingComp, this.beans.context);
        } else if (customElement) {
            // if the rowDraggingComp is already present, means we should only set the drag element
            this.rowDraggingComp.setDragElement(customElement, dragStartPixels);
        }

        // If there is a custom element, the Cell Renderer is responsible for displaying it.
        if (!customElement) {
            // put the checkbox in before the value
            this.eCellWrapper.insertBefore(this.rowDraggingComp.getGui(), this.eCellValue);
        }
    }

    private addDndSource(): void {
        const dndSourceComp = new DndSourceComp(this.rowNode, this.column, this.beans, this.getGui());
        this.createManagedBean(dndSourceComp, this.beans.context);

        // put the checkbox in before the value
        this.eCellWrapper.insertBefore(dndSourceComp.getGui(), this.eCellValue);
    }

    private addSelectionCheckbox(): CheckboxSelectionComponent {
        const cbSelectionComponent = new CheckboxSelectionComponent();
        this.beans.context.createBean(cbSelectionComponent);

        let visibleFunc = this.getComponentHolder().checkboxSelection;

        if (typeof visibleFunc !== 'function') {
            visibleFunc = undefined;
        }

        cbSelectionComponent.init({ rowNode: this.rowNode, column: this.column });
        this.addDestroyFunc(() => this.beans.context.destroyBean(cbSelectionComponent));

        // put the checkbox in before the value
        this.eCellWrapper.insertBefore(cbSelectionComponent.getGui(), this.eCellValue);
        return cbSelectionComponent;
    }

    private addDomData(): void {
        const element = this.getGui();
        this.beans.gridOptionsWrapper.setDomData(element, CellComp.DOM_DATA_KEY_CELL_COMP, this);

        this.addDestroyFunc(() => this.beans.gridOptionsWrapper.setDomData(element, CellComp.DOM_DATA_KEY_CELL_COMP, null));
    }

    private isSingleCell(): boolean {
        const { rangeService } = this.beans;

        return this.rangeCount === 1 && rangeService && !rangeService.isMoreThanOneCell();
    }

    public onCellFocused(event?: any): void {
        const cellFocused = this.beans.focusService.isCellFocused(this.cellPosition);

        // see if we need to change the classes on this cell
        if (cellFocused !== this.cellFocused) {
            // if we are not doing cell selection, then the focus class does not change
            const doingFocusCss = !this.beans.gridOptionsWrapper.isSuppressCellSelection();

            if (doingFocusCss) {
                this.addOrRemoveCssClass(CSS_CELL_FOCUS, cellFocused);
            }

            this.cellFocused = cellFocused;
        }

        // see if we need to force browser focus - this can happen if focus is programmatically set
        if (cellFocused && event && event.forceBrowserFocus) {
            const focusEl = this.getFocusableElement();
            focusEl.focus();
            // Fix for AG-3465 "IE11 - After editing cell's content, selection doesn't go one cell below on enter"
            // IE can fail to focus the cell after the first call to focus(), and needs a second call
            if (!document.activeElement || document.activeElement === document.body) {
                focusEl.focus();
            }
        }

        // if another cell was focused, and we are editing, then stop editing
        const fullRowEdit = this.beans.gridOptionsWrapper.isFullRowEdit();

        if (!cellFocused && !fullRowEdit && this.editingCell) {
            this.stopRowOrCellEdit();
        }
    }

    // pass in 'true' to cancel the editing.
    public stopRowOrCellEdit(cancel: boolean = false) {
        if (this.beans.gridOptionsWrapper.isFullRowEdit()) {
            this.rowComp!.stopRowEditing(cancel);
        } else {
            this.stopEditing(cancel);
        }
    }

    public stopEditing(cancel = false): void {
        if (!this.editingCell) { return; }

        // if no cell editor, this means due to async, that the cell editor never got initialised,
        // so we just carry on regardless as if the editing was never started.
        if (!this.cellEditor) {
            this.editingCell = false;
            return;
        }

        const oldValue = this.getValue();
        let newValueExists = false;
        let newValue: any;

        if (!cancel) {
            // also have another option here to cancel after editing, so for example user could have a popup editor and
            // it is closed by user clicking outside the editor. then the editor will close automatically (with false
            // passed above) and we need to see if the editor wants to accept the new value.
            const userWantsToCancel = this.cellEditor.isCancelAfterEnd && this.cellEditor.isCancelAfterEnd();

            if (!userWantsToCancel) {
                newValue = this.cellEditor.getValue();
                newValueExists = true;
            }
        }

        // it is important we set this after setValue() above, as otherwise the cell will flash
        // when editing stops. the 'refresh' method checks editing, and doesn't refresh editing cells.
        // thus it will skip the refresh on this cell until the end of this method where we call
        // refresh directly and we suppress the flash.
        this.editingCell = false;

        // important to clear this out - as parts of the code will check for
        // this to see if an async cellEditor has yet to be created
        this.beans.context.destroyBean(this.cellEditor);
        this.cellEditor = null;

        if (this.cellEditorInPopup && this.hideEditorPopup) {
            this.hideEditorPopup();
            this.hideEditorPopup = null;
        } else {
            this.clearCellElement();

            const eGui = this.getGui();
            // put the cell back the way it was before editing
            if (this.usingWrapper) {
                // if wrapper, then put the wrapper back
                eGui.appendChild(this.eCellWrapper);
            } else if (this.cellRenderer) {
                // if cellRenderer, then put the gui back in. if the renderer has
                // a refresh, it will be called. however if it doesn't, then later
                // the renderer will be destroyed and a new one will be created.
                // we know it's a dom element (not a string) because we converted
                // it after the gui was attached if it was a string.
                const eCell = this.cellRendererGui as HTMLElement;

                // can be null if cell was previously null / contained empty string,
                // this will result in new value not being rendered.
                if (eCell) {
                    eGui.appendChild(eCell);
                }
            }
        }

        this.setInlineEditingClass();
        this.refreshHandle();

        if (newValueExists && newValue !== oldValue) {
            // we suppressRefreshCell because the call to rowNode.setDataValue() results in change detection
            // getting triggered, which results in all cells getting refreshed. we do not want this refresh
            // to happen on this call as we want to call it explicitly below. otherwise refresh gets called twice.
            // if we only did this refresh (and not the one below) then the cell would flash and not be forced.
            this.suppressRefreshCell = true;
            this.rowNode.setDataValue(this.column, newValue);
            this.suppressRefreshCell = false;
        }

        // we suppress the flash, as it is not correct to flash the cell the user has finished editing,
        // the user doesn't need to flash as they were the one who did the edit, the flash is pointless
        // (as the flash is meant to draw the user to a change that they didn't manually do themselves).
        this.refreshCell({ forceRefresh: true, suppressFlash: true });

        const editingStoppedEvent = {
            ...this.createEvent(null, Events.EVENT_CELL_EDITING_STOPPED),
            oldValue,
            newValue
        };

        this.beans.eventService.dispatchEvent(editingStoppedEvent);
    }

    private clearCellElement(): void {
        const eGui = this.getGui();

        // if focus is inside the cell, we move focus to the cell itself
        // before removing it's contents, otherwise errors could be thrown.
        if (eGui.contains(document.activeElement) && !isBrowserIE()) {
            eGui.focus({
                preventScroll: true
            });
        }

        clearElement(eGui);
    }
}
