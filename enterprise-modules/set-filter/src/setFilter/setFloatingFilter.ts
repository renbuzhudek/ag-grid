import {
    Autowired,
    Component,
    IFloatingFilter,
    RefSelector,
    ValueFormatterService,
    IFloatingFilterParams,
    AgInputTextField,
    _,
    ColumnModel,
    ISetFilterParams
} from '@ag-grid-community/core';

import { SetFilterModel } from './setFilterModel';
import { SetFilter } from './setFilter';
import { SetValueModel } from './setValueModel';
import { DEFAULT_LOCALE_TEXT } from './localeText';

export class SetFloatingFilterComp extends Component implements IFloatingFilter {
    @RefSelector('eFloatingFilterText') private readonly eFloatingFilterText: AgInputTextField;
    @Autowired('valueFormatterService') private readonly valueFormatterService: ValueFormatterService;
    @Autowired('columnModel') private readonly columnModel: ColumnModel;

    private params: IFloatingFilterParams;
    private lastKnownModel: SetFilterModel;
    private availableValuesListenerAdded = false;

    constructor() {
        super(/* html */`
            <div class="ag-floating-filter-input" role="presentation">
                <ag-input-text-field ref="eFloatingFilterText"></ag-input-text-field>
            </div>`
        );
    }

    // this is a user component, and IComponent has "public destroy()" as part of the interface.
    // so we need to override destroy() just to make the method public.
    public destroy(): void {
        super.destroy();
    }

    public init(params: IFloatingFilterParams): void {
        const displayName = this.columnModel.getDisplayNameForColumn(params.column, 'header', true);
        const translate = this.gridOptionsWrapper.getLocaleTextFunc();

        this.eFloatingFilterText
            .setDisabled(true)
            .setInputAriaLabel(`${displayName} ${translate('ariaFilterInput', 'Filter Input')}`)
            .addGuiEventListener('click', () => params.showParentFilter());

        this.params = params;
    }

    public onParentModelChanged(parentModel: SetFilterModel): void {
        this.lastKnownModel = parentModel;
        this.updateFloatingFilterText();
    }

    private addAvailableValuesListener(): void {
        this.params.parentFilterInstance((setFilter: SetFilter) => {
            const setValueModel = setFilter.getValueModel();

            if (!setValueModel) { return; }

            // unlike other filters, what we show in the floating filter can be different, even
            // if another filter changes. this is due to how set filter restricts its values based
            // on selections in other filters, e.g. if you filter Language to English, then the set filter
            // on Country will only show English speaking countries. Thus the list of items to show
            // in the floating filter can change.
            this.addManagedListener(
                setValueModel, SetValueModel.EVENT_AVAILABLE_VALUES_CHANGED, () => this.updateFloatingFilterText());
        });

        this.availableValuesListenerAdded = true;
    }

    private updateFloatingFilterText(): void {
        if (!this.lastKnownModel) {
            this.eFloatingFilterText.setValue('');
            return;
        }

        if (!this.availableValuesListenerAdded) {
            this.addAvailableValuesListener();
        }

        // also supporting old filter model for backwards compatibility
        const values = this.lastKnownModel instanceof Array ? this.lastKnownModel as string[] : this.lastKnownModel.values;

        if (!values) {
            this.eFloatingFilterText.setValue('');
            return;
        }

        this.params.parentFilterInstance((setFilter: SetFilter) => {
            const valueModel = setFilter.getValueModel();

            if (!valueModel) { return; }

            const availableValues = _.filter(values, v => valueModel.isValueAvailable(v))!;
            const localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();

            // format all the values, if a formatter is provided
            const formattedValues = _.map(availableValues, value => {
                const { column, filterParams } = this.params;
                const formattedValue = this.valueFormatterService.formatValue(
                    column, null, null, value, (filterParams as ISetFilterParams).valueFormatter, false);

                const valueToRender = formattedValue != null ? formattedValue : value;

                return valueToRender == null ? localeTextFunc('blanks', DEFAULT_LOCALE_TEXT.blanks) : valueToRender;
            })!;

            const arrayToDisplay = formattedValues.length > 10 ? formattedValues.slice(0, 10).concat('...') : formattedValues;
            const valuesString = `(${formattedValues.length}) ${arrayToDisplay.join(',')}`;

            this.eFloatingFilterText.setValue(valuesString);
        });
    }
}
