import { IRowModel } from './iRowModel';
import { RowNodeTransaction } from './rowNodeTransaction';
import { RowDataTransaction } from './rowDataTransaction';
import { RowNode } from '../entities/rowNode';
import { ChangedPath } from '../utils/changedPath';

export enum ClientSideRowModelSteps {
    EVERYTHING = 'group',
    FILTER = 'filter',
    SORT = 'sort',
    MAP = 'map',
    AGGREGATE = 'aggregate',
    PIVOT = 'pivot',
    NOTHING = 'nothing'
}

export interface IClientSideRowModel extends IRowModel {
    updateRowData(rowDataTran: RowDataTransaction, rowNodeOrder?: { [id: string]: number; } | null): RowNodeTransaction | null;
    setRowData(rowData: any[]): void;
    refreshModel(params: RefreshModelParams): void;
    expandOrCollapseAll(expand: boolean): void;
    forEachLeafNode(callback: (node: RowNode, index: number) => void): void;
    forEachNode(callback: (node: RowNode, index: number) => void): void;
    forEachNodeAfterFilter(callback: (node: RowNode, index: number) => void): void;
    forEachNodeAfterFilterAndSort(callback: (node: RowNode, index: number) => void): void;
    resetRowHeights(): void;
    onRowHeightChanged(): void;
    batchUpdateRowData(rowDataTransaction: RowDataTransaction, callback?: (res: RowNodeTransaction) => void): void;
    flushAsyncTransactions(): void;
    getRootNode(): RowNode;
    doAggregate(changedPath?: ChangedPath): void;
    getTopLevelNodes(): RowNode[] | null;
    forEachPivotNode(callback: (node: RowNode, index: number) => void): void;
    ensureRowsAtPixel(rowNode: RowNode[], pixel: number, increment: number): boolean;
    highlightRowAtPixel(rowNode: RowNode | null, pixel?: number): void;
    getHighlightPosition(pixel: number, rowNode?: RowNode): 'above' | 'below';
    getLastHighlightedRowNode(): RowNode | null;
}

export interface RefreshModelParams {
    // how much of the pipeline to execute
    step: ClientSideRowModelSteps;
    // what state to reset the groups back to after the refresh
    groupState?: any;
    // if NOT new data, then this flag tells grid to check if rows already
    // exist for the nodes (matching by node id) and reuses the row if it does.
    keepRenderedRows?: boolean;
    // if true, rows that are kept are animated to the new position
    animate?: boolean;
    // if true, then rows we are editing will be kept
    keepEditingRows?: boolean;
    // if doing delta updates, this has the changes that were done
    rowNodeTransactions?: RowNodeTransaction[];
    // if doing delta updates, this has the order of the nodes
    rowNodeOrder?: { [id: string]: number };
    // true user called setRowData() (or a new page in pagination). the grid scrolls
    // back to the top when this is true.
    newData?: boolean;
    // true if this update is due to columns changing, ie no rows were changed
    afterColumnsChanged?: boolean;
}
