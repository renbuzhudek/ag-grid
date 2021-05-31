import { Autowired, Bean, Optional, PostConstruct } from "./context/context";
import { BeanStub } from "./context/beanStub";
import { Column } from "./entities/column";
import { CellFocusedEvent, Events } from "./events";
import { ColumnApi } from "./columns/columnApi";
import { ColumnModel } from "./columns/columnModel";
import { CellPosition } from "./entities/cellPosition";
import { RowNode } from "./entities/rowNode";
import { GridApi } from "./gridApi";
import { CellComp } from "./rendering/cellComp";
import { HeaderRowComp } from "./headerRendering/headerRowComp";
import { AbstractHeaderWrapper } from "./headerRendering/header/abstractHeaderWrapper";
import { HeaderPosition } from "./headerRendering/header/headerPosition";
import { RowPositionUtils } from "./entities/rowPosition";
import { IRangeService } from "./interfaces/IRangeService";
import { RowRenderer } from "./rendering/rowRenderer";
import { HeaderNavigationService } from "./headerRendering/header/headerNavigationService";
import { ColumnGroup } from "./entities/columnGroup";
import { ManagedFocusComponent } from "./widgets/managedFocusComponent";
import { getTabIndex } from './utils/browser';
import { findIndex, last } from './utils/array';
import { makeNull } from './utils/generic';
import { Constants } from "./constants/constants";
import { GridCtrl } from "./gridComp/gridCtrl";

@Bean('focusService')
export class FocusService extends BeanStub {

    @Autowired('columnModel') private readonly columnModel: ColumnModel;
    @Autowired('headerNavigationService') private readonly headerNavigationService: HeaderNavigationService;
    @Autowired('columnApi') private readonly columnApi: ColumnApi;
    @Autowired('gridApi') private readonly gridApi: GridApi;
    @Autowired('rowRenderer') private readonly rowRenderer: RowRenderer;
    @Autowired('rowPositionUtils') private readonly rowPositionUtils: RowPositionUtils;
    @Optional('rangeService') private readonly rangeService: IRangeService;

    public static AG_KEYBOARD_FOCUS: string = 'ag-keyboard-focus';

    private gridCompController: GridCtrl;
    private focusedCellPosition: CellPosition | null;
    private focusedHeaderPosition: HeaderPosition | null;

    private static keyboardModeActive: boolean = false;
    private static instancesMonitored: Map<Document, GridCtrl[]> = new Map();

    /**
     * Adds a gridCore to the list of the gridCores monitoring Keyboard Mode
     * in a specific HTMLDocument.
     *
     * @param doc {Document} - The Document containing the gridCore.
     * @param gridCore {GridComp} - The GridCore to be monitored.
     */
    private static addKeyboardModeEvents(doc: Document, controller: GridCtrl): void {
        const docControllers = FocusService.instancesMonitored.get(doc);

        if (docControllers && docControllers.length > 0) {
            if (docControllers.indexOf(controller) === -1) {
                docControllers.push(controller);
            }
        } else {
            FocusService.instancesMonitored.set(doc, [controller]);
            doc.addEventListener('keydown', FocusService.toggleKeyboardMode);
            doc.addEventListener('mousedown', FocusService.toggleKeyboardMode);
        }
    }

    /**
     * Removes a gridCore from the list of the gridCores monitoring Keyboard Mode
     * in a specific HTMLDocument.
     *
     * @param doc {Document} - The Document containing the gridCore.
     * @param gridCore {GridComp} - The GridCore to be removed.
     */
    private static removeKeyboardModeEvents(doc: Document, controller: GridCtrl): void {
        const docControllers = FocusService.instancesMonitored.get(doc);

        let newControllers: GridCtrl[] = [];

        if (docControllers && docControllers.length) {
            newControllers = [...docControllers].filter(
                currentGridCore => currentGridCore !== controller
            );
            FocusService.instancesMonitored.set(doc, newControllers);
        }

        if (newControllers.length === 0) {
            doc.removeEventListener('keydown', FocusService.toggleKeyboardMode);
            doc.removeEventListener('mousedown', FocusService.toggleKeyboardMode);
        }
    }

    /**
     * This method will be called by `keydown` and `mousedown` events on all Documents monitoring
     * KeyboardMode. It will then fire a KEYBOARD_FOCUS, MOUSE_FOCUS on each gridCore present in
     * the Document allowing each gridCore to maintain a state for KeyboardMode.
     *
     * @param event {KeyboardEvent | MouseEvent | TouchEvent} - The event triggered.
     */
    private static toggleKeyboardMode(event: KeyboardEvent | MouseEvent | TouchEvent): void {
        const isKeyboardActive = FocusService.keyboardModeActive;
        const isKeyboardEvent = event.type === 'keydown';

        if (isKeyboardEvent) {
            // the following keys should not toggle keyboard mode.
            if (event.ctrlKey || event.metaKey || event.altKey) { return; }
        }

        if (isKeyboardActive && isKeyboardEvent || !isKeyboardActive && !isKeyboardEvent) { return; }

        FocusService.keyboardModeActive = isKeyboardEvent;
        const doc = (event.target as HTMLElement).ownerDocument;

        if (!doc) { return; }

        const controllersForDoc = FocusService.instancesMonitored.get(doc);

        if (controllersForDoc) {
            controllersForDoc.forEach(controller => {
                controller.dispatchEvent({ type: isKeyboardEvent ? Events.EVENT_KEYBOARD_FOCUS : Events.EVENT_MOUSE_FOCUS });
            });
        }
    }

    @PostConstruct
    private init(): void {
        const clearFocusedCellListener = this.clearFocusedCell.bind(this);

        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_PIVOT_MODE_CHANGED, clearFocusedCellListener);
        this.addManagedListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, this.onColumnEverythingChanged.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_GROUP_OPENED, clearFocusedCellListener);
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_ROW_GROUP_CHANGED, clearFocusedCellListener);
    }

    public registerGridCompController(gridCompController: GridCtrl): void {
        this.gridCompController = gridCompController;

        const doc = this.gridOptionsWrapper.getDocument();
        FocusService.addKeyboardModeEvents(doc, gridCompController);
        this.addDestroyFunc(() => this.unregisterGridCompController(gridCompController));
    }

    public unregisterGridCompController(gridCompController: GridCtrl): void {
        const doc = this.gridOptionsWrapper.getDocument();

        FocusService.removeKeyboardModeEvents(doc, gridCompController);
    }

    public onColumnEverythingChanged(): void {
        // if the columns change, check and see if this column still exists. if it does, then
        // we can keep the focused cell. if it doesn't, then we need to drop the focused cell.
        if (!this.focusedCellPosition) { return; }

        const col = this.focusedCellPosition.column;
        const colFromColumnModel = this.columnModel.getGridColumn(col.getId());

        if (col !== colFromColumnModel) {
            this.clearFocusedCell();
        }
    }

    public isKeyboardMode(): boolean {
        return FocusService.keyboardModeActive;
    }

    // we check if the browser is focusing something, and if it is, and
    // it's the cell we think is focused, then return the cell. so this
    // methods returns the cell if a) we think it has focus and b) the
    // browser thinks it has focus. this then returns nothing if we
    // first focus a cell, then second click outside the grid, as then the
    // grid cell will still be focused as far as the grid is concerned,
    // however the browser focus will have moved somewhere else.
    public getFocusCellToUseAfterRefresh(): CellPosition | null {
        if (this.gridOptionsWrapper.isSuppressFocusAfterRefresh() || !this.focusedCellPosition) {
            return null;
        }

        // we check that the browser is actually focusing on the grid, if it is not, then
        // we have nothing to worry about
        if (!this.getGridCellForDomElement(document.activeElement)) {
            return null;
        }

        return this.focusedCellPosition;
    }

    private getGridCellForDomElement(eBrowserCell: Node | null): CellPosition | null {
        let ePointer = eBrowserCell;

        while (ePointer) {
            const cellComp = this.gridOptionsWrapper.getDomData(ePointer, CellComp.DOM_DATA_KEY_CELL_COMP) as CellComp;

            if (cellComp) {
                return cellComp.getCellPosition();
            }

            ePointer = ePointer.parentNode;
        }

        return null;
    }

    public clearFocusedCell(): void {
        this.focusedCellPosition = null;
        this.onCellFocused(false);
    }

    public getFocusedCell(): CellPosition | null {
        return this.focusedCellPosition;
    }

    public setFocusedCell(rowIndex: number, colKey: string | Column, floating: string | null | undefined, forceBrowserFocus = false): void {
        const gridColumn = this.columnModel.getGridColumn(colKey);

        // if column doesn't exist, then blank the focused cell and return. this can happen when user sets new columns,
        // and the focused cell is in a column that no longer exists. after columns change, the grid refreshes and tries
        // to re-focus the focused cell.
        if (!gridColumn) {
            this.focusedCellPosition = null;
            return;
        }

        this.focusedCellPosition = gridColumn ? { rowIndex, rowPinned: makeNull(floating), column: gridColumn } : null;
        this.onCellFocused(forceBrowserFocus);
    }

    public isCellFocused(cellPosition: CellPosition): boolean {
        if (this.focusedCellPosition == null) { return false; }

        return this.focusedCellPosition.column === cellPosition.column &&
            this.isRowFocused(cellPosition.rowIndex, cellPosition.rowPinned);
    }

    public isRowNodeFocused(rowNode: RowNode): boolean {
        return this.isRowFocused(rowNode.rowIndex!, rowNode.rowPinned);
    }

    public isHeaderWrapperFocused(headerWrapper: AbstractHeaderWrapper): boolean {
        if (this.focusedHeaderPosition == null) { return false; }

        const column = headerWrapper.getColumn();
        const headerRowIndex = (headerWrapper.getParentComponent() as HeaderRowComp).getRowIndex();
        const pinned = headerWrapper.getPinned();

        const { column: focusedColumn, headerRowIndex: focusedHeaderRowIndex } = this.focusedHeaderPosition;

        return column === focusedColumn &&
            headerRowIndex === focusedHeaderRowIndex &&
            pinned == focusedColumn.getPinned();
    }

    public clearFocusedHeader(): void {
        this.focusedHeaderPosition = null;
    }

    public getFocusedHeader(): HeaderPosition | null {
        return this.focusedHeaderPosition;
    }

    public setFocusedHeader(headerRowIndex: number, column: ColumnGroup | Column): void {
        this.focusedHeaderPosition = { headerRowIndex, column };
    }

    public focusHeaderPosition(
        headerPosition: HeaderPosition | null,
        direction: 'Before' | 'After' | undefined | null = null,
        fromTab: boolean = false,
        allowUserOverride: boolean = false,
        event?: KeyboardEvent
    ): boolean {
        if (allowUserOverride) {
            const { gridOptionsWrapper } = this;
            const currentPosition = this.getFocusedHeader();
            const headerRowCount = this.headerNavigationService.getHeaderRowCount();

            if (fromTab) {
                const userFunc = gridOptionsWrapper.getTabToNextHeaderFunc();
                if (userFunc) {
                    const params = {
                        backwards: direction === 'Before',
                        previousHeaderPosition: currentPosition,
                        nextHeaderPosition: headerPosition,
                        headerRowCount
                    };
                    headerPosition = userFunc(params);
                }
            } else {
                const userFunc = gridOptionsWrapper.getNavigateToNextHeaderFunc();
                if (userFunc && event) {
                    const params = {
                        key: event.key,
                        previousHeaderPosition: currentPosition,
                        nextHeaderPosition: headerPosition,
                        headerRowCount,
                        event
                    };
                    headerPosition = userFunc(params);
                }
            }
        }

        if (!headerPosition) { return false; }

        if (headerPosition.headerRowIndex === -1) {
            return this.focusGridView(headerPosition.column as Column);
        }

        this.headerNavigationService.scrollToColumn(headerPosition.column, direction);

        const childContainer = this.headerNavigationService.getHeaderContainer(headerPosition.column.getPinned());
        const rowComps = childContainer!.getRowComps();
        const nextRowComp = rowComps[headerPosition.headerRowIndex];
        const headerComps = nextRowComp.getHeaderComps();
        const nextHeader = headerComps[headerPosition.column.getUniqueId()];

        if (nextHeader) {
            // this will automatically call the setFocusedHeader method above
            nextHeader.getFocusableElement().focus();
            return true;
        }

        return false;
    }

    public isAnyCellFocused(): boolean {
        return !!this.focusedCellPosition;
    }

    public isRowFocused(rowIndex: number, floating?: string | null): boolean {
        if (this.focusedCellPosition == null) { return false; }

        return this.focusedCellPosition.rowIndex === rowIndex && this.focusedCellPosition.rowPinned === makeNull(floating);
    }

    public findFocusableElements(rootNode: HTMLElement, exclude?: string | null, onlyUnmanaged = false): HTMLElement[] {
        const focusableString = Constants.FOCUSABLE_SELECTOR;
        let excludeString = Constants.FOCUSABLE_EXCLUDE;

        if (exclude) {
            excludeString += ', ' + exclude;
        }

        if (onlyUnmanaged) {
            excludeString += ', [tabindex="-1"]';
        }

        const nodes = Array.prototype.slice.apply(rootNode.querySelectorAll(focusableString)) as HTMLElement[];
        const excludeNodes = Array.prototype.slice.apply(rootNode.querySelectorAll(excludeString)) as HTMLElement[];

        if (!excludeNodes.length) {
            return nodes;
        }

        const diff = (a: HTMLElement[], b: HTMLElement[]) => a.filter(element => b.indexOf(element) === -1);
        return diff(nodes, excludeNodes);
    }

    public focusInto(rootNode: HTMLElement, up = false, onlyUnmanaged = false): boolean {
        const focusableElements = this.findFocusableElements(rootNode, null, onlyUnmanaged);
        const toFocus = up ? last(focusableElements) : focusableElements[0];

        if (toFocus) {
            toFocus.focus();
            return true;
        }

        return false;
    }

    public findNextFocusableElement(rootNode: HTMLElement, onlyManaged?: boolean | null, backwards?: boolean): HTMLElement | null {
        const focusable = this.findFocusableElements(rootNode, onlyManaged ? ':not([tabindex="-1"])' : null);
        let currentIndex: number;

        if (onlyManaged) {
            currentIndex = findIndex(focusable, el => el.contains(document.activeElement));
        } else {
            currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
        }

        const nextIndex = currentIndex + (backwards ? -1 : 1);

        if (nextIndex < 0 || nextIndex >= focusable.length) {
            return null;
        }

        return focusable[nextIndex];
    }

    public isFocusUnderManagedComponent(rootNode: HTMLElement): boolean {
        const managedContainers = rootNode.querySelectorAll(`.${ManagedFocusComponent.FOCUS_MANAGED_CLASS}`);

        if (!managedContainers.length) { return false; }

        for (let i = 0; i < managedContainers.length; i++) {
            if (managedContainers[i].contains(document.activeElement)) {
                return true;
            }
        }

        return false;
    }

    public findTabbableParent(node: HTMLElement | null, limit: number = 5): HTMLElement | null {
        let counter = 0;

        while (node && getTabIndex(node) === null && ++counter <= limit) {
            node = node.parentElement;
        }

        if (getTabIndex(node) === null) { return null; }

        return node;
    }

    private onCellFocused(forceBrowserFocus: boolean): void {
        const event: CellFocusedEvent = {
            type: Events.EVENT_CELL_FOCUSED,
            forceBrowserFocus: forceBrowserFocus,
            rowIndex: null,
            column: null,
            floating: null,
            api: this.gridApi,
            columnApi: this.columnApi,
            rowPinned: null,
            isFullWidthCell: false
        };

        if (this.focusedCellPosition) {
            const rowIndex = event.rowIndex = this.focusedCellPosition.rowIndex;
            const rowPinned = event.rowPinned = this.focusedCellPosition.rowPinned;

            event.column = this.focusedCellPosition.column;

            const rowCon = this.rowRenderer.getRowConByPosition({ rowIndex, rowPinned });

            if (rowCon) {
                event.isFullWidthCell = rowCon.isFullWidth();
            }
        }

        this.eventService.dispatchEvent(event);
    }

    public focusGridView(column?: Column, backwards?: boolean): boolean {
        const nextRow = backwards
            ? this.rowPositionUtils.getLastRow()
            : this.rowPositionUtils.getFirstRow();

        if (!nextRow) { return false; }

        const { rowIndex, rowPinned } = nextRow;
        const focusedHeader = this.getFocusedHeader();

        if (!column && focusedHeader) {
            column = focusedHeader.column as Column;
        }

        if (rowIndex == null || !column) { return false; }

        this.rowRenderer.ensureCellVisible({ rowIndex, column, rowPinned });

        this.setFocusedCell(rowIndex, column, makeNull(rowPinned), true);

        if (this.rangeService) {
            const cellPosition = { rowIndex, rowPinned, column };
            this.rangeService.setRangeToCell(cellPosition);
        }

        return true;
    }

    public focusNextGridCoreContainer(backwards: boolean): boolean {
        if (this.gridCompController.focusNextInnerContainer(backwards)) {
            return true;
        }

        if (!backwards) {
            this.gridCompController.forceFocusOutOfContainer();
        }

        return false;
    }
}
