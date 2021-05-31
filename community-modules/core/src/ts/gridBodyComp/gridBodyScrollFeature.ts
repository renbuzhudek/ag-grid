import { Autowired, PostConstruct } from "../context/context";
import { BeanStub } from "../context/beanStub";
import { getInnerHeight, getScrollLeft, isRtlNegativeScroll, setScrollLeft } from "../utils/dom";
import { ControllersService } from "../controllersService";
import { Events } from "../eventKeys";
import { debounce } from "../utils/function";
import { BodyScrollEvent } from "../events";
import { isIOSUserAgent } from "../utils/browser";
import { AnimationFrameService } from "../misc/animationFrameService";
import { ColumnApi } from "../columns/columnApi";
import { GridApi } from "../gridApi";
import { Constants } from "../constants/constants";
import { PaginationProxy } from "../pagination/paginationProxy";
import { IRowModel } from "../interfaces/iRowModel";
import { RowContainerHeightService } from "../rendering/rowContainerHeightService";
import { RowRenderer } from "../rendering/rowRenderer";
import { ColumnModel } from "../columns/columnModel";
import { RowContainerCtrl } from "./rowContainer/rowContainerCtrl";

type ScrollDirection = 'horizontal' | 'vertical';

export class GridBodyScrollFeature extends BeanStub {

    @Autowired('controllersService') public controllersService: ControllersService;
    @Autowired('animationFrameService') private animationFrameService: AnimationFrameService;
    @Autowired('columnApi') private columnApi: ColumnApi;
    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('paginationProxy') private paginationProxy: PaginationProxy;
    @Autowired('rowModel') private rowModel: IRowModel;
    @Autowired('rowContainerHeightService') private heightScaler: RowContainerHeightService;
    @Autowired('rowRenderer') private rowRenderer: RowRenderer;
    @Autowired('columnModel') private columnModel: ColumnModel;

    private enableRtl: boolean;

    private lastHorizontalScrollElement: HTMLElement | undefined | null;

    private eBodyViewport: HTMLElement;

    private scrollLeft = -1;
    private nextScrollTop = -1;
    private scrollTop = -1;

    private readonly resetLastHorizontalScrollElementDebounced: () => void;

    private centerRowContainerCon: RowContainerCtrl;

    constructor(eBodyViewport: HTMLElement) {
        super();
        this.eBodyViewport = eBodyViewport;
        this.resetLastHorizontalScrollElementDebounced = debounce(this.resetLastHorizontalScrollElement.bind(this), 500);
    }

    @PostConstruct
    private postConstruct(): void {
        this.enableRtl = this.gridOptionsWrapper.isEnableRtl();
        this.addManagedListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_WIDTH_CHANGED, this.onDisplayedColumnsWidthChanged.bind(this));

        this.controllersService.whenReady(p => {
            this.centerRowContainerCon = p.centerRowContainerCon;
            this.onDisplayedColumnsWidthChanged();
            this.addScrollListener();
        });
    }

    private addScrollListener() {
        const fakeHScroll = this.controllersService.getFakeHScrollCon();

        this.addManagedListener(this.centerRowContainerCon.getViewportElement(), 'scroll', this.onCenterViewportScroll.bind(this));
        this.addManagedListener(fakeHScroll.getViewport(), 'scroll', this.onFakeHorizontalScroll.bind(this));

        const onVerticalScroll = this.gridOptionsWrapper.isDebounceVerticalScrollbar() ?
            debounce(this.onVerticalScroll.bind(this), 100)
            : this.onVerticalScroll.bind(this);

        this.addManagedListener(this.eBodyViewport, 'scroll', onVerticalScroll);
    }

    private onDisplayedColumnsWidthChanged(): void {
        if (this.enableRtl) {
            // because RTL is all backwards, a change in the width of the row
            // can cause a change in the scroll position, without a scroll event,
            // because the scroll position in RTL is a function that depends on
            // the width. to be convinced of this, take out this line, enable RTL,
            // scroll all the way to the left and then resize a column
            this.horizontallyScrollHeaderCenterAndFloatingCenter();
        }
    }

    public horizontallyScrollHeaderCenterAndFloatingCenter(scrollLeft?: number): void {
        if (scrollLeft === undefined) {
            scrollLeft = this.centerRowContainerCon.getCenterViewportScrollLeft();
        }

        const offset = this.enableRtl ? scrollLeft : -scrollLeft;
        const topCenterContainer = this.controllersService.getTopCenterRowContainerCon();
        const bottomCenterContainer = this.controllersService.getBottomCenterRowContainerCon();
        const headerRootComp = this.controllersService.getHeaderRootComp();
        const fakeHScroll = this.controllersService.getFakeHScrollCon();

        headerRootComp.setHorizontalScroll(offset);
        bottomCenterContainer.setContainerTranslateX(offset);
        topCenterContainer.setContainerTranslateX(offset);

        const partner = this.lastHorizontalScrollElement === this.centerRowContainerCon.getViewportElement() ?
                fakeHScroll.getViewport() : this.centerRowContainerCon.getViewportElement();

        setScrollLeft(partner, Math.abs(scrollLeft), this.enableRtl);
    }

    private isControllingScroll(eDiv: HTMLElement): boolean {
        if (!this.lastHorizontalScrollElement) {
            this.lastHorizontalScrollElement = eDiv;
            return true;
        }

        return eDiv === this.lastHorizontalScrollElement;
    }

    private onFakeHorizontalScroll(): void {
        const fakeHScrollViewport = this.controllersService.getFakeHScrollCon().getViewport();
        if (!this.isControllingScroll(fakeHScrollViewport)) { return; }
        this.onBodyHorizontalScroll(fakeHScrollViewport);
    }

    private onCenterViewportScroll(): void {
        const centerContainerViewport = this.centerRowContainerCon.getViewportElement();
        if (!this.isControllingScroll(centerContainerViewport)) { return; }
        this.onBodyHorizontalScroll(centerContainerViewport);
    }

    private onBodyHorizontalScroll(eSource: HTMLElement): void {
        const centerContainerViewport = this.centerRowContainerCon.getViewportElement();
        const { scrollLeft } = centerContainerViewport;

        if (this.shouldBlockScrollUpdate('horizontal', scrollLeft, true)) {
            return;
        }

        // we do Math.round() rather than Math.floor(), to mirror how scroll values are applied.
        // eg if a scale is applied (ie user has zoomed the browser), then applying scroll=200
        // could result in 199.88, which then floor(199.88) = 199, however round(199.88) = 200.
        // initially Math.floor() was used, however this caused (almost) infinite loop with aligned grids,
        // as the scroll would move 1px at at time bouncing from one grid to the next (eg one grid would cause
        // scroll to 200px, the next to 199px, then the first back to 198px and so on).
        this.doHorizontalScroll(Math.round(getScrollLeft(eSource, this.enableRtl)));
        this.resetLastHorizontalScrollElementDebounced();
    }

    private onVerticalScroll(): void {
        const scrollTop: number = this.eBodyViewport.scrollTop;

        if (this.shouldBlockScrollUpdate('vertical', scrollTop, true)) { return; }
        this.animationFrameService.setScrollTop(scrollTop);
        this.nextScrollTop = scrollTop;

        if (this.gridOptionsWrapper.isSuppressAnimationFrame()) {
            this.scrollTop = this.nextScrollTop;
            this.redrawRowsAfterScroll();
        } else {
            this.animationFrameService.schedule();
        }
    }

    private resetLastHorizontalScrollElement() {
        this.lastHorizontalScrollElement = null;
    }

    private doHorizontalScroll(scrollLeft: number): void {
        this.scrollLeft = scrollLeft;

        const event: BodyScrollEvent = {
            type: Events.EVENT_BODY_SCROLL,
            api: this.gridApi,
            columnApi: this.columnApi,
            direction: 'horizontal',
            left: this.scrollLeft,
            top: this.scrollTop
        };

        this.eventService.dispatchEvent(event);
        this.horizontallyScrollHeaderCenterAndFloatingCenter(scrollLeft);
        this.onHorizontalViewportChanged();
    }

    private shouldBlockScrollUpdate(direction: ScrollDirection, scrollTo: number, touchOnly: boolean = false): boolean {
        // touch devices allow elastic scroll - which temporally scrolls the panel outside of the viewport
        // (eg user uses touch to go to the left of the grid, but drags past the left, the rows will actually
        // scroll past the left until the user releases the mouse). when this happens, we want ignore the scroll,
        // as otherwise it was causing the rows and header to flicker.

        // sometimes when scrolling, we got values that extended the maximum scroll allowed. we used to
        // ignore these scrolls. problem is the max scroll position could be skipped (eg the previous scroll event
        // could be 10px before the max position, and then current scroll event could be 20px after the max position).
        // if we just ignored the last event, we would be setting the scroll to 10px before the max position, when in
        // actual fact the user has exceeded the max scroll and thus scroll should be set to the max.

        if (touchOnly && !isIOSUserAgent()) { return false; }

        if (direction === 'vertical') {
            const clientHeight = getInnerHeight(this.eBodyViewport);
            const { scrollHeight } = this.eBodyViewport;
            if (scrollTo < 0 || (scrollTo + clientHeight > scrollHeight)) {
                return true;
            }
        }

        if (direction === 'horizontal') {
            const clientWidth = this.centerRowContainerCon.getCenterWidth();
            const { scrollWidth } = this.centerRowContainerCon.getViewportElement();

            if (this.enableRtl && isRtlNegativeScroll()) {
                if (scrollTo > 0) { return true; }
            } else if (scrollTo < 0) { return true; }

            if (Math.abs(scrollTo) + clientWidth > scrollWidth) {
                return true;
            }
        }

        return false;
    }

    private redrawRowsAfterScroll(): void {
        const event: BodyScrollEvent = {
            type: Events.EVENT_BODY_SCROLL,
            direction: 'vertical',
            api: this.gridApi,
            columnApi: this.columnApi,
            left: this.scrollLeft,
            top: this.scrollTop
        };
        this.eventService.dispatchEvent(event);
    }

    private onHorizontalViewportChanged(): void {
        this.centerRowContainerCon.onHorizontalViewportChanged();
    }

    // this is to cater for AG-3274, where grid is removed from the dom and then inserted back in again.
    // (which happens with some implementations of tabbing). this can result in horizontal scroll getting
    // reset back to the left, however no scroll event is fired. so we need to get header to also scroll
    // back to the left to be kept in sync.
    // adding and removing the grid from the DOM both resets the scroll position and
    // triggers a resize event, so notify listeners if the scroll position has changed
    public checkScrollLeft(): void {
        if (this.scrollLeft !== this.centerRowContainerCon.getCenterViewportScrollLeft()) {
            this.onBodyHorizontalScroll(this.centerRowContainerCon.getViewportElement());
        }
    }

    public executeAnimationFrameScroll(): boolean {
        const frameNeeded = this.scrollTop != this.nextScrollTop;

        if (frameNeeded) {
            this.scrollTop = this.nextScrollTop;
            this.redrawRowsAfterScroll();
        }

        return frameNeeded;
    }

    // called by scrollHorizontally method and alignedGridsService
    public setHorizontalScrollPosition(hScrollPosition: number): void {
        const minScrollLeft = 0;
        const maxScrollLeft = this.centerRowContainerCon.getViewportElement().scrollWidth - this.centerRowContainerCon.getCenterWidth();

        if (this.shouldBlockScrollUpdate('horizontal', hScrollPosition)) {
            if (this.enableRtl && isRtlNegativeScroll()) {
                hScrollPosition = hScrollPosition > 0 ? 0 : maxScrollLeft;
            } else {
                hScrollPosition = Math.min(Math.max(hScrollPosition, minScrollLeft), maxScrollLeft);
            }
        }

        setScrollLeft(this.centerRowContainerCon.getViewportElement(), Math.abs(hScrollPosition), this.enableRtl);

        // we need to manually do the event handling (rather than wait for the event)
        // for the alignedGridsService, as if we don't, the aligned grid service gets
        // notified async, and then it's 'consuming' flag doesn't get used right, and
        // we can end up with an infinite loop
        this.doHorizontalScroll(hScrollPosition);
    }

    public setVerticalScrollPosition(vScrollPosition: number): void {
        this.eBodyViewport.scrollTop = vScrollPosition;
    }

    public getVScrollPosition(): { top: number, bottom: number; } {
        const result = {
            top: this.eBodyViewport.scrollTop,
            bottom: this.eBodyViewport.scrollTop + this.eBodyViewport.offsetHeight
        };
        return result;
    }

    public getHScrollPosition(): { left: number, right: number; } {
        return this.centerRowContainerCon.getHScrollPosition();
    }

    public isHorizontalScrollShowing(): boolean {
        return this.centerRowContainerCon.isHorizontalScrollShowing();
    }

    // called by the headerRootComp and moveColumnController
    public scrollHorizontally(pixels: number): number {
        const oldScrollPosition = this.centerRowContainerCon.getViewportElement().scrollLeft;

        this.setHorizontalScrollPosition(oldScrollPosition + pixels);
        return this.centerRowContainerCon.getViewportElement().scrollLeft - oldScrollPosition;
    }

    // gets called by rowRenderer when new data loaded, as it will want to scroll to the top
    public scrollToTop(): void {
        this.eBodyViewport.scrollTop = 0;
    }

    // Valid values for position are bottom, middle and top
    public ensureNodeVisible(comparator: any, position: string | null = null) {

        // look for the node index we want to display
        const rowCount = this.rowModel.getRowCount();
        const comparatorIsAFunction = typeof comparator === 'function';
        let indexToSelect = -1;
        // go through all the nodes, find the one we want to show
        for (let i = 0; i < rowCount; i++) {
            const node = this.rowModel.getRow(i);
            if (comparatorIsAFunction) {
                if (comparator(node)) {
                    indexToSelect = i;
                    break;
                }
            } else {
                // check object equality against node and data
                if (comparator === node || comparator === node!.data) {
                    indexToSelect = i;
                    break;
                }
            }
        }
        if (indexToSelect >= 0) {
            this.ensureIndexVisible(indexToSelect, position);
        }
    }

    // Valid values for position are bottom, middle and top
    // position should be {'top','middle','bottom', or undefined/null}.
    // if undefined/null, then the grid will to the minimal amount of scrolling,
    // eg if grid needs to scroll up, it scrolls until row is on top,
    //    if grid needs to scroll down, it scrolls until row is on bottom,
    //    if row is already in view, grid does not scroll
    public ensureIndexVisible(index: any, position?: string | null) {
        // if for print or auto height, everything is always visible
        if (this.gridOptionsWrapper.getDomLayout() === Constants.DOM_LAYOUT_PRINT) { return; }

        const rowCount = this.paginationProxy.getRowCount();

        if (typeof index !== 'number' || index < 0 || index >= rowCount) {
            console.warn('invalid row index for ensureIndexVisible: ' + index);
            return;
        }

        const isPaging = this.gridOptionsWrapper.isPagination();
        const paginationPanelEnabled = isPaging && !this.gridOptionsWrapper.isSuppressPaginationPanel();

        if (!paginationPanelEnabled) {
            this.paginationProxy.goToPageWithIndex(index);
        }

        const rowNode = this.paginationProxy.getRow(index);
        let rowGotShiftedDuringOperation: boolean;

        do {
            const startingRowTop = rowNode!.rowTop;
            const startingRowHeight = rowNode!.rowHeight;

            const paginationOffset = this.paginationProxy.getPixelOffset();
            const rowTopPixel = rowNode!.rowTop! - paginationOffset;
            const rowBottomPixel = rowTopPixel + rowNode!.rowHeight!;

            const scrollPosition = this.getVScrollPosition();
            const heightOffset = this.heightScaler.getDivStretchOffset();

            const vScrollTop = scrollPosition.top + heightOffset;
            const vScrollBottom = scrollPosition.bottom + heightOffset;

            const viewportHeight = vScrollBottom - vScrollTop;

            // work out the pixels for top, middle and bottom up front,
            // make the if/else below easier to read
            const pxTop = this.heightScaler.getScrollPositionForPixel(rowTopPixel);
            const pxBottom = this.heightScaler.getScrollPositionForPixel(rowBottomPixel - viewportHeight);
            // make sure if middle, the row is not outside the top of the grid
            const pxMiddle = Math.min((pxTop + pxBottom) / 2, rowTopPixel);

            const rowBelowViewport = vScrollTop > rowTopPixel;
            const rowAboveViewport = vScrollBottom < rowBottomPixel;

            let newScrollPosition: number | null = null;

            if (position === 'top') {
                newScrollPosition = pxTop;
            } else if (position === 'bottom') {
                newScrollPosition = pxBottom;
            } else if (position === 'middle') {
                newScrollPosition = pxMiddle;
            } else if (rowBelowViewport) {
                // if row is before, scroll up with row at top
                newScrollPosition = pxTop;
            } else if (rowAboveViewport) {
                // if row is below, scroll down with row at bottom
                newScrollPosition = pxBottom;
            }

            if (newScrollPosition !== null) {
                this.eBodyViewport.scrollTop = newScrollPosition;
                this.rowRenderer.redrawAfterScroll();
            }

            // the row can get shifted if during the rendering (during rowRenderer.redrawAfterScroll()),
            // the height of a row changes due to lazy calculation of row heights when using
            // colDef.autoHeight or gridOptions.getRowHeight.
            // if row was shifted, then the position we scrolled to is incorrect.
            rowGotShiftedDuringOperation = (startingRowTop !== rowNode!.rowTop)
                || (startingRowHeight !== rowNode!.rowHeight);

        } while (rowGotShiftedDuringOperation);

        // so when we return back to user, the cells have rendered
        this.animationFrameService.flushAllFrames();
    }

    public ensureColumnVisible(key: any): void {
        const column = this.columnModel.getGridColumn(key);

        if (!column) { return; }

        if (column.isPinned()) {
            console.warn('calling ensureIndexVisible on a ' + column.getPinned() + ' pinned column doesn\'t make sense for column ' + column.getColId());
            return;
        }

        if (!this.columnModel.isColumnDisplayed(column)) {
            console.warn('column is not currently visible');
            return;
        }

        const colLeftPixel = column.getLeft();
        const colRightPixel = colLeftPixel! + column.getActualWidth();

        const viewportWidth = this.centerRowContainerCon.getCenterWidth();
        const scrollPosition = this.centerRowContainerCon.getCenterViewportScrollLeft();

        const bodyWidth = this.columnModel.getBodyContainerWidth();

        let viewportLeftPixel: number;
        let viewportRightPixel: number;

        // the logic of working out left and right viewport px is both here and in the ColumnController,
        // need to refactor it out to one place
        if (this.enableRtl) {
            viewportLeftPixel = bodyWidth - scrollPosition - viewportWidth;
            viewportRightPixel = bodyWidth - scrollPosition;
        } else {
            viewportLeftPixel = scrollPosition;
            viewportRightPixel = viewportWidth + scrollPosition;
        }

        const viewportScrolledPastCol = viewportLeftPixel > colLeftPixel!;
        const viewportScrolledBeforeCol = viewportRightPixel < colRightPixel;
        const colToSmallForViewport = viewportWidth < column.getActualWidth();

        const alignColToLeft = viewportScrolledPastCol || colToSmallForViewport;
        const alignColToRight = viewportScrolledBeforeCol;

        if (alignColToLeft || alignColToRight) {
            let newScrollPosition: number;
            if (this.enableRtl) {
                newScrollPosition = alignColToLeft ? (bodyWidth - viewportWidth - colLeftPixel!) : (bodyWidth - colRightPixel);
            } else {
                newScrollPosition = alignColToLeft ? colLeftPixel! : (colRightPixel - viewportWidth);
            }
            this.centerRowContainerCon.setCenterViewportScrollLeft(newScrollPosition);
        } else {
            // otherwise, col is already in view, so do nothing
        }

        // this will happen anyway, as the move will cause a 'scroll' event on the body, however
        // it is possible that the ensureColumnVisible method is called from within AG Grid and
        // the caller will need to have the columns rendered to continue, which will be before
        // the event has been worked on (which is the case for cell navigation).
        this.centerRowContainerCon.onHorizontalViewportChanged();

        // so when we return back to user, the cells have rendered
        this.animationFrameService.flushAllFrames();
    }
}