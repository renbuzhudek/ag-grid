import { AgCheckbox } from "../../widgets/agCheckbox";
import { Autowired, PreDestroy } from "../../context/context";
import { Beans } from "../../rendering/beans";
import { Column } from "../../entities/column";
import { DragAndDropService, DragItem, DragSource, DragSourceType } from "../../dragAndDrop/dragAndDropService";
import { ColDef } from "../../entities/colDef";
import { Constants } from "../../constants/constants";
import { ColumnApi } from "../../columns/columnApi";
import { ColumnModel } from "../../columns/columnModel";
import { ColumnHoverService } from "../../rendering/columnHoverService";
import { CssClassApplier } from "../cssClassApplier";
import { Events } from "../../events";
import { IHeaderComp, IHeaderParams, HeaderComp } from "./headerComp";
import { IMenuFactory } from "../../interfaces/iMenuFactory";
import { GridApi } from "../../gridApi";
import { HorizontalResizeService } from "../horizontalResizeService";
import { HoverFeature } from "../hoverFeature";
import { SetLeftFeature } from "../../rendering/features/setLeftFeature";
import { SortController } from "../../sortController";
import { SelectAllFeature } from "./selectAllFeature";
import { RefSelector } from "../../widgets/componentAnnotations";
import { TouchListener } from "../../widgets/touchListener";
import { UserComponentFactory } from "../../components/framework/userComponentFactory";
import { AbstractHeaderWrapper } from "./abstractHeaderWrapper";
import { HeaderRowComp } from "../headerRowComp";
import { setAriaSort, getAriaSortState, removeAriaSort } from "../../utils/aria";
import { addCssClass, addOrRemoveCssClass, removeCssClass, setDisplayed } from "../../utils/dom";
import { KeyCode } from '../../constants/keyCode';
import { ITooltipParams } from "../../rendering/tooltipComponent";
import { escapeString } from "../../utils/string";

export class HeaderWrapperComp extends AbstractHeaderWrapper {

    private static TEMPLATE = /* html */
        `<div class="ag-header-cell" role="columnheader" unselectable="on" tabindex="-1">
            <div ref="eResize" class="ag-header-cell-resize" role="presentation"></div>
            <ag-checkbox ref="cbSelectAll" class="ag-header-select-all" role="presentation"></ag-checkbox>
        </div>`;

    @Autowired('dragAndDropService') private dragAndDropService: DragAndDropService;
    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('horizontalResizeService') private horizontalResizeService: HorizontalResizeService;
    @Autowired('menuFactory') private menuFactory: IMenuFactory;
    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('columnApi') private columnApi: ColumnApi;
    @Autowired('sortController') private sortController: SortController;
    @Autowired('userComponentFactory') private userComponentFactory: UserComponentFactory;
    @Autowired('columnHoverService') private columnHoverService: ColumnHoverService;
    @Autowired('beans') protected beans: Beans;

    @RefSelector('eResize') private eResize: HTMLElement;
    @RefSelector('cbSelectAll') private cbSelectAll: AgCheckbox;

    protected readonly column: Column;
    protected readonly pinned: string | null;

    private headerComp: IHeaderComp | undefined;
    private headerCompGui: HTMLElement | undefined;

    private headerCompVersion = 0;
    private resizeStartWidth: number;
    private resizeWithShiftKey: boolean;
    private sortable: boolean | null | undefined;
    private menuEnabled: boolean;

    private colDefVersion: number;
    private refreshFunctions: (() => void)[] = [];

    private moveDragSource: DragSource | undefined;
    private displayName: string | null;
    private draggable: boolean;

    private colDefHeaderComponent?: string | { new(): any; };
    private colDefHeaderComponentFramework?: any;

    constructor(column: Column, pinned: string | null) {
        super(HeaderWrapperComp.TEMPLATE);
        this.column = column;
        this.pinned = pinned;
    }

    protected postConstruct(): void {
        super.postConstruct();

        this.colDefVersion = this.columnModel.getColDefVersion();

        this.updateState();

        this.setupWidth();
        this.setupMovingCss();
        this.setupTooltip();
        this.setupResize();
        this.setupMenuClass();
        this.setupSortableClass();
        this.addColumnHoverListener();
        this.addActiveHeaderMouseListeners();

        this.createManagedBean(new HoverFeature([this.column], this.getGui()));

        this.addManagedListener(this.column, Column.EVENT_FILTER_ACTIVE_CHANGED, this.onFilterChanged.bind(this));
        this.onFilterChanged();

        this.createManagedBean(new SelectAllFeature(this.cbSelectAll, this.column));
        this.cbSelectAll.setParentComponent(this);
        this.createManagedBean(new SetLeftFeature(this.column, this.getGui(), this.beans));

        this.addAttributes();
        CssClassApplier.addHeaderClassesFromColDef(this.column.getColDef(), this.getGui(), this.gridOptionsWrapper,
            this.column, null);

        this.addManagedListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, this.onNewColumnsLoaded.bind(this));

        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_VALUE_CHANGED, this.onColumnValueChanged.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_ROW_GROUP_CHANGED, this.onColumnRowGroupChanged.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_PIVOT_CHANGED, this.onColumnPivotChanged.bind(this));

        this.appendHeaderComp();
    }

    private onColumnRowGroupChanged(): void {
        this.checkDisplayName();
    }

    private onColumnPivotChanged(): void {
        this.checkDisplayName();
    }

    private onColumnValueChanged(): void {
        this.checkDisplayName();
    }

    private checkDisplayName(): void {
        // display name can change if aggFunc different, eg sum(Gold) is now max(Gold)
        if (this.displayName !== this.calculateDisplayName()) {
            this.refresh();
        }
    }

    private updateState(): void {
        const colDef = this.column.getColDef();
        this.sortable = colDef.sortable;
        this.displayName = this.calculateDisplayName();
        this.draggable = this.workOutDraggable();
    }

    private calculateDisplayName(): string | null {
        return this.columnModel.getDisplayNameForColumn(this.column, 'header', true);
    }

    private onNewColumnsLoaded(): void {
        const colDefVersionNow = this.columnModel.getColDefVersion();
        if (colDefVersionNow != this.colDefVersion) {
            this.colDefVersion = colDefVersionNow;
            this.refresh();
        }
    }

    private refresh(): void {
        this.updateState();
        this.refreshHeaderComp();
        this.refreshFunctions.forEach(f => f());
    }

    private refreshHeaderComp(): void {
        // if no header comp created yet, it's cos of async creation, so first version is yet
        // to get here, in which case nothing to refresh
        if (!this.headerComp) { return; }

        const colDef = this.column.getColDef();
        const newHeaderCompConfigured =
            this.colDefHeaderComponent != colDef.headerComponent
            || this.colDefHeaderComponentFramework != colDef.headerComponentFramework;

        const headerCompRefreshed = newHeaderCompConfigured ? false : this.attemptHeaderCompRefresh();
        if (headerCompRefreshed) {
            const dragSourceIsMissing = this.draggable && !this.moveDragSource;
            const dragSourceNeedsRemoving = !this.draggable && this.moveDragSource;
            if (dragSourceIsMissing || dragSourceNeedsRemoving) {
                this.attachDraggingToHeaderComp();
            }
        } else {
            this.appendHeaderComp();
        }
    }

    @PreDestroy
    private destroyHeaderComp(): void {
        if (this.headerComp) {
            this.getGui().removeChild(this.headerCompGui!);
            this.headerComp = this.destroyBean(this.headerComp);
            this.headerCompGui = undefined;
        }
        this.removeMoveDragSource();
    }

    private removeMoveDragSource(): void {
        if (this.moveDragSource) {
            this.dragAndDropService.removeDragSource(this.moveDragSource);
            this.moveDragSource = undefined;
        }
    }

    public attemptHeaderCompRefresh(): boolean {
        // if no refresh method, then we want to replace the headerComp
        if (!this.headerComp!.refresh) { return false; }

        // if the cell renderer has a refresh method, we call this instead of doing a refresh
        const params = this.createParams();

        // take any custom params off of the user
        const finalParams = this.userComponentFactory.createFinalParams(this.getComponentHolder(), 'headerComponent', params);

        const res = this.headerComp!.refresh(finalParams);

        return res;
    }

    private addActiveHeaderMouseListeners(): void {
        const listener = (e: MouseEvent) => this.setActiveHeader(e.type === 'mouseenter');
        this.addManagedListener(this.getGui(), 'mouseenter', listener);
        this.addManagedListener(this.getGui(), 'mouseleave', listener);
    }

    private setActiveHeader(active: boolean): void {
        addOrRemoveCssClass(this.getGui(), 'ag-header-active', active);
    }

    protected onFocusIn(e: FocusEvent) {
        if (!this.getGui().contains(e.relatedTarget as HTMLElement)) {
            const headerRow = this.getParentComponent() as HeaderRowComp;
            this.focusService.setFocusedHeader(
                headerRow.getRowIndex(),
                this.getColumn()
            );
        }

        this.setActiveHeader(true);
    }

    protected onFocusOut(e: FocusEvent) {
        if (
            this.getGui().contains(e.relatedTarget as HTMLElement)
        ) { return; }

        this.setActiveHeader(false);
    }

    protected handleKeyDown(e: KeyboardEvent): void {
        const headerComp = this.headerComp as HeaderComp;
        if (!headerComp) { return; }

        if (e.keyCode === KeyCode.SPACE) {
            const checkbox = this.cbSelectAll;
            if (checkbox.isDisplayed() && !checkbox.getGui().contains(document.activeElement)) {
                e.preventDefault();
                checkbox.setValue(!checkbox.getValue());
            }
        }

        if (e.keyCode === KeyCode.ENTER) {
            if (e.ctrlKey || e.metaKey) {
                if (this.menuEnabled && headerComp.showMenu) {
                    e.preventDefault();
                    headerComp.showMenu();
                }
            } else if (this.sortable) {
                const multiSort = e.shiftKey;
                this.sortController.progressSort(this.column, multiSort, "uiColumnSorted");
            }
        }
    }

    protected onTabKeyDown(): void { }

    public getComponentHolder(): ColDef {
        return this.column.getColDef();
    }

    private addColumnHoverListener(): void {
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_HOVER_CHANGED, this.onColumnHover.bind(this));
        this.onColumnHover();
    }

    private onColumnHover(): void {
        const isHovered = this.columnHoverService.isHovered(this.column);
        addOrRemoveCssClass(this.getGui(), 'ag-column-hover', isHovered);
    }

    private setupSortableClass(): void {

        const eGui = this.getGui();

        const updateSortableCssClass = () => {
            addOrRemoveCssClass(eGui, 'ag-header-cell-sortable', !!this.sortable);
        };

        const updateAriaSort = () => {
            if (this.sortable) {
                setAriaSort(eGui, getAriaSortState(this.column));
            } else {
                removeAriaSort(eGui);
            }
        };

        updateSortableCssClass();
        updateAriaSort();

        this.refreshFunctions.push(updateSortableCssClass);
        this.refreshFunctions.push(updateAriaSort);

        this.addManagedListener(this.column, Column.EVENT_SORT_CHANGED, updateAriaSort.bind(this));
    }

    private onFilterChanged(): void {
        const filterPresent = this.column.isFilterActive();
        addOrRemoveCssClass(this.getGui(), 'ag-header-cell-filtered', filterPresent);
    }

    private appendHeaderComp(): void {
        this.headerCompVersion++;

        const colDef = this.column.getColDef();
        this.colDefHeaderComponent = colDef.headerComponent;
        this.colDefHeaderComponentFramework = colDef.headerComponentFramework;

        const params = this.createParams();
        const callback = this.afterHeaderCompCreated.bind(this, this.headerCompVersion);
        this.userComponentFactory.newHeaderComponent(params)!.then(callback);
    }

    private createParams(): IHeaderParams {

        const colDef = this.column.getColDef();

        this.menuEnabled = this.menuFactory.isMenuEnabled(this.column) && !colDef.suppressMenu;

        const params = {
            column: this.column,
            displayName: this.displayName,
            enableSorting: colDef.sortable,
            enableMenu: this.menuEnabled,
            showColumnMenu: (source: HTMLElement) => {
                this.gridApi.showColumnMenuAfterButtonClick(this.column, source);
            },
            progressSort: (multiSort?: boolean) => {
                this.sortController.progressSort(this.column, !!multiSort, "uiColumnSorted");
            },
            setSort: (sort: string, multiSort?: boolean) => {
                this.sortController.setSortForColumn(this.column, sort, !!multiSort, "uiColumnSorted");
            },
            api: this.gridApi,
            columnApi: this.columnApi,
            context: this.gridOptionsWrapper.getContext(),
            eGridHeader: this.getGui()
        } as IHeaderParams;
        return params;
    }

    private afterHeaderCompCreated(version: number, headerComp: IHeaderComp): void {

        if (version != this.headerCompVersion || !this.isAlive()) {
            this.destroyBean(headerComp);
            return;
        }

        this.destroyHeaderComp();

        this.headerComp = headerComp;
        this.headerCompGui = headerComp.getGui();
        this.getGui().appendChild(this.headerCompGui);

        this.attachDraggingToHeaderComp();
    }

    private onColumnMovingChanged(): void {
        // this function adds or removes the moving css, based on if the col is moving.
        // this is what makes the header go dark when it is been moved (gives impression to
        // user that the column was picked up).
        if (this.column.isMoving()) {
            addCssClass(this.getGui(), 'ag-header-cell-moving');
        } else {
            removeCssClass(this.getGui(), 'ag-header-cell-moving');
        }
    }

    private workOutDraggable(): boolean {
        const colDef = this.column.getColDef();
        const isSuppressMovableColumns = this.gridOptionsWrapper.isSuppressMovableColumns();

        const colCanMove = !isSuppressMovableColumns && !colDef.suppressMovable && !colDef.lockPosition;

        // we should still be allowed drag the column, even if it can't be moved, if the column
        // can be dragged to a rowGroup or pivot drop zone
        return !!colCanMove || !!colDef.enableRowGroup || !!colDef.enablePivot;
    }

    private attachDraggingToHeaderComp(): void {

        this.removeMoveDragSource();

        if (!this.draggable) { return; }

        this.moveDragSource = {
            type: DragSourceType.HeaderCell,
            eElement: this.headerCompGui!,
            defaultIconName: DragAndDropService.ICON_HIDE,
            getDragItem: () => this.createDragItem(),
            dragItemName: this.displayName,
            onDragStarted: () => this.column.setMoving(true, "uiColumnMoved"),
            onDragStopped: () => this.column.setMoving(false, "uiColumnMoved")
        };

        this.dragAndDropService.addDragSource(this.moveDragSource, true);
    }

    private createDragItem(): DragItem {
        const visibleState: { [key: string]: boolean; } = {};
        visibleState[this.column.getId()] = this.column.isVisible();

        return {
            columns: [this.column],
            visibleState: visibleState
        };
    }

    private setupResize(): void {
        const colDef = this.getComponentHolder();

        const destroyResizeFuncs: (() => void)[] = [];

        let canResize: boolean;
        let canAutosize: boolean;

        const addResize = () => {
            setDisplayed(this.eResize, canResize);

            if (!canResize) { return; }

            const finishedWithResizeFunc = this.horizontalResizeService.addResizeBar({
                eResizeBar: this.eResize,
                onResizeStart: this.onResizeStart.bind(this),
                onResizing: this.onResizing.bind(this, false),
                onResizeEnd: this.onResizing.bind(this, true)
            });
            destroyResizeFuncs.push(finishedWithResizeFunc);

            if (canAutosize) {
                const skipHeaderOnAutoSize = this.gridOptionsWrapper.isSkipHeaderOnAutoSize();

                const autoSizeColListener = () => {
                    this.columnModel.autoSizeColumn(this.column, skipHeaderOnAutoSize, "uiColumnResized");
                };

                this.eResize.addEventListener('dblclick', autoSizeColListener);
                const touchListener: TouchListener = new TouchListener(this.eResize);
                touchListener.addEventListener(TouchListener.EVENT_DOUBLE_TAP, autoSizeColListener);

                this.addDestroyFunc(() => {
                    this.eResize.removeEventListener('dblclick', autoSizeColListener);
                    touchListener.removeEventListener(TouchListener.EVENT_DOUBLE_TAP, autoSizeColListener);
                    touchListener.destroy();
                });
            }
        };

        const removeResize = () => {
            destroyResizeFuncs.forEach(f => f());
            destroyResizeFuncs.length = 0;
        };

        const refresh = () => {
            const resize = this.column.isResizable();
            const autoSize = !this.gridOptionsWrapper.isSuppressAutoSize() && !colDef.suppressAutoSize;
            const propertyChange = resize !== canResize || autoSize !== canAutosize;
            if (propertyChange) {
                canResize = resize;
                canAutosize = autoSize;
                removeResize();
                addResize();
            }
        };

        refresh();
        this.addDestroyFunc(removeResize);
        this.refreshFunctions.push(refresh);
    }

    public onResizing(finished: boolean, resizeAmount: number): void {
        const resizeAmountNormalised = this.normaliseResizeAmount(resizeAmount);
        const columnWidths = [{ key: this.column, newWidth: this.resizeStartWidth + resizeAmountNormalised }];
        this.columnModel.setColumnWidths(columnWidths, this.resizeWithShiftKey, finished, "uiColumnDragged");

        if (finished) {
            removeCssClass(this.getGui(), 'ag-column-resizing');
        }
    }

    public onResizeStart(shiftKey: boolean): void {
        this.resizeStartWidth = this.column.getActualWidth();
        this.resizeWithShiftKey = shiftKey;

        addCssClass(this.getGui(), 'ag-column-resizing');
    }

    public getTooltipParams(): ITooltipParams {
        const res = super.getTooltipParams();
        res.location = 'header';
        res.colDef = this.column.getColDef();
        return res;
    }

    private setupTooltip(): void {

        const refresh = () => {
            const newTooltipText = this.column.getColDef().headerTooltip;
            this.setTooltip(escapeString(newTooltipText));
        };

        refresh();

        this.refreshFunctions.push(refresh);
    }

    private setupMovingCss(): void {
        this.addManagedListener(this.column, Column.EVENT_MOVING_CHANGED, this.onColumnMovingChanged.bind(this));
        this.onColumnMovingChanged();
    }

    private addAttributes(): void {
        this.getGui().setAttribute("col-id", this.column.getColId());
    }

    private setupWidth(): void {
        this.addManagedListener(this.column, Column.EVENT_WIDTH_CHANGED, this.onColumnWidthChanged.bind(this));
        this.onColumnWidthChanged();
    }

    private setupMenuClass(): void {
        this.addManagedListener(this.column, Column.EVENT_MENU_VISIBLE_CHANGED, this.onMenuVisible.bind(this));
    }

    private onMenuVisible(): void {
        this.addOrRemoveCssClass('ag-column-menu-visible', this.column.isMenuVisible());
    }

    private onColumnWidthChanged(): void {
        this.getGui().style.width = this.column.getActualWidth() + 'px';
    }

    // optionally inverts the drag, depending on pinned and RTL
    // note - this method is duplicated in RenderedHeaderGroupCell - should refactor out?
    private normaliseResizeAmount(dragChange: number): number {
        let result = dragChange;

        if (this.gridOptionsWrapper.isEnableRtl()) {
            // for RTL, dragging left makes the col bigger, except when pinning left
            if (this.pinned !== Constants.PINNED_LEFT) {
                result *= -1;
            }
        } else {
            // for LTR (ie normal), dragging left makes the col smaller, except when pinning right
            if (this.pinned === Constants.PINNED_RIGHT) {
                result *= -1;
            }
        }

        return result;
    }
}
