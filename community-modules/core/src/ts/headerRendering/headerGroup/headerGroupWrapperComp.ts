import { ColGroupDef } from "../../entities/colDef";
import { Column } from "../../entities/column";
import { ColumnGroup } from "../../entities/columnGroup";
import { ColumnApi } from "../../columns/columnApi";
import { Constants } from "../../constants/constants";
import { ColumnModel, ColumnResizeSet } from "../../columns/columnModel";
import { HorizontalResizeService } from "../horizontalResizeService";
import { Autowired } from "../../context/context";
import { CssClassApplier } from "../cssClassApplier";
import {
    DragAndDropService,
    DragItem,
    DragSource,
    DragSourceType
} from "../../dragAndDrop/dragAndDropService";
import { SetLeftFeature } from "../../rendering/features/setLeftFeature";
import { IHeaderGroupComp, IHeaderGroupParams } from "./headerGroupComp";
import { GridApi } from "../../gridApi";
import { UserComponentFactory } from "../../components/framework/userComponentFactory";
import { HoverFeature } from "../hoverFeature";
import { AbstractHeaderWrapper } from "../header/abstractHeaderWrapper";
import { HeaderRowComp } from "../headerRowComp";
import { Beans } from "../../rendering/beans";
import { OriginalColumnGroup } from "../../entities/originalColumnGroup";
import { setAriaExpanded } from "../../utils/aria";
import { removeFromArray } from "../../utils/array";
import { removeFromParent, addCssClass, removeCssClass, addOrRemoveCssClass } from "../../utils/dom";
import { KeyCode } from '../../constants/keyCode';
import { ITooltipParams } from "../../rendering/tooltipComponent";
import { escapeString } from "../../utils/string";

export class HeaderGroupWrapperComp extends AbstractHeaderWrapper {

    private static TEMPLATE = /* html */
        `<div class="ag-header-group-cell" role="columnheader" tabindex="-1">
            <div ref="agResize" class="ag-header-cell-resize" role="presentation"></div>
        </div>`;

    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('horizontalResizeService') private horizontalResizeService: HorizontalResizeService;
    @Autowired('dragAndDropService') private dragAndDropService: DragAndDropService;
    @Autowired('userComponentFactory') private userComponentFactory: UserComponentFactory;
    @Autowired('beans') protected beans: Beans;
    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('columnApi') private columnApi: ColumnApi;

    protected readonly column: ColumnGroup;
    protected readonly pinned: string | null;

    private eHeaderCellResize: HTMLElement;

    private resizeCols: Column[];
    private resizeStartWidth: number;
    private resizeRatios: number[];

    private resizeTakeFromCols: Column[] | null;
    private resizeTakeFromStartWidth: number | null;
    private resizeTakeFromRatios: number[] | null;
    private expandable: boolean;

    // the children can change, we keep destroy functions related to listening to the children here
    private removeChildListenersFuncs: Function[] = [];

    constructor(columnGroup: ColumnGroup, pinned: string | null) {
        super(HeaderGroupWrapperComp.TEMPLATE);
        this.column = columnGroup;
        this.pinned = pinned;
    }

    protected postConstruct(): void {
        super.postConstruct();

        CssClassApplier.addHeaderClassesFromColDef(this.getComponentHolder(), this.getGui(), this.gridOptionsWrapper, null, this.column);

        const displayName = this.columnModel.getDisplayNameForColumnGroup(this.column, 'header');

        this.appendHeaderGroupComp(displayName!);

        this.setupResize();
        this.addClasses();
        this.setupWidth();
        this.addAttributes();
        this.setupMovingCss();
        this.setupTooltip();
        this.setupExpandable();

        this.createManagedBean(new HoverFeature(this.column.getOriginalColumnGroup().getLeafColumns(), this.getGui()));
        this.createManagedBean(new SetLeftFeature(this.column, this.getGui(), this.beans));
    }

    protected onFocusIn(e: FocusEvent) {
        if (!this.getGui().contains(e.relatedTarget as HTMLElement)) {
            const headerRow = this.getParentComponent() as HeaderRowComp;
            this.beans.focusService.setFocusedHeader(
                headerRow.getRowIndex(),
                this.getColumn()
            );
        }
    }

    protected handleKeyDown(e: KeyboardEvent) {
        const activeEl = document.activeElement;
        const eGui = this.getGui();
        const wrapperHasFocus = activeEl === eGui;

        if (!this.expandable || !wrapperHasFocus) { return; }

        if (e.keyCode === KeyCode.ENTER) {
            const column = this.getColumn() as ColumnGroup;
            const newExpandedValue = !column.isExpanded();

            this.columnModel.setColumnGroupOpened(column.getOriginalColumnGroup(), newExpandedValue, "uiColumnExpanded");
        }
    }

    protected onTabKeyDown(): void { }

    private setupExpandable(): void {
        const column = this.getColumn() as ColumnGroup;
        const originalColumnGroup = column.getOriginalColumnGroup();

        this.refreshExpanded();

        this.addManagedListener(originalColumnGroup, OriginalColumnGroup.EVENT_EXPANDABLE_CHANGED, this.refreshExpanded.bind(this));
        this.addManagedListener(originalColumnGroup, OriginalColumnGroup.EVENT_EXPANDED_CHANGED, this.refreshExpanded.bind(this));
    }

    private refreshExpanded(): void {
        const column = this.getColumn() as ColumnGroup;
        const eGui = this.getGui();

        const expandable = column.isExpandable();
        const expanded = column.isExpanded();

        this.expandable = expandable;

        if (!expandable) {
            eGui.removeAttribute('aria-expanded');
        } else {
            setAriaExpanded(eGui, expanded);
        }
    }

    private setupMovingCss(): void {
        const originalColumnGroup = this.column.getOriginalColumnGroup();
        const leafColumns = originalColumnGroup.getLeafColumns();

        leafColumns.forEach(col => {
            this.addManagedListener(col, Column.EVENT_MOVING_CHANGED, this.onColumnMovingChanged.bind(this));
        });

        this.onColumnMovingChanged();
    }

    public getComponentHolder(): ColGroupDef | null {
        return this.column.getColGroupDef();
    }

    public getTooltipParams(): ITooltipParams {
        const res = super.getTooltipParams();
        res.location = 'headerGroup';

        // this is wrong, but leaving it as i don't want to change code,
        // but the ColumnGroup does not have a ColDef or a Column (although it does have GroupDef and ColumnGroup)
        res.colDef = this.getComponentHolder();
        res.column = this.getColumn();

        return res;
    }

    private setupTooltip(): void {
        const colGroupDef = this.getComponentHolder();
        const tooltipText = colGroupDef && colGroupDef.headerTooltip;
        if (tooltipText != null) {
            this.setTooltip(escapeString(tooltipText));
        }
    }

    private onColumnMovingChanged(): void {
        // this function adds or removes the moving css, based on if the col is moving.
        // this is what makes the header go dark when it is been moved (gives impression to
        // user that the column was picked up).
        addOrRemoveCssClass(this.getGui(), 'ag-header-cell-moving', this.column.isMoving());
    }

    private addAttributes(): void {
        this.getGui().setAttribute("col-id", this.column.getUniqueId());
    }

    private appendHeaderGroupComp(displayName: string): void {
        const params: IHeaderGroupParams = {
            displayName: displayName,
            columnGroup: this.column,
            setExpanded: (expanded: boolean) => {
                this.columnModel.setColumnGroupOpened(this.column.getOriginalColumnGroup(), expanded, "gridInitializing");
            },
            api: this.gridApi,
            columnApi: this.columnApi,
            context: this.gridOptionsWrapper.getContext()
        };

        if (!displayName) {
            let columnGroup = this.column;
            const leafCols = columnGroup.getLeafColumns();

            // find the top most column group that represents the same columns. so if we are dragging a group, we also
            // want to visually show the parent groups dragging for the same column set. for example imaging 5 levels
            // of grouping, with each group only containing the next group, and the last group containing three columns,
            // then when you move any group (even the lowest level group) you are in-fact moving all the groups, as all
            // the groups represent the same column set.
            while (columnGroup.getParent() && columnGroup.getParent().getLeafColumns().length === leafCols.length) {
                columnGroup = columnGroup.getParent();
            }

            const colGroupDef = columnGroup.getColGroupDef();

            if (colGroupDef) {
                displayName = colGroupDef.headerName!;
            }

            if (!displayName) {
                displayName = leafCols ? this.columnModel.getDisplayNameForColumn(leafCols[0], 'header', true)! : '';
            }
        }

        const callback = this.afterHeaderCompCreated.bind(this, displayName);

        this.userComponentFactory.newHeaderGroupComponent(params)!.then(callback);
    }

    private afterHeaderCompCreated(displayName: string, headerGroupComp: IHeaderGroupComp): void {
        this.getGui().appendChild(headerGroupComp.getGui());
        this.addDestroyFunc(() => {
            this.getContext().destroyBean(headerGroupComp);
        });

        this.setupMove(headerGroupComp.getGui(), displayName);
    }

    private addClasses(): void {
        // having different classes below allows the style to not have a bottom border
        // on the group header, if no group is specified
        // columnGroup.getColGroupDef
        const style = this.column.isPadding() ? 'no' : 'with';

        this.addCssClass(`ag-header-group-cell-${style}-group`);
    }

    private setupMove(eHeaderGroup: HTMLElement, displayName: string): void {
        if (!eHeaderGroup) { return; }
        if (this.isSuppressMoving()) { return; }

        const allLeafColumns = this.column.getOriginalColumnGroup().getLeafColumns();
        const dragSource: DragSource = {
            type: DragSourceType.HeaderCell,
            eElement: eHeaderGroup,
            defaultIconName: DragAndDropService.ICON_HIDE,
            dragItemName: displayName,
            // we add in the original group leaf columns, so we move both visible and non-visible items
            getDragItem: this.getDragItemForGroup.bind(this),
            onDragStarted: () => allLeafColumns.forEach(col => col.setMoving(true, "uiColumnDragged")),
            onDragStopped: () => allLeafColumns.forEach(col => col.setMoving(false, "uiColumnDragged"))
        };

        this.dragAndDropService.addDragSource(dragSource, true);
        this.addDestroyFunc(() => this.dragAndDropService.removeDragSource(dragSource));
    }

    // when moving the columns, we want to move all the columns (contained within the DragItem) in this group in one go,
    // and in the order they are currently in the screen.
    public getDragItemForGroup(): DragItem {
        const allColumnsOriginalOrder = this.column.getOriginalColumnGroup().getLeafColumns();

        // capture visible state, used when re-entering grid to dictate which columns should be visible
        const visibleState: { [key: string]: boolean; } = {};
        allColumnsOriginalOrder.forEach(column => visibleState[column.getId()] = column.isVisible());

        const allColumnsCurrentOrder: Column[] = [];
        this.columnModel.getAllDisplayedColumns().forEach(column => {
            if (allColumnsOriginalOrder.indexOf(column) >= 0) {
                allColumnsCurrentOrder.push(column);
                removeFromArray(allColumnsOriginalOrder, column);
            }
        });

        // we are left with non-visible columns, stick these in at the end
        allColumnsOriginalOrder.forEach(column => allColumnsCurrentOrder.push(column));

        // create and return dragItem
        return {
            columns: allColumnsCurrentOrder,
            visibleState: visibleState
        };
    }

    private isSuppressMoving(): boolean {
        // if any child is fixed, then don't allow moving
        let childSuppressesMoving = false;
        this.column.getLeafColumns().forEach((column: Column) => {
            if (column.getColDef().suppressMovable || column.getColDef().lockPosition) {
                childSuppressesMoving = true;
            }
        });

        const result = childSuppressesMoving || this.gridOptionsWrapper.isSuppressMovableColumns();

        return result;
    }

    private setupWidth(): void {
        // we need to listen to changes in child columns, as they impact our width
        this.addListenersToChildrenColumns();

        // the children belonging to this group can change, so we need to add and remove listeners as they change
        this.addManagedListener(this.column, ColumnGroup.EVENT_DISPLAYED_CHILDREN_CHANGED, this.onDisplayedChildrenChanged.bind(this));

        this.onWidthChanged();

        // the child listeners are not tied to this components life-cycle, as children can get added and removed
        // to the group - hence they are on a different life-cycle. so we must make sure the existing children
        // listeners are removed when we finally get destroyed
        this.addDestroyFunc(this.removeListenersOnChildrenColumns.bind(this));
    }

    private onDisplayedChildrenChanged(): void {
        this.addListenersToChildrenColumns();
        this.onWidthChanged();
    }

    private addListenersToChildrenColumns(): void {
        // first destroy any old listeners
        this.removeListenersOnChildrenColumns();

        // now add new listeners to the new set of children
        const widthChangedListener = this.onWidthChanged.bind(this);
        this.column.getLeafColumns().forEach(column => {
            column.addEventListener(Column.EVENT_WIDTH_CHANGED, widthChangedListener);
            column.addEventListener(Column.EVENT_VISIBLE_CHANGED, widthChangedListener);
            this.removeChildListenersFuncs.push(() => {
                column.removeEventListener(Column.EVENT_WIDTH_CHANGED, widthChangedListener);
                column.removeEventListener(Column.EVENT_VISIBLE_CHANGED, widthChangedListener);
            });
        });
    }

    private removeListenersOnChildrenColumns(): void {
        this.removeChildListenersFuncs.forEach(func => func());
        this.removeChildListenersFuncs = [];
    }

    private onWidthChanged(): void {
        this.getGui().style.width = this.column.getActualWidth() + 'px';
    }

    private setupResize(): void {
        this.eHeaderCellResize = this.getRefElement('agResize');

        if (!this.column.isResizable()) {
            removeFromParent(this.eHeaderCellResize);
            return;
        }

        const finishedWithResizeFunc = this.horizontalResizeService.addResizeBar({
            eResizeBar: this.eHeaderCellResize,
            onResizeStart: this.onResizeStart.bind(this),
            onResizing: this.onResizing.bind(this, false),
            onResizeEnd: this.onResizing.bind(this, true)
        });

        this.addDestroyFunc(finishedWithResizeFunc);

        if (!this.gridOptionsWrapper.isSuppressAutoSize()) {
            const skipHeaderOnAutoSize = this.gridOptionsWrapper.isSkipHeaderOnAutoSize();

            this.eHeaderCellResize.addEventListener('dblclick', (event: MouseEvent) => {
                // get list of all the column keys we are responsible for
                const keys: string[] = [];
                this.column.getDisplayedLeafColumns().forEach((column: Column) => {
                    // not all cols in the group may be participating with auto-resize
                    if (!column.getColDef().suppressAutoSize) {
                        keys.push(column.getColId());
                    }
                });

                if (keys.length > 0) {
                    this.columnModel.autoSizeColumns(keys, skipHeaderOnAutoSize, "uiColumnResized");
                }
            });
        }
    }

    public onResizeStart(shiftKey: boolean): void {
        const leafCols = this.column.getDisplayedLeafColumns();
        this.resizeCols = leafCols.filter(col => col.isResizable());
        this.resizeStartWidth = 0;
        this.resizeCols.forEach(col => this.resizeStartWidth += col.getActualWidth());
        this.resizeRatios = [];
        this.resizeCols.forEach(col => this.resizeRatios.push(col.getActualWidth() / this.resizeStartWidth));

        let takeFromGroup: ColumnGroup | null = null;

        if (shiftKey) {
            takeFromGroup = this.columnModel.getDisplayedGroupAfter(this.column);
        }

        if (takeFromGroup) {
            const takeFromLeafCols = takeFromGroup.getDisplayedLeafColumns();

            this.resizeTakeFromCols = takeFromLeafCols.filter(col => col.isResizable());

            this.resizeTakeFromStartWidth = 0;
            this.resizeTakeFromCols.forEach(col => this.resizeTakeFromStartWidth! += col.getActualWidth());
            this.resizeTakeFromRatios = [];
            this.resizeTakeFromCols.forEach(col => this.resizeTakeFromRatios!.push(col.getActualWidth() / this.resizeTakeFromStartWidth!));
        } else {
            this.resizeTakeFromCols = null;
            this.resizeTakeFromStartWidth = null;
            this.resizeTakeFromRatios = null;
        }

        addCssClass(this.getGui(), 'ag-column-resizing');

    }

    public onResizing(finished: boolean, resizeAmount: any): void {
        const resizeSets: ColumnResizeSet[] = [];
        const resizeAmountNormalised = this.normaliseDragChange(resizeAmount);

        resizeSets.push({
            columns: this.resizeCols,
            ratios: this.resizeRatios,
            width: this.resizeStartWidth + resizeAmountNormalised
        });

        if (this.resizeTakeFromCols) {
            resizeSets.push({
                columns: this.resizeTakeFromCols,
                ratios: this.resizeTakeFromRatios!,
                width: this.resizeTakeFromStartWidth! - resizeAmountNormalised
            });
        }

        this.columnModel.resizeColumnSets(resizeSets, finished, 'uiColumnDragged');

        if (finished) {
            removeCssClass(this.getGui(), 'ag-column-resizing');
        }
    }

    // optionally inverts the drag, depending on pinned and RTL
    // note - this method is duplicated in RenderedHeaderCell - should refactor out?
    private normaliseDragChange(dragChange: number): number {
        let result = dragChange;

        if (this.gridOptionsWrapper.isEnableRtl()) {
            // for RTL, dragging left makes the col bigger, except when pinning left
            if (this.pinned !== Constants.PINNED_LEFT) {
                result *= -1;
            }
        } else if (this.pinned === Constants.PINNED_RIGHT) {
            // for LTR (ie normal), dragging left makes the col smaller, except when pinning right
            result *= -1;
        }

        return result;
    }
}
