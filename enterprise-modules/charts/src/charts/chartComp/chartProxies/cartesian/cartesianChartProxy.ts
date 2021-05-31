import { ChartProxy, ChartProxyParams, UpdateChartParams } from "../chartProxy";
import { _, AxisOptions, AxisType, CartesianChartOptions, SeriesOptions } from "@ag-grid-community/core";
import {
    AreaSeries,
    LineSeries,
    CartesianChart,
    CategoryAxis,
    ChartAxis,
    ChartAxisPosition,
    ChartTheme,
    find,
    GroupedCategoryAxis,
    GroupedCategoryChart,
    NumberAxis,
    TimeAxis
} from "ag-charts-community";
import { ChartDataModel } from "../../chartDataModel";
import { isDate } from "../../typeChecker";
import { deepMerge } from "../../object";
import { ChartController, ChartModelUpdatedEvent } from "../../chartController";

enum AXIS_TYPE {REGULAR, SPECIAL}

export abstract class CartesianChartProxy<T extends SeriesOptions> extends ChartProxy<CartesianChart | GroupedCategoryChart, CartesianChartOptions<T>> {

    // these are used to preserve the axis label rotation when switching between axis types
    private prevCategory: AXIS_TYPE;
    private prevAxisLabelRotation = 0;

    protected constructor(params: ChartProxyParams) {
        super(params);
    }

    protected extractIChartOptionsFromTheme(theme: ChartTheme): CartesianChartOptions<T> {
        const options = super.extractIChartOptionsFromTheme(theme);
        const standaloneChartType = this.getStandaloneChartType();
        const flipXY = standaloneChartType === 'bar';

        let xAxisType = (standaloneChartType === 'scatter' || standaloneChartType === 'histogram') ? 'number' : 'category';
        let yAxisType = 'number';

        if (flipXY) {
            [xAxisType, yAxisType] = [yAxisType, xAxisType];
        }

        let xAxisTheme: any = {};
        let yAxisTheme: any = {};

        xAxisTheme = deepMerge(xAxisTheme, theme.getConfig(standaloneChartType + '.axes.' + xAxisType));
        xAxisTheme = deepMerge(xAxisTheme, theme.getConfig(standaloneChartType + '.axes.' + xAxisType + '.bottom'));

        yAxisTheme = deepMerge(yAxisTheme, theme.getConfig(standaloneChartType + '.axes.' + yAxisType));
        yAxisTheme = deepMerge(yAxisTheme, theme.getConfig(standaloneChartType + '.axes.' + yAxisType + '.left'));

        options.xAxis = xAxisTheme;
        options.yAxis = yAxisTheme;

        return options;
    }

    public getAxisProperty<T = string>(expression: string): T {
        return _.get(this.iChartOptions.xAxis, expression, undefined) as T;
    }

    public setAxisProperty(expression: string, value: any) {
        _.set(this.iChartOptions.xAxis, expression, value);
        _.set(this.iChartOptions.yAxis, expression, value);

        const chart = this.chart;

        this.chart.axes.forEach(axis => _.set(axis, expression, value));

        chart.performLayout();

        this.raiseChartOptionsChangedEvent();
    }

    protected updateLabelRotation(
        categoryId: string,
        isHorizontalChart = false,
        axisType: 'time' | 'category' = 'category'
    ) {
        const axisPosition = isHorizontalChart ? ChartAxisPosition.Left : ChartAxisPosition.Bottom;
        const axis = find(this.chart.axes, currentAxis => currentAxis.position === axisPosition);

        const isSpecialCategory = categoryId === ChartDataModel.DEFAULT_CATEGORY || this.chartProxyParams.grouping;

        if (isSpecialCategory && this.prevCategory === AXIS_TYPE.REGULAR && axis) {
            this.prevAxisLabelRotation = axis.label.rotation;
        }

        let labelRotation = 0;
        if (!isSpecialCategory) {
            if (this.prevCategory === AXIS_TYPE.REGULAR) { return; }

            if (_.exists(this.prevCategory)) {
                labelRotation = this.prevAxisLabelRotation;
            } else {
                let rotationFromTheme = this.getUserThemeOverrideRotation(isHorizontalChart, axisType);
                labelRotation = rotationFromTheme !== undefined ? rotationFromTheme : 335;
            }
        }

        if (axis) {
            axis.label.rotation = labelRotation;
            _.set(this.iChartOptions.xAxis, "label.rotation", labelRotation);
        }

        const event: ChartModelUpdatedEvent = Object.freeze({type: ChartController.EVENT_CHART_UPDATED});
        this.chartProxyParams.eventService.dispatchEvent(event);

        this.prevCategory = isSpecialCategory ? AXIS_TYPE.SPECIAL : AXIS_TYPE.REGULAR;
    }

    private getUserThemeOverrideRotation(isHorizontalChart = false, axisType: 'time' | 'category' = 'category') {
        if (!this.mergedThemeOverrides || !this.mergedThemeOverrides.overrides) {
            return;
        }

        const chartType = this.getStandaloneChartType();
        const overrides = this.mergedThemeOverrides.overrides;
        const axisPosition = isHorizontalChart ? ChartAxisPosition.Left : ChartAxisPosition.Bottom;

        const chartTypePositionRotation = _.get(overrides, `${chartType}.axes.${axisType}.${axisPosition}.label.rotation`, undefined);
        if (typeof chartTypePositionRotation === 'number' && isFinite(chartTypePositionRotation)) {
            return chartTypePositionRotation;
        }

        const chartTypeRotation = _.get(overrides, `${chartType}.axes.${axisType}.label.rotation`, undefined);
        if (typeof chartTypeRotation === 'number' && isFinite(chartTypeRotation)) {
            return chartTypeRotation;
        }

        const cartesianPositionRotation = _.get(overrides, `cartesian.axes.${axisType}.${axisPosition}.label.rotation`, undefined);
        if (typeof cartesianPositionRotation === 'number' && isFinite(cartesianPositionRotation)) {
            return cartesianPositionRotation;
        }

        const cartesianRotation = _.get(overrides, `cartesian.axes.${axisType}.label.rotation`, undefined);
        if (typeof cartesianRotation === 'number' && isFinite(cartesianRotation)) {
            return cartesianRotation;
        }
    }

    protected getDefaultAxisOptions(): AxisOptions {
        const fontOptions = this.getDefaultFontOptions();
        const stroke = this.getAxisGridColor();
        const axisColor = "rgba(195, 195, 195, 1)";

        return {
            title: {
                ...fontOptions,
                enabled: false,
                fontSize: 14,
            },
            line: {
                color: axisColor,
                width: 1,
            },
            tick: {
                color: axisColor,
                size: 6,
                width: 1,
            },
            label: {
                ...fontOptions,
                padding: 5,
                rotation: 0,
            },
            gridStyle: [{
                stroke,
                lineDash: [4, 2]
            }]
        };
    }

    protected getDefaultCartesianChartOptions(): CartesianChartOptions<SeriesOptions> {
        const options = this.getDefaultChartOptions() as CartesianChartOptions<SeriesOptions>;

        options.xAxis = this.getDefaultAxisOptions();
        options.yAxis = this.getDefaultAxisOptions();

        return options;
    }

    protected axisTypeToClassMap: { [key in string]: any } = {
        number: NumberAxis,
        category: CategoryAxis,
        groupedCategory: GroupedCategoryAxis,
        time: TimeAxis
    };

    protected getAxisClass(axisType: string) {
        return this.axisTypeToClassMap[axisType];
    }

    protected updateAxes(baseAxisType: AxisType = 'category', isHorizontalChart = false): void {
        const baseAxis = isHorizontalChart ? this.getYAxis() : this.getXAxis();

        if (!baseAxis) { return; }

        if (this.chartProxyParams.grouping) {
            if (!(baseAxis instanceof GroupedCategoryAxis)) {
                this.recreateChart();
            }
            return;
        }

        const axisClass = this.axisTypeToClassMap[baseAxisType];

        if (baseAxis instanceof axisClass) { return; }

        let options = this.iChartOptions;

        if (isHorizontalChart && !options.yAxis.type) {
            options = {
                ...options,
                yAxis: {
                    type: baseAxisType,
                    ...options.yAxis
                }
            };
        } else if (!isHorizontalChart && !options.xAxis.type) {
            options = {
                ...options,
                xAxis: {
                    type: baseAxisType,
                    ...options.xAxis
                }
            };
        }

        this.iChartOptions = options;

        this.recreateChart();
    }

    protected isTimeAxis(params: UpdateChartParams): boolean {
        if (params.category && params.category.chartDataType) {
            return params.category.chartDataType === 'time';
        }

        const testDatum = params.data[0];
        const testValue = testDatum && testDatum[params.category.id];
        return isDate(testValue);
    }

    protected getXAxisDefaults(xAxisType: AxisType, options: CartesianChartOptions<T>) {
        if (xAxisType === 'time') {
            let xAxisTheme: any = {};
            const standaloneChartType = this.getStandaloneChartType();
            xAxisTheme = deepMerge(xAxisTheme, this.chartTheme.getConfig(standaloneChartType + '.axes.time'));
            xAxisTheme = deepMerge(xAxisTheme, this.chartTheme.getConfig(standaloneChartType + '.axes.time.bottom'));
            return xAxisTheme;
        }
        return options.xAxis;
    }

    protected getXAxis(): ChartAxis | undefined {
        return find(this.chart.axes, a => a.position === ChartAxisPosition.Bottom);
    }

    protected getYAxis(): ChartAxis | undefined {
        return find(this.chart.axes, a => a.position === ChartAxisPosition.Left);
    }

    protected processDataForCrossFiltering(data: any[], colId: string, params: UpdateChartParams) {
        let yKey = colId;
        let atLeastOneSelectedPoint = false;
        if (this.crossFiltering) {
            data.forEach(d => {
                d[colId + '-total'] = d[colId] + d[colId + '-filtered-out'];
                if (d[colId + '-filtered-out'] > 0) {
                    atLeastOneSelectedPoint = true;
                }
            });

            const lastSelectedChartId = params.getCrossFilteringContext().lastSelectedChartId;
            if (lastSelectedChartId === params.chartId) {
                yKey = colId + '-total';
            }
        }
        return {yKey, atLeastOneSelectedPoint};
    }

    protected updateSeriesForCrossFiltering(
        series: AreaSeries | LineSeries,
        colId: string,
        chart: CartesianChart,
        params: UpdateChartParams,
        atLeastOneSelectedPoint: boolean) {

        if (this.crossFiltering) {
            // special custom marker handling to show and hide points
            series!.marker.enabled = true;
            series!.marker.formatter = (p: any) => {
                return {
                    fill: p.highlighted ? 'yellow' : p.fill,
                    size: p.highlighted ? 12 : p.datum[colId] > 0 ? 8 : 0,
                };
            }

            chart.tooltip.delay = 500;

            // make line opaque when some points are deselected
            const ctx = params.getCrossFilteringContext();
            const lastSelectionOnThisChart = ctx.lastSelectedChartId === params.chartId;
            const deselectedPoints = lastSelectionOnThisChart && atLeastOneSelectedPoint;

            if (series instanceof AreaSeries) {
                series!.fillOpacity = deselectedPoints ? 0.3 : 1;
            }

            if (series instanceof LineSeries) {
                series!.strokeOpacity = deselectedPoints ? 0.3 : 1;
            }

            // add node click cross filtering callback to series
            series!.addEventListener('nodeClick', this.crossFilterCallback);
        }
    }
}