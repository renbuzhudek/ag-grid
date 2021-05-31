import {
    _,
    AgCheckbox,
    Autowired,
    Column,
    ColumnModel,
    ColumnEventType,
    Component,
    CssClassApplier,
    DragAndDropService,
    DragSource,
    DragSourceType,
    Events,
    ITooltipParams,
    KeyCode,
    OriginalColumnGroup,
    PostConstruct,
    RefSelector,
    TouchListener
} from "@ag-grid-community/core";
import { ColumnModelItem } from "./columnModelItem";
import { ModelItemUtils } from "./modelItemUtils";

export class ToolPanelColumnGroupComp extends Component {

    private static TEMPLATE = /* html */
        `<div class="ag-column-select-column-group" aria-hidden="true">
            <span class="ag-column-group-icons" ref="eColumnGroupIcons" >
                <span class="ag-column-group-closed-icon" ref="eGroupClosedIcon"></span>
                <span class="ag-column-group-opened-icon" ref="eGroupOpenedIcon"></span>
            </span>
            <ag-checkbox ref="cbSelect" class="ag-column-select-checkbox"></ag-checkbox>
            <span class="ag-column-select-column-label" ref="eLabel"></span>
        </div>`;

    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('dragAndDropService') private dragAndDropService: DragAndDropService;
    @Autowired('modelItemUtils') private modelItemUtils: ModelItemUtils;

    @RefSelector('cbSelect') private cbSelect: AgCheckbox;
    @RefSelector('eLabel') private eLabel: HTMLElement;

    @RefSelector('eGroupOpenedIcon') private eGroupOpenedIcon: HTMLElement;
    @RefSelector('eGroupClosedIcon') private eGroupClosedIcon: HTMLElement;
    @RefSelector('eColumnGroupIcons') private eColumnGroupIcons: HTMLElement;

    private eDragHandle: HTMLElement;

    private readonly columnGroup: OriginalColumnGroup;
    private readonly columnDept: number;

    private displayName: string | null;
    private processingColumnStateChange = false;

    constructor(
        private readonly modelItem: ColumnModelItem,
        private readonly allowDragging: boolean,
        private readonly eventType: ColumnEventType,
        private readonly focusWrapper: HTMLElement
    ) {
        super();
        this.modelItem = modelItem;
        this.columnGroup = modelItem.getColumnGroup();
        this.columnDept = modelItem.getDept();
        this.allowDragging = allowDragging;
    }

    @PostConstruct
    public init(): void {
        this.setTemplate(ToolPanelColumnGroupComp.TEMPLATE);

        this.eDragHandle = _.createIconNoSpan('columnDrag', this.gridOptionsWrapper)!;
        _.addCssClass(this.eDragHandle, 'ag-drag-handle');
        _.addCssClass(this.eDragHandle, 'ag-column-select-column-group-drag-handle');
        this.cbSelect.getGui().insertAdjacentElement('afterend', this.eDragHandle);

        this.displayName = this.columnModel.getDisplayNameForOriginalColumnGroup(null, this.columnGroup, this.eventType);

        if (_.missing(this.displayName)) {
            this.displayName = '>>';
        }

        this.eLabel.innerHTML = this.displayName ? this.displayName : '';
        this.setupExpandContract();

        this.addCssClass('ag-column-select-indent-' + this.columnDept);

        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_PIVOT_MODE_CHANGED, this.onColumnStateChanged.bind(this));

        this.addManagedListener(this.eLabel, 'click', this.onLabelClicked.bind(this));
        this.addManagedListener(this.cbSelect, AgCheckbox.EVENT_CHANGED, this.onCheckboxChanged.bind(this));
        this.addManagedListener(this.modelItem, ColumnModelItem.EVENT_EXPANDED_CHANGED, this.onExpandChanged.bind(this));
        this.addManagedListener(this.focusWrapper, 'keydown', this.handleKeyDown.bind(this));

        this.setOpenClosedIcons();
        this.setupDragging();
        this.onColumnStateChanged();
        this.addVisibilityListenersToAllChildren();
        this.refreshAriaExpanded();
        this.refreshAriaLabel();
        this.setupTooltip();

        CssClassApplier.addToolPanelClassesFromColDef(this.columnGroup.getColGroupDef(), this.getGui(), this.gridOptionsWrapper, null, this.columnGroup);
    }

    private setupTooltip(): void {

        const colGroupDef = this.columnGroup.getColGroupDef();
        if (!colGroupDef) { return; }

        const refresh = () => {
            const newTooltipText = colGroupDef.headerTooltip;
            this.setTooltip(_.escapeString(newTooltipText));
        };

        refresh();

        this.addManagedListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, refresh);
    }

    public getTooltipParams(): ITooltipParams {
        const res = super.getTooltipParams();
        res.location = 'columnToolPanelColumnGroup';
        return res;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        switch (e.keyCode) {
            case KeyCode.LEFT:
                e.preventDefault();
                this.modelItem.setExpanded(false);
                break;
            case KeyCode.RIGHT:
                e.preventDefault();
                this.modelItem.setExpanded(true);
                break;
            case KeyCode.SPACE:
                e.preventDefault();
                if (this.isSelectable()) {
                    this.onSelectAllChanged(!this.isSelected());
                }
                break;
        }
    }

    private addVisibilityListenersToAllChildren(): void {
        this.columnGroup.getLeafColumns().forEach(column => {
            this.addManagedListener(column, Column.EVENT_VISIBLE_CHANGED, this.onColumnStateChanged.bind(this));
            this.addManagedListener(column, Column.EVENT_VALUE_CHANGED, this.onColumnStateChanged.bind(this));
            this.addManagedListener(column, Column.EVENT_PIVOT_CHANGED, this.onColumnStateChanged.bind(this));
            this.addManagedListener(column, Column.EVENT_ROW_GROUP_CHANGED, this.onColumnStateChanged.bind(this));
        });
    }

    private setupDragging(): void {
        if (!this.allowDragging) {
            _.setDisplayed(this.eDragHandle, false);
            return;
        }

        const dragSource: DragSource = {
            type: DragSourceType.ToolPanel,
            eElement: this.eDragHandle,
            dragItemName: this.displayName,
            getDragItem: () => this.createDragItem()
        };

        this.dragAndDropService.addDragSource(dragSource, true);
        this.addDestroyFunc(() => this.dragAndDropService.removeDragSource(dragSource));
    }

    private createDragItem() {
        const visibleState: { [key: string]: boolean; } = {};
        this.columnGroup.getLeafColumns().forEach(col => {
            visibleState[col.getId()] = col.isVisible();
        });

        return {
            columns: this.columnGroup.getLeafColumns(),
            visibleState: visibleState
        };
    }

    private setupExpandContract(): void {
        this.eGroupClosedIcon.appendChild(_.createIcon('columnSelectClosed', this.gridOptionsWrapper, null));
        this.eGroupOpenedIcon.appendChild(_.createIcon('columnSelectOpen', this.gridOptionsWrapper, null));

        this.addManagedListener(this.eGroupClosedIcon, 'click', this.onExpandOrContractClicked.bind(this));
        this.addManagedListener(this.eGroupOpenedIcon, 'click', this.onExpandOrContractClicked.bind(this));

        const touchListener = new TouchListener(this.eColumnGroupIcons, true);
        this.addManagedListener(touchListener, TouchListener.EVENT_TAP, this.onExpandOrContractClicked.bind(this));
        this.addDestroyFunc(touchListener.destroy.bind(touchListener));
    }

    private onLabelClicked(): void {
        const nextState = !this.cbSelect.getValue();
        this.onChangeCommon(nextState);
    }

    private onCheckboxChanged(event: any): void {
        this.onChangeCommon(event.selected);
    }

    private getVisibleLeafColumns(): Column[] {
        const childColumns: Column[] = [];

        const extractCols = (children: ColumnModelItem[]) => {
            children.forEach(child => {
                if (!child.isPassesFilter()) { return; }
                if (child.isGroup()) {
                    extractCols(child.getChildren());
                } else {
                    childColumns.push(child.getColumn());
                }
            });
        };

        extractCols(this.modelItem.getChildren());

        return childColumns;
    }

    private onChangeCommon(nextState: boolean): void {
        this.refreshAriaLabel();

        if (this.processingColumnStateChange) {
            return;
        }

        this.modelItemUtils.selectAllChildren(this.modelItem.getChildren(), nextState, this.eventType);
    }

    private refreshAriaLabel(): void {
        const translate = this.gridOptionsWrapper.getLocaleTextFunc();
        const state = this.cbSelect.getValue() ? translate('ariaVisible', 'visible') : translate('ariaHidden', 'hidden');
        const label = translate('ariaColumnGroupToggleVisibility', 'column group toggle visibility');
        _.setAriaLabel(this.focusWrapper, `${this.displayName} ${label} (${state})`);
    }

    public onColumnStateChanged(): void {
        const selectedValue = this.workOutSelectedValue();
        const readOnlyValue = this.workOutReadOnlyValue();
        this.processingColumnStateChange = true;
        this.cbSelect.setValue(selectedValue);
        this.cbSelect.setReadOnly(readOnlyValue);
        _.addOrRemoveCssClass(this.getGui(), 'ag-column-select-column-group-readonly', readOnlyValue);
        this.processingColumnStateChange = false;
    }

    private workOutSelectedValue(): boolean | undefined {
        const pivotMode = this.columnModel.isPivotMode();

        const visibleLeafColumns = this.getVisibleLeafColumns();

        let checkedCount = 0;
        let uncheckedCount = 0;

        visibleLeafColumns.forEach(column => {
            if (!pivotMode && column.getColDef().lockVisible) { return; }

            if (this.isColumnChecked(column, pivotMode)) {
                checkedCount++;
            } else {
                uncheckedCount++;
            }
        });

        if (checkedCount > 0 && uncheckedCount > 0) {
            return undefined;
        } else {
            return checkedCount > 0;
        }
    }

    private workOutReadOnlyValue(): boolean {
        const pivotMode = this.columnModel.isPivotMode();

        let colsThatCanAction = 0;

        this.columnGroup.getLeafColumns().forEach(col => {
            if (pivotMode) {
                if (col.isAnyFunctionAllowed()) {
                    colsThatCanAction++;
                }
            } else {
                if (!col.getColDef().lockVisible) {
                    colsThatCanAction++;
                }
            }
        });

        return colsThatCanAction === 0;
    }

    private isColumnChecked(column: Column, pivotMode: boolean): boolean {
        if (pivotMode) {
            const pivoted = column.isPivotActive();
            const grouped = column.isRowGroupActive();
            const aggregated = column.isValueActive();
            return pivoted || grouped || aggregated;
        } else {
            return column.isVisible();
        }
    }

    private onExpandOrContractClicked(): void {
        const oldState = this.modelItem.isExpanded();
        this.modelItem.setExpanded(!oldState);
    }

    private onExpandChanged() {
        this.setOpenClosedIcons();
        this.refreshAriaExpanded();
    }

    private setOpenClosedIcons(): void {
        const folderOpen = this.modelItem.isExpanded();
        _.setDisplayed(this.eGroupClosedIcon, !folderOpen);
        _.setDisplayed(this.eGroupOpenedIcon, folderOpen);
    }

    private refreshAriaExpanded(): void {
        _.setAriaExpanded(this.focusWrapper, this.modelItem.isExpanded());
    }

    public getDisplayName(): string | null {
        return this.displayName;
    }

    public onSelectAllChanged(value: boolean): void {
        const cbValue = this.cbSelect.getValue();
        const readOnly = this.cbSelect.isReadOnly();

        if (!readOnly && ((value && !cbValue) || (!value && cbValue))) {
            this.cbSelect.toggle();
        }
    }

    public isSelected(): boolean | undefined {
        return this.cbSelect.getValue();
    }

    public isSelectable(): boolean {
        return !this.cbSelect.isReadOnly();
    }

    public setSelected(selected: boolean) {
        this.cbSelect.setValue(selected, true);
    }
}
