import {
    _,
    Autowired,
    Bean,
    BeanStub,
    CellNavigationService,
    CellPosition,
    CellPositionUtils,
    CellRange,
    ChangedPath,
    IClientSideRowModel,
    Column,
    ColumnApi,
    ColumnModel,
    Constants,
    CsvExportParams,
    Events,
    FlashCellsEvent,
    FocusService,
    GridApi,
    GridCtrl,
    IClipboardService,
    IRowModel,
    Logger,
    LoggerFactory,
    PasteEndEvent,
    PasteStartEvent,
    PostConstruct,
    ProcessCellForExportParams,
    ProcessHeaderForExportParams,
    RowNode,
    RowPosition,
    RowPositionUtils,
    RowRenderer,
    RowValueChangedEvent,
    SelectionService,
    ValueService,
    ICsvCreator,
    IRangeService,
    Optional
} from "@ag-grid-community/core";

interface RowCallback {
    (gridRow: RowPosition, rowNode: RowNode | null, columns: Column[], rangeIndex: number, isLastRow?: boolean): void;
}

interface ColumnCallback {
    (columns: Column[]): void;
}

@Bean('clipboardService')
export class ClipboardService extends BeanStub implements IClipboardService {

    @Autowired('csvCreator') private csvCreator: ICsvCreator;
    @Autowired('loggerFactory') private loggerFactory: LoggerFactory;
    @Autowired('selectionService') private selectionService: SelectionService;
    @Optional('rangeService') private rangeService: IRangeService;
    @Autowired('rowModel') private rowModel: IRowModel;

    @Autowired('valueService') private valueService: ValueService;
    @Autowired('focusService') private focusService: FocusService;
    @Autowired('rowRenderer') private rowRenderer: RowRenderer;
    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('cellNavigationService') private cellNavigationService: CellNavigationService;
    @Autowired('columnApi') private columnApi: ColumnApi;
    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('cellPositionUtils') public cellPositionUtils: CellPositionUtils;
    @Autowired('rowPositionUtils') public rowPositionUtils: RowPositionUtils;

    private clientSideRowModel: IClientSideRowModel;
    private logger: Logger;
    private gridCtrl: GridCtrl;

    private navigatorApiFailed = false;

    public registerGridCompController(gridCtrl: GridCtrl): void {
        this.gridCtrl = gridCtrl;
    }

    @PostConstruct
    private init(): void {
        this.logger = this.loggerFactory.create('ClipboardService');

        if (this.rowModel.getType() === Constants.ROW_MODEL_TYPE_CLIENT_SIDE) {
            this.clientSideRowModel = this.rowModel as IClientSideRowModel;
        }
    }

    public pasteFromClipboard(): void {
        this.logger.log('pasteFromClipboard');

        // Method 1 - native clipboard API, available in modern chrome browsers
        const allowNavigator = !this.gridOptionsWrapper.isSuppressClipboardApi();
        // Some browsers (Firefox) do not allow Web Applications to read from
        // the clipboard so verify if not only the ClipboardAPI is available,
        // but also if the `readText` method is public.
        if (allowNavigator && !this.navigatorApiFailed && navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText()
                .then(this.processClipboardData.bind(this))
                .catch((e) => {
                    _.doOnce(() => {
                        console.warn(e);
                        console.warn(
                            'AG Grid: Unable to use the Clipboard API (navigator.clipboard.readText()). ' +
                            'The reason why it could not be used has been logged in the previous line. ' +
                            'For this reason the grid has defaulted to using a workaround which doesn\'t perform as well. ' +
                            'Either fix why Clipboard API is blocked, OR stop this message from appearing by setting grid ' +
                            'property suppressClipboardApi=true (which will default the grid to using the workaround rather than the API');
                    }, 'clipboardApiError');
                    this.navigatorApiFailed = true;
                    this.pasteFromClipboardLegacy();
                });
        } else {
            this.pasteFromClipboardLegacy();
        }
    }

    private pasteFromClipboardLegacy(): void {
        // Method 2 - if modern API fails, the old school hack
        this.executeOnTempElement(
            (textArea: HTMLTextAreaElement) => textArea.focus({ preventScroll: true }),
            (element: HTMLTextAreaElement) => {
                const data = element.value;
                this.processClipboardData(data);
            }
        );
    }

    private processClipboardData(data: string): void {
        if (data == null) { return; }

        let parsedData: string[][] | null = _.stringToArray(data, this.gridOptionsWrapper.getClipboardDeliminator());

        const userFunc = this.gridOptionsWrapper.getProcessDataFromClipboardFunc();

        if (userFunc) {
            parsedData = userFunc({ data: parsedData });
        }

        if (parsedData == null) { return; }

        if (this.gridOptionsWrapper.isSuppressLastEmptyLineOnPaste()) {
            this.removeLastLineIfBlank(parsedData!);
        }

        const pasteOperation = (
            cellsToFlash: any,
            updatedRowNodes: RowNode[],
            focusedCell: CellPosition,
            changedPath: ChangedPath | undefined) => {

            const rangeActive = this.rangeService && this.rangeService.isMoreThanOneCell();
            const pasteIntoRange = rangeActive && !this.hasOnlyOneValueToPaste(parsedData!);

            if (pasteIntoRange) {
                this.pasteIntoActiveRange(parsedData!, cellsToFlash, updatedRowNodes, changedPath);
            } else {
                this.pasteStartingFromFocusedCell(parsedData!, cellsToFlash, updatedRowNodes, focusedCell, changedPath);
            }
        };

        this.doPasteOperation(pasteOperation);
    }

    // common code to paste operations, e.g. paste to cell, paste to range, and copy range down
    private doPasteOperation(pasteOperationFunc: (
        cellsToFlash: any,
        updatedRowNodes: RowNode[],
        focusedCell: CellPosition | null,
        changedPath: ChangedPath | undefined) => void
    ): void {
        const api = this.gridOptionsWrapper.getApi();
        const columnApi = this.gridOptionsWrapper.getColumnApi();
        const source = 'clipboard';

        this.eventService.dispatchEvent({
            type: Events.EVENT_PASTE_START,
            api,
            columnApi,
            source
        } as PasteStartEvent);

        let changedPath: ChangedPath | undefined;

        if (this.clientSideRowModel) {
            const onlyChangedColumns = this.gridOptionsWrapper.isAggregateOnlyChangedColumns();
            changedPath = new ChangedPath(onlyChangedColumns, this.clientSideRowModel.getRootNode());
        }

        const cellsToFlash = {} as any;
        const updatedRowNodes: RowNode[] = [];
        const focusedCell = this.focusService.getFocusedCell();

        pasteOperationFunc(cellsToFlash, updatedRowNodes, focusedCell, changedPath);

        if (changedPath) {
            this.clientSideRowModel.doAggregate(changedPath);
        }

        this.rowRenderer.refreshCells();
        this.dispatchFlashCells(cellsToFlash);
        this.fireRowChanged(updatedRowNodes);

        // if using the clipboard hack with a temp element, then the focus has been lost,
        // so need to put it back. otherwise paste operation loosed focus on cell and keyboard
        // navigation stops.
        if (focusedCell) {
            this.focusService.setFocusedCell(focusedCell.rowIndex, focusedCell.column, focusedCell.rowPinned, true);
        }

        this.eventService.dispatchEvent({
            type: Events.EVENT_PASTE_END,
            api,
            columnApi,
            source
        } as PasteEndEvent);
    }

    private pasteIntoActiveRange(
        clipboardData: string[][],
        cellsToFlash: any,
        updatedRowNodes: RowNode[],
        changedPath: ChangedPath | undefined
    ) {
        // true if clipboard data can be evenly pasted into range, otherwise false
        const abortRepeatingPasteIntoRows = this.getRangeSize() % clipboardData.length != 0;

        let indexOffset = 0;
        let dataRowIndex = 0;

        const rowCallback: RowCallback = (currentRow: RowPosition, rowNode: RowNode, columns: Column[], index: number) => {
            const atEndOfClipboardData = index - indexOffset >= clipboardData.length;

            if (atEndOfClipboardData) {
                if (abortRepeatingPasteIntoRows) { return; }

                // increment offset and reset data index to repeat paste of data
                indexOffset += dataRowIndex;
                dataRowIndex = 0;
            }

            const currentRowData = clipboardData[index - indexOffset];

            // otherwise we are not the first row, so copy
            updatedRowNodes.push(rowNode);

            const processCellFromClipboardFunc = this.gridOptionsWrapper.getProcessCellFromClipboardFunc();

            columns.forEach((column, idx) => {
                if (!column.isCellEditable(rowNode) || column.isSuppressPaste(rowNode)) { return; }

                // repeat data for columns we don't have data for - happens when to range is bigger than copied data range
                if (idx >= currentRowData.length) {
                    idx = idx % currentRowData.length;
                }

                const newValue = this.processCell(
                    rowNode, column, currentRowData[idx], Constants.EXPORT_TYPE_DRAG_COPY, processCellFromClipboardFunc);

                this.valueService.setValue(rowNode, column, newValue, Constants.SOURCE_PASTE);

                if (changedPath) {
                    changedPath.addParentNode(rowNode.parent, [column]);
                }

                const cellId = this.cellPositionUtils.createIdFromValues(currentRow.rowIndex, column, currentRow.rowPinned);
                cellsToFlash[cellId] = true;
            });

            dataRowIndex++;
        };

        this.iterateActiveRanges(false, rowCallback);
    }

    private pasteStartingFromFocusedCell(
        parsedData: string[][],
        cellsToFlash: any,
        updatedRowNodes: RowNode[],
        focusedCell: CellPosition,
        changedPath: ChangedPath | undefined
    ) {
        if (!focusedCell) { return; }

        const currentRow: RowPosition = { rowIndex: focusedCell.rowIndex, rowPinned: focusedCell.rowPinned };
        const columnsToPasteInto = this.columnModel.getDisplayedColumnsStartingAt(focusedCell.column);

        if (this.isPasteSingleValueIntoRange(parsedData)) {
            this.pasteSingleValueIntoRange(parsedData, updatedRowNodes, cellsToFlash, changedPath);
        } else {
            this.pasteMultipleValues(
                parsedData,
                currentRow,
                updatedRowNodes,
                columnsToPasteInto,
                cellsToFlash,
                Constants.EXPORT_TYPE_CLIPBOARD,
                changedPath);
        }
    }

    // if range is active, and only one cell, then we paste this cell into all cells in the active range.
    private isPasteSingleValueIntoRange(parsedData: string[][]): boolean {
        return this.hasOnlyOneValueToPaste(parsedData)
            && this.rangeService != null
            && !this.rangeService.isEmpty();
    }

    private pasteSingleValueIntoRange(parsedData: string[][], updatedRowNodes: RowNode[], cellsToFlash: any, changedPath: ChangedPath | undefined) {
        const value = parsedData[0][0];

        const rowCallback: RowCallback = (currentRow: RowPosition, rowNode: RowNode, columns: Column[]) => {
            updatedRowNodes.push(rowNode);
            columns.forEach(column =>
                this.updateCellValue(rowNode, column, value, cellsToFlash, Constants.EXPORT_TYPE_CLIPBOARD, changedPath));
        };

        this.iterateActiveRanges(false, rowCallback);
    }

    private hasOnlyOneValueToPaste(parsedData: string[][]) {
        return parsedData.length === 1 && parsedData[0].length === 1;
    }

    public copyRangeDown(): void {
        if (!this.rangeService || this.rangeService.isEmpty()) {
            return;
        }

        const firstRowValues: any[] = [];

        const pasteOperation = (
            cellsToFlash: any,
            updatedRowNodes: RowNode[],
            focusedCell: CellPosition,
            changedPath: ChangedPath | undefined
        ) => {
            const processCellForClipboardFunc = this.gridOptionsWrapper.getProcessCellForClipboardFunc();
            const processCellFromClipboardFunc = this.gridOptionsWrapper.getProcessCellFromClipboardFunc();

            const rowCallback: RowCallback = (currentRow: RowPosition, rowNode: RowNode, columns: Column[]) => {
                // take reference of first row, this is the one we will be using to copy from
                if (!firstRowValues.length) {
                    // two reasons for looping through columns
                    columns.forEach(column => {
                        // get the initial values to copy down
                        const value = this.processCell(
                            rowNode,
                            column,
                            this.valueService.getValue(column, rowNode),
                            Constants.EXPORT_TYPE_DRAG_COPY,
                            processCellForClipboardFunc);

                        firstRowValues.push(value);
                    });
                } else {
                    // otherwise we are not the first row, so copy
                    updatedRowNodes.push(rowNode);
                    columns.forEach((column, index) => {
                        if (!column.isCellEditable(rowNode) || column.isSuppressPaste(rowNode)) { return; }

                        const firstRowValue = this.processCell(
                            rowNode, column, firstRowValues[index], Constants.EXPORT_TYPE_DRAG_COPY, processCellFromClipboardFunc);

                        this.valueService.setValue(rowNode, column, firstRowValue, Constants.SOURCE_PASTE);

                        if (changedPath) {
                            changedPath.addParentNode(rowNode.parent, [column]);
                        }

                        const cellId = this.cellPositionUtils.createIdFromValues(currentRow.rowIndex, column, currentRow.rowPinned);
                        cellsToFlash[cellId] = true;
                    });
                }
            };

            this.iterateActiveRanges(true, rowCallback);
        };

        this.doPasteOperation(pasteOperation);
    }

    private removeLastLineIfBlank(parsedData: string[][]): void {
        // remove last row if empty, excel puts empty last row in
        const lastLine = _.last(parsedData);
        const lastLineIsBlank = lastLine && lastLine.length === 1 && lastLine[0] === '';

        if (lastLineIsBlank) {
            _.removeFromArray(parsedData, lastLine);
        }
    }

    private fireRowChanged(rowNodes: RowNode[]): void {
        if (!this.gridOptionsWrapper.isFullRowEdit()) { return; }

        rowNodes.forEach(rowNode => {
            const event: RowValueChangedEvent = {
                type: Events.EVENT_ROW_VALUE_CHANGED,
                node: rowNode,
                data: rowNode.data,
                rowIndex: rowNode.rowIndex!,
                rowPinned: rowNode.rowPinned,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()!,
                columnApi: this.gridOptionsWrapper.getColumnApi()!
            };

            this.eventService.dispatchEvent(event);
        });
    }

    private pasteMultipleValues(
        clipboardGridData: string[][],
        currentRow: RowPosition | null,
        updatedRowNodes: RowNode[],
        columnsToPasteInto: Column[],
        cellsToFlash: any,
        type: string,
        changedPath: ChangedPath | undefined): void {

        let rowPointer = currentRow;

        // if doing CSRM and NOT tree data, then it means groups are aggregates, which are read only,
        // so we should skip them when doing paste operations.
        const skipGroupRows = this.clientSideRowModel != null && !this.gridOptionsWrapper.isTreeData();

        const getNextGoodRowNode = () => {
            while (true) {
                if (!rowPointer) { return null; }
                const res = this.rowPositionUtils.getRowNode(rowPointer);
                // move to next row down for next set of values
                rowPointer = this.cellNavigationService.getRowBelow({ rowPinned: rowPointer.rowPinned, rowIndex: rowPointer.rowIndex });

                // if no more rows, return null
                if (res == null) { return null; }

                // skip details rows and footer rows, never paste into them as they don't hold data
                const skipRow = res.detail || res.footer || (skipGroupRows && res.group);

                // skipping row means we go into the next iteration of the while loop
                if (!skipRow) { return res; }
            }
        };

        clipboardGridData.forEach(clipboardRowData => {
            const rowNode = getNextGoodRowNode();

            // if we have come to end of rows in grid, then skip
            if (!rowNode) { return; }

            clipboardRowData.forEach((value, index) =>
                this.updateCellValue(rowNode, columnsToPasteInto[index], value, cellsToFlash, type, changedPath));

            updatedRowNodes.push(rowNode);
        });
    }

    private updateCellValue(
        rowNode: RowNode | null,
        column: Column,
        value: string,
        cellsToFlash: any,
        type: string,
        changedPath: ChangedPath | undefined) {
        if (
            !rowNode ||
            !column ||
            !column.isCellEditable(rowNode) ||
            column.isSuppressPaste(rowNode)
        ) { return; }

        const processedValue = this.processCell(rowNode, column, value, type, this.gridOptionsWrapper.getProcessCellFromClipboardFunc());
        this.valueService.setValue(rowNode, column, processedValue, Constants.SOURCE_PASTE);

        const cellId = this.cellPositionUtils.createIdFromValues(rowNode.rowIndex!, column, rowNode.rowPinned);
        cellsToFlash[cellId] = true;

        if (changedPath) {
            changedPath.addParentNode(rowNode.parent, [column]);
        }
    }

    public copyToClipboard(includeHeaders?: boolean): void {
        this.logger.log(`copyToClipboard: includeHeaders = ${includeHeaders}`);

        // don't override 'includeHeaders' if it has been explicitly set to 'false'
        if (includeHeaders == null) {
            includeHeaders = this.gridOptionsWrapper.isCopyHeadersToClipboard();
        }

        const selectedRowsToCopy = !this.selectionService.isEmpty()
            && !this.gridOptionsWrapper.isSuppressCopyRowsToClipboard();

        // default is copy range if exists, otherwise rows
        if (this.rangeService && this.rangeService.isMoreThanOneCell()) {
            this.copySelectedRangeToClipboard(includeHeaders);
        } else if (selectedRowsToCopy) {
            // otherwise copy selected rows if they exist
            this.copySelectedRowsToClipboard(includeHeaders);
        } else if (this.focusService.isAnyCellFocused()) {
            // if there is a focused cell, copy this
            this.copyFocusedCellToClipboard(includeHeaders);
        } else {
            // lastly if no focused cell, try range again. this can happen
            // if use has cellSelection turned off (so no focused cell)
            // but has a cell clicked, so there exists a cell range
            // of exactly one cell (hence the first 'if' above didn't
            // get executed).
            this.copySelectedRangeToClipboard(includeHeaders);
        }
    }

    private iterateActiveRanges(onlyFirst: boolean, rowCallback: RowCallback, columnCallback?: ColumnCallback): void {
        if (!this.rangeService || this.rangeService.isEmpty()) { return; }

        const cellRanges = this.rangeService.getCellRanges();

        if (onlyFirst) {
            this.iterateActiveRange(cellRanges[0], rowCallback, columnCallback, true);
        } else {
            cellRanges.forEach((range, idx) => this.iterateActiveRange(range, rowCallback, columnCallback, idx === cellRanges.length - 1));
        }
    }

    private iterateActiveRange(range: CellRange, rowCallback: RowCallback, columnCallback?: ColumnCallback, isLastRange?: boolean): void {
        if (!this.rangeService) { return; }

        let currentRow: RowPosition | null = this.rangeService.getRangeStartRow(range);
        const lastRow = this.rangeService.getRangeEndRow(range);

        if (columnCallback && range.columns) {
            columnCallback(range.columns);
        }

        let rangeIndex = 0;
        let isLastRow = false;

        // the currentRow could be missing if the user sets the active range manually, and sets a range
        // that is outside of the grid (eg. sets range rows 0 to 100, but grid has only 20 rows).
        while (!isLastRow && currentRow != null) {
            const rowNode = this.rowPositionUtils.getRowNode(currentRow);
            isLastRow = this.rowPositionUtils.sameRow(currentRow, lastRow);

            rowCallback(currentRow, rowNode, range.columns, rangeIndex++, isLastRow && isLastRange);

            currentRow = this.cellNavigationService.getRowBelow(currentRow);
        }
    }

    public copySelectedRangeToClipboard(includeHeaders = false): void {
        if (!this.rangeService || this.rangeService.isEmpty()) { return; }

        const deliminator = this.gridOptionsWrapper.getClipboardDeliminator();

        let data = '';
        const cellsToFlash = {} as any;

        // adds columns to the data
        const columnCallback = (columns: Column[]) => {
            if (!includeHeaders) { return; }

            const processHeaderForClipboardFunc = this.gridOptionsWrapper.getProcessHeaderForClipboardFunc();
            const columnNames = columns.map(column => {
                const name = this.columnModel.getDisplayNameForColumn(column, 'clipboard', true);
                return this.processHeader(column, name, processHeaderForClipboardFunc) || '';
            });

            data += columnNames.join(deliminator) + '\r\n';
        };

        // adds cell values to the data
        const rowCallback: RowCallback = (currentRow: RowPosition, rowNode: RowNode, columns: Column[], _2: number, isLastRow?: boolean) => {
            const processCellForClipboardFunc = this.gridOptionsWrapper.getProcessCellForClipboardFunc();

            columns.forEach((column, index) => {
                const value = this.valueService.getValue(column, rowNode);
                const processedValue = this.processCell(rowNode, column, value, Constants.EXPORT_TYPE_CLIPBOARD, processCellForClipboardFunc);

                if (index != 0) {
                    data += deliminator;
                }

                if (_.exists(processedValue)) {
                    data += processedValue;
                }

                const cellId = this.cellPositionUtils.createIdFromValues(currentRow.rowIndex, column, currentRow.rowPinned);
                cellsToFlash[cellId] = true;
            });

            if (!isLastRow) {
                data += '\r\n';
            }
        };

        this.iterateActiveRanges(false, rowCallback, columnCallback);
        this.copyDataToClipboard(data);
        this.dispatchFlashCells(cellsToFlash);
    }

    private copyFocusedCellToClipboard(includeHeaders = false): void {
        const focusedCell = this.focusService.getFocusedCell();

        if (focusedCell == null) { return; }

        const cellId = this.cellPositionUtils.createId(focusedCell);
        const currentRow: RowPosition = { rowPinned: focusedCell.rowPinned, rowIndex: focusedCell.rowIndex };

        const rowNode = this.rowPositionUtils.getRowNode(currentRow);
        const column = focusedCell.column;
        const value = this.valueService.getValue(column, rowNode);

        let processedValue = this.processCell(
            rowNode, column, value, Constants.EXPORT_TYPE_CLIPBOARD, this.gridOptionsWrapper.getProcessCellForClipboardFunc());

        processedValue = _.missing(processedValue) ? '' : processedValue.toString();

        let data: string;

        if (includeHeaders) {
            const headerValue = this.columnModel.getDisplayNameForColumn(column, 'clipboard', true);
            data = this.processHeader(column, headerValue, this.gridOptionsWrapper.getProcessHeaderForClipboardFunc()) + '\r\n' + processedValue;
        } else {
            data = processedValue;
        }

        this.copyDataToClipboard(data);
        this.dispatchFlashCells({ [cellId]: true });
    }

    private dispatchFlashCells(cellsToFlash: {}): void {
        window.setTimeout(() => {
            const event: FlashCellsEvent = {
                type: Events.EVENT_FLASH_CELLS,
                cells: cellsToFlash,
                api: this.gridApi,
                columnApi: this.columnApi
            };

            this.eventService.dispatchEvent(event);
        }, 0);
    }

    private processCell<T>(
        rowNode: RowNode | null,
        column: Column,
        value: T,
        type: string,
        func?: ((params: ProcessCellForExportParams) => T)): T {
        if (func) {
            const params = {
                column,
                node: rowNode,
                value,
                api: this.gridOptionsWrapper.getApi(),
                columnApi: this.gridOptionsWrapper.getColumnApi(),
                context: this.gridOptionsWrapper.getContext(),
                type,
            };

            return func(params);
        }

        return value;
    }

    private processHeader<T>(column: Column, value: T, func?: ((params: ProcessHeaderForExportParams) => T)): T {
        if (func) {
            const params: ProcessHeaderForExportParams = {
                column,
                api: this.gridOptionsWrapper.getApi(),
                columnApi: this.gridOptionsWrapper.getColumnApi(),
                context: this.gridOptionsWrapper.getContext()
            };

            return func(params);
        }

        return value;
    }

    public copySelectedRowsToClipboard(includeHeaders = false, columnKeys?: (string | Column)[]): void {
        const params: CsvExportParams = {
            columnKeys: columnKeys,
            skipColumnHeaders: !includeHeaders,
            suppressQuotes: true,
            columnSeparator: this.gridOptionsWrapper.getClipboardDeliminator(),
            onlySelected: true,
            processCellCallback: this.gridOptionsWrapper.getProcessCellForClipboardFunc(),
            processHeaderCallback: this.gridOptionsWrapper.getProcessHeaderForClipboardFunc()
        };

        const data = this.csvCreator.getDataAsCsv(params);

        this.copyDataToClipboard(data);
    }

    private copyDataToClipboard(data: string): void {
        const userProvidedFunc = this.gridOptionsWrapper.getSendToClipboardFunc();

        // method 1 - user provided func
        if (userProvidedFunc) {
            userProvidedFunc({ data });
            return;
        }

        // method 2 - native clipboard API, available in modern chrome browsers
        const allowNavigator = !this.gridOptionsWrapper.isSuppressClipboardApi();
        if (allowNavigator && navigator.clipboard) {
            navigator.clipboard.writeText(data).catch((e) => {
                _.doOnce(() => {
                    console.warn(e);
                    console.warn(
                        'AG Grid: Unable to use the Clipboard API (navigator.clipboard.writeText()). ' +
                        'The reason why it could not be used has been logged in the previous line. ' +
                        'For this reason the grid has defaulted to using a workaround which doesn\'t perform as well. ' +
                        'Either fix why Clipboard API is blocked, OR stop this message from appearing by setting grid ' +
                        'property suppressClipboardApi=true (which will default the grid to using the workaround rather than the API.');
                }, 'clipboardApiError');
                this.copyDataToClipboardLegacy(data);
            });
            return;
        }

        this.copyDataToClipboardLegacy(data);
    }

    private copyDataToClipboardLegacy(data: string): void {
        // method 3 - if all else fails, the old school hack
        this.executeOnTempElement(element => {
            const focusedElementBefore = this.gridOptionsWrapper.getDocument().activeElement as HTMLElement;

            element.value = data || ' '; // has to be non-empty value or execCommand will not do anything
            element.select();
            element.focus({ preventScroll: true });

            const result = document.execCommand('copy');

            if (!result) {
                console.warn('ag-grid: Browser did not allow document.execCommand(\'copy\'). Ensure ' +
                    'api.copySelectedRowsToClipboard() is invoked via a user event, i.e. button click, otherwise ' +
                    'the browser will prevent it for security reasons.');
            }

            if (focusedElementBefore != null && focusedElementBefore.focus != null) {
                focusedElementBefore.focus({ preventScroll: true });
            }
        });
    }

    private executeOnTempElement(
        callbackNow: (element: HTMLTextAreaElement) => void,
        callbackAfter?: (element: HTMLTextAreaElement) => void
    ): void {
        const eDoc = this.gridOptionsWrapper.getDocument();
        const eTempInput = eDoc.createElement('textarea');
        eTempInput.style.width = '1px';
        eTempInput.style.height = '1px';

        // removing items from the DOM causes the document element to scroll to the
        // position where the element was positioned. Here we set scrollTop / scrollLeft
        // to prevent the document element from scrolling when we remove it from the DOM.
        eTempInput.style.top = eDoc.documentElement.scrollTop + 'px';
        eTempInput.style.left = eDoc.documentElement.scrollLeft + 'px';

        eTempInput.style.position = 'absolute';
        eTempInput.style.opacity = '0';

        const guiRoot = this.gridCtrl.getGui();

        guiRoot.appendChild(eTempInput);

        try {
            callbackNow(eTempInput);
        } catch (err) {
            console.warn('ag-grid: Browser does not support document.execCommand(\'copy\') for clipboard operations');
        }

        //It needs 100 otherwise OS X seemed to not always be able to paste... Go figure...
        if (callbackAfter) {
            window.setTimeout(() => {
                callbackAfter(eTempInput);
                guiRoot.removeChild(eTempInput);
            }, 100);
        } else {
            guiRoot.removeChild(eTempInput);
        }
    }

    private getRangeSize(): number {
        const ranges = this.rangeService.getCellRanges();
        let startRangeIndex = 0;
        let endRangeIndex = 0;

        if (ranges.length > 0) {
            startRangeIndex = this.rangeService.getRangeStartRow(ranges[0]).rowIndex;
            endRangeIndex = this.rangeService.getRangeEndRow(ranges[0]).rowIndex;
        }

        return startRangeIndex - endRangeIndex + 1;
    }
}
