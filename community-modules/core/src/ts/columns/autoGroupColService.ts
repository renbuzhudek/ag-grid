import { Autowired, Bean } from "../context/context";
import { Column } from "../entities/column";
import { ColDef } from "../entities/colDef";
import { ColumnModel } from "./columnModel";
import { ColumnFactory } from "./columnFactory";
import { Constants } from "../constants/constants";
import { BeanStub } from "../context/beanStub";
import { mergeDeep, assign } from "../utils/object";
import { missing } from "../utils/generic";

@Bean('autoGroupColService')
export class AutoGroupColService extends BeanStub {

    public static GROUP_AUTO_COLUMN_BUNDLE_ID = Constants.GROUP_AUTO_COLUMN_ID;

    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('columnFactory') private columnFactory: ColumnFactory;

    public createAutoGroupColumns(rowGroupColumns: Column[]): Column[] {
        const groupAutoColumns: Column[] = [];

        const doingTreeData = this.gridOptionsWrapper.isTreeData();
        let doingMultiAutoColumn = this.gridOptionsWrapper.isGroupMultiAutoColumn();

        if (doingTreeData && doingMultiAutoColumn) {
            console.warn('AG Grid: you cannot mix groupMultiAutoColumn with treeData, only one column can be used to display groups when doing tree data');
            doingMultiAutoColumn = false;
        }

        // if doing groupMultiAutoColumn, then we call the method multiple times, once
        // for each column we are grouping by
        if (doingMultiAutoColumn) {
            rowGroupColumns.forEach((rowGroupCol: Column, index: number) => {
                groupAutoColumns.push(this.createOneAutoGroupColumn(rowGroupCol, index));
            });
        } else {
            groupAutoColumns.push(this.createOneAutoGroupColumn());
        }

        return groupAutoColumns;
    }

    // rowGroupCol and index are missing if groupMultiAutoColumn=false
    private createOneAutoGroupColumn(rowGroupCol?: Column, index?: number): Column {
        // if one provided by user, use it, otherwise create one
        let defaultAutoColDef: ColDef = this.generateDefaultColDef(rowGroupCol);
        // if doing multi, set the field
        let colId: string;
        if (rowGroupCol) {
            colId = `${Constants.GROUP_AUTO_COLUMN_ID}-${rowGroupCol.getId()}`;
        } else {
            colId = AutoGroupColService.GROUP_AUTO_COLUMN_BUNDLE_ID;
        }

        const userAutoColDef = this.gridOptionsWrapper.getAutoGroupColumnDef();
        mergeDeep(defaultAutoColDef, userAutoColDef);

        defaultAutoColDef = this.columnFactory.mergeColDefs(defaultAutoColDef);

        defaultAutoColDef.colId = colId;

        // For tree data the filter is always allowed
        if (!this.gridOptionsWrapper.isTreeData()) {
            // we would only allow filter if the user has provided field or value getter. otherwise the filter
            // would not be able to work.
            const noFieldOrValueGetter = missing(defaultAutoColDef.field) && missing(defaultAutoColDef.valueGetter) && missing(defaultAutoColDef.filterValueGetter);
            if (noFieldOrValueGetter) {
                defaultAutoColDef.filter = false;
            }
        }

        // if showing many cols, we don't want to show more than one with a checkbox for selection
        if (index && index > 0) {
            defaultAutoColDef.headerCheckboxSelection = false;
        }

        const newCol = new Column(defaultAutoColDef, null, colId, true);
        this.context.createBean(newCol);

        return newCol;
    }

    private generateDefaultColDef(rowGroupCol?: Column): ColDef {
        const userDef = this.gridOptionsWrapper.getAutoGroupColumnDef();
        const localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();

        const res: ColDef = {
            headerName: localeTextFunc('group', 'Group')
        };

        const userHasProvidedGroupCellRenderer =
            userDef &&
            (userDef.cellRenderer || userDef.cellRendererFramework || userDef.cellRendererSelector);

        // only add the default group cell renderer if user hasn't provided one
        if (!userHasProvidedGroupCellRenderer) {
            res.cellRenderer = 'agGroupCellRenderer';
        }

        // we never allow moving the group column
        // defaultAutoColDef.suppressMovable = true;

        if (rowGroupCol) {
            const colDef = rowGroupCol.getColDef();
            assign(res, {
                // cellRendererParams.groupKey: colDefToCopy.field;
                headerName: this.columnModel.getDisplayNameForColumn(rowGroupCol, 'header'),
                headerValueGetter: colDef.headerValueGetter
            });

            if (colDef.cellRenderer) {
                assign(res, {
                    cellRendererParams: {
                        innerRenderer: colDef.cellRenderer,
                        innerRendererParams: colDef.cellRendererParams
                    }
                });
            }

            res.showRowGroup = rowGroupCol.getColId();
        } else {
            res.showRowGroup = true;
        }

        return res;
    }

}
