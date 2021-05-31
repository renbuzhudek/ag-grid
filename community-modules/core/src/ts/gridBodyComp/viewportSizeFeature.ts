import { BeanStub } from "../context/beanStub";
import { Autowired, PostConstruct } from "../context/context";
import { ColumnModel } from "../columns/columnModel";
import { ScrollVisibleService, SetScrollsVisibleParams } from "../gridBodyComp/scrollVisibleService";
import { GridBodyCtrl } from "./gridBodyCtrl";
import { BodyHeightChangedEvent, Events } from "../events";
import { ColumnApi } from "../columns/columnApi";
import { GridApi } from "../gridApi";
import { ControllersService } from "../controllersService";
import { RowContainerCtrl } from "./rowContainer/rowContainerCtrl";
import { getInnerHeight } from "../utils/dom";

// listens to changes in the center viewport size, for column and row virtualisation,
// and adjusts grid as necessary. there are two viewports, one for horizontal and one for
// vertical scrolling.
export class ViewportSizeFeature extends BeanStub {

    @Autowired('controllersService') private controllersService: ControllersService;
    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('scrollVisibleService') private scrollVisibleService: ScrollVisibleService;
    @Autowired('columnApi') private columnApi: ColumnApi;
    @Autowired('gridApi') private gridApi: GridApi;

    private centerContainerCon: RowContainerCtrl;
    private gridBodyCon: GridBodyCtrl;

    private centerWidth: number;
    private bodyHeight: number;

    constructor(centerContainer: RowContainerCtrl) {
        super();
        this.centerContainerCon = centerContainer;
    }

    @PostConstruct
    private postConstruct(): void {
        this.controllersService.whenReady(() => {
            this.gridBodyCon = this.controllersService.getGridBodyController();
            this.listenForResize();
        });
        this.addManagedListener(this.eventService, Events.EVENT_SCROLLBAR_WIDTH_CHANGED, this.onScrollbarWidthChanged.bind(this));
    }

    private listenForResize(): void {
        const listener = this.onCenterViewportResized.bind(this);

        // centerContainer gets horizontal resizes
        this.centerContainerCon.registerViewportResizeListener(listener);

        // eBodyViewport gets vertical resizes
        this.gridBodyCon.registerBodyViewportResizeListener(listener);
    }

    private onScrollbarWidthChanged() {
        this.checkViewportAndScrolls();
    }

    private onCenterViewportResized(): void {
        if (this.centerContainerCon.isViewportVisible()) {
            this.checkViewportAndScrolls();

            const newWidth = this.centerContainerCon.getCenterWidth();

            if (newWidth !== this.centerWidth) {
                this.centerWidth = newWidth;
                this.columnModel.refreshFlexedColumns(
                    { viewportWidth: this.centerWidth, updateBodyWidths: true, fireResizedEvent: true }
                );
            }
        } else {
            this.bodyHeight = 0;
        }
    }

    // gets called every time the viewport size changes. we use this to check visibility of scrollbars
    // in the grid panel, and also to check size and position of viewport for row and column virtualisation.
    public checkViewportAndScrolls(): void {
        // results in updating anything that depends on scroll showing
        this.updateScrollVisibleService();

        // fires event if height changes, used by PaginationService, HeightScalerService, RowRenderer
        this.checkBodyHeight();

        // check for virtual columns for ColumnController
        this.onHorizontalViewportChanged();

        this.gridBodyCon.getScrollFeature().checkScrollLeft();
    }

    public getBodyHeight(): number {
        return this.bodyHeight;
    }

    private checkBodyHeight(): void {
        const eBodyViewport = this.gridBodyCon.getBodyViewportElement();
        const bodyHeight = getInnerHeight(eBodyViewport);

        if (this.bodyHeight !== bodyHeight) {
            this.bodyHeight = bodyHeight;
            const event: BodyHeightChangedEvent = {
                type: Events.EVENT_BODY_HEIGHT_CHANGED,
                api: this.gridApi,
                columnApi: this.columnApi
            };
            this.eventService.dispatchEvent(event);
        }
    }

    private updateScrollVisibleService(): void {
        // because of column animation (which takes 200ms), we have to do this twice.
        // eg if user removes cols anywhere except at the RHS, then the cols on the RHS
        // will animate to the left to fill the gap. this animation means just after
        // the cols are removed, the remaining cols are still in the original location
        // at the start of the animation, so pre animation the H scrollbar is still needed,
        // but post animation it is not.
        this.updateScrollVisibleServiceImpl();
        setTimeout(this.updateScrollVisibleServiceImpl.bind(this), 500);
    }

    private updateScrollVisibleServiceImpl(): void {
        const params: SetScrollsVisibleParams = {
            horizontalScrollShowing: this.isHorizontalScrollShowing(),
            verticalScrollShowing: this.gridBodyCon.isVerticalScrollShowing()
        };

        this.scrollVisibleService.setScrollsVisible(params);

        // fix - gridComp should just listen to event from above
        this.gridBodyCon.setVerticalScrollPaddingVisible(params.verticalScrollShowing);
    }

    public isHorizontalScrollShowing(): boolean {
        const isAlwaysShowHorizontalScroll = this.gridOptionsWrapper.isAlwaysShowHorizontalScroll();
        return isAlwaysShowHorizontalScroll || this.centerContainerCon.isViewportHScrollShowing();
    }

    // this gets called whenever a change in the viewport, so we can inform column controller it has to work
    // out the virtual columns again. gets called from following locations:
    // + ensureColVisible, scroll, init, layoutChanged, displayedColumnsChanged, API (doLayout)
    private onHorizontalViewportChanged(): void {
        const scrollWidth = this.centerContainerCon.getCenterWidth();
        const scrollPosition = this.centerContainerCon.getViewportScrollLeft();

        this.columnModel.setViewportPosition(scrollWidth, scrollPosition);
    }
}