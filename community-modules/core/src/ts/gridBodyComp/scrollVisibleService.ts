import { Bean, Autowired, PostConstruct } from "../context/context";
import { BeanStub } from "../context/beanStub";
import { Events, ScrollVisibilityChangedEvent } from "../events";
import { ColumnApi } from "../columns/columnApi";
import { GridApi } from "../gridApi";
import { ControllersService } from "../controllersService";

export interface SetScrollsVisibleParams {
    horizontalScrollShowing: boolean;
    verticalScrollShowing: boolean;
}

@Bean('scrollVisibleService')
export class ScrollVisibleService extends BeanStub {

    @Autowired('columnApi') private columnApi: ColumnApi;
    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('controllersService') public controllersService: ControllersService;

    private horizontalScrollShowing: boolean;
    private verticalScrollShowing: boolean;

    @PostConstruct
    private postConstruct(): void {
        this.addManagedListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_CHANGED, this.onDisplayedColumnsChanged.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_WIDTH_CHANGED, this.onDisplayedColumnsWidthChanged.bind(this));

    }

    public onDisplayedColumnsChanged(): void {
        this.update();
    }

    private onDisplayedColumnsWidthChanged(): void {
        this.update();
    }

    private update(): void {
        // because of column animation (which takes 200ms), we have to do this twice.
        // eg if user removes cols anywhere except at the RHS, then the cols on the RHS
        // will animate to the left to fill the gap. this animation means just after
        // the cols are removed, the remaining cols are still in the original location
        // at the start of the animation, so pre animation the H scrollbar is still needed,
        // but post animation it is not.
        this.updateImpl();
        setTimeout(this.updateImpl.bind(this), 500);
    }

    private updateImpl(): void {
        const params: SetScrollsVisibleParams = {
            horizontalScrollShowing: this.controllersService.getCenterRowContainerCon().isHorizontalScrollShowing(),
            verticalScrollShowing: this.isVerticalScrollShowing()
        };

        this.setScrollsVisible(params);
    }

    public setScrollsVisible(params: SetScrollsVisibleParams): void {
        const atLeastOneDifferent =
            this.horizontalScrollShowing !== params.horizontalScrollShowing ||
            this.verticalScrollShowing !== params.verticalScrollShowing;

        if (atLeastOneDifferent) {
            this.horizontalScrollShowing = params.horizontalScrollShowing;
            this.verticalScrollShowing = params.verticalScrollShowing;

            const event: ScrollVisibilityChangedEvent = {
                type: Events.EVENT_SCROLL_VISIBILITY_CHANGED,
                api: this.gridApi,
                columnApi: this.columnApi
            };
            this.eventService.dispatchEvent(event);
        }
    }

    // used by pagination service - to know page height
    public isHorizontalScrollShowing(): boolean {
        return this.horizontalScrollShowing;
    }

    // used by header container
    public isVerticalScrollShowing(): boolean {
        return this.verticalScrollShowing;
    }
}
