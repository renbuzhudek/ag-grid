import { AgCheckbox } from "../../widgets/agCheckbox";
import { BeanStub } from "../../context/beanStub";
import { PostConstruct, Autowired } from "../../context/context";
import { ColumnApi } from "../../columns/columnApi";
import { GridApi } from "../../gridApi";
import { Events } from "../../events";
import { IRowModel } from "../../interfaces/iRowModel";
import { Constants } from "../../constants/constants";
import { Column } from "../../entities/column";
import { RowNode } from "../../entities/rowNode";
import { SelectionService } from "../../selectionService";
import { getAriaDescribedBy, setAriaDescribedBy } from "../../utils/aria";
import { isVisible } from "../../utils/dom";

export class SelectAllFeature extends BeanStub {

    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('columnApi') private columnApi: ColumnApi;
    @Autowired('rowModel') private rowModel: IRowModel;
    @Autowired('selectionService') private selectionService: SelectionService;

    private cbSelectAllVisible = false;
    private processingEventFromCheckbox = false;
    private column: Column;

    private filteredOnly: boolean;
    private cbSelectAll: AgCheckbox;

    constructor(cbSelectAll: AgCheckbox, column: Column) {
        super();
        this.cbSelectAll = cbSelectAll;
        this.column = column;

        const colDef = column.getColDef();
        this.filteredOnly = colDef ? !!colDef.headerCheckboxSelectionFilteredOnly : false;
    }

    @PostConstruct
    private postConstruct(): void {
        this.showOrHideSelectAll();

        this.addManagedListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, this.showOrHideSelectAll.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_CHANGED, this.showOrHideSelectAll.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_MODEL_UPDATED, this.onModelChanged.bind(this));
        this.addManagedListener(this.cbSelectAll, AgCheckbox.EVENT_CHANGED, this.onCbSelectAll.bind(this));
        this.cbSelectAll.getInputElement().setAttribute('tabindex', '-1');
        this.refreshSelectAllLabel();
    }

    private showOrHideSelectAll(): void {
        this.cbSelectAllVisible = this.isCheckboxSelection();
        this.cbSelectAll.setDisplayed(this.cbSelectAllVisible);

        if (this.cbSelectAllVisible) {
            // in case user is trying this feature with the wrong model type
            this.checkRightRowModelType();
            // make sure checkbox is showing the right state
            this.updateStateOfCheckbox();
        }
        this.refreshHeaderAriaDescribedBy(this.cbSelectAllVisible);
    }

    private refreshHeaderAriaDescribedBy(isSelectAllVisible: boolean): void {
        const parentHeader = this.cbSelectAll.getParentComponent();
        const parentHeaderGui = parentHeader && parentHeader.getGui();
        if (!parentHeaderGui || !isVisible(parentHeaderGui)) { return; }

        let describedByIds = '';

        if (parentHeaderGui) {
            describedByIds = getAriaDescribedBy(parentHeaderGui);
        }

        const cbSelectAllId = this.cbSelectAll.getInputElement().id;
        const describedByIdsHasSelectAllFeature = describedByIds.indexOf(cbSelectAllId) !== -1;

        if (isSelectAllVisible) {
            if (!describedByIdsHasSelectAllFeature) {
                setAriaDescribedBy(parentHeaderGui, `${cbSelectAllId} ${describedByIds.trim()}`);
            }
        } else if (describedByIdsHasSelectAllFeature) {
            setAriaDescribedBy(parentHeaderGui, describedByIds.trim().split(' ').filter(id => id === cbSelectAllId).join(' '));
        }
    }

    private onModelChanged(): void {
        if (!this.cbSelectAllVisible) { return; }
        this.updateStateOfCheckbox();
    }

    private onSelectionChanged(): void {
        if (!this.cbSelectAllVisible) { return; }
        this.updateStateOfCheckbox();
    }

    private getNextCheckboxState(selectionCount: SelectionCount): boolean | null {
        // if no rows, always have it unselected
        if (selectionCount.selected === 0 && selectionCount.notSelected === 0) {
            return false;
        }

        // if mix of selected and unselected, this is the tri-state
        if (selectionCount.selected > 0 && selectionCount.notSelected > 0) {
            return null;
        }

        // only selected
        if (selectionCount.selected > 0) {
            return true;
        }

        // nothing selected
        return false;
    }

    private updateStateOfCheckbox(): void {
        if (this.processingEventFromCheckbox) { return; }

        this.processingEventFromCheckbox = true;

        const selectionCount = this.getSelectionCount();
        const allSelected = this.getNextCheckboxState(selectionCount);

        this.cbSelectAll.setValue(allSelected!);
        this.refreshSelectAllLabel();

        this.processingEventFromCheckbox = false;
    }

    private refreshSelectAllLabel(): void {
        const translate = this.gridOptionsWrapper.getLocaleTextFunc();
        const checked = this.cbSelectAll.getValue();
        const ariaStatus = checked ? translate('ariaChecked', 'checked') : translate('ariaUnchecked', 'unchecked');
        const ariaLabel = translate('ariaRowSelectAll', 'Press Space to toggle all rows selection');

        this.cbSelectAll.setInputAriaLabel(`${ariaLabel} (${ariaStatus})`);
    }

    private getSelectionCount(): SelectionCount {
        let selectedCount = 0;
        let notSelectedCount = 0;

        const callback = (node: RowNode) => {

            if (this.gridOptionsWrapper.isGroupSelectsChildren() && node.group) { return; }

            if (node.isSelected()) {
                selectedCount++;
            } else if (!node.selectable) {
                // don't count non-selectable nodes!
            } else {
                notSelectedCount++;
            }
        };

        if (this.filteredOnly) {
            this.gridApi.forEachNodeAfterFilter(callback);
        } else {
            this.gridApi.forEachNode(callback);
        }

        return {
            notSelected: notSelectedCount,
            selected: selectedCount
        };
    }

    private checkRightRowModelType(): void {
        const rowModelType = this.rowModel.getType();
        const rowModelMatches = rowModelType === Constants.ROW_MODEL_TYPE_CLIENT_SIDE;

        if (!rowModelMatches) {
            console.warn(`AG Grid: selectAllCheckbox is only available if using normal row model, you are using ${rowModelType}`);
        }
    }

    private onCbSelectAll(): void {
        if (this.processingEventFromCheckbox) { return; }
        if (!this.cbSelectAllVisible) { return; }

        const value = this.cbSelectAll.getValue();

        if (value) {
            this.selectionService.selectAllRowNodes(this.filteredOnly);
        } else {
            this.selectionService.deselectAllRowNodes(this.filteredOnly);
        }
    }

    private isCheckboxSelection(): boolean {
        let result = this.column.getColDef().headerCheckboxSelection;

        if (typeof result === 'function') {
            const func = result as (params: any) => boolean;
            result = func({
                column: this.column,
                colDef: this.column.getColDef(),
                columnApi: this.columnApi,
                api: this.gridApi
            });
        }

        if (result) {
            if (this.gridOptionsWrapper.isRowModelServerSide()) {
                console.warn('headerCheckboxSelection is not supported for Server Side Row Model');
                return false;
            }
            if (this.gridOptionsWrapper.isRowModelInfinite()) {
                console.warn('headerCheckboxSelection is not supported for Infinite Row Model');
                return false;
            }
            if (this.gridOptionsWrapper.isRowModelViewport()) {
                console.warn('headerCheckboxSelection is not supported for Viewport Row Model');
                return false;
            }
            // otherwise the row model is compatible, so return true
            return true;
        }

        return false;
    }

}

interface SelectionCount {
    selected: number;
    notSelected: number;
}
