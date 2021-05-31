import { RowNode } from './entities/rowNode';
import {
    ChartRef,
    FillOperationParams,
    GetChartToolbarItems,
    GetContextMenuItems,
    GetMainMenuItems,
    GetRowNodeIdFunc,
    GetServerSideStoreParamsParams,
    GridOptions,
    IsApplyServerSideTransaction,
    IsGroupOpenByDefaultParams,
    IsRowMaster,
    IsRowSelectable,
    IsServerSideGroupOpenByDefaultParams,
    NavigateToNextCellParams,
    NavigateToNextHeaderParams,
    PaginationNumberFormatterParams,
    PostProcessPopupParams,
    ProcessChartOptionsParams,
    ProcessDataFromClipboardParams,
    ServerSideStoreParams,
    TabToNextCellParams,
    TabToNextHeaderParams
} from './entities/gridOptions';
import { EventService } from './eventService';
import { Constants } from './constants/constants';
import { ComponentUtil } from './components/componentUtil';
import { GridApi } from './gridApi';
import { ColDef, ColGroupDef, IAggFunc, SuppressKeyboardEventParams } from './entities/colDef';
import { Autowired, Bean, PostConstruct, PreDestroy, Qualifier } from './context/context';
import { ColumnApi } from './columns/columnApi';
import { ColumnModel } from './columns/columnModel';
import { IViewportDatasource } from './interfaces/iViewportDatasource';
import { IDatasource } from './interfaces/iDatasource';
import { CellPosition } from './entities/cellPosition';
import { IServerSideDatasource } from './interfaces/iServerSideDatasource';
import { CsvExportParams, ProcessCellForExportParams, ProcessHeaderForExportParams } from './interfaces/exportParams';
import { AgEvent } from './events';
import { Environment, SASS_PROPERTIES } from './environment';
import { PropertyKeys } from './propertyKeys';
import { ColDefUtil } from './components/colDefUtil';
import { Events } from './eventKeys';
import { AutoHeightCalculator } from './rendering/row/autoHeightCalculator';
import { SideBarDef, SideBarDefParser } from './entities/sideBar';
import { ModuleNames } from './modules/moduleNames';
import { ChartOptions } from './interfaces/iChartOptions';
import { AgChartTheme, AgChartThemeOverrides } from "./interfaces/iAgChartOptions";
import { iterateObject } from './utils/object';
import { ModuleRegistry } from './modules/moduleRegistry';
import { isNumeric } from './utils/number';
import { exists, missing, values } from './utils/generic';
import { fuzzyCheckStrings } from './utils/fuzzyMatch';
import { doOnce } from './utils/function';
import { getScrollbarWidth } from './utils/browser';
import { HeaderPosition } from './headerRendering/header/headerPosition';
import { ExcelExportParams } from './interfaces/iExcelCreator';
import { capitalise } from './utils/string';

const DEFAULT_ROW_HEIGHT = 25;
const DEFAULT_DETAIL_ROW_HEIGHT = 300;
const DEFAULT_VIEWPORT_ROW_MODEL_PAGE_SIZE = 5;
const DEFAULT_VIEWPORT_ROW_MODEL_BUFFER_SIZE = 5;
const DEFAULT_KEEP_DETAIL_ROW_COUNT = 10;

function isTrue(value: any): boolean {
    return value === true || value === 'true';
}

function toNumber(value: any): number | undefined {
    if (typeof value == 'number') {
        return value;
    }

    if (typeof value == 'string') {
        return parseInt(value, 10);
    }
}

function zeroOrGreater(value: any, defaultValue: number): number {
    if (value >= 0) { return value; }

    // zero gets returned if number is missing or the wrong type
    return defaultValue;
}

function oneOrGreater(value: any, defaultValue?: number): number | undefined {
    const valueNumber = parseInt(value, 10);

    if (isNumeric(valueNumber) && valueNumber > 0) {
        return valueNumber;
    }

    return defaultValue;
}

export interface PropertyChangedEvent extends AgEvent {
    currentValue: any;
    previousValue: any;
}

@Bean('gridOptionsWrapper')
export class GridOptionsWrapper {
    private static MIN_COL_WIDTH = 10;

    public static PROP_HEADER_HEIGHT = 'headerHeight';
    public static PROP_GROUP_REMOVE_SINGLE_CHILDREN = 'groupRemoveSingleChildren';
    public static PROP_GROUP_REMOVE_LOWEST_SINGLE_CHILDREN = 'groupRemoveLowestSingleChildren';
    public static PROP_PIVOT_HEADER_HEIGHT = 'pivotHeaderHeight';
    public static PROP_SUPPRESS_CLIPBOARD_PASTE = 'suppressClipboardPaste';

    public static PROP_GROUP_HEADER_HEIGHT = 'groupHeaderHeight';
    public static PROP_PIVOT_GROUP_HEADER_HEIGHT = 'pivotGroupHeaderHeight';

    public static PROP_NAVIGATE_TO_NEXT_CELL = 'navigateToNextCell';
    public static PROP_TAB_TO_NEXT_CELL = 'tabToNextCell';
    public static PROP_NAVIGATE_TO_NEXT_HEADER = 'navigateToNextHeader';
    public static PROP_TAB_TO_NEXT_HEADER = 'tabToNextHeader';

    public static PROP_IS_EXTERNAL_FILTER_PRESENT = 'isExternalFilterPresentFunc';
    public static PROP_DOES_EXTERNAL_FILTER_PASS = 'doesExternalFilterPass';

    public static PROP_FLOATING_FILTERS_HEIGHT = 'floatingFiltersHeight';

    public static PROP_SUPPRESS_ROW_CLICK_SELECTION = 'suppressRowClickSelection';
    public static PROP_SUPPRESS_ROW_DRAG = 'suppressRowDrag';
    public static PROP_SUPPRESS_MOVE_WHEN_ROW_DRAG = 'suppressMoveWhenRowDragging';

    public static PROP_GET_ROW_CLASS = 'getRowClass';
    public static PROP_GET_ROW_STYLE = 'getRowStyle';

    public static PROP_GET_ROW_HEIGHT = 'getRowHeight';

    public static PROP_POPUP_PARENT = 'popupParent';

    public static PROP_DOM_LAYOUT = 'domLayout';

    public static PROP_FILL_HANDLE_DIRECTION = 'fillHandleDirection';

    public static PROP_GROUP_ROW_AGG_NODES = 'groupRowAggNodes';
    public static PROP_GET_BUSINESS_KEY_FOR_NODE = 'getBusinessKeyForNode';
    public static PROP_GET_CHILD_COUNT = 'getChildCount';
    public static PROP_PROCESS_ROW_POST_CREATE = 'processRowPostCreate';
    public static PROP_GET_ROW_NODE_ID = 'getRowNodeId';
    public static PROP_IS_FULL_WIDTH_CELL = 'isFullWidthCell';
    public static PROP_IS_ROW_SELECTABLE = 'isRowSelectable';
    public static PROP_IS_ROW_MASTER = 'isRowMaster';
    public static PROP_POST_SORT = 'postSort';
    public static PROP_GET_DOCUMENT = 'getDocument';
    public static PROP_POST_PROCESS_POPUP = 'postProcessPopup';
    public static PROP_DEFAULT_GROUP_SORT_COMPARATOR = 'defaultGroupSortComparator';
    public static PROP_PAGINATION_NUMBER_FORMATTER = 'paginationNumberFormatter';

    public static PROP_GET_CONTEXT_MENU_ITEMS = 'getContextMenuItems';
    public static PROP_GET_MAIN_MENU_ITEMS = 'getMainMenuItems';

    public static PROP_PROCESS_CELL_FOR_CLIPBOARD = 'processCellForClipboard';
    public static PROP_PROCESS_CELL_FROM_CLIPBOARD = 'processCellFromClipboard';
    public static PROP_SEND_TO_CLIPBOARD = 'sendToClipboard';

    public static PROP_PROCESS_TO_SECONDARY_COLDEF = 'processSecondaryColDef';
    public static PROP_PROCESS_SECONDARY_COL_GROUP_DEF = 'processSecondaryColGroupDef';

    public static PROP_PROCESS_CHART_OPTIONS = 'processChartOptions';
    public static PROP_GET_CHART_TOOLBAR_ITEMS = 'getChartToolbarItems';

    public static PROP_GET_SERVER_SIDE_STORE_PARAMS = 'getServerSideStoreParams';
    public static PROP_IS_SERVER_SIDE_GROUPS_OPEN_BY_DEFAULT = 'isServerSideGroupOpenByDefault';
    public static PROP_IS_APPLY_SERVER_SIDE_TRANSACTION = 'isApplyServerSideTransaction';
    public static PROP_IS_SERVER_SIDE_GROUP = 'isServerSideGroup';
    public static PROP_GET_SERVER_SIDE_GROUP_KEY = 'getServerSideGroupKey';

    @Autowired('gridOptions') private readonly gridOptions: GridOptions;
    @Autowired('columnModel') private readonly columnModel: ColumnModel;
    @Autowired('eventService') private readonly eventService: EventService;
    @Autowired('environment') private readonly environment: Environment;
    @Autowired('autoHeightCalculator') private readonly autoHeightCalculator: AutoHeightCalculator;

    private propertyEventService: EventService = new EventService();

    private domDataKey = '__AG_' + Math.random().toString();

    // we store this locally, so we are not calling getScrollWidth() multiple times as it's an expensive operation
    private scrollbarWidth: number;
    private updateLayoutClassesListener: any;

    private destroyed = false;

    private agWire(@Qualifier('gridApi') gridApi: GridApi, @Qualifier('columnApi') columnApi: ColumnApi): void {
        this.gridOptions.api = gridApi;
        this.gridOptions.columnApi = columnApi;
        this.checkForDeprecated();
        this.checkForViolations();
    }

    @PreDestroy
    private destroy(): void {
        // need to remove these, as we don't own the lifecycle of the gridOptions, we need to
        // remove the references in case the user keeps the grid options, we want the rest
        // of the grid to be picked up by the garbage collector
        this.gridOptions.api = null;
        this.gridOptions.columnApi = null;
        this.removeEventListener(GridOptionsWrapper.PROP_DOM_LAYOUT, this.updateLayoutClassesListener);

        this.destroyed = true;
    }

    @PostConstruct
    public init(): void {
        if (this.gridOptions.suppressPropertyNamesCheck !== true) {
            this.checkGridOptionsProperties();
            this.checkColumnDefProperties();
        }

        // parse side bar options into correct format
        if (this.gridOptions.sideBar != null) {
            this.gridOptions.sideBar = SideBarDefParser.parse(this.gridOptions.sideBar);
        }

        const async = this.useAsyncEvents();
        this.eventService.addGlobalListener(this.globalEventHandler.bind(this), async);

        if (this.isGroupSelectsChildren() && this.isSuppressParentsInRowNodes()) {
            console.warn("AG Grid: 'groupSelectsChildren' does not work with 'suppressParentsInRowNodes', this selection method needs the part in rowNode to work");
        }

        if (this.isGroupSelectsChildren()) {
            if (!this.isRowSelectionMulti()) {
                console.warn("AG Grid: rowSelection must be 'multiple' for groupSelectsChildren to make sense");
            }
            if (this.isRowModelServerSide()) {
                console.warn(
                    'AG Grid: group selects children is NOT support for Server Side Row Model. ' +
                    'This is because the rows are lazy loaded, so selecting a group is not possible as' +
                    'the grid has no way of knowing what the children are.'
                );
            }
        }

        if (this.isGroupRemoveSingleChildren() && this.isGroupHideOpenParents()) {
            console.warn(
                "AG Grid: groupRemoveSingleChildren and groupHideOpenParents do not work with each other, you need to pick one. And don't ask us how to us these together on our support forum either you will get the same answer!"
            );
        }

        if (this.isRowModelServerSide()) {
            const msg = (prop: string) => `AG Grid: '${prop}' is not supported on the Server-Side Row Model`;
            if (exists(this.gridOptions.groupDefaultExpanded)) {
                console.warn(msg('groupDefaultExpanded'));
            }
            if (exists(this.gridOptions.groupDefaultExpanded)) {
                console.warn(msg('groupIncludeFooter'));
            }
            if (exists(this.gridOptions.groupDefaultExpanded)) {
                console.warn(msg('groupIncludeTotalFooter'));
            }
        }

        if (this.isEnableRangeSelection()) {
            ModuleRegistry.assertRegistered(ModuleNames.RangeSelectionModule, 'enableRangeSelection');
        }

        if (!this.isEnableRangeSelection() && (this.isEnableRangeHandle() || this.isEnableFillHandle())) {
            console.warn("AG Grid: 'enableRangeHandle' and 'enableFillHandle' will not work unless 'enableRangeSelection' is set to true");
        }

        const warnOfDeprecaredIcon = (name: string) => {
            if (this.gridOptions.icons && this.gridOptions.icons[name]) {
                console.warn(`gridOptions.icons.${name} is no longer supported. For information on how to style checkboxes and radio buttons, see https://www.ag-grid.com/javascript-grid-icons/`);
            }
        };
        warnOfDeprecaredIcon('radioButtonOff');
        warnOfDeprecaredIcon('radioButtonOn');
        warnOfDeprecaredIcon('checkboxChecked');
        warnOfDeprecaredIcon('checkboxUnchecked');
        warnOfDeprecaredIcon('checkboxIndeterminate');

        // sets an initial calculation for the scrollbar width
        this.getScrollbarWidth();
    }

    private checkColumnDefProperties() {
        if (this.gridOptions.columnDefs == null) { return; }

        this.gridOptions.columnDefs.forEach(colDef => {
            const userProperties: string[] = Object.getOwnPropertyNames(colDef);
            const validProperties: string[] = [...ColDefUtil.ALL_PROPERTIES, ...ColDefUtil.FRAMEWORK_PROPERTIES];

            this.checkProperties(
                userProperties,
                validProperties,
                validProperties,
                'colDef',
                'https://www.ag-grid.com/javascript-grid-column-properties/'
            );
        });
    }

    private checkGridOptionsProperties() {
        const userProperties: string[] = Object.getOwnPropertyNames(this.gridOptions);
        const validProperties: string[] = [
            ...PropertyKeys.ALL_PROPERTIES,
            ...PropertyKeys.FRAMEWORK_PROPERTIES,
            ...values<any>(Events).map(event => ComponentUtil.getCallbackForEvent(event))
        ];

        const validPropertiesAndExceptions: string[] = [...validProperties, 'api', 'columnApi'];

        this.checkProperties(
            userProperties,
            validPropertiesAndExceptions,
            validProperties,
            'gridOptions',
            'https://www.ag-grid.com/javascript-grid-properties/'
        );
    }

    private checkProperties(
        userProperties: string[],
        validPropertiesAndExceptions: string[],
        validProperties: string[],
        containerName: string,
        docsUrl: string
    ) {
        const invalidProperties: { [p: string]: string[]; } = fuzzyCheckStrings(
            userProperties,
            validPropertiesAndExceptions,
            validProperties
        );

        iterateObject<any>(invalidProperties, (key, value) => {
            console.warn(`ag-grid: invalid ${containerName} property '${key}' did you mean any of these: ${value.slice(0, 8).join(", ")}`);
        });

        if (Object.keys(invalidProperties).length > 0) {
            console.warn(`ag-grid: to see all the valid ${containerName} properties please check: ${docsUrl}`);
        }
    }

    public getDomDataKey(): string {
        return this.domDataKey;
    }

    // returns the dom data, or undefined if not found
    public getDomData(element: Node | null, key: string): any {
        const domData = (element as any)[this.getDomDataKey()];

        return domData ? domData[key] : undefined;
    }

    public setDomData(element: Element, key: string, value: any): any {
        const domDataKey = this.getDomDataKey();
        let domData = (element as any)[domDataKey];

        if (missing(domData)) {
            domData = {};
            (element as any)[domDataKey] = domData;
        }
        domData[key] = value;
    }

    public isRowSelection() {
        return this.gridOptions.rowSelection === 'single' || this.gridOptions.rowSelection === 'multiple';
    }

    public isSuppressRowDeselection() {
        return isTrue(this.gridOptions.suppressRowDeselection);
    }

    public isRowSelectionMulti() {
        return this.gridOptions.rowSelection === 'multiple';
    }

    public isRowMultiSelectWithClick() {
        return isTrue(this.gridOptions.rowMultiSelectWithClick);
    }

    public getContext() {
        return this.gridOptions.context;
    }

    public isPivotMode() {
        return isTrue(this.gridOptions.pivotMode);
    }

    public isSuppressExpandablePivotGroups() {
        return isTrue(this.gridOptions.suppressExpandablePivotGroups);
    }

    public getPivotColumnGroupTotals() {
        return this.gridOptions.pivotColumnGroupTotals;
    }

    public getPivotRowTotals() {
        return this.gridOptions.pivotRowTotals;
    }

    public isRowModelInfinite() {
        return this.gridOptions.rowModelType === Constants.ROW_MODEL_TYPE_INFINITE;
    }

    public isRowModelViewport() {
        return this.gridOptions.rowModelType === Constants.ROW_MODEL_TYPE_VIEWPORT;
    }

    public isRowModelServerSide() {
        return this.gridOptions.rowModelType === Constants.ROW_MODEL_TYPE_SERVER_SIDE;
    }

    public isRowModelDefault() {
        return (missing(this.gridOptions.rowModelType) ||
            this.gridOptions.rowModelType === Constants.ROW_MODEL_TYPE_CLIENT_SIDE);
    }

    public isFullRowEdit() {
        return this.gridOptions.editType === 'fullRow';
    }

    public isSuppressFocusAfterRefresh() {
        return isTrue(this.gridOptions.suppressFocusAfterRefresh);
    }

    public isSuppressBrowserResizeObserver() {
        return isTrue(this.gridOptions.suppressBrowserResizeObserver);
    }

    public isSuppressMaintainUnsortedOrder() {
        return isTrue(this.gridOptions.suppressMaintainUnsortedOrder);
    }

    public isSuppressClearOnFillReduction() {
        return isTrue(this.gridOptions.suppressClearOnFillReduction);
    }

    public isShowToolPanel() {
        return isTrue(this.gridOptions.sideBar && Array.isArray(this.getSideBar().toolPanels));
    }

    public getSideBar(): SideBarDef {
        return this.gridOptions.sideBar as SideBarDef;
    }

    public isSuppressTouch() {
        return isTrue(this.gridOptions.suppressTouch);
    }

    public isApplyColumnDefOrder() {
        return isTrue(this.gridOptions.applyColumnDefOrder);
    }

    public isSuppressRowTransform() {
        return isTrue(this.gridOptions.suppressRowTransform);
    }

    public isSuppressColumnStateEvents() {
        return isTrue(this.gridOptions.suppressColumnStateEvents);
    }

    public isAllowDragFromColumnsToolPanel() {
        return isTrue(this.gridOptions.allowDragFromColumnsToolPanel);
    }

    public useAsyncEvents() {
        return !isTrue(this.gridOptions.suppressAsyncEvents);
    }

    public isEnableCellChangeFlash() {
        return isTrue(this.gridOptions.enableCellChangeFlash);
    }

    public getCellFlashDelay(): number {
        return this.gridOptions.cellFlashDelay || 500;
    }

    public getCellFadeDelay(): number {
        return this.gridOptions.cellFadeDelay || 1000;
    }

    public isGroupSelectsChildren() {
        const result = isTrue(this.gridOptions.groupSelectsChildren);

        if (result && this.isTreeData()) {
            console.warn('AG Grid: groupSelectsChildren does not work with tree data');
            return false;
        }

        return result;
    }

    public isSuppressRowHoverHighlight() {
        return isTrue(this.gridOptions.suppressRowHoverHighlight);
    }

    public isGroupSelectsFiltered() {
        return isTrue(this.gridOptions.groupSelectsFiltered);
    }

    public isGroupHideOpenParents() {
        return isTrue(this.gridOptions.groupHideOpenParents);
    }

    // if we are doing hideOpenParents, then we always have groupMultiAutoColumn, otherwise hideOpenParents would not work
    public isGroupMultiAutoColumn() {
        return isTrue(this.gridOptions.groupMultiAutoColumn) || isTrue(this.gridOptions.groupHideOpenParents);
    }

    public isGroupRemoveSingleChildren() {
        return isTrue(this.gridOptions.groupRemoveSingleChildren);
    }

    public isGroupRemoveLowestSingleChildren() {
        return isTrue(this.gridOptions.groupRemoveLowestSingleChildren);
    }

    public isGroupIncludeFooter() {
        return isTrue(this.gridOptions.groupIncludeFooter);
    }

    public isGroupIncludeTotalFooter() {
        return isTrue(this.gridOptions.groupIncludeTotalFooter);
    }

    public isGroupSuppressBlankHeader() {
        return isTrue(this.gridOptions.groupSuppressBlankHeader);
    }

    public isSuppressRowClickSelection() {
        return isTrue(this.gridOptions.suppressRowClickSelection);
    }

    public isSuppressCellSelection() {
        return isTrue(this.gridOptions.suppressCellSelection);
    }

    public isSuppressMultiSort() {
        return isTrue(this.gridOptions.suppressMultiSort);
    }

    public isMultiSortKeyCtrl() {
        return this.gridOptions.multiSortKey === 'ctrl';
    }

    public isGroupSuppressAutoColumn() {
        return isTrue(this.gridOptions.groupSuppressAutoColumn);
    }

    public isPivotSuppressAutoColumn() {
        return isTrue(this.gridOptions.pivotSuppressAutoColumn);
    }

    public isSuppressDragLeaveHidesColumns() {
        return isTrue(this.gridOptions.suppressDragLeaveHidesColumns);
    }

    public isSuppressScrollOnNewData() {
        return isTrue(this.gridOptions.suppressScrollOnNewData);
    }

    public isRowDragManaged() {
        return isTrue(this.gridOptions.rowDragManaged);
    }

    public isSuppressRowDrag() {
        return isTrue(this.gridOptions.suppressRowDrag);
    }

    public isSuppressMoveWhenRowDragging() {
        return isTrue(this.gridOptions.suppressMoveWhenRowDragging);
    }

    public isEnableMultiRowDragging() {
        return isTrue(this.gridOptions.enableMultiRowDragging);
    }

    // returns either 'print', 'autoHeight' or 'normal' (normal is the default)
    public getDomLayout(): string {
        const domLayout = this.gridOptions.domLayout || Constants.DOM_LAYOUT_NORMAL;
        const validLayouts = [
            Constants.DOM_LAYOUT_PRINT,
            Constants.DOM_LAYOUT_AUTO_HEIGHT,
            Constants.DOM_LAYOUT_NORMAL
        ];

        if (validLayouts.indexOf(domLayout) === -1) {
            doOnce(
                () =>
                    console.warn(
                        `AG Grid: ${domLayout} is not valid for DOM Layout, valid values are ${Constants.DOM_LAYOUT_NORMAL}, ${Constants.DOM_LAYOUT_AUTO_HEIGHT} and ${Constants.DOM_LAYOUT_PRINT}`
                    ),
                'warn about dom layout values'
            );
            return Constants.DOM_LAYOUT_NORMAL;
        }

        return domLayout;
    }

    public isSuppressHorizontalScroll() {
        return isTrue(this.gridOptions.suppressHorizontalScroll);
    }

    public isSuppressMaxRenderedRowRestriction() {
        return isTrue(this.gridOptions.suppressMaxRenderedRowRestriction);
    }

    public isExcludeChildrenWhenTreeDataFiltering() {
        return isTrue(this.gridOptions.excludeChildrenWhenTreeDataFiltering);
    }

    public isAlwaysShowHorizontalScroll() {
        return isTrue(this.gridOptions.alwaysShowHorizontalScroll);
    }

    public isAlwaysShowVerticalScroll() {
        return isTrue(this.gridOptions.alwaysShowVerticalScroll);
    }

    public isDebounceVerticalScrollbar() {
        return isTrue(this.gridOptions.debounceVerticalScrollbar);
    }

    public isSuppressLoadingOverlay() {
        return isTrue(this.gridOptions.suppressLoadingOverlay);
    }

    public isSuppressNoRowsOverlay() {
        return isTrue(this.gridOptions.suppressNoRowsOverlay);
    }

    public isSuppressFieldDotNotation() {
        return isTrue(this.gridOptions.suppressFieldDotNotation);
    }

    public getPinnedTopRowData(): any[] | undefined {
        return this.gridOptions.pinnedTopRowData;
    }

    public getPinnedBottomRowData(): any[] | undefined {
        return this.gridOptions.pinnedBottomRowData;
    }

    public isFunctionsPassive() {
        return isTrue(this.gridOptions.functionsPassive);
    }

    public isSuppressChangeDetection() {
        return isTrue(this.gridOptions.suppressChangeDetection);
    }

    public isSuppressAnimationFrame() {
        return isTrue(this.gridOptions.suppressAnimationFrame);
    }

    public getQuickFilterText(): string | undefined {
        return this.gridOptions.quickFilterText;
    }

    public isCacheQuickFilter() {
        return isTrue(this.gridOptions.cacheQuickFilter);
    }

    public isUnSortIcon() {
        return isTrue(this.gridOptions.unSortIcon);
    }

    public isSuppressMenuHide() {
        return isTrue(this.gridOptions.suppressMenuHide);
    }

    public isEnterMovesDownAfterEdit() {
        return isTrue(this.gridOptions.enterMovesDownAfterEdit);
    }

    public isEnterMovesDown() {
        return isTrue(this.gridOptions.enterMovesDown);
    }

    public isUndoRedoCellEditing() {
        return isTrue(this.gridOptions.undoRedoCellEditing);
    }

    public getUndoRedoCellEditingLimit(): number | undefined {
        return this.gridOptions.undoRedoCellEditingLimit;
    }

    public getRowStyle() {
        return this.gridOptions.rowStyle;
    }

    public getRowClass() {
        return this.gridOptions.rowClass;
    }

    public getRowStyleFunc() {
        return this.gridOptions.getRowStyle;
    }

    public getRowClassFunc() {
        return this.gridOptions.getRowClass;
    }

    public rowClassRules() {
        return this.gridOptions.rowClassRules;
    }

    public getServerSideStoreType(): string | undefined {
        return this.gridOptions.serverSideStoreType;
    }

    public getServerSideStoreParamsFunc(): ((params: GetServerSideStoreParamsParams) => ServerSideStoreParams) | undefined {
        return this.gridOptions.getServerSideStoreParams;
    }

    public getCreateChartContainerFunc(): ((params: ChartRef) => void) | undefined {
        return this.gridOptions.createChartContainer;
    }

    public getPopupParent() {
        return this.gridOptions.popupParent;
    }

    public getBlockLoadDebounceMillis() {
        return this.gridOptions.blockLoadDebounceMillis;
    }

    public getPostProcessPopupFunc(): ((params: PostProcessPopupParams) => void) | undefined {
        return this.gridOptions.postProcessPopup;
    }

    public getPaginationNumberFormatterFunc(): ((params: PaginationNumberFormatterParams) => string) | undefined {
        return this.gridOptions.paginationNumberFormatter;
    }

    public getChildCountFunc() {
        return this.gridOptions.getChildCount;
    }

    public getIsApplyServerSideTransactionFunc(): IsApplyServerSideTransaction | undefined {
        return this.gridOptions.isApplyServerSideTransaction;
    }

    public getDefaultGroupSortComparator() {
        return this.gridOptions.defaultGroupSortComparator;
    }

    public getIsFullWidthCellFunc(): ((rowNode: RowNode) => boolean) | undefined {
        return this.gridOptions.isFullWidthCell;
    }

    public getFullWidthCellRendererParams() {
        return this.gridOptions.fullWidthCellRendererParams;
    }

    public isEmbedFullWidthRows() {
        return isTrue(this.gridOptions.embedFullWidthRows) || isTrue(this.gridOptions.deprecatedEmbedFullWidthRows);
    }

    public isDetailRowAutoHeight() {
        return isTrue(this.gridOptions.detailRowAutoHeight);
    }

    public getSuppressKeyboardEventFunc(): ((params: SuppressKeyboardEventParams) => boolean) | undefined {
        return this.gridOptions.suppressKeyboardEvent;
    }

    public getBusinessKeyForNodeFunc() {
        return this.gridOptions.getBusinessKeyForNode;
    }

    public getApi(): GridApi | undefined | null {
        return this.gridOptions.api;
    }

    public getColumnApi(): ColumnApi | undefined | null {
        return this.gridOptions.columnApi;
    }

    public isImmutableData() {
        return isTrue(this.gridOptions.immutableData);
    }

    public isEnsureDomOrder() {
        return isTrue(this.gridOptions.ensureDomOrder);
    }

    public isEnableCharts() {
        if (isTrue(this.gridOptions.enableCharts)) {
            return ModuleRegistry.assertRegistered(ModuleNames.GridChartsModule, 'enableCharts');
        }
        return false;
    }

    public getColResizeDefault() {
        return this.gridOptions.colResizeDefault;
    }

    public isSingleClickEdit() {
        return isTrue(this.gridOptions.singleClickEdit);
    }

    public isSuppressClickEdit() {
        return isTrue(this.gridOptions.suppressClickEdit);
    }

    public isStopEditingWhenCellsLoseFocus() {
        return isTrue(this.gridOptions.stopEditingWhenCellsLoseFocus);
    }

    public getGroupDefaultExpanded(): number | undefined {
        return this.gridOptions.groupDefaultExpanded;
    }

    public getMaxConcurrentDatasourceRequests(): number | undefined {
        return this.gridOptions.maxConcurrentDatasourceRequests;
    }

    public getMaxBlocksInCache(): number | undefined {
        return this.gridOptions.maxBlocksInCache;
    }

    public getCacheOverflowSize(): number | undefined {
        return this.gridOptions.cacheOverflowSize;
    }

    public getPaginationPageSize(): number | undefined {
        return toNumber(this.gridOptions.paginationPageSize);
    }

    public isPaginateChildRows(): boolean {
        const shouldPaginate = this.isGroupRemoveSingleChildren() || this.isGroupRemoveLowestSingleChildren();
        if (shouldPaginate) { return true; }
        return isTrue(this.gridOptions.paginateChildRows);
    }

    public getCacheBlockSize(): number | undefined {
        return oneOrGreater(this.gridOptions.cacheBlockSize);
    }

    public getInfiniteInitialRowCount(): number | undefined {
        return this.gridOptions.infiniteInitialRowCount;
    }

    public isPurgeClosedRowNodes() {
        return isTrue(this.gridOptions.purgeClosedRowNodes);
    }

    public isSuppressPaginationPanel() {
        return isTrue(this.gridOptions.suppressPaginationPanel);
    }

    public getRowData(): any[] | undefined {
        return this.gridOptions.rowData;
    }

    // this property is different - we never allow groupUseEntireRow if in pivot mode,
    // as otherwise we don't see the pivot values.
    public isGroupUseEntireRow(pivotMode: boolean): boolean {
        return pivotMode ? false : isTrue(this.gridOptions.groupUseEntireRow);
    }

    public isEnableRtl() {
        return isTrue(this.gridOptions.enableRtl);
    }

    public getAutoGroupColumnDef(): ColDef | undefined {
        return this.gridOptions.autoGroupColumnDef;
    }

    public getRowGroupPanelShow() {
        return this.gridOptions.rowGroupPanelShow;
    }

    public getPivotPanelShow() {
        return this.gridOptions.pivotPanelShow;
    }

    public isAngularCompileRows() {
        return isTrue(this.gridOptions.angularCompileRows);
    }

    public isAngularCompileFilters() {
        return isTrue(this.gridOptions.angularCompileFilters);
    }

    public isDebug() {
        return isTrue(this.gridOptions.debug);
    }

    public getColumnDefs() {
        return this.gridOptions.columnDefs;
    }

    public getColumnTypes(): { [key: string]: ColDef; } | undefined {
        return this.gridOptions.columnTypes;
    }

    public getDatasource(): IDatasource | undefined {
        return this.gridOptions.datasource;
    }

    public getViewportDatasource(): IViewportDatasource | undefined {
        return this.gridOptions.viewportDatasource;
    }

    public getServerSideDatasource(): IServerSideDatasource | undefined {
        return this.gridOptions.serverSideDatasource;
    }

    public isAccentedSort() {
        return isTrue(this.gridOptions.accentedSort);
    }

    public isEnableBrowserTooltips() {
        return isTrue(this.gridOptions.enableBrowserTooltips);
    }

    public isEnableCellExpressions() {
        return isTrue(this.gridOptions.enableCellExpressions);
    }

    public isEnableGroupEdit() {
        return isTrue(this.gridOptions.enableGroupEdit);
    }

    public isSuppressMiddleClickScrolls() {
        return isTrue(this.gridOptions.suppressMiddleClickScrolls);
    }

    public isPreventDefaultOnContextMenu() {
        return isTrue(this.gridOptions.preventDefaultOnContextMenu);
    }

    public isSuppressPreventDefaultOnMouseWheel() {
        return isTrue(this.gridOptions.suppressPreventDefaultOnMouseWheel);
    }

    public isSuppressColumnVirtualisation() {
        return isTrue(this.gridOptions.suppressColumnVirtualisation);
    }

    public isSuppressContextMenu() {
        return isTrue(this.gridOptions.suppressContextMenu);
    }

    public isAllowContextMenuWithControlKey() {
        return isTrue(this.gridOptions.allowContextMenuWithControlKey);
    }

    public isSuppressCopyRowsToClipboard() {
        return isTrue(this.gridOptions.suppressCopyRowsToClipboard);
    }

    public isCopyHeadersToClipboard() {
        return isTrue(this.gridOptions.copyHeadersToClipboard);
    }

    public isSuppressClipboardPaste() {
        return isTrue(this.gridOptions.suppressClipboardPaste);
    }

    public isSuppressLastEmptyLineOnPaste() {
        return isTrue(this.gridOptions.suppressLastEmptyLineOnPaste);
    }

    public isPagination() {
        return isTrue(this.gridOptions.pagination);
    }

    public isSuppressEnterpriseResetOnNewColumns() {
        return isTrue(this.gridOptions.suppressEnterpriseResetOnNewColumns);
    }

    public getProcessDataFromClipboardFunc(): ((params: ProcessDataFromClipboardParams) => string[][] | null) | undefined {
        return this.gridOptions.processDataFromClipboard;
    }

    public getAsyncTransactionWaitMillis(): number | undefined {
        return exists(this.gridOptions.asyncTransactionWaitMillis) ? this.gridOptions.asyncTransactionWaitMillis : Constants.BATCH_WAIT_MILLIS;
    }

    public isSuppressMovableColumns() {
        return isTrue(this.gridOptions.suppressMovableColumns);
    }

    public isAnimateRows() {
        // never allow animating if enforcing the row order
        if (this.isEnsureDomOrder()) { return false; }

        return isTrue(this.gridOptions.animateRows);
    }

    public isSuppressColumnMoveAnimation() {
        return isTrue(this.gridOptions.suppressColumnMoveAnimation);
    }

    public isSuppressAggFuncInHeader() {
        return isTrue(this.gridOptions.suppressAggFuncInHeader);
    }

    public isSuppressAggAtRootLevel() {
        return isTrue(this.gridOptions.suppressAggAtRootLevel);
    }

    public isSuppressAggFilteredOnly() {
        return isTrue(this.gridOptions.suppressAggFilteredOnly);
    }

    public isShowOpenedGroup() {
        return isTrue(this.gridOptions.showOpenedGroup);
    }

    public isEnableRangeSelection(): boolean {
        return ModuleRegistry.isRegistered(ModuleNames.RangeSelectionModule) && isTrue(this.gridOptions.enableRangeSelection);
    }

    public isEnableRangeHandle(): boolean {
        return isTrue(this.gridOptions.enableRangeHandle);
    }

    public isEnableFillHandle(): boolean {
        return isTrue(this.gridOptions.enableFillHandle);
    }

    public getFillHandleDirection(): 'x' | 'y' | 'xy' {
        const direction = this.gridOptions.fillHandleDirection;

        if (!direction) { return 'xy'; }

        if (direction !== 'x' && direction !== 'y' && direction !== 'xy') {
            doOnce(() => console.warn(`AG Grid: valid values for fillHandleDirection are 'x', 'y' and 'xy'. Default to 'xy'.`), 'warn invalid fill direction');
            return 'xy';
        }

        return direction;
    }

    public getFillOperation(): ((params: FillOperationParams) => any) | undefined {
        return this.gridOptions.fillOperation;
    }

    public isSuppressMultiRangeSelection(): boolean {
        return isTrue(this.gridOptions.suppressMultiRangeSelection);
    }

    public isPaginationAutoPageSize(): boolean {
        return isTrue(this.gridOptions.paginationAutoPageSize);
    }

    public isRememberGroupStateWhenNewData(): boolean {
        return isTrue(this.gridOptions.rememberGroupStateWhenNewData);
    }

    public getIcons() {
        return this.gridOptions.icons;
    }

    public getAggFuncs(): { [key: string]: IAggFunc; } | undefined {
        return this.gridOptions.aggFuncs;
    }

    public getSortingOrder(): (string | null)[] | undefined {
        return this.gridOptions.sortingOrder;
    }

    public getAlignedGrids(): GridOptions[] | undefined {
        return this.gridOptions.alignedGrids;
    }

    public isMasterDetail() {
        const masterDetail = isTrue(this.gridOptions.masterDetail);

        if (masterDetail) {
            return ModuleRegistry.assertRegistered(ModuleNames.MasterDetailModule, 'masterDetail');
        } else {
            return false;
        }
    }

    public isKeepDetailRows(): boolean {
        return isTrue(this.gridOptions.keepDetailRows);
    }

    public getKeepDetailRowsCount(): number | undefined {
        const keepDetailRowsCount = this.gridOptions.keepDetailRowsCount;
        if (exists(keepDetailRowsCount) && keepDetailRowsCount > 0) {
            return this.gridOptions.keepDetailRowsCount;
        }

        return DEFAULT_KEEP_DETAIL_ROW_COUNT;
    }

    public getIsRowMasterFunc(): IsRowMaster | undefined {
        return this.gridOptions.isRowMaster;
    }

    public getIsRowSelectableFunc(): IsRowSelectable | undefined {
        return this.gridOptions.isRowSelectable;
    }

    public getGroupRowRendererParams() {
        return this.gridOptions.groupRowRendererParams;
    }

    public getOverlayLoadingTemplate() {
        return this.gridOptions.overlayLoadingTemplate;
    }

    public getOverlayNoRowsTemplate() {
        return this.gridOptions.overlayNoRowsTemplate;
    }

    public isSuppressAutoSize() {
        return isTrue(this.gridOptions.suppressAutoSize);
    }

    public isEnableCellTextSelection() {
        return isTrue(this.gridOptions.enableCellTextSelection);
    }

    public isSuppressParentsInRowNodes() {
        return isTrue(this.gridOptions.suppressParentsInRowNodes);
    }

    public isSuppressClipboardApi() {
        return isTrue(this.gridOptions.suppressClipboardApi);
    }

    public isFunctionsReadOnly() {
        return isTrue(this.gridOptions.functionsReadOnly);
    }

    public isFloatingFilter(): boolean | undefined {
        return this.gridOptions.floatingFilter;
    }

    public isEnableCellTextSelect(): boolean {
        return isTrue(this.gridOptions.enableCellTextSelection);
    }

    public isEnableOldSetFilterModel(): boolean {
        return isTrue(this.gridOptions.enableOldSetFilterModel);
    }

    public getDefaultColDef(): ColDef | undefined {
        return this.gridOptions.defaultColDef;
    }

    public getDefaultColGroupDef(): ColGroupDef | undefined {
        return this.gridOptions.defaultColGroupDef;
    }

    public getDefaultExportParams(type: 'csv'): CsvExportParams | undefined;
    public getDefaultExportParams(type: 'excel'): ExcelExportParams | undefined;
    public getDefaultExportParams(type: 'csv' | 'excel'): CsvExportParams | ExcelExportParams | undefined {
        if (this.gridOptions.defaultExportParams) {
            console.warn(`AG Grid: Since v25.2 \`defaultExportParams\`  has been replaced by \`default${capitalise(type)}ExportParams\`'`);
            if (type === 'csv') {
                return this.gridOptions.defaultExportParams as CsvExportParams;
            }
            return this.gridOptions.defaultExportParams as ExcelExportParams;
        }

        if (type === 'csv' && this.gridOptions.defaultCsvExportParams) {
            return this.gridOptions.defaultCsvExportParams;
        }

        if (type === 'excel' && this.gridOptions.defaultExcelExportParams) {
            return this.gridOptions.defaultExcelExportParams;
        }
    }

    public isSuppressCsvExport() {
        return isTrue(this.gridOptions.suppressCsvExport);
    }

    public isAllowShowChangeAfterFilter() {
        return isTrue(this.gridOptions.allowShowChangeAfterFilter);
    }

    public isSuppressExcelExport() {
        return isTrue(this.gridOptions.suppressExcelExport);
    }

    public isSuppressMakeColumnVisibleAfterUnGroup() {
        return isTrue(this.gridOptions.suppressMakeColumnVisibleAfterUnGroup);
    }

    public getDataPathFunc(): ((dataItem: any) => string[]) | undefined {
        return this.gridOptions.getDataPath;
    }

    public getIsServerSideGroupFunc(): ((dataItem: any) => boolean) | undefined {
        return this.gridOptions.isServerSideGroup;
    }

    public getIsServerSideGroupOpenByDefaultFunc(): ((params: IsServerSideGroupOpenByDefaultParams) => boolean) | undefined {
        return this.gridOptions.isServerSideGroupOpenByDefault;
    }

    public getIsGroupOpenByDefaultFunc(): ((params: IsGroupOpenByDefaultParams) => boolean) | undefined {
        return this.gridOptions.isGroupOpenByDefault;
    }

    public getServerSideGroupKeyFunc(): ((dataItem: any) => string) | undefined {
        return this.gridOptions.getServerSideGroupKey;
    }

    public getGroupRowAggNodesFunc() {
        return this.gridOptions.groupRowAggNodes;
    }

    public getContextMenuItemsFunc(): GetContextMenuItems | undefined {
        return this.gridOptions.getContextMenuItems;
    }

    public getMainMenuItemsFunc(): GetMainMenuItems | undefined {
        return this.gridOptions.getMainMenuItems;
    }

    public getRowNodeIdFunc(): GetRowNodeIdFunc | undefined {
        return this.gridOptions.getRowNodeId;
    }

    public getNavigateToNextHeaderFunc(): ((params: NavigateToNextHeaderParams) => HeaderPosition) | undefined {
        return this.gridOptions.navigateToNextHeader;
    }

    public getTabToNextHeaderFunc(): ((params: TabToNextHeaderParams) => HeaderPosition) | undefined {
        return this.gridOptions.tabToNextHeader;
    }

    public getNavigateToNextCellFunc(): ((params: NavigateToNextCellParams) => CellPosition) | undefined {
        return this.gridOptions.navigateToNextCell;
    }

    public getTabToNextCellFunc(): ((params: TabToNextCellParams) => CellPosition) | undefined {
        return this.gridOptions.tabToNextCell;
    }

    public getGridTabIndex(): string {
        return (this.gridOptions.tabIndex || 0).toString();
    }

    public isTreeData(): boolean {
        const usingTreeData = isTrue(this.gridOptions.treeData);

        if (usingTreeData) {
            return ModuleRegistry.assertRegistered(ModuleNames.RowGroupingModule, 'Tree Data');
        }

        return false;
    }

    public isValueCache(): boolean {
        return isTrue(this.gridOptions.valueCache);
    }

    public isValueCacheNeverExpires(): boolean {
        return isTrue(this.gridOptions.valueCacheNeverExpires);
    }

    public isDeltaSort(): boolean {
        return isTrue(this.gridOptions.deltaSort);
    }

    public isAggregateOnlyChangedColumns(): boolean {
        return isTrue(this.gridOptions.aggregateOnlyChangedColumns);
    }

    public getProcessSecondaryColDefFunc(): ((colDef: ColDef) => void) | undefined {
        return this.gridOptions.processSecondaryColDef;
    }

    public getProcessSecondaryColGroupDefFunc(): ((colGroupDef: ColGroupDef) => void) | undefined {
        return this.gridOptions.processSecondaryColGroupDef;
    }

    public getSendToClipboardFunc() {
        return this.gridOptions.sendToClipboard;
    }

    public getProcessRowPostCreateFunc(): any {
        return this.gridOptions.processRowPostCreate;
    }

    public getProcessCellForClipboardFunc(): ((params: ProcessCellForExportParams) => any) | undefined {
        return this.gridOptions.processCellForClipboard;
    }

    public getProcessHeaderForClipboardFunc(): ((params: ProcessHeaderForExportParams) => any) | undefined {
        return this.gridOptions.processHeaderForClipboard;
    }

    public getProcessCellFromClipboardFunc(): ((params: ProcessCellForExportParams) => any) | undefined {
        return this.gridOptions.processCellFromClipboard;
    }

    public getViewportRowModelPageSize(): number | undefined {
        return oneOrGreater(this.gridOptions.viewportRowModelPageSize, DEFAULT_VIEWPORT_ROW_MODEL_PAGE_SIZE);
    }

    public getViewportRowModelBufferSize(): number {
        return zeroOrGreater(this.gridOptions.viewportRowModelBufferSize, DEFAULT_VIEWPORT_ROW_MODEL_BUFFER_SIZE);
    }

    public isServerSideSortingAlwaysResets() {
        return isTrue(this.gridOptions.serverSideSortingAlwaysResets);
    }

    public isServerSideFilteringAlwaysResets() {
        return isTrue(this.gridOptions.serverSideFilteringAlwaysResets);
    }

    public getPostSortFunc(): ((rowNodes: RowNode[]) => void) | undefined {
        return this.gridOptions.postSort;
    }

    public getChartToolbarItemsFunc(): GetChartToolbarItems | undefined {
        return this.gridOptions.getChartToolbarItems;
    }

    public getChartThemeOverrides(): AgChartThemeOverrides | undefined {
        return this.gridOptions.chartThemeOverrides;
    }

    public getCustomChartThemes(): { [name: string]: AgChartTheme; } | undefined {
        return this.gridOptions.customChartThemes;
    }

    public getChartThemes(): string[] {
        // return default themes if user hasn't supplied any
        return this.gridOptions.chartThemes || ['ag-default', 'ag-material', 'ag-pastel', 'ag-vivid', 'ag-solar'];
    }

    public getProcessChartOptionsFunc(): ((params: ProcessChartOptionsParams) => ChartOptions<any>) | undefined  {
        return this.gridOptions.processChartOptions;
    }

    public getClipboardDeliminator() {
        return exists(this.gridOptions.clipboardDeliminator) ? this.gridOptions.clipboardDeliminator : '\t';
    }

    public setProperty(key: string, value: any, force = false): void {
        const gridOptionsNoType = this.gridOptions as any;
        const previousValue = gridOptionsNoType[key];

        if (force || previousValue !== value) {
            gridOptionsNoType[key] = value;
            const event: PropertyChangedEvent = {
                type: key,
                currentValue: value,
                previousValue: previousValue
            };
            this.propertyEventService.dispatchEvent(event);
        }
    }

    public addEventListener(key: string, listener: Function): void {
        this.propertyEventService.addEventListener(key, listener);
    }

    public removeEventListener(key: string, listener: Function): void {
        this.propertyEventService.removeEventListener(key, listener);
    }

    public isSkipHeaderOnAutoSize(): boolean {
        return !!this.gridOptions.skipHeaderOnAutoSize;
    }

    public getAutoSizePadding(): number {
        const value = this.gridOptions.autoSizePadding;
        return value != null && value >= 0 ? value : 20;
    }

    // properties
    public getHeaderHeight(): number | null | undefined {
        if (typeof this.gridOptions.headerHeight === 'number') {
            return this.gridOptions.headerHeight;
        }

        return this.getFromTheme(25, 'headerHeight');
    }

    public getFloatingFiltersHeight(): number | null | undefined {
        if (typeof this.gridOptions.floatingFiltersHeight === 'number') {
            return this.gridOptions.floatingFiltersHeight;
        }

        return this.getFromTheme(25, 'headerHeight');
    }

    public getGroupHeaderHeight(): number | null | undefined {
        if (typeof this.gridOptions.groupHeaderHeight === 'number') {
            return this.gridOptions.groupHeaderHeight;
        }

        return this.getHeaderHeight();
    }

    public getPivotHeaderHeight(): number | null | undefined {
        if (typeof this.gridOptions.pivotHeaderHeight === 'number') {
            return this.gridOptions.pivotHeaderHeight;
        }

        return this.getHeaderHeight();
    }

    public getPivotGroupHeaderHeight(): number | null | undefined {
        if (typeof this.gridOptions.pivotGroupHeaderHeight === 'number') {
            return this.gridOptions.pivotGroupHeaderHeight;
        }

        return this.getGroupHeaderHeight();
    }

    public isExternalFilterPresent() {
        if (typeof this.gridOptions.isExternalFilterPresent === 'function') {
            return this.gridOptions.isExternalFilterPresent();
        }

        return false;
    }

    public doesExternalFilterPass(node: RowNode) {
        if (typeof this.gridOptions.doesExternalFilterPass === 'function') {
            return this.gridOptions.doesExternalFilterPass(node);
        }

        return false;
    }

    public getTooltipShowDelay(): number | null {
        const { tooltipShowDelay } = this.gridOptions;

        if (exists(tooltipShowDelay)) {
            if (tooltipShowDelay < 0) {
                console.warn('ag-grid: tooltipShowDelay should not be lower than 0');
            }

            return Math.max(200, tooltipShowDelay);
        }

        return null;
    }

    public isTooltipMouseTrack() {
        return isTrue(this.gridOptions.tooltipMouseTrack);
    }

    public isSuppressModelUpdateAfterUpdateTransaction(): boolean {
        return isTrue(this.gridOptions.suppressModelUpdateAfterUpdateTransaction);
    }

    public getDocument(): Document {
        // if user is providing document, we use the users one,
        // otherwise we use the document on the global namespace.
        let result: Document | null = null;
        if (this.gridOptions.getDocument && exists(this.gridOptions.getDocument)) {
            result = this.gridOptions.getDocument();
        }
        if (result && exists(result)) {
            return result;
        }

        return document;
    }

    public getMinColWidth() {
        const minColWidth = this.gridOptions.minColWidth;

        if (exists(minColWidth) && minColWidth > GridOptionsWrapper.MIN_COL_WIDTH) {
            return this.gridOptions.minColWidth;
        }

        const measuredMin = this.getFromTheme(null, 'headerCellMinWidth');
        return exists(measuredMin) ? Math.max(measuredMin, GridOptionsWrapper.MIN_COL_WIDTH) : GridOptionsWrapper.MIN_COL_WIDTH;
    }

    public getMaxColWidth() {
        if (this.gridOptions.maxColWidth && this.gridOptions.maxColWidth > GridOptionsWrapper.MIN_COL_WIDTH) {
            return this.gridOptions.maxColWidth;
        }

        return null;
    }

    public getColWidth() {
        if (typeof this.gridOptions.colWidth !== 'number' || this.gridOptions.colWidth < GridOptionsWrapper.MIN_COL_WIDTH) {
            return 200;
        }

        return this.gridOptions.colWidth;
    }

    public getRowBuffer(): number {
        let rowBuffer = this.gridOptions.rowBuffer;

        if (typeof rowBuffer === 'number') {
            if (rowBuffer < 0) {
                doOnce(() => console.warn(`AG Grid: rowBuffer should not be negative`), 'warn rowBuffer negative');
                this.gridOptions.rowBuffer = rowBuffer = 0;
            }
        } else {
            rowBuffer = Constants.ROW_BUFFER_SIZE;
        }

        return rowBuffer;
    }

    public getRowBufferInPixels() {
        const rowsToBuffer = this.getRowBuffer();
        const defaultRowHeight = this.getRowHeightAsNumber();

        return rowsToBuffer * defaultRowHeight;
    }

    // the user might be using some non-standard scrollbar, eg a scrollbar that has zero
    // width and overlays (like the Safari scrollbar, but presented in Chrome). so we
    // allow the user to provide the scroll width before we work it out.
    public getScrollbarWidth() {
        if (this.scrollbarWidth == null) {
            const useGridOptions = typeof this.gridOptions.scrollbarWidth === 'number' && this.gridOptions.scrollbarWidth >= 0;
            const scrollbarWidth = useGridOptions ? this.gridOptions.scrollbarWidth : getScrollbarWidth();

            if (scrollbarWidth != null) {
                this.scrollbarWidth = scrollbarWidth;

                this.eventService.dispatchEvent({
                    type: Events.EVENT_SCROLLBAR_WIDTH_CHANGED
                });
            }
        }

        return this.scrollbarWidth;
    }

    private checkForDeprecated() {
        // casting to generic object, so typescript compiles even though
        // we are looking for attributes that don't exist
        const options: any = this.gridOptions;

        if (options.deprecatedEmbedFullWidthRows) {
            console.warn(`AG Grid: since v21.2, deprecatedEmbedFullWidthRows has been replaced with embedFullWidthRows.`);
        }

        if (options.enableOldSetFilterModel) {
            console.warn(
                'AG Grid: since v22.x, enableOldSetFilterModel is deprecated. Please move to the new Set Filter Model as the old one may not be supported in v23 onwards.'
            );
        }

        if (options.floatingFilter) {
            console.warn(
                'AG Grid: since v23.1, floatingFilter on the gridOptions is deprecated. Please use floatingFilter on the colDef instead.'
            );

            if (!options.defaultColDef) {
                options.defaultColDef = {};
            }

            if (options.defaultColDef.floatingFilter == null) {
                options.defaultColDef.floatingFilter = true;
            }
        }

        if (options.rowDeselection) {
            console.warn(
                'AG Grid: since v24.x, rowDeselection is deprecated and the behaviour is true by default. Please use `suppressRowDeselection` to prevent rows from being deselected.'
            );
        }

        const checkRenamedProperty = (oldProp: string, newProp: string, version: string) => {
            if (options[oldProp] != null) {
                console.warn(`ag-grid: since version ${version}, '${oldProp}' is deprecated / renamed, please use the new property name '${newProp}' instead.`);
                if (options[newProp] == null) {
                    options[newProp] = options[oldProp];
                }
            }
        };

        checkRenamedProperty('batchUpdateWaitMillis', 'asyncTransactionWaitMillis', '23.1.x');
        checkRenamedProperty('deltaRowDataMode', 'immutableData', '23.1.x');

        if (options.immutableColumns || options.deltaColumnMode) {
            console.warn(
                'AG Grid: since v24.0, immutableColumns and deltaColumnMode properties are gone. The grid now works like this as default. To keep column order maintained, set grid property applyColumnDefOrder=true'
            );
        }

        checkRenamedProperty('suppressSetColumnStateEvents', 'suppressColumnStateEvents', '24.0.x');

        if (options.groupRowInnerRenderer || options.groupRowInnerRendererParams || options.groupRowInnerRendererFramework) {
            console.warn('AG Grid: since v24.0, grid properties groupRowInnerRenderer, groupRowInnerRendererFramework and groupRowInnerRendererParams are no longer used.');
            console.warn('  Instead use the grid properties groupRowRendererParams.innerRenderer, groupRowRendererParams.innerRendererFramework and groupRowRendererParams.innerRendererParams.');
            console.warn('  For example instead of this:');
            console.warn('    groupRowInnerRenderer: "myRenderer"');
            console.warn('    groupRowInnerRendererParams: {x: a}');
            console.warn('  Replace with this:');
            console.warn('    groupRowRendererParams: {');
            console.warn('      innerRenderer: "myRenderer",');
            console.warn('      innerRendererParams: {x: a}');
            console.warn('    }');
            console.warn('  We have copied the properties over for you. However to stop this error message, please change your application code.');
            if (!options.groupRowRendererParams) {
                options.groupRowRendererParams = {};
            }
            const params = options.groupRowRendererParams;
            if (options.groupRowInnerRenderer) {
                params.innerRenderer = options.groupRowInnerRenderer;
            }
            if (options.groupRowInnerRendererParams) {
                params.innerRendererParams = options.groupRowInnerRendererParams;
            }
            if (options.groupRowInnerRendererFramework) {
                params.innerRendererFramework = options.groupRowInnerRendererFramework;
            }
        }

        if (options.rememberGroupStateWhenNewData) {
            console.warn('AG Grid: since v24.0, grid property rememberGroupStateWhenNewData is deprecated. This feature was provided before Transaction Updates worked (which keep group state). Now that transaction updates are possible and they keep group state, this feature is no longer needed.');
        }

        if (options.detailCellRendererParams && options.detailCellRendererParams.autoHeight) {
            console.warn('AG Grid: since v24.1, grid property detailCellRendererParams.autoHeight is replaced with grid property detailRowAutoHeight. This allows this feature to work when you provide a custom DetailCellRenderer');
            options.detailRowAutoHeight = true;
        }

        if (options.suppressKeyboardEvent) {
            console.warn(
                `AG Grid: since v24.1 suppressKeyboardEvent in the gridOptions has been deprecated and will be removed in
                 future versions of AG Grid. If you need this to be set for every column use the defaultColDef property.`
            );
        }

        if (options.suppressEnterpriseResetOnNewColumns) {
            console.warn('AG Grid: since v25, grid property suppressEnterpriseResetOnNewColumns is deprecated. This was a temporary property to allow changing columns in Server Side Row Model without triggering a reload. Now that it is possible to dynamically change columns in the grid, this is no longer needed.');
            options.detailRowAutoHeight = true;
        }

        if (options.suppressColumnStateEvents) {
            console.warn('AG Grid: since v25, grid property suppressColumnStateEvents no longer works due to a refactor that we did. It should be possible to achieve similar using event.source, which would be "api" if the event was due to setting column state via the API');
            options.detailRowAutoHeight = true;
        }

        if (options.defaultExportParams) {
            console.warn('AG Grid: since v25.2, the grid property `defaultExportParams` has been replaced by `defaultCsvExportParams` and `defaultExcelExportParams`.');
        }

        if (options.stopEditingWhenGridLosesFocus) {
            console.warn('AG Grid: since v25.2.2, the grid property `stopEditingWhenGridLosesFocus`.');
            options.stopEditingWhenCellsLoseFocus = true;
        }
    }

    private checkForViolations() {
        if (this.isTreeData()) { this.treeDataViolations(); }
    }

    private treeDataViolations() {
        if (this.isRowModelDefault()) {
            if (missing(this.getDataPathFunc())) {
                console.warn(
                    'AG Grid: property usingTreeData=true with rowModel=clientSide, but you did not ' +
                    'provide getDataPath function, please provide getDataPath function if using tree data.'
                );
            }
        }
        if (this.isRowModelServerSide()) {
            if (missing(this.getIsServerSideGroupFunc())) {
                console.warn(
                    'AG Grid: property usingTreeData=true with rowModel=serverSide, but you did not ' +
                    'provide isServerSideGroup function, please provide isServerSideGroup function if using tree data.'
                );
            }
            if (missing(this.getServerSideGroupKeyFunc())) {
                console.warn(
                    'AG Grid: property usingTreeData=true with rowModel=serverSide, but you did not ' +
                    'provide getServerSideGroupKey function, please provide getServerSideGroupKey function if using tree data.'
                );
            }
        }
    }

    public getLocaleTextFunc(): (key: string, defaultValue: string) => string {
        if (this.gridOptions.localeTextFunc) {
            return this.gridOptions.localeTextFunc;
        }

        const { localeText } = this.gridOptions;

        return (key: string, defaultValue: string) => {
            return localeText && localeText[key] ? localeText[key] : defaultValue;
        };
    }

    // responsible for calling the onXXX functions on gridOptions
    public globalEventHandler(eventName: string, event?: any): void {
        // prevent events from being fired _after_ the grid has been destroyed
        if (this.destroyed) {
            return;
        }

        const callbackMethodName = ComponentUtil.getCallbackForEvent(eventName);
        if (typeof (this.gridOptions as any)[callbackMethodName] === 'function') {
            (this.gridOptions as any)[callbackMethodName](event);
        }
    }

    // we don't allow dynamic row height for virtual paging
    public getRowHeightAsNumber(): number {
        if (!this.gridOptions.rowHeight || missing(this.gridOptions.rowHeight)) {
            return this.getDefaultRowHeight();
        }

        if (this.gridOptions.rowHeight && this.isNumeric(this.gridOptions.rowHeight)) {
            return this.gridOptions.rowHeight;
        }

        console.warn('AG Grid row height must be a number if not using standard row model');
        return this.getDefaultRowHeight();
    }

    public getRowHeightForNode(rowNode: RowNode, allowEstimate = false): { height: number | null | undefined; estimated: boolean; } {
        // check the function first, in case use set both function and
        // number, when using virtual pagination then function can be
        // used for pinned rows and the number for the body rows.

        if (typeof this.gridOptions.getRowHeight === 'function') {
            if (allowEstimate) {
                return { height: this.getDefaultRowHeight(), estimated: true };
            }
            const params = {
                node: rowNode,
                data: rowNode.data,
                api: this.gridOptions.api,
                context: this.gridOptions.context
            };
            const height = this.gridOptions.getRowHeight(params);

            if (this.isNumeric(height)) {
                if (height === 0) {
                    doOnce(() => console.warn('AG Grid: The return of `getRowHeight` cannot be zero. If the intention is to hide rows, use a filter instead.'), 'invalidRowHeight');
                }
                return { height: Math.max(1, height), estimated: false };
            }
        }

        if (rowNode.detail && this.isMasterDetail()) {
            if (this.isNumeric(this.gridOptions.detailRowHeight)) {
                return { height: this.gridOptions.detailRowHeight, estimated: false };
            }

            return { height: DEFAULT_DETAIL_ROW_HEIGHT, estimated: false };
        }

        const defaultRowHeight = this.getDefaultRowHeight();
        const rowHeight = this.gridOptions.rowHeight && this.isNumeric(this.gridOptions.rowHeight) ? this.gridOptions.rowHeight : defaultRowHeight;

        const minRowHeight = exists(rowHeight) ? Math.min(defaultRowHeight, rowHeight) : defaultRowHeight;

        if (this.columnModel.isAutoRowHeightActive()) {
            if (allowEstimate) {
                return { height: rowHeight, estimated: true };
            }
            const autoHeight = this.autoHeightCalculator.getPreferredHeightForRow(rowNode);
            // never return less than the default row height - covers when auto height
            // cells are blank.
            return { height: Math.max(autoHeight, minRowHeight), estimated: false };
        }

        return { height: rowHeight, estimated: false };
    }

    public isDynamicRowHeight(): boolean {
        return typeof this.gridOptions.getRowHeight === 'function';
    }

    public getListItemHeight() {
        return this.getFromTheme(20, 'listItemHeight');

    }

    public chartMenuPanelWidth() {
        return this.environment.chartMenuPanelWidth();
    }

    private isNumeric(value: any) {
        return !isNaN(value) && typeof value === 'number' && isFinite(value);
    }

    // Material data table has strict guidelines about whitespace, and these values are different than the ones
    // ag-grid uses by default. We override the default ones for the sake of making it better out of the box
    private getFromTheme(defaultValue: number, sassVariableName: SASS_PROPERTIES): number;
    private getFromTheme(defaultValue: null, sassVariableName: SASS_PROPERTIES): number |  null | undefined;
    private getFromTheme(defaultValue: any, sassVariableName: SASS_PROPERTIES): any {
        const { theme } = this.environment.getTheme();
        if (theme && theme.indexOf('ag-theme') === 0) {
            return this.environment.getSassVariable(theme, sassVariableName);
        }
        return defaultValue;
    }

    private getDefaultRowHeight(): number {
        return this.getFromTheme(DEFAULT_ROW_HEIGHT, 'rowHeight');
    }
}
