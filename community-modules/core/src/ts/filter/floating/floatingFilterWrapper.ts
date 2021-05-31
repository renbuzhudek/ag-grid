import { Autowired } from '../../context/context';
import { IMenuFactory } from '../../interfaces/iMenuFactory';
import { Column } from '../../entities/column';
import { SetLeftFeature } from '../../rendering/features/setLeftFeature';
import { IFloatingFilterComp, IFloatingFilterParams } from './../floating/floatingFilter';
import { RefSelector } from '../../widgets/componentAnnotations';
import { HoverFeature } from '../../headerRendering/hoverFeature';
import { Events, FilterChangedEvent } from '../../events';
import { ColumnHoverService } from '../../rendering/columnHoverService';
import { AgPromise } from '../../utils';
import { ColDef } from '../../entities/colDef';
import { IFilterComp, IFilterDef } from '../../interfaces/iFilter';
import { UserComponentFactory } from '../../components/framework/userComponentFactory';
import { GridApi } from '../../gridApi';
import { ColumnApi } from '../../columns/columnApi';
import { FilterManager } from './../filterManager';
import { ReadOnlyFloatingFilter } from './provided/readOnlyFloatingFilter';
import { ModuleNames } from '../../modules/moduleNames';
import { ModuleRegistry } from '../../modules/moduleRegistry';
import { addOrRemoveCssClass, setDisplayed } from '../../utils/dom';
import { createIconNoSpan } from '../../utils/icon';
import { AbstractHeaderWrapper } from '../../headerRendering/header/abstractHeaderWrapper';
import { Beans } from '../../rendering/beans';
import { HeaderRowComp } from '../../headerRendering/headerRowComp';
import { FloatingFilterMapper } from './floatingFilterMapper';
import { KeyCode } from '../../constants/keyCode';

export class FloatingFilterWrapper extends AbstractHeaderWrapper {
    private static TEMPLATE = /* html */
        `<div class="ag-header-cell" role="gridcell" tabindex="-1">
            <div class="ag-floating-filter-full-body" ref="eFloatingFilterBody" role="presentation"></div>
            <div class="ag-floating-filter-button ag-hidden" ref="eButtonWrapper" role="presentation">
                <button type="button" aria-label="Open Filter Menu" class="ag-floating-filter-button-button" ref="eButtonShowMainFilter" tabindex="-1"></button>
            </div>
        </div>`;

    @Autowired('columnHoverService') private readonly columnHoverService: ColumnHoverService;
    @Autowired('userComponentFactory') private readonly userComponentFactory: UserComponentFactory;
    @Autowired('gridApi') private readonly gridApi: GridApi;
    @Autowired('columnApi') private readonly columnApi: ColumnApi;
    @Autowired('filterManager') private readonly filterManager: FilterManager;
    @Autowired('menuFactory') private readonly menuFactory: IMenuFactory;
    @Autowired('beans') protected readonly beans: Beans;

    @RefSelector('eFloatingFilterBody') private readonly eFloatingFilterBody: HTMLElement;
    @RefSelector('eButtonWrapper') private readonly eButtonWrapper: HTMLElement;
    @RefSelector('eButtonShowMainFilter') private readonly eButtonShowMainFilter: HTMLElement;

    protected readonly column: Column;
    protected readonly pinned: string | null;

    private suppressFilterButton: boolean;

    private floatingFilterCompPromise: AgPromise<IFloatingFilterComp> | null;

    constructor(column: Column, pinned: string | null) {
        super(FloatingFilterWrapper.TEMPLATE);
        this.column = column;
        this.pinned = pinned;
    }

    protected postConstruct(): void {
        super.postConstruct();

        this.setupFloatingFilter();
        this.setupWidth();
        this.setupLeftPositioning();
        this.setupColumnHover();
        this.createManagedBean(new HoverFeature([this.column], this.getGui()));

        this.addManagedListener(this.eButtonShowMainFilter, 'click', this.showParentFilter.bind(this));
    }

    protected onTabKeyDown(e: KeyboardEvent) {
        const activeEl = document.activeElement as HTMLElement;
        const eGui = this.getGui();
        const wrapperHasFocus = activeEl === eGui;

        if (wrapperHasFocus) { return; }

        e.preventDefault();

        const nextFocusableEl = this.focusService.findNextFocusableElement(eGui, null, e.shiftKey);

        if (nextFocusableEl) {
            nextFocusableEl.focus();
        } else {
            eGui.focus();
        }
    }

    protected handleKeyDown(e: KeyboardEvent) {
        const activeEl = document.activeElement;
        const eGui = this.getGui();
        const wrapperHasFocus = activeEl === eGui;

        switch (e.keyCode) {
            case KeyCode.UP:
            case KeyCode.DOWN:
                if (!wrapperHasFocus) {
                    e.preventDefault();
                }
            case KeyCode.LEFT:
            case KeyCode.RIGHT:
                if (wrapperHasFocus) { return; }
                e.stopPropagation();
            case KeyCode.ENTER:
                if (wrapperHasFocus) {
                    if (this.focusService.focusInto(eGui)) {
                        e.preventDefault();
                    }
                }
                break;
            case KeyCode.ESCAPE:
                if (!wrapperHasFocus) {
                    this.getGui().focus();
                }
        }
    }

    protected onFocusIn(e: FocusEvent) {
        const eGui = this.getGui();

        if (!eGui.contains(e.relatedTarget as HTMLElement)) {
            const headerRow = this.getParentComponent() as HeaderRowComp;
            this.beans.focusService.setFocusedHeader(headerRow.getRowIndex(), this.getColumn());
        }
    }

    private setupFloatingFilter(): void {
        const colDef = this.column.getColDef();

        if (!colDef.filter || !colDef.floatingFilter) { return; }

        this.floatingFilterCompPromise = this.getFloatingFilterInstance();

        if (!this.floatingFilterCompPromise) { return; }

        this.floatingFilterCompPromise.then(compInstance => {
            if (compInstance) {
                this.setupWithFloatingFilter(compInstance);
                this.setupSyncWithFilter();
            }
        });
    }

    private setupLeftPositioning(): void {
        const setLeftFeature = new SetLeftFeature(this.column, this.getGui(), this.beans);
        this.createManagedBean(setLeftFeature);
    }

    private setupSyncWithFilter(): void {
        const syncWithFilter = (filterChangedEvent: FilterChangedEvent | null) => {
            this.onParentModelChanged(this.currentParentModel(), filterChangedEvent);
        };

        this.addManagedListener(this.column, Column.EVENT_FILTER_CHANGED, syncWithFilter);

        if (this.filterManager.isFilterActive(this.column)) {
            syncWithFilter(null);
        }
    }

    // linked to event listener in template
    private showParentFilter() {
        const eventSource = this.suppressFilterButton ? this.eFloatingFilterBody : this.eButtonShowMainFilter;

        this.menuFactory.showMenuAfterButtonClick(this.column, eventSource, 'filterMenuTab', ['filterMenuTab']);
    }

    private setupColumnHover(): void {
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_HOVER_CHANGED, this.onColumnHover.bind(this));
        this.onColumnHover();
    }

    private onColumnHover(): void {
        addOrRemoveCssClass(this.getGui(), 'ag-column-hover', this.columnHoverService.isHovered(this.column));
    }

    private setupWidth(): void {
        this.addManagedListener(this.column, Column.EVENT_WIDTH_CHANGED, this.onColumnWidthChanged.bind(this));
        this.onColumnWidthChanged();
    }

    private onColumnWidthChanged(): void {
        this.getGui().style.width = `${this.column.getActualWidth()}px`;
    }

    private setupWithFloatingFilter(floatingFilterComp: IFloatingFilterComp): void {
        const disposeFunc = () => {
            this.getContext().destroyBean(floatingFilterComp);
        };

        if (!this.isAlive()) {
            disposeFunc();
            return;
        }

        this.addDestroyFunc(disposeFunc);

        const floatingFilterCompUi = floatingFilterComp.getGui();

        addOrRemoveCssClass(this.eFloatingFilterBody, 'ag-floating-filter-full-body', this.suppressFilterButton);
        addOrRemoveCssClass(this.eFloatingFilterBody, 'ag-floating-filter-body', !this.suppressFilterButton);

        setDisplayed(this.eButtonWrapper, !this.suppressFilterButton);

        const eIcon = createIconNoSpan('filter', this.gridOptionsWrapper, this.column);
        this.eButtonShowMainFilter.appendChild(eIcon!);

        this.eFloatingFilterBody.appendChild(floatingFilterCompUi);

        if (floatingFilterComp.afterGuiAttached) {
            floatingFilterComp.afterGuiAttached();
        }
    }

    private parentFilterInstance(callback: (filterInstance: IFilterComp) => void): void {
        const filterComponent = this.getFilterComponent();

        if (filterComponent) {
            filterComponent.then(callback);
        }
    }

    private getFilterComponent(createIfDoesNotExist = true): AgPromise<IFilterComp> | null {
        return this.filterManager.getFilterComponent(this.column, 'NO_UI', createIfDoesNotExist);
    }

    public static getDefaultFloatingFilterType(def: IFilterDef): string | null {
        if (def == null) { return null; }

        let defaultFloatingFilterType: string | null = null;

        if (typeof def.filter === 'string') {
            // will be undefined if not in the map
            defaultFloatingFilterType = FloatingFilterMapper.getFloatingFilterType(def.filter);
        } else if (def.filterFramework) {
            // If filterFramework, then grid is NOT using one of the provided filters, hence no default.
            // Note: We could combine this with another part of the 'if' statement, however explicitly
            // having this section makes the code easier to read.
        } else if (def.filter === true) {
            const setFilterModuleLoaded = ModuleRegistry.isRegistered(ModuleNames.SetFilterModule);
            defaultFloatingFilterType = setFilterModuleLoaded ? 'agSetColumnFloatingFilter' : 'agTextColumnFloatingFilter';
        }

        return defaultFloatingFilterType;
    }

    private getFloatingFilterInstance(): AgPromise<IFloatingFilterComp> | null {
        const colDef = this.column.getColDef();
        const defaultFloatingFilterType = FloatingFilterWrapper.getDefaultFloatingFilterType(colDef);
        const filterParams = this.filterManager.createFilterParams(this.column, colDef);
        const finalFilterParams = this.userComponentFactory.createFinalParams(colDef, 'filter', filterParams);

        const params: IFloatingFilterParams = {
            api: this.gridApi,
            column: this.column,
            filterParams: finalFilterParams,
            currentParentModel: this.currentParentModel.bind(this),
            parentFilterInstance: this.parentFilterInstance.bind(this),
            showParentFilter: this.showParentFilter.bind(this),
            onFloatingFilterChanged: this.onFloatingFilterChanged.bind(this),
            suppressFilterButton: false // This one might be overridden from the colDef
        };

        // this is unusual - we need a params value OUTSIDE the component the params are for.
        // the params are for the floating filter component, but this property is actually for the wrapper.
        this.suppressFilterButton = colDef.floatingFilterComponentParams ? !!colDef.floatingFilterComponentParams.suppressFilterButton : false;

        let promise = this.userComponentFactory.newFloatingFilterComponent(colDef, params, defaultFloatingFilterType);

        if (!promise) {
            const compInstance =
                this.userComponentFactory.createUserComponentFromConcreteClass(ReadOnlyFloatingFilter, params);

            promise = AgPromise.resolve(compInstance);
        }

        return promise;
    }

    private currentParentModel(): any {
        const filterComponent = this.getFilterComponent(false);

        return filterComponent ? filterComponent.resolveNow(null, filter => filter && filter.getModel()) : null;
    }

    private onParentModelChanged(model: any, filterChangedEvent: FilterChangedEvent | null): void {
        if (!this.floatingFilterCompPromise) { return; }

        this.floatingFilterCompPromise.then(comp => comp && comp.onParentModelChanged(model, filterChangedEvent));
    }

    private onFloatingFilterChanged(): void {
        console.warn('AG Grid: since version 21.x, how floating filters are implemented has changed. ' +
            'Instead of calling params.onFloatingFilterChanged(), get a reference to the main filter via ' +
            'params.parentFilterInstance() and then set a value on the parent filter directly.');
    }
}
