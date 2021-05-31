import {
    _,
    LoadSuccessParams,
    Autowired,
    Column,
    ColumnModel,
    Logger,
    LoggerFactory,
    NumberSequence,
    PostConstruct,
    PreDestroy,
    Qualifier,
    RowBounds,
    RowNode,
    RowNodeBlock,
    ServerSideStoreParams,
    RowNodeBlockLoader
} from "@ag-grid-community/core";
import { StoreUtils } from "../stores/storeUtils";
import { BlockUtils } from "./blockUtils";
import { SSRMParams } from "../serverSideRowModel";
import { PartialStore } from "../stores/partialStore";
import { NodeManager } from "../nodeManager";

export class PartialStoreBlock extends RowNodeBlock {

    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('ssrmCacheUtils') private cacheUtils: StoreUtils;
    @Autowired('ssrmBlockUtils') private blockUtils: BlockUtils;
    @Autowired('ssrmNodeManager') private nodeManager: NodeManager;
    @Autowired('rowNodeBlockLoader') private rowNodeBlockLoader: RowNodeBlockLoader;

    private logger: Logger;

    private readonly ssrmParams: SSRMParams;
    private readonly storeParams: ServerSideStoreParams;
    private readonly startRow: number;

    private readonly level: number;
    private readonly groupLevel: boolean | undefined;
    private readonly leafGroup: boolean;

    private readonly parentStore: PartialStore;
    private readonly parentRowNode: RowNode;

    private usingTreeData: boolean;

    private lastAccessed: number;

    // when user is provide the id's, we also keep a map of ids to row nodes for convenience
    private allNodesMap: {[id:string]: RowNode};

    public rowNodes: RowNode[];

    private displayIndexStart: number | undefined;
    private displayIndexEnd: number | undefined;

    private blockTopPx: number;
    private blockHeightPx: number;

    private groupField: string;
    private rowGroupColumn: Column;
    private nodeIdPrefix: string | undefined;

    constructor(blockNumber: number, parentRowNode: RowNode, ssrmParams: SSRMParams,
                storeParams: ServerSideStoreParams, parentStore: PartialStore) {
        super(blockNumber);

        this.ssrmParams = ssrmParams;
        this.storeParams = storeParams;
        this.parentRowNode = parentRowNode;

        // we don't need to calculate these now, as the inputs don't change,
        // however it makes the code easier to read if we work them out up front
        this.startRow = blockNumber * storeParams.cacheBlockSize!;

        this.parentStore = parentStore;
        this.level = parentRowNode.level + 1;
        this.groupLevel = ssrmParams.rowGroupCols ? this.level < ssrmParams.rowGroupCols.length : undefined;
        this.leafGroup = ssrmParams.rowGroupCols ? this.level === ssrmParams.rowGroupCols.length - 1 : false;
    }

    @PostConstruct
    protected postConstruct(): void {
        this.usingTreeData = this.gridOptionsWrapper.isTreeData();

        if (!this.usingTreeData && this.groupLevel) {
            const groupColVo = this.ssrmParams.rowGroupCols[this.level];
            this.groupField = groupColVo.field!;
            this.rowGroupColumn = this.columnModel.getRowGroupColumns()[this.level];
        }

        this.nodeIdPrefix = this.blockUtils.createNodeIdPrefix(this.parentRowNode);
        this.setData([]);
    }

    public isDisplayIndexInBlock(displayIndex: number): boolean {
        return displayIndex >= this.displayIndexStart! && displayIndex < this.displayIndexEnd!;
    }

    public isBlockBefore(displayIndex: number): boolean {
        return displayIndex >= this.displayIndexEnd!;
    }

    public getDisplayIndexStart(): number | undefined {
        return this.displayIndexStart;
    }

    public getDisplayIndexEnd(): number | undefined {
        return this.displayIndexEnd;
    }

    public getBlockHeightPx(): number {
        return this.blockHeightPx;
    }

    public getBlockTopPx(): number {
        return this.blockTopPx;
    }

    public isGroupLevel(): boolean | undefined {
        return this.groupLevel;
    }

    public getGroupField(): string {
        return this.groupField;
    }

    private prefixId(id: number): string {
        if (this.nodeIdPrefix!=null) {
            return this.nodeIdPrefix + '-' + id;
        } else {
            return id.toString();
        }
    }

    public getBlockStateJson(): {id: string, state: any} {
        return {
            id: this.prefixId(this.getId()),
            state: {
                blockNumber: this.getId(),
                startRow: this.startRow,
                endRow: this.startRow + this.storeParams.cacheBlockSize!,
                pageStatus: this.getState()
            }
        };
    }

    public isAnyNodeOpen(): boolean {
        const openNodeCount = this.rowNodes.filter(node => node.expanded).length;
        return openNodeCount > 0;
    }

    // this method is repeated, see forEachRowNode, why?
    private forEachNode(callback: (rowNode: RowNode, index: number) => void,
                        sequence: NumberSequence = new NumberSequence(),
                        includeChildren: boolean, filterAndSort: boolean): void {
        this.rowNodes.forEach(rowNode => {
            callback(rowNode, sequence.next());

            // this will only every happen for server side row model, as infinite
            // row model doesn't have groups
            if (includeChildren && rowNode.childStore) {
                const childStore = rowNode.childStore;
                if (filterAndSort) {
                    childStore.forEachNodeDeepAfterFilterAndSort(callback, sequence);
                } else {
                    childStore.forEachNodeDeep(callback, sequence);
                }
            }
        });
    }

    public forEachNodeDeep(callback: (rowNode: RowNode, index: number) => void, sequence?: NumberSequence): void {
        this.forEachNode(callback, sequence, true, false);
    }

    public forEachNodeAfterFilterAndSort(callback: (rowNode: RowNode, index: number) => void, sequence?: NumberSequence): void {
        this.forEachNode(callback, sequence, true, true);
    }

    public forEachNodeShallow(callback: (rowNode: RowNode) => void, sequence?: NumberSequence): void {
        this.forEachNode(callback, sequence, false, false);
    }

    public getLastAccessed(): number {
        return this.lastAccessed;
    }

    public getRowUsingLocalIndex(rowIndex: number): RowNode {
        return this.rowNodes[rowIndex - this.startRow];
    }

    private touchLastAccessed(): void {
        this.lastAccessed = this.ssrmParams.lastAccessedSequence.next();
    }

    protected processServerFail(): void {
        this.parentStore.onBlockLoadFailed(this);
    }

    public retryLoads(): void {
        if (this.getState() === RowNodeBlock.STATE_FAILED) {
            this.setStateWaitingToLoad();
            this.rowNodeBlockLoader.checkBlockToLoad();
            this.setData();
        }

        this.forEachNodeShallow(node => {
            if (node.childStore) {
                node.childStore.retryLoads();
            }
        });
    }

    protected processServerResult(params: LoadSuccessParams): void {
        this.parentStore.onBlockLoaded(this, params);
    }

    public setData(rows: any[] = [], failedLoad = false): void {

        this.destroyRowNodes();

        const storeRowCount = this.parentStore.getRowCount();
        const startRow = this.getId() * this.storeParams.cacheBlockSize!;
        const endRow = Math.min(startRow + this.storeParams.cacheBlockSize!, storeRowCount);
        const rowsToCreate = endRow - startRow;

        for (let i = 0; i < rowsToCreate; i++) {
            const rowNode = this.blockUtils.createRowNode(
                {field: this.groupField, group: this.groupLevel!, leafGroup: this.leafGroup,
                    level: this.level, parent: this.parentRowNode, rowGroupColumn: this.rowGroupColumn}
            );
            const dataLoadedForThisRow = i < rows.length;
            if (dataLoadedForThisRow) {
                const data = rows[i];
                const defaultId = this.prefixId(this.startRow + i);
                this.blockUtils.setDataIntoRowNode(rowNode, data, defaultId);
                const newId = rowNode.id;
                this.parentStore.removeDuplicateNode(newId!);
                this.nodeManager.addRowNode(rowNode);
                this.allNodesMap[rowNode.id!] = rowNode;
                this.blockUtils.checkOpenByDefault(rowNode);
            }
            this.rowNodes.push(rowNode);

            if (failedLoad) {
                rowNode.failedLoad = true;
            }
        }
    }

    // to safeguard the grid against duplicate nodes, when a row is loaded, we check
    // for another row in the same cache. if another row does exist, we delete it.
    // this covers for when user refreshes the store (which typically happens after a
    // data change) and the same row ends up coming back in a different block, and the
    // new block finishes refreshing before the old block has finished refreshing.
    public removeDuplicateNode(id: string): void {
        const rowNode = this.allNodesMap[id];
        if (!rowNode) { return; }

        this.blockUtils.destroyRowNode(rowNode);

        const index = this.rowNodes.indexOf(rowNode);

        const stubRowNode = this.blockUtils.createRowNode(
            {field: this.groupField, group: this.groupLevel!, leafGroup: this.leafGroup,
                level: this.level, parent: this.parentRowNode, rowGroupColumn: this.rowGroupColumn}
        );

        this.rowNodes[index] = stubRowNode;
    }

    public refresh(): void {
        if (this.getState() !== RowNodeBlock.STATE_WAITING_TO_LOAD) {
            this.setStateWaitingToLoad();
        }
    }

    @PreDestroy
    private destroyRowNodes(): void {
        this.blockUtils.destroyRowNodes(this.rowNodes);
        this.rowNodes = [];
        this.allNodesMap = {};
    }

    private setBeans(@Qualifier('loggerFactory') loggerFactory: LoggerFactory) {
        this.logger = loggerFactory.create('ServerSideBlock');
    }

    public getRowUsingDisplayIndex(displayRowIndex: number): RowNode | null {
        this.touchLastAccessed();
        const res = this.blockUtils.binarySearchForDisplayIndex(displayRowIndex, this.rowNodes);
        return res;
    }

    protected loadFromDatasource(): void {
        this.cacheUtils.loadFromDatasource({
            startRow: this.startRow,
            endRow: this.startRow + this.storeParams.cacheBlockSize!,
            parentNode: this.parentRowNode,
            storeParams: this.ssrmParams,
            successCallback: this.pageLoaded.bind(this, this.getVersion()),
            success: this.success.bind(this, this.getVersion()),
            failCallback: this.pageLoadFailed.bind(this, this.getVersion()),
            fail: this.pageLoadFailed.bind(this, this.getVersion())
        });
    }

    public isPixelInRange(pixel: number): boolean {
        return pixel >= this.blockTopPx && pixel < (this.blockTopPx + this.blockHeightPx);
    }

    public getRowBounds(index: number): RowBounds | undefined {
        this.touchLastAccessed();

        let res: RowBounds | undefined;
        _.find(this.rowNodes, rowNode => {
            res = this.blockUtils.extractRowBounds(rowNode, index);
            return res != null;
        });

        return res;
    }

    public getRowIndexAtPixel(pixel: number): number | null {
        this.touchLastAccessed();

        let res: number | null = null;

        _.find(this.rowNodes, rowNode => {
            res = this.blockUtils.getIndexAtPixel(rowNode, pixel);
            return res != null;
        });

        return res;
    }

    public clearDisplayIndexes(): void {
        this.displayIndexEnd = undefined;
        this.displayIndexStart = undefined;
        this.rowNodes.forEach(rowNode => this.blockUtils.clearDisplayIndex(rowNode));
    }

    public setDisplayIndexes(displayIndexSeq: NumberSequence,
                             nextRowTop: { value: number }): void {
        this.displayIndexStart = displayIndexSeq.peek();
        this.blockTopPx = nextRowTop.value;

        this.rowNodes.forEach(rowNode => this.blockUtils.setDisplayIndex(rowNode, displayIndexSeq, nextRowTop));

        this.displayIndexEnd = displayIndexSeq.peek();
        this.blockHeightPx = nextRowTop.value - this.blockTopPx;
    }

}
