import {
    _,
    AgChartThemeOverrides,
    Autowired,
    Bean,
    BeanStub,
    CellRange,
    ChartModel,
    ChartOptions,
    ChartRef,
    ChartType,
    ColumnModel,
    CreateCrossFilterChartParams,
    CreatePivotChartParams,
    CreateRangeChartParams,
    Environment,
    IAggFunc,
    IChartService,
    IRangeService,
    Optional,
    PreDestroy,
    ProcessChartOptionsParams,
    SeriesOptions,
    CellRangeParams
} from "@ag-grid-community/core";
import { GridChartComp, GridChartParams } from "./chartComp/gridChartComp";

export interface CrossFilteringContext {
    lastSelectedChartId: string;
}

@Bean('chartService')
export class ChartService extends BeanStub implements IChartService {

    @Optional('rangeService') private rangeService: IRangeService;
    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('environment') private environment: Environment;

    // we destroy all charts bound to this grid when grid is destroyed. activeCharts contains all charts, including
    // those in developer provided containers.
    private activeCharts = new Set<ChartRef>();
    private activeChartComps = new Set<GridChartComp>();

    // this shared (singleton) context is used by cross filtering in line and area charts
    private crossFilteringContext: CrossFilteringContext = {
        lastSelectedChartId: '',
    };

    public getChartModels(): ChartModel[] {
        const models: ChartModel[] = [];

        this.activeChartComps.forEach(c => models.push(c.getChartModel()));

        return models;
    }

    public createChartFromCurrentRange(chartType: ChartType = ChartType.GroupedColumn): ChartRef | undefined {
        const selectedRange: CellRange = this.getSelectedRange();
        return this.createChart(selectedRange, chartType);
    }

    public restoreChart(model: ChartModel, chartContainer?: HTMLElement): ChartRef | undefined {
        if (!model) {
            console.warn("AG Grid - unable to restore chart as no chart model is provided");
            return;
        }

        if (model.modelType && model.modelType === 'pivot') {
            return this.createPivotChart(this.mapToPivotParams(model, chartContainer));
        }

        return this.createRangeChart(this.mapToRangeParam(model, chartContainer));
    }

    public createRangeChart(params: CreateRangeChartParams): ChartRef | undefined {
        const cellRange = this.rangeService
            ? this.rangeService.createCellRangeFromCellRangeParams(params.cellRange)
            : undefined;

        if (!cellRange) {
            console.warn("AG Grid - unable to create chart as no range is selected");
            return;
        }

        return this.createChart(
            cellRange,
            params.chartType,
            params.chartThemeName,
            false,
            params.suppressChartRanges,
            params.chartContainer,
            params.aggFunc,
            params.chartThemeOverrides,
            params.unlinkChart,
            params.processChartOptions);
    }

    public createPivotChart(params: CreatePivotChartParams): ChartRef | undefined {
        // if required enter pivot mode
        if (!this.columnModel.isPivotMode()) {
            this.columnModel.setPivotMode(true, "pivotChart");
        }

        // pivot chart range contains all visible column without a row range to include all rows
        const chartAllRangeParams: CellRangeParams = {
            rowStartIndex: null,
            rowEndIndex: null,
            columns: this.columnModel.getAllDisplayedColumns().map(col => col.getColId())
        };

        const cellRange = this.rangeService
            ? this.rangeService.createCellRangeFromCellRangeParams(chartAllRangeParams)
            : undefined;

        if (!cellRange) {
            console.warn("AG Grid - unable to create chart as there are no columns in the grid.");
            return;
        }

        return this.createChart(
            cellRange,
            params.chartType,
            params.chartThemeName,
            true,
            true,
            params.chartContainer,
            undefined,
            params.chartThemeOverrides,
            params.unlinkChart,
            params.processChartOptions);
    }

    public createCrossFilterChart(params: CreateCrossFilterChartParams): ChartRef | undefined {
        const cellRange = this.rangeService
            ? this.rangeService.createCellRangeFromCellRangeParams(params.cellRange)
            : undefined;

        if (!cellRange) {
            console.warn("AG Grid - unable to create chart as no range is selected");
            return;
        }

        const crossFiltering = true;

        const suppressChartRangesSupplied = typeof params.suppressChartRanges !== 'undefined' && params.suppressChartRanges !== null;
        const suppressChartRanges = suppressChartRangesSupplied ? params.suppressChartRanges : true;

        return this.createChart(
            cellRange,
            params.chartType,
            params.chartThemeName,
            false,
            suppressChartRanges,
            params.chartContainer,
            params.aggFunc,
            params.chartThemeOverrides,
            params.unlinkChart,
            undefined,
            crossFiltering);
    }

    private createChart(cellRange: CellRange,
        chartType: ChartType,
        chartThemeName?: string,
        pivotChart = false,
        suppressChartRanges = false,
        container?: HTMLElement,
        aggFunc?: string | IAggFunc,
        chartThemeOverrides?: AgChartThemeOverrides,
        unlinkChart = false,
        processChartOptions?: (params: ProcessChartOptionsParams) => ChartOptions<SeriesOptions>,
        crossFiltering  = false): ChartRef | undefined {

        const createChartContainerFunc = this.gridOptionsWrapper.getCreateChartContainerFunc();

        const params: GridChartParams = {
            pivotChart,
            cellRange,
            chartType,
            chartThemeName,
            insideDialog: !(container || createChartContainerFunc),
            suppressChartRanges,
            aggFunc,
            chartThemeOverrides,
            processChartOptions,
            unlinkChart,
            crossFiltering,
            crossFilteringContext: this.crossFilteringContext
        };

        const chartComp = new GridChartComp(params);
        this.context.createBean(chartComp);

        const chartRef = this.createChartRef(chartComp);

        if (container) {
            // if container exists, means developer initiated chart create via API, so place in provided container
            container.appendChild(chartComp.getGui());

            // if the chart container was placed outside of an element that
            // has the grid's theme, we manually add the current theme to
            // make sure all styles for the chartMenu are rendered correctly
            const theme = this.environment.getTheme();

            if (theme.el && !theme.el.contains(container)) {
                _.addCssClass(container, theme.theme!);
            }
        } else if (createChartContainerFunc) {
            // otherwise user created chart via grid UI, check if developer provides containers (eg if the application
            // is using its own dialogs rather than the grid provided dialogs)
            createChartContainerFunc(chartRef);
        } else {
            // add listener to remove from active charts list when charts are destroyed, e.g. closing chart dialog
            chartComp.addEventListener(
                GridChartComp.EVENT_DESTROYED,
                () => {
                    this.activeChartComps.delete(chartComp);
                    this.activeCharts.delete(chartRef);
                });
        }

        return chartRef;
    }

    private createChartRef(chartComp: GridChartComp): ChartRef {
        const chartRef: ChartRef = {
            destroyChart: () => {
                if (this.activeCharts.has(chartRef)) {
                    this.context.destroyBean(chartComp);
                    this.activeChartComps.delete(chartComp);
                    this.activeCharts.delete(chartRef);
                }
            },
            chartElement: chartComp.getGui(),
            chart: chartComp.getUnderlyingChart()
        };

        this.activeCharts.add(chartRef);
        this.activeChartComps.add(chartComp);

        return chartRef;
    }

    private getSelectedRange(): CellRange {
        const ranges = this.rangeService.getCellRanges();
        return ranges.length > 0 ? ranges[0] : {} as CellRange;
    }

    private mapToRangeParam(model: ChartModel, chartContainer?: HTMLElement): CreateRangeChartParams {
        return {
            cellRange: model.cellRange,
            chartType: model.chartType,
            chartThemeName: model.chartThemeName,
            chartContainer: chartContainer,
            suppressChartRanges: model.suppressChartRanges,
            aggFunc: model.aggFunc,
            unlinkChart: model.unlinkChart,
            processChartOptions: () => model.chartOptions
        };
    }

    private mapToPivotParams(model: ChartModel, chartContainer?: HTMLElement): CreatePivotChartParams {
        return {
            chartType: model.chartType,
            chartThemeName: model.chartThemeName,
            chartContainer: chartContainer,
            unlinkChart: model.unlinkChart,
            processChartOptions: () => model.chartOptions
        };
    }

    @PreDestroy
    private destroyAllActiveCharts(): void {
        this.activeCharts.forEach(chart => chart.destroyChart());
    }
}
