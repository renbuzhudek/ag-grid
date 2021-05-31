import {
    _,
    AgCheckbox,
    AgEvent,
    Autowired,
    ColDef,
    Column,
    Component,
    ISetFilterCellRendererParams,
    ISetFilterParams,
    ITooltipParams,
    PostConstruct,
    RefSelector,
    UserComponentFactory,
    ValueFormatterService
} from '@ag-grid-community/core';
import { ISetFilterLocaleText } from './localeText';

export interface SetFilterListItemSelectionChangedEvent extends AgEvent {
    isSelected: boolean;
}

export class SetFilterListItem extends Component {
    public static EVENT_SELECTION_CHANGED = 'selectionChanged';

    @Autowired('valueFormatterService') private readonly valueFormatterService: ValueFormatterService;
    @Autowired('userComponentFactory') private readonly userComponentFactory: UserComponentFactory;

    private static TEMPLATE = /* html */`
        <div class="ag-set-filter-item">
            <ag-checkbox ref="eCheckbox" class="ag-set-filter-item-checkbox"></ag-checkbox>
        </div>`;

    @RefSelector('eCheckbox') private readonly eCheckbox: AgCheckbox;

    constructor(
        private readonly value: string | (() => string),
        private readonly params: ISetFilterParams,
        private readonly translate: (key: keyof ISetFilterLocaleText) => string,
        private isSelected?: boolean) {
        super(SetFilterListItem.TEMPLATE);
    }

    @PostConstruct
    private init(): void {
        this.render();

        this.eCheckbox.setValue(this.isSelected, true);
        this.eCheckbox.onValueChange(value => {
            const parsedValue = value || false;

            this.isSelected = parsedValue;

            const event: SetFilterListItemSelectionChangedEvent = {
                type: SetFilterListItem.EVENT_SELECTION_CHANGED,
                isSelected: parsedValue,
            };

            this.dispatchEvent(event);
        });
    }

    public toggleSelected(): void {
        this.isSelected = !this.isSelected;
        this.eCheckbox.setValue(this.isSelected);
    }

    public render(): void {
        const { params: { column } } = this;

        let { value } = this;
        let formattedValue: string | null = null;

        if (typeof value === 'function') {
            value = value();
        } else {
            formattedValue = this.getFormattedValue(this.params, column, value);
        }

        if (this.params.showTooltips) {
            const tooltipText = _.escapeString(formattedValue != null ? formattedValue : value);
            this.setTooltip(tooltipText);
        }

        const params: ISetFilterCellRendererParams = {
            value,
            valueFormatted: formattedValue,
            api: this.gridOptionsWrapper.getApi(),
            context: this.gridOptionsWrapper.getContext()
        };

        this.renderCell(params);
    }

    public getTooltipParams(): ITooltipParams {
        const res = super.getTooltipParams();
        res.location = 'setFilterValue';
        res.colDef = this.getComponentHolder();
        return res;
    }

    private getFormattedValue(filterParams: ISetFilterParams, column: Column, value: any) {
        const formatter = filterParams && filterParams.valueFormatter;

        return this.valueFormatterService.formatValue(column, null, null, value, formatter, false);
    }

    private renderCell(params: any): void {
        const cellRendererPromise = this.userComponentFactory.newSetFilterCellRenderer(this.params, params);

        if (cellRendererPromise == null) {
            const valueToRender = params.valueFormatted == null ? params.value : params.valueFormatted;

            this.eCheckbox.setLabel(valueToRender == null ? this.translate('blanks') : valueToRender);

            return;
        }

        cellRendererPromise.then(component => {
            if (component) {
                this.eCheckbox.setLabel(component.getGui());
                this.addDestroyFunc(() => this.destroyBean(component));
            }
        });
    }

    public getComponentHolder(): ColDef {
        return this.params.column.getColDef();
    }
}
