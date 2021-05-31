import { BeanStub } from "../context/beanStub";
import { Autowired, Bean, PostConstruct } from "../context/context";
import { GridOptionsWrapper } from "../gridOptionsWrapper";
import { Events } from "../eventKeys";
import { ColumnModel } from "../columns/columnModel";
import { Constants } from "../constants/constants";

@Bean('pinnedWidthService')
export class PinnedWidthService extends BeanStub {

    @Autowired('columnModel') private columnModel: ColumnModel;

    private leftWidth: number;
    private rightWidth: number;

    @PostConstruct
    private postConstruct(): void {
        const listener = this.checkContainerWidths.bind(this);
        this.addManagedListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_CHANGED, listener);
        this.addManagedListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_WIDTH_CHANGED, listener);
        this.addManagedListener(this.gridOptionsWrapper, GridOptionsWrapper.PROP_DOM_LAYOUT, listener);
    }

    private checkContainerWidths() {

        const printLayout = this.gridOptionsWrapper.getDomLayout() === Constants.DOM_LAYOUT_PRINT;

        const newLeftWidth = printLayout ? 0 : this.columnModel.getDisplayedColumnsLeftWidth();
        const newRightWidth = printLayout ? 0 : this.columnModel.getDisplayedColumnsRightWidth();

        if (newLeftWidth != this.leftWidth) {
            this.leftWidth = newLeftWidth;
            this.eventService.dispatchEvent({type: Events.EVENT_LEFT_PINNED_WIDTH_CHANGED});
        }

        if (newRightWidth != this.rightWidth) {
            this.rightWidth = newRightWidth;
            this.eventService.dispatchEvent({type: Events.EVENT_RIGHT_PINNED_WIDTH_CHANGED});
        }
    }

    public getPinnedRightWidth(): number {
        return this.rightWidth;
    }

    public getPinnedLeftWidth(): number {
        return this.leftWidth;
    }
}