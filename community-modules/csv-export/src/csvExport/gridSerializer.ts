import {
    _,
    Autowired,
    Bean,
    BeanStub,
    Column,
    ColumnModel,
    ColumnGroup,
    ColumnGroupChild,
    Constants,
    DisplayedGroupCreator,
    ExportParams,
    GroupInstanceIdCreator,
    IClientSideRowModel,
    IRowModel,
    IServerSideRowModel,
    PinnedRowModel,
    ProcessGroupHeaderForExportParams,
    RowNode,
    SelectionService,
    ShouldRowBeSkippedParams
} from "@ag-grid-community/core";
import { GridSerializingSession, RowAccumulator, RowSpanningAccumulator } from "./interfaces";

type ProcessGroupHeaderCallback = (params: ProcessGroupHeaderForExportParams) => string;

export enum RowType { HEADER_GROUPING, HEADER, BODY }

@Bean("gridSerializer")
export class GridSerializer extends BeanStub {

    @Autowired('displayedGroupCreator') private displayedGroupCreator: DisplayedGroupCreator;
    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('rowModel') private rowModel: IRowModel;
    @Autowired('pinnedRowModel') private pinnedRowModel: PinnedRowModel;
    @Autowired('selectionService') private selectionService: SelectionService;

    public serialize<T>(gridSerializingSession: GridSerializingSession<T>, params: ExportParams<T> = {}): string {
        const columnsToExport = this.getColumnsToExport(params.allColumns, params.columnKeys);

        const serializeChain = _.compose(
            // first pass, put in the header names of the cols
            this.prepareSession(columnsToExport),
            this.prependContent(params),
            this.exportColumnGroups(params, columnsToExport),
            this.exportHeaders(params, columnsToExport),
            this.processPinnedTopRows(params, columnsToExport),
            this.processRows(params, columnsToExport),
            this.processPinnedBottomRows(params, columnsToExport),
            this.appendContent(params)
        );

        return serializeChain(gridSerializingSession).parse();
    }

    private processRow<T>(gridSerializingSession: GridSerializingSession<T>, params: ExportParams<T>, columnsToExport: Column[], node: RowNode): void {
        const rowSkipper: (params: ShouldRowBeSkippedParams) => boolean = params.shouldRowBeSkipped || (() => false);
        const gridOptionsWrapper = this.gridOptionsWrapper;
        const context = gridOptionsWrapper.getContext();
        const api = gridOptionsWrapper.getApi()!;
        const columnApi = gridOptionsWrapper.getColumnApi()!;
        const skipSingleChildrenGroup = gridOptionsWrapper.isGroupRemoveSingleChildren();
        const hideOpenParents = gridOptionsWrapper.isGroupHideOpenParents();
        const skipLowestSingleChildrenGroup = gridOptionsWrapper.isGroupRemoveLowestSingleChildren();
        const isLeafNode = this.columnModel.isPivotMode() ? node.leafGroup : !node.group;
        const skipRowGroups = params.skipGroups || params.skipRowGroups;
        const shouldSkipLowestGroup = skipLowestSingleChildrenGroup && node.leafGroup;
        const shouldSkipCurrentGroup = node.allChildrenCount === 1 && (skipSingleChildrenGroup || shouldSkipLowestGroup);

        if (skipRowGroups && params.skipGroups) {
            _.doOnce(() => console.warn('AG Grid: Since v25.2 `skipGroups` has been renamed to `skipRowGroups`.'), 'gridSerializer-skipGroups');
        }

        if (
            (!isLeafNode && (params.skipRowGroups || shouldSkipCurrentGroup || hideOpenParents)) ||
            (params.onlySelected && !node.isSelected()) ||
            (params.skipPinnedTop && node.rowPinned === 'top') ||
            (params.skipPinnedBottom && node.rowPinned === 'bottom')
        ) {
            return;
        }

        // if we are in pivotMode, then the grid will show the root node only
        // if it's not a leaf group
        const nodeIsRootNode = node.level === -1;

        if (nodeIsRootNode && !node.leafGroup) { return; }

        const shouldRowBeSkipped: boolean = rowSkipper({ node, api, context });

        if (shouldRowBeSkipped) { return; }

        const rowAccumulator: RowAccumulator = gridSerializingSession.onNewBodyRow();
        columnsToExport.forEach((column: Column, index: number) => {
            rowAccumulator.onColumn(column, index, node);
        });

        if (params.getCustomContentBelowRow) {
            const content = params.getCustomContentBelowRow({ node, api, columnApi, context });
            if (content) {
                gridSerializingSession.addCustomContent(content);
            }
        }
    }

    private appendContent<T>(params: ExportParams<T>): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession: GridSerializingSession<T>) => {
            const appendContent = params.customFooter || params.appendContent;
            if (appendContent) {
                if (params.customFooter) {
                    _.doOnce(() => console.warn('AG Grid: Since version 25.2.0 the `customFooter` param has been deprecated. Use `appendContent` instead.'), 'gridSerializer-customFooter');
                }
                gridSerializingSession.addCustomContent(appendContent);
            }
            return gridSerializingSession;
        }
    }

    private prependContent<T>(params: ExportParams<T>): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession: GridSerializingSession<T>) => {
            const prependContent = params.customHeader || params.prependContent;
            if (prependContent) {
                if (params.customHeader) {
                    _.doOnce(() => console.warn('AG Grid: Since version 25.2.0 the `customHeader` param has been deprecated. Use `prependContent` instead.'), 'gridSerializer-customHeader');
                }
                gridSerializingSession.addCustomContent(prependContent);
            }
            return gridSerializingSession;
        }
    }

    private prepareSession<T>(columnsToExport: Column[]): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession) => {
            gridSerializingSession.prepare(columnsToExport);
            return gridSerializingSession;
        }
    }

    private exportColumnGroups<T>(params: ExportParams<T>, columnsToExport: Column[]): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession) => {
            if (!params.skipColumnGroupHeaders) {
                const groupInstanceIdCreator: GroupInstanceIdCreator = new GroupInstanceIdCreator();
                const displayedGroups: ColumnGroupChild[] = this.displayedGroupCreator.createDisplayedGroups(
                    columnsToExport,
                    this.columnModel.getGridBalancedTree(),
                    groupInstanceIdCreator,
                    null
                );
                this.recursivelyAddHeaderGroups(displayedGroups, gridSerializingSession, params.processGroupHeaderCallback);
            } else if (params.columnGroups) {
                _.doOnce(() => console.warn('AG Grid: Since v25.2 the `columnGroups` param has deprecated, and groups are exported by default.'), 'gridSerializer-columnGroups');
            }
            return gridSerializingSession;
        }
    }

    private exportHeaders<T>(params: ExportParams<T>, columnsToExport: Column[]): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession) => {
            if (!params.skipHeader && !params.skipColumnHeaders) {
                const gridRowIterator = gridSerializingSession.onNewHeaderRow();
                columnsToExport.forEach((column, index) => {
                gridRowIterator.onColumn(column, index, undefined);
            });
            } else if (params.skipHeader) {
                _.doOnce(() => console.warn('AG Grid: Since v25.2 the `skipHeader` param has been renamed to `skipColumnHeaders`.'), 'gridSerializer-skipHeader');
            }
            return gridSerializingSession;
        }
    }

    private processPinnedTopRows<T>(params: ExportParams<T>, columnsToExport: Column[]): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession) => {
            const processRow = this.processRow.bind(this, gridSerializingSession, params, columnsToExport);
            this.pinnedRowModel.forEachPinnedTopRow(processRow);
            return gridSerializingSession;
        }
    }

    private processRows<T>(params: ExportParams<T>, columnsToExport: Column[]): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession) => {
            // when in pivot mode, we always render cols on screen, never 'all columns'
            const rowModel = this.rowModel;
            const rowModelType = rowModel.getType();
            const usingCsrm = rowModelType === Constants.ROW_MODEL_TYPE_CLIENT_SIDE;
            const usingSsrm = rowModelType === Constants.ROW_MODEL_TYPE_SERVER_SIDE;
            const onlySelectedNonStandardModel = !usingCsrm && params.onlySelected;
            const processRow = this.processRow.bind(this, gridSerializingSession, params, columnsToExport);

            if (this.columnModel.isPivotMode()) {
                if (usingCsrm) {
                    (rowModel as IClientSideRowModel).forEachPivotNode(processRow);
                } else {
                    // must be enterprise, so we can just loop through all the nodes
                    rowModel.forEachNode(processRow);
                }
            } else {
                // onlySelectedAllPages: user doing pagination and wants selected items from
                // other pages, so cannot use the standard row model as it won't have rows from
                // other pages.
                // onlySelectedNonStandardModel: if user wants selected in non standard row model
                // (eg viewport) then again RowModel cannot be used, so need to use selected instead.
                if (params.onlySelectedAllPages || onlySelectedNonStandardModel) {
                    const selectedNodes = this.selectionService.getSelectedNodes();
                    selectedNodes.forEach(processRow);
                } else {
                    // here is everything else - including standard row model and selected. we don't use
                    // the selection model even when just using selected, so that the result is the order
                    // of the rows appearing on the screen.
                    if (usingCsrm) {
                        (rowModel as IClientSideRowModel).forEachNodeAfterFilterAndSort(processRow);
                    } else if (usingSsrm) {
                        (rowModel as IServerSideRowModel).forEachNodeAfterFilterAndSort(processRow);
                    } else {
                        rowModel.forEachNode(processRow);
                    }
                }
            }
            return gridSerializingSession;
        }
    }

    private processPinnedBottomRows<T>(params: ExportParams<T>, columnsToExport: Column[]): (gridSerializingSession: GridSerializingSession<T>) => GridSerializingSession<T> {
        return (gridSerializingSession) => {
            const processRow = this.processRow.bind(this, gridSerializingSession, params, columnsToExport);
            this.pinnedRowModel.forEachPinnedBottomRow(processRow);
            return gridSerializingSession;
        }
    }

    private getColumnsToExport(allColumns: boolean = false, columnKeys?: (string | Column)[]): Column[] {
        const isPivotMode = this.columnModel.isPivotMode();

        if (columnKeys && columnKeys.length) {
            return this.columnModel.getGridColumns(columnKeys);
        }

        if (allColumns && !isPivotMode) {
            // add auto group column for tree data
           const columns = this.gridOptionsWrapper.isTreeData()
                ? this.columnModel.getGridColumns([Constants.GROUP_AUTO_COLUMN_ID])
                : [];

            return columns.concat(this.columnModel.getAllPrimaryColumns() || []);
        }

        return this.columnModel.getAllDisplayedColumns();
    }

    private recursivelyAddHeaderGroups<T>(displayedGroups: ColumnGroupChild[], gridSerializingSession: GridSerializingSession<T>, processGroupHeaderCallback: ProcessGroupHeaderCallback | undefined): void {
        const directChildrenHeaderGroups: ColumnGroupChild[] = [];
        displayedGroups.forEach((columnGroupChild: ColumnGroupChild) => {
            const columnGroup: ColumnGroup = columnGroupChild as ColumnGroup;
            if (!columnGroup.getChildren) {
                return;
            }
            columnGroup.getChildren()!.forEach(it => directChildrenHeaderGroups.push(it));
        });

        if (displayedGroups.length > 0 && displayedGroups[0] instanceof ColumnGroup) {
            this.doAddHeaderHeader(gridSerializingSession, displayedGroups, processGroupHeaderCallback);
        }

        if (directChildrenHeaderGroups && directChildrenHeaderGroups.length > 0) {
            this.recursivelyAddHeaderGroups(directChildrenHeaderGroups, gridSerializingSession, processGroupHeaderCallback);
        }
    }

    private doAddHeaderHeader<T>(gridSerializingSession: GridSerializingSession<T>, displayedGroups: ColumnGroupChild[], processGroupHeaderCallback: ProcessGroupHeaderCallback | undefined) {
        const gridRowIterator: RowSpanningAccumulator = gridSerializingSession.onNewHeaderGroupingRow();
        let columnIndex: number = 0;
        displayedGroups.forEach((columnGroupChild: ColumnGroupChild) => {
            const columnGroup: ColumnGroup = columnGroupChild as ColumnGroup;

            let name: string;
            if (processGroupHeaderCallback) {
                name = processGroupHeaderCallback({
                    columnGroup: columnGroup,
                    api: this.gridOptionsWrapper.getApi(),
                    columnApi: this.gridOptionsWrapper.getColumnApi(),
                    context: this.gridOptionsWrapper.getContext()
                });
            } else {
                name = this.columnModel.getDisplayNameForColumnGroup(columnGroup, 'header')!;
            }

            gridRowIterator.onColumn(name || '', columnIndex++, columnGroup.getLeafColumns().length - 1);
        });
    }
}
