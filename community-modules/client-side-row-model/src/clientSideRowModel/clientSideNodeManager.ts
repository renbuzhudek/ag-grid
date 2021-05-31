import {
    _,
    ColumnApi,
    ColumnModel,
    Context,
    Events,
    EventService,
    GridApi,
    GridOptionsWrapper,
    IsRowMaster,
    RowDataTransaction,
    RowNode,
    RowNodeTransaction,
    SelectionChangedEvent,
    SelectionService
} from "@ag-grid-community/core";

export class ClientSideNodeManager {

    private static TOP_LEVEL = 0;

    private readonly columnApi: ColumnApi;
    private readonly gridApi: GridApi;
    private readonly rootNode: RowNode;

    private gridOptionsWrapper: GridOptionsWrapper;
    private context: Context;
    private eventService: EventService;
    private columnModel: ColumnModel;
    private selectionService: SelectionService;

    private nextId = 0;

    private static ROOT_NODE_ID = 'ROOT_NODE_ID';

    private isRowMasterFunc?: IsRowMaster;
    private suppressParentsInRowNodes: boolean;

    private doingTreeData: boolean;
    private doingMasterDetail: boolean;

    // when user is provide the id's, we also keep a map of ids to row nodes for convenience
    private allNodesMap: {[id:string]: RowNode} = {};

    constructor(rootNode: RowNode, gridOptionsWrapper: GridOptionsWrapper, context: Context, eventService: EventService,
                columnModel: ColumnModel, gridApi: GridApi, columnApi: ColumnApi,
                selectionService: SelectionService) {
        this.rootNode = rootNode;
        this.gridOptionsWrapper = gridOptionsWrapper;
        this.context = context;
        this.eventService = eventService;
        this.columnModel = columnModel;
        this.gridApi = gridApi;
        this.columnApi = columnApi;
        this.selectionService = selectionService;

        this.rootNode.group = true;
        this.rootNode.level = -1;
        this.rootNode.id = ClientSideNodeManager.ROOT_NODE_ID;
        this.rootNode.allLeafChildren = [];
        this.rootNode.childrenAfterGroup = [];
        this.rootNode.childrenAfterSort = [];
        this.rootNode.childrenAfterFilter = [];

        // if we make this class a bean, then can annotate postConstruct
        this.postConstruct();
    }

    // @PostConstruct - this is not a bean, so postConstruct called by constructor
    public postConstruct(): void {
        // func below doesn't have 'this' pointer, so need to pull out these bits
        this.suppressParentsInRowNodes = this.gridOptionsWrapper.isSuppressParentsInRowNodes();
        this.isRowMasterFunc = this.gridOptionsWrapper.getIsRowMasterFunc();
        this.doingTreeData = this.gridOptionsWrapper.isTreeData();
        this.doingMasterDetail = this.gridOptionsWrapper.isMasterDetail();
    }

    public getCopyOfNodesMap(): {[id:string]: RowNode} {
        return _.cloneObject(this.allNodesMap);
    }

    public getRowNode(id: string): RowNode {
        return this.allNodesMap[id];
    }

    public setRowData(rowData: any[]): RowNode[] | undefined {
        this.rootNode.childrenAfterFilter = null;
        this.rootNode.childrenAfterGroup = null;
        this.rootNode.childrenAfterSort = null;
        this.rootNode.childrenMapped = null;
        this.rootNode.updateHasChildren();

        this.nextId = 0;
        this.allNodesMap = {};

        if (!rowData) {
            this.rootNode.allLeafChildren = [];
            this.rootNode.childrenAfterGroup = [];
            return;
        }

        // kick off recursion
        // we add rootNode as the parent, however if using ag-grid-enterprise, the grouping stage
        // sets the parent node on each row (even if we are not grouping). so setting parent node
        // here is for benefit of ag-grid-community users
        this.rootNode.allLeafChildren = this.recursiveFunction(rowData, this.rootNode, ClientSideNodeManager.TOP_LEVEL)!;
    }

    public updateRowData(rowDataTran: RowDataTransaction, rowNodeOrder: {[id:string]: number} | null | undefined): RowNodeTransaction {
        const rowNodeTransaction: RowNodeTransaction = {
            remove: [],
            update: [],
            add: []
        };

        const nodesToUnselect: RowNode[] = [];

        this.executeRemove(rowDataTran, rowNodeTransaction, nodesToUnselect);
        this.executeUpdate(rowDataTran, rowNodeTransaction, nodesToUnselect);
        this.executeAdd(rowDataTran, rowNodeTransaction);

        this.updateSelection(nodesToUnselect);

        if (rowNodeOrder) {
            _.sortRowNodesByOrder(this.rootNode.allLeafChildren, rowNodeOrder);
        }

        return rowNodeTransaction;
    }

    private updateSelection(nodesToUnselect: RowNode[]): void {
        const selectionChanged = nodesToUnselect.length > 0;
        if (selectionChanged) {
            nodesToUnselect.forEach(rowNode => {
                rowNode.setSelected(false, false, true);
            });
        }

        // we do this regardless of nodes to unselect or not, as it's possible
        // a new node was inserted, so a parent that was previously selected (as all
        // children were selected) should not be tri-state (as new one unselected against
        // all other selected children).
        this.selectionService.updateGroupsFromChildrenSelections();

        if (selectionChanged) {
            const event: SelectionChangedEvent = {
                type: Events.EVENT_SELECTION_CHANGED,
                api: this.gridApi,
                columnApi: this.columnApi
            };
            this.eventService.dispatchEvent(event);
        }
    }

    private executeAdd(rowDataTran: RowDataTransaction, rowNodeTransaction: RowNodeTransaction): void {
        const {add, addIndex} = rowDataTran;
        if (_.missingOrEmpty(add)) { return; }

        // create new row nodes for each data item
        const newNodes: RowNode[] = add!.map(item => this.createNode(item, this.rootNode, ClientSideNodeManager.TOP_LEVEL));

        // add new row nodes to the root nodes 'allLeafChildren'
        const useIndex = typeof addIndex === 'number' && addIndex >= 0;
        if (useIndex) {
            // new rows are inserted in one go by concatenating them in between the existing rows at the desired index.
            // this is much faster than splicing them individually into 'allLeafChildren' when there are large inserts.
            const existingLeafChildren = this.rootNode.allLeafChildren;
            const nodesBeforeIndex = existingLeafChildren.slice(0, addIndex!);
            const nodesAfterIndex = existingLeafChildren.slice(addIndex!, existingLeafChildren.length);
            this.rootNode.allLeafChildren = [...nodesBeforeIndex, ...newNodes, ...nodesAfterIndex];
        } else {
            this.rootNode.allLeafChildren = [...this.rootNode.allLeafChildren, ...newNodes];
        }

        // add new row nodes to the transaction add items
        rowNodeTransaction.add = newNodes;
    }

    private executeRemove(rowDataTran: RowDataTransaction, rowNodeTransaction: RowNodeTransaction, nodesToUnselect: RowNode[]): void {
        const {remove} = rowDataTran;

        if (_.missingOrEmpty(remove)) { return; }

        const rowIdsRemoved: {[key: string]: boolean} = {};

        remove!.forEach(item => {
            const rowNode = this.lookupRowNode(item);

            if (!rowNode) { return; }

            // do delete - setting 'suppressFinishActions = true' to ensure EVENT_SELECTION_CHANGED is not raised for
            // each row node updated, instead it is raised once by the calling code if any selected nodes exist.
            if (rowNode.isSelected()) {
                nodesToUnselect.push(rowNode);
            }

            // so row renderer knows to fade row out (and not reposition it)
            rowNode.clearRowTopAndRowIndex();

            // NOTE: were we could remove from allLeaveChildren, however _.removeFromArray() is expensive, especially
            // if called multiple times (eg deleting lots of rows) and if allLeafChildren is a large list
            rowIdsRemoved[rowNode.id!] = true;
            // _.removeFromArray(this.rootNode.allLeafChildren, rowNode);
            delete this.allNodesMap[rowNode.id!];

            rowNodeTransaction.remove.push(rowNode);
        });

        this.rootNode.allLeafChildren = this.rootNode.allLeafChildren.filter(rowNode => !rowIdsRemoved[rowNode.id!]);
    }

    private executeUpdate(rowDataTran: RowDataTransaction, rowNodeTransaction: RowNodeTransaction, nodesToUnselect: RowNode[]): void {
        const {update} = rowDataTran;
        if (_.missingOrEmpty(update)) { return; }

        update!.forEach(item => {
            const rowNode = this.lookupRowNode(item);

            if (!rowNode) { return; }

            rowNode.updateData(item);
            if (!rowNode.selectable && rowNode.isSelected()) {
                nodesToUnselect.push(rowNode);
            }

            this.setMasterForRow(rowNode, item, ClientSideNodeManager.TOP_LEVEL, false);

            rowNodeTransaction.update.push(rowNode);
        });
    }

    private lookupRowNode(data: any): RowNode | null {
        const rowNodeIdFunc = this.gridOptionsWrapper.getRowNodeIdFunc();

        let rowNode: RowNode | null;
        if (_.exists(rowNodeIdFunc)) {
            // find rowNode using id
            const id: string = rowNodeIdFunc(data);
            rowNode = this.allNodesMap[id];
            if (!rowNode) {
                console.error(`AG Grid: could not find row id=${id}, data item was not found for this id`);
                return null;
            }
        } else {
            // find rowNode using object references
            rowNode = _.find(this.rootNode.allLeafChildren, node => node.data === data);
            if (!rowNode) {
                console.error(`AG Grid: could not find data item as object was not found`, data);
                return null;
            }
        }

        return rowNode;
    }

    private recursiveFunction(rowData: any[], parent: RowNode, level: number): RowNode[] | undefined {
        // make sure the rowData is an array and not a string of json - this was a commonly reported problem on the forum
        if (typeof rowData === 'string') {
            console.warn('AG Grid: rowData must be an array, however you passed in a string. If you are loading JSON, make sure you convert the JSON string to JavaScript objects first');
            return;
        }

        const rowNodes: RowNode[] = [];
        rowData.forEach((dataItem) => {
            const node = this.createNode(dataItem, parent, level);
            rowNodes.push(node);
        });
        return rowNodes;
    }

    private createNode(dataItem: any, parent: RowNode, level: number): RowNode {
        const node = new RowNode();
        this.context.createBean(node);
        node.group = false;
        this.setMasterForRow(node, dataItem, level, true);

        if (parent && !this.suppressParentsInRowNodes) {
            node.parent = parent;
        }
        node.level = level;
        node.setDataAndId(dataItem, this.nextId.toString());

        if (this.allNodesMap[node.id!]) {
            console.warn(`ag-grid: duplicate node id '${node.id}' detected from getRowNodeId callback, this could cause issues in your grid.`);
        }
        this.allNodesMap[node.id!] = node;

        this.nextId++;

        return node;
    }

    private setMasterForRow(rowNode: RowNode, data: any, level: number, setExpanded: boolean): void {
        if (this.doingTreeData) {
            rowNode.setMaster(false);
            if (setExpanded) {
                rowNode.expanded = false;
            }
        } else {
            // this is the default, for when doing grid data
            if (this.doingMasterDetail) {
                // if we are doing master detail, then the
                // default is that everything can be a Master Row.
                if (this.isRowMasterFunc) {
                    rowNode.setMaster(this.isRowMasterFunc(data));
                } else {
                    rowNode.setMaster(true);
                }
            } else {
                rowNode.setMaster(false);
            }

            if (setExpanded) {
                const rowGroupColumns = this.columnModel.getRowGroupColumns();
                const numRowGroupColumns = rowGroupColumns ? rowGroupColumns.length : 0;

                // need to take row group into account when determining level
                const masterRowLevel = level + numRowGroupColumns;

                rowNode.expanded = rowNode.master ? this.isExpanded(masterRowLevel) : false;
            }
        }
    }

    private isExpanded(level: any) {
        const expandByDefault = this.gridOptionsWrapper.getGroupDefaultExpanded();
        if (expandByDefault === -1) {
            return true;
        }
        return level < expandByDefault!;
    }
}
