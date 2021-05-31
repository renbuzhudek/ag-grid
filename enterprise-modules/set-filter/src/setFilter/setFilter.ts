import {
    AgInputTextField,
    Autowired,
    CellValueChangedEvent,
    Component,
    Constants,
    Events,
    IDoesFilterPassParams,
    ISetFilterParams,
    ProvidedFilter,
    RefSelector,
    ValueFormatterService,
    VirtualList,
    VirtualListModel,
    IAfterGuiAttachedParams,
    AgPromise,
    KeyCode,
    _,
} from '@ag-grid-community/core';
import { SetFilterModelValuesType, SetValueModel } from './setValueModel';
import { SetFilterListItem, SetFilterListItemSelectionChangedEvent } from './setFilterListItem';
import { SetFilterModel, SetFilterModelValue } from './setFilterModel';
import { ISetFilterLocaleText, DEFAULT_LOCALE_TEXT } from './localeText';
export class SetFilter extends ProvidedFilter<SetFilterModel> {
    public static SELECT_ALL_VALUE = '__AG_SELECT_ALL__';

    @RefSelector('eMiniFilter') private readonly eMiniFilter: AgInputTextField;
    @RefSelector('eFilterLoading') private readonly eFilterLoading: HTMLElement;
    @RefSelector('eSetFilterList') private readonly eSetFilterList: HTMLElement;
    @RefSelector('eFilterNoMatches') private readonly eNoMatches: HTMLElement;

    @Autowired('valueFormatterService') private readonly valueFormatterService: ValueFormatterService;

    private valueModel: SetValueModel | null = null;
    private setFilterParams: ISetFilterParams | null = null;
    private virtualList: VirtualList | null = null;

    // To make the filtering super fast, we store the values in an object, and check for the boolean value.
    // Although Set would be a more natural choice of data structure, its performance across browsers is
    // significantly worse than using an object: https://jsbench.me/hdk91jbw1h/
    private appliedModelValues: { [key: string]: boolean; } | null = null;

    constructor() {
        super('setFilter');
    }

    // unlike the simple filters, nothing in the set filter UI shows/hides.
    // maybe this method belongs in abstractSimpleFilter???
    protected updateUiVisibility(): void { }

    protected createBodyTemplate(): string {
        return /* html */`
            <div class="ag-set-filter">
                <div ref="eFilterLoading" class="ag-filter-loading ag-hidden">${this.translateForSetFilter('loadingOoo')}</div>
                <ag-input-text-field class="ag-mini-filter" ref="eMiniFilter"></ag-input-text-field>
                <div ref="eFilterNoMatches" class="ag-filter-no-matches ag-hidden">${this.translateForSetFilter('noMatches')}</div>
                <div ref="eSetFilterList" class="ag-set-filter-list" role="presentation"></div>
            </div>`;
    }

    protected handleKeyDown(e: KeyboardEvent): void {
        if (e.defaultPrevented) { return; }

        switch (e.which || e.keyCode) {
            case KeyCode.SPACE:
                this.handleKeySpace(e);
                break;
            case KeyCode.ENTER:
                this.handleKeyEnter(e);
                break;
        }
    }

    private handleKeySpace(e: KeyboardEvent): void {
        if (!this.eSetFilterList.contains(document.activeElement) || !this.virtualList) { return; }

        const currentItem = this.virtualList.getLastFocusedRow();

        if (currentItem != null) {
            const component = this.virtualList.getComponentAt(currentItem) as SetFilterListItem;

            if (component) {
                e.preventDefault();
                component.toggleSelected();
            }
        }
    }

    private handleKeyEnter(e: KeyboardEvent): void {
        if (!this.setFilterParams) { return; }

        if (this.setFilterParams.excelMode) {
            e.preventDefault();

            // in Excel Mode, hitting Enter is the same as pressing the Apply button
            this.onBtApply(false, false, e);

            if (this.setFilterParams.excelMode === 'mac') {
                // in Mac version, select all the input text
                this.eMiniFilter.getInputElement().select();
            }
        }
    }

    protected getCssIdentifier(): string {
        return 'set-filter';
    }

    private setModelAndRefresh(values: SetFilterModelValue | null): AgPromise<void> {
        return this.valueModel ? this.valueModel.setModel(values).then(() => this.refresh()) : AgPromise.resolve();
    }

    protected resetUiToDefaults(): AgPromise<void> {
        this.setMiniFilter(null);

        return this.setModelAndRefresh(null);
    }

    protected setModelIntoUi(model: SetFilterModel): AgPromise<void> {
        this.setMiniFilter(null);

        if (model instanceof Array) {
            const message = 'AG Grid: The Set Filter Model is no longer an array and models as arrays are ' +
                'deprecated. Please check the docs on what the set filter model looks like. Future versions of ' +
                'AG Grid will have the array version of the model removed.';
            _.doOnce(() => console.warn(message), 'setFilter.modelAsArray');
        }

        // also supporting old filter model for backwards compatibility
        const values = model == null ? null : (model instanceof Array ? model as string[] : model.values);

        return this.setModelAndRefresh(values);
    }

    public getModelFromUi(): SetFilterModel | null {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        const values = this.valueModel.getModel();

        if (!values) { return null; }

        if (this.gridOptionsWrapper.isEnableOldSetFilterModel()) {
            // this is a hack, it breaks casting rules, to apply with old model
            return (values as any);
        }

        return { values, filterType: this.getFilterType() };
    }

    public getModel(): SetFilterModel {
        return super.getModel() as SetFilterModel;
    }

    public getFilterType(): string {
        return 'set';
    }

    public getValueModel(): SetValueModel | null {
        return this.valueModel;
    }

    protected areModelsEqual(a: SetFilterModel, b: SetFilterModel): boolean {
        // both are missing
        if (a == null && b == null) { return true; }

        return a != null && b != null && _.areEqual(a.values, b.values);
    }

    public setParams(params: ISetFilterParams): void {
        this.applyExcelModeOptions(params);

        super.setParams(params);

        this.checkSetFilterDeprecatedParams(params);
        this.setFilterParams = params;

        this.valueModel = new SetValueModel(
            params,
            loading => this.showOrHideLoadingScreen(loading),
            this.valueFormatterService,
            key => this.translateForSetFilter(key),
        );

        this.initialiseFilterBodyUi();

        if (params.rowModel.getType() === Constants.ROW_MODEL_TYPE_CLIENT_SIDE &&
            !params.values &&
            !params.suppressSyncValuesAfterDataChange) {
            this.addEventListenersForDataChanges();
        }
    }

    private applyExcelModeOptions(params: ISetFilterParams): void {
        // apply default options to match Excel behaviour, unless they have already been specified
        if (params.excelMode === 'windows') {
            if (!params.buttons) {
                params.buttons = ['apply', 'cancel'];
            }

            if (params.closeOnApply == null) {
                params.closeOnApply = true;
            }
        } else if (params.excelMode === 'mac') {
            if (!params.buttons) {
                params.buttons = ['reset'];
            }

            if (params.applyMiniFilterWhileTyping == null) {
                params.applyMiniFilterWhileTyping = true;
            }

            if (params.debounceMs == null) {
                params.debounceMs = 500;
            }
        }
    }

    private checkSetFilterDeprecatedParams(params: ISetFilterParams): void {
        if (params.syncValuesLikeExcel) {
            const message = 'AG Grid: since version 22.x, the Set Filter param syncValuesLikeExcel is no longer' +
                ' used as this is the default behaviour. To turn this default behaviour off, use the' +
                ' param suppressSyncValuesAfterDataChange';
            _.doOnce(() => console.warn(message), 'syncValuesLikeExcel deprecated');
        }

        if (params.selectAllOnMiniFilter) {
            const message = 'AG Grid: since version 22.x, the Set Filter param selectAllOnMiniFilter is no longer' +
                ' used as this is the default behaviour.';
            _.doOnce(() => console.warn(message), 'selectAllOnMiniFilter deprecated');
        }

        if (params.suppressSyncValuesAfterDataChange) {
            const message = 'AG Grid: since version 23.1, the Set Filter param suppressSyncValuesAfterDataChange has' +
                ' been deprecated and will be removed in a future major release.';
            _.doOnce(() => console.warn(message), 'suppressSyncValuesAfterDataChange deprecated');
        }

        if (params.suppressRemoveEntries) {
            const message = 'AG Grid: since version 23.1, the Set Filter param suppressRemoveEntries has' +
                ' been deprecated and will be removed in a future major release.';
            _.doOnce(() => console.warn(message), 'suppressRemoveEntries deprecated');
        }
    }

    private addEventListenersForDataChanges(): void {
        this.addManagedListener(
            this.eventService, Events.EVENT_ROW_DATA_UPDATED, () => this.syncAfterDataChange());

        this.addManagedListener(
            this.eventService,
            Events.EVENT_CELL_VALUE_CHANGED,
            (event: CellValueChangedEvent) => {
                // only interested in changes to do with this column
                if (this.setFilterParams && event.column === this.setFilterParams.column) {
                    this.syncAfterDataChange();
                }
            });
    }

    private syncAfterDataChange(refreshValues = true, keepSelection = true): AgPromise<void> {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        let promise: AgPromise<void> = AgPromise.resolve();

        if (refreshValues) {
            promise = this.valueModel.refreshValues(keepSelection);
        } else if (!keepSelection) {
            promise = this.valueModel.setModel(null);
        }

        return promise.then(() => {
            this.refresh();
            this.onBtApply(false, true);
        });
    }

    /** @deprecated since version 23.2. The loading screen is displayed automatically when the set filter is retrieving values. */
    public setLoading(loading: boolean): void {
        const message = 'AG Grid: since version 23.2, setLoading has been deprecated. The loading screen is displayed automatically when the set filter is retrieving values.';
        _.doOnce(() => console.warn(message), 'setFilter.setLoading');

        this.showOrHideLoadingScreen(loading);
    }

    private showOrHideLoadingScreen(isLoading: boolean): void {
        _.setDisplayed(this.eFilterLoading, isLoading);
    }

    private initialiseFilterBodyUi(): void {
        this.initVirtualList();
        this.initMiniFilter();
    }

    private initVirtualList(): void {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        const virtualList = this.virtualList = this.createBean(new VirtualList('filter'));
        const eSetFilterList = this.getRefElement('eSetFilterList');

        if (eSetFilterList) {
            eSetFilterList.appendChild(virtualList.getGui());
        }

        const { cellHeight } = this.setFilterParams;

        if (cellHeight != null) {
            virtualList.setRowHeight(cellHeight);
        }

        virtualList.setComponentCreator(value => this.createSetListItem(value));

        let model: VirtualListModel;

        if (this.setFilterParams.suppressSelectAll) {
            model = new ModelWrapper(this.valueModel);
        } else {
            model = new ModelWrapperWithSelectAll(this.valueModel, () => this.isSelectAllSelected());
        }

        virtualList.setModel(model);
    }

    private getSelectAllLabel(): string {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        const key = this.valueModel.getMiniFilter() == null || !this.setFilterParams.excelMode ?
            'selectAll' : 'selectAllSearchResults';

        return this.translateForSetFilter(key);
    }

    private createSetListItem(value: any): Component {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        let listItem: SetFilterListItem;

        if (value === SetFilter.SELECT_ALL_VALUE) {
            listItem = this.createBean(new SetFilterListItem(
                () => this.getSelectAllLabel(),
                this.setFilterParams,
                key => this.translateForSetFilter(key),
                this.isSelectAllSelected()));

            listItem.addEventListener(
                SetFilterListItem.EVENT_SELECTION_CHANGED,
                (e: SetFilterListItemSelectionChangedEvent) => this.onSelectAll(e.isSelected)
            );

            return listItem;
        }

        listItem = this.createBean(new SetFilterListItem(
            value, this.setFilterParams, key => this.translateForSetFilter(key), this.valueModel.isValueSelected(value)));

        listItem.addEventListener(
            SetFilterListItem.EVENT_SELECTION_CHANGED,
            (e: SetFilterListItemSelectionChangedEvent) => this.onItemSelected(value, e.isSelected)
        );

        return listItem;
    }

    private initMiniFilter() {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        const { eMiniFilter, gridOptionsWrapper } = this;
        const translate = gridOptionsWrapper.getLocaleTextFunc();

        _.setDisplayed(eMiniFilter.getGui(), !this.setFilterParams.suppressMiniFilter);

        eMiniFilter.setValue(this.valueModel.getMiniFilter());
        eMiniFilter.onValueChange(() => this.onMiniFilterInput());
        eMiniFilter.setInputAriaLabel(translate('ariaSearchFilterValues', 'Search filter values'));

        this.addManagedListener(eMiniFilter.getInputElement(), 'keypress', e => this.onMiniFilterKeyPress(e));
    }

    // we need to have the GUI attached before we can draw the virtual rows, as the
    // virtual row logic needs info about the GUI state
    public afterGuiAttached(params?: IAfterGuiAttachedParams): void {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }

        super.afterGuiAttached(params);

        this.refreshVirtualList();

        if (this.setFilterParams.excelMode) {
            this.resetUiToActiveModel();
        }

        const { eMiniFilter } = this;

        eMiniFilter.setInputPlaceholder(this.translateForSetFilter('searchOoo'));

        if (!params || !params.suppressFocus) {
            eMiniFilter.getFocusableElement().focus();
        }
    }

    public applyModel(): boolean {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        if (this.setFilterParams.excelMode && this.valueModel.isEverythingVisibleSelected()) {
            // In Excel, if the filter is applied with all visible values selected, then any active filter on the
            // column is removed. This ensures the filter is removed in this situation.
            this.valueModel.selectAllMatchingMiniFilter();
        }

        const result = super.applyModel();

        // keep appliedModelValues in sync with the applied model
        const appliedModel = this.getModel();

        if (appliedModel) {
            this.appliedModelValues = _.reduce(
                appliedModel.values,
                (values, value) => {
                    values[String(value)] = true;
                    return values;
                },
                {} as { [key: string]: boolean; });
        } else {
            this.appliedModelValues = null;
        }

        return result;
    }

    protected isModelValid(model: SetFilterModel): boolean {
        return this.setFilterParams && this.setFilterParams.excelMode ? model == null || model.values.length > 0 : true;
    }

    public doesFilterPass(params: IDoesFilterPassParams): boolean {
        if (!this.setFilterParams || !this.valueModel || !this.appliedModelValues) { return true; }

        const { valueGetter, colDef: { keyCreator } } = this.setFilterParams;

        let value = valueGetter(params.node);

        if (keyCreator) {
            value = keyCreator({ value });
        }

        value = _.makeNull(value);

        if (Array.isArray(value)) {
            return _.some(value, v => this.appliedModelValues![_.makeNull(v)] === true);
        }

        // Comparing against a value performs better than just checking for undefined
        // https://jsbench.me/hdk91jbw1h/
        return this.appliedModelValues[value] === true;
    }

    public onNewRowsLoaded(): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        const valuesType = this.valueModel.getValuesType();
        const keepSelection = this.isNewRowsActionKeep();

        this.syncAfterDataChange(valuesType === SetFilterModelValuesType.TAKEN_FROM_GRID_VALUES, keepSelection);
    }

    //noinspection JSUnusedGlobalSymbols
    /**
     * Public method provided so the user can change the value of the filter once
     * the filter has been already started
     * @param options The options to use.
     */
    public setFilterValues(options: string[]): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.valueModel.overrideValues(options, this.isNewRowsActionKeep()).then(() => {
            this.refresh();
            this.onUiChanged();
        });
    }

    //noinspection JSUnusedGlobalSymbols
    /**
     * Public method provided so the user can reset the values of the filter once that it has started.
     */
    public resetFilterValues(): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.valueModel.setValuesType(SetFilterModelValuesType.TAKEN_FROM_GRID_VALUES);
        this.syncAfterDataChange(true, this.isNewRowsActionKeep());
    }

    public refreshFilterValues(): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        // the model is still being initialised
        if (!this.valueModel.isInitialised()) { return; }

        this.valueModel.refreshValues().then(() => {
            this.refresh();
            this.onUiChanged();
        });
    }

    public onAnyFilterChanged(): void {
        // don't block the current action when updating the values for this filter
        setTimeout(() => {
            if (!this.isAlive()) { return; }

            if (!this.valueModel) { throw new Error('Value model has not been created.'); }

            this.valueModel.refreshAfterAnyFilterChanged().then(() => this.refresh());
        }, 0);
    }

    private onMiniFilterInput() {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        if (this.valueModel.setMiniFilter(this.eMiniFilter.getValue())) {
            if (this.setFilterParams.applyMiniFilterWhileTyping) {
                this.filterOnAllVisibleValues(false);
            } else {
                this.updateUiAfterMiniFilterChange();
            }
        }
    }

    private updateUiAfterMiniFilterChange(): void {
        if (!this.setFilterParams) { throw new Error('Set filter params have not been provided.'); }
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        if (this.setFilterParams.excelMode) {
            if (this.valueModel.getMiniFilter() == null) {
                this.resetUiToActiveModel();
            } else {
                this.valueModel.selectAllMatchingMiniFilter(true);
                this.refresh();
                this.onUiChanged();
            }
        } else {
            this.refresh();
        }

        this.showOrHideResults();
    }

    private showOrHideResults(): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        const hideResults = this.valueModel.getMiniFilter() != null && this.valueModel.getDisplayedValueCount() < 1;

        _.setDisplayed(this.eNoMatches, hideResults);
        _.setDisplayed(this.eSetFilterList, !hideResults);
    }

    private resetUiToActiveModel(): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.eMiniFilter.setValue(null, true);
        this.valueModel.setMiniFilter(null);
        this.setModelIntoUi(this.getModel()).then(() => this.onUiChanged(false, 'prevent'));
    }

    private onMiniFilterKeyPress(e: KeyboardEvent): void {
        if (_.isKeyPressed(e, KeyCode.ENTER) && (!this.setFilterParams || !this.setFilterParams.excelMode)) {
            this.filterOnAllVisibleValues();
        }
    }

    private filterOnAllVisibleValues(applyImmediately = true): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.valueModel.selectAllMatchingMiniFilter(true);
        this.refresh();
        this.onUiChanged(false, applyImmediately ? 'immediately' : 'debounce');
        this.showOrHideResults();
    }

    private focusRowIfAlive(rowIndex: number | null): void {
        if (rowIndex == null) { return; }

        window.setTimeout(() => {
            if (!this.virtualList) { throw new Error('Virtual list has not been created.'); }

            if (this.isAlive()) {
                this.virtualList.focusRow(rowIndex);
            }
        }, 0);
    }

    private onSelectAll(isSelected: boolean): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }
        if (!this.virtualList) { throw new Error('Virtual list has not been created.'); }

        if (isSelected) {
            this.valueModel.selectAllMatchingMiniFilter();
        } else {
            this.valueModel.deselectAllMatchingMiniFilter();
        }

        const focusedRow = this.virtualList.getLastFocusedRow();

        this.refresh();
        this.onUiChanged();
        this.focusRowIfAlive(focusedRow);
    }

    private onItemSelected(value: any, isSelected: boolean): void {
        if (!this.valueModel) { throw new Error('Value model has not been created.'); }
        if (!this.virtualList) { throw new Error('Virtual list has not been created.'); }

        if (isSelected) {
            this.valueModel.selectValue(value);
        } else {
            this.valueModel.deselectValue(value);
        }

        const focusedRow = this.virtualList.getLastFocusedRow();

        this.refresh();
        this.onUiChanged();
        this.focusRowIfAlive(focusedRow);
    }

    public setMiniFilter(newMiniFilter: string | null): void {
        this.eMiniFilter.setValue(newMiniFilter);
        this.onMiniFilterInput();
    }

    public getMiniFilter(): string | null {
        return this.valueModel ? this.valueModel.getMiniFilter() : null;
    }

    /** @deprecated since version 23.2. Please use setModel instead. */
    public selectEverything() {
        const message = 'AG Grid: since version 23.2, selectEverything has been deprecated. Please use setModel instead.';
        _.doOnce(() => console.warn(message), 'setFilter.selectEverything');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.valueModel.selectAllMatchingMiniFilter();
        this.refresh();
    }

    /** @deprecated since version 23.2. Please use setModel instead. */
    public selectNothing() {
        const message = 'AG Grid: since version 23.2, selectNothing has been deprecated. Please use setModel instead.';
        _.doOnce(() => console.warn(message), 'setFilter.selectNothing');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.valueModel.deselectAllMatchingMiniFilter();
        this.refresh();
    }

    /** @deprecated since version 23.2. Please use setModel instead. */
    public unselectValue(value: string) {
        const message = 'AG Grid: since version 23.2, unselectValue has been deprecated. Please use setModel instead.';
        _.doOnce(() => console.warn(message), 'setFilter.unselectValue');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.valueModel.deselectValue(value);
        this.refresh();
    }

    /** @deprecated since version 23.2. Please use setModel instead. */
    public selectValue(value: string) {
        const message = 'AG Grid: since version 23.2, selectValue has been deprecated. Please use setModel instead.';
        _.doOnce(() => console.warn(message), 'setFilter.selectValue');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        this.valueModel.selectValue(value);
        this.refresh();
    }

    private refresh() {
        if (!this.virtualList) { throw new Error('Virtual list has not been created.'); }

        this.virtualList.refresh();
    }

    /** @deprecated since version 23.2. Please use getModel instead. */
    public isValueSelected(value: string) {
        const message = 'AG Grid: since version 23.2, isValueSelected has been deprecated. Please use getModel instead.';
        _.doOnce(() => console.warn(message), 'setFilter.isValueSelected');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        return this.valueModel.isValueSelected(value);
    }

    /** @deprecated since version 23.2. Please use getModel instead. */
    public isEverythingSelected() {
        const message = 'AG Grid: since version 23.2, isEverythingSelected has been deprecated. Please use getModel instead.';
        _.doOnce(() => console.warn(message), 'setFilter.isEverythingSelected');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        return this.valueModel.isEverythingVisibleSelected();
    }

    /** @deprecated since version 23.2. Please use getModel instead. */
    public isNothingSelected() {
        const message = 'AG Grid: since version 23.2, isNothingSelected has been deprecated. Please use getModel instead.';
        _.doOnce(() => console.warn(message), 'setFilter.isNothingSelected');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        return this.valueModel.isNothingVisibleSelected();
    }

    /** @deprecated since version 23.2. Please use getValues instead. */
    public getUniqueValueCount() {
        const message = 'AG Grid: since version 23.2, getUniqueValueCount has been deprecated. Please use getValues instead.';
        _.doOnce(() => console.warn(message), 'setFilter.getUniqueValueCount');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        return this.valueModel.getUniqueValueCount();
    }

    /** @deprecated since version 23.2. Please use getValues instead. */
    public getUniqueValue(index: any) {
        const message = 'AG Grid: since version 23.2, getUniqueValue has been deprecated. Please use getValues instead.';
        _.doOnce(() => console.warn(message), 'setFilter.getUniqueValue');

        if (!this.valueModel) { throw new Error('Value model has not been created.'); }

        return this.valueModel.getUniqueValue(index);
    }

    public getValues(): (string | null)[] {
        return this.valueModel ? this.valueModel.getValues() : [];
    }

    public refreshVirtualList(): void {
        if (this.setFilterParams && this.setFilterParams.refreshValuesOnOpen) {
            this.refreshFilterValues();
        } else {
            this.refresh();
        }
    }

    private translateForSetFilter(key: keyof ISetFilterLocaleText): string {
        const translate = this.gridOptionsWrapper.getLocaleTextFunc();

        return translate(key, DEFAULT_LOCALE_TEXT[key]);
    }

    private isSelectAllSelected(): boolean | undefined {
        if (!this.setFilterParams || !this.valueModel) { return false; }

        if (!this.setFilterParams.defaultToNothingSelected) {
            // everything selected by default
            if (this.valueModel.hasSelections() && this.valueModel.isNothingVisibleSelected()) {
                return false;
            }

            if (this.valueModel.isEverythingVisibleSelected()) {
                return true;
            }
        } else {
            // nothing selected by default
            if (this.valueModel.hasSelections() && this.valueModel.isEverythingVisibleSelected()) {
                return true;
            }

            if (this.valueModel.isNothingVisibleSelected()) {
                return false;
            }
        }
        // returning `undefined` means the checkbox status is indeterminate.
        return undefined;
    }

    public destroy(): void {
        if (this.virtualList != null) {
            this.virtualList.destroy();
            this.virtualList = null;
        }

        super.destroy();
    }
}

class ModelWrapper implements VirtualListModel {
    constructor(private readonly model: SetValueModel) {
    }

    public getRowCount(): number {
        return this.model.getDisplayedValueCount();
    }

    public getRow(index: number): string | null {
        return this.model.getDisplayedValue(index);
    }

    public isRowSelected(index: number): boolean {
        return this.model.isValueSelected(this.getRow(index));
    }
}

class ModelWrapperWithSelectAll implements VirtualListModel {
    constructor(
        private readonly model: SetValueModel,
        private readonly isSelectAllSelected: (() => boolean | undefined)) {
    }

    public getRowCount(): number {
        return this.model.getDisplayedValueCount() + 1;
    }

    public getRow(index: number): string | null {
        return index === 0 ? SetFilter.SELECT_ALL_VALUE : this.model.getDisplayedValue(index - 1);
    }

    public isRowSelected(index: number): boolean | undefined {
        return index === 0 ? this.isSelectAllSelected() : this.model.isValueSelected(this.getRow(index));
    }
}