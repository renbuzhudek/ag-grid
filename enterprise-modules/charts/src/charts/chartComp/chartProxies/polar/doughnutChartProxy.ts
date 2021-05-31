import {
    AgChart,
    AgPieSeriesOptions,
    AgPolarChartOptions,
    ChartTheme, LegendClickEvent,
    PieSeries,
    PolarChart
} from "ag-charts-community";
import { _, HighlightOptions, PieSeriesOptions, PolarChartOptions } from "@ag-grid-community/core";
import { ChartProxyParams, FieldDefinition, UpdateChartParams } from "../chartProxy";
import { PolarChartProxy } from "./polarChartProxy";

interface UpdateDoughnutSeriesParams {
    seriesMap: { [p: string]: PieSeries };
    angleField: FieldDefinition;
    field: FieldDefinition;
    seriesDefaults: PieSeriesOptions;
    index: number;
    params: UpdateChartParams;
    fills: string[];
    strokes: string[];
    doughnutChart: PolarChart;
    offset: number;
    numFields: number;
    opaqueSeries: PieSeries | undefined;
}

export class DoughnutChartProxy extends PolarChartProxy {

    public constructor(params: ChartProxyParams) {
        super(params);

        this.initChartOptions();
        this.recreateChart();
    }

    protected createChart(): PolarChart {
        const options = this.iChartOptions;
        const agChartOptions = options as AgPolarChartOptions;
        agChartOptions.type = 'pie';
        agChartOptions.autoSize = true;
        agChartOptions.series = [];

        return AgChart.create(agChartOptions, this.chartProxyParams.parentElement);
    }

    public update(params: UpdateChartParams): void {
        if (params.fields.length === 0) {
            this.chart.removeAllSeries();
            return;
        }

        const doughnutChart = this.chart;
        const fieldIds = params.fields.map(f => f.colId);
        const seriesMap: { [id: string]: PieSeries } = {};

        doughnutChart.series.forEach((series: PieSeries) => {
            const pieSeries = series;
            const id = pieSeries.angleKey;
            if (_.includes(fieldIds, id)) {
                seriesMap[id] = pieSeries;
            }
        });

        const { seriesDefaults } = this.iChartOptions;
        const fills = seriesDefaults.fill.colors;
        const strokes = seriesDefaults.stroke.colors;
        const numFields = params.fields.length;

        let offset = 0;
        if (this.crossFiltering) {

            params.fields.forEach((field: FieldDefinition, index: number) => {
                const filteredOutField = {...field};
                filteredOutField.colId = field.colId + '-filtered-out';

                params.data.forEach(d => {
                    d[field.colId + '-total'] = d[field.colId] + d[filteredOutField.colId];
                    d[field.colId] = d[field.colId] / d[field.colId + '-total'];
                    d[filteredOutField.colId] = 1;
                });

                const {updatedOffset, pieSeries} =
                    this.updateSeries({
                        seriesMap,
                        angleField: field,
                        field: filteredOutField,
                        seriesDefaults,
                        index,
                        params,
                        fills,
                        strokes,
                        doughnutChart,
                        offset,
                        numFields,
                        opaqueSeries: undefined
                    });

                this.updateSeries({
                    seriesMap,
                    angleField: field,
                    field: field,
                    seriesDefaults,
                    index,
                    params,
                    fills,
                    strokes,
                    doughnutChart,
                    offset,
                    numFields,
                    opaqueSeries: pieSeries
                });

                offset = updatedOffset;
            });
        } else {
            params.fields.forEach((f, index) => {
                const {updatedOffset} = this.updateSeries({
                    seriesMap,
                    angleField: f,
                    field: f,
                    seriesDefaults,
                    index,
                    params,
                    fills,
                    strokes,
                    doughnutChart,
                    offset,
                    numFields,
                    opaqueSeries: undefined
                });
                offset = updatedOffset;
            });
        }

        // Because repaints are automatic, it's important to remove/add/update series at once,
        // so that we don't get painted twice.
        doughnutChart.series = _.values(seriesMap);
    }

    private updateSeries(updateParams: UpdateDoughnutSeriesParams) {
        const existingSeries = updateParams.seriesMap[updateParams.field.colId];

        const seriesOptions: AgPieSeriesOptions = {
            ...updateParams.seriesDefaults,
            type: 'pie',
            angleKey: this.crossFiltering ? updateParams.angleField.colId + '-total' : updateParams.angleField.colId,
            radiusKey: this.crossFiltering ? updateParams.field.colId : undefined,
            showInLegend: updateParams.index === 0, // show legend items for the first series only
            title: {
                ...updateParams.seriesDefaults.title,
                text: updateParams.seriesDefaults.title.text || updateParams.field.displayName!,
            },
            fills: updateParams.seriesDefaults.fill.colors,
            fillOpacity: updateParams.seriesDefaults.fill.opacity,
            strokes: updateParams.seriesDefaults.stroke.colors,
            strokeOpacity: updateParams.seriesDefaults.stroke.opacity,
            strokeWidth: updateParams.seriesDefaults.stroke.width,
            tooltip: {
                enabled: updateParams.seriesDefaults.tooltip && updateParams.seriesDefaults.tooltip.enabled,
                renderer: (updateParams.seriesDefaults.tooltip && updateParams.seriesDefaults.tooltip.enabled && updateParams.seriesDefaults.tooltip.renderer) || undefined,
            }
        };

        const calloutColors = seriesOptions.callout && seriesOptions.callout.colors || seriesOptions.strokes || [];
        const pieSeries = existingSeries || AgChart.createComponent(seriesOptions, 'pie.series') as PieSeries;

        if (!existingSeries) {
            if (this.crossFiltering && !pieSeries.tooltip.renderer) {
                // only add renderer if user hasn't provided one
                this.addCrossFilteringTooltipRenderer(pieSeries);
            }
        }

        pieSeries.angleName = updateParams.field.displayName!;
        pieSeries.labelKey = updateParams.params.category.id;
        pieSeries.labelName = updateParams.params.category.name;
        pieSeries.data = updateParams.params.data;

        // Normally all series provide legend items for every slice.
        // For our use case, where all series have the same number of slices in the same order with the same labels
        // (all of which can be different in other use cases) we don't want to show repeating labels in the legend,
        // so we only show legend items for the first series, and then when the user toggles the slices of the
        // first series in the legend, we programmatically toggle the corresponding slices of other series.
        if (updateParams.index === 0) {
            pieSeries.toggleSeriesItem = (itemId: any, enabled: boolean) => {
                if (updateParams.doughnutChart) {
                    updateParams.doughnutChart.series.forEach((series: any) => {
                        (series as PieSeries).seriesItemEnabled[itemId] = enabled;
                    });
                }

                pieSeries.scheduleData();
            };
        }

        if (this.crossFiltering) {
            pieSeries.radiusMin = 0;
            pieSeries.radiusMax = 1;

            const isOpaqueSeries = !updateParams.opaqueSeries;
            if (isOpaqueSeries) {
                pieSeries.fills = updateParams.fills.map(fill => this.hexToRGBA(fill, '0.3'));
                pieSeries.strokes = updateParams.strokes.map(stroke => this.hexToRGBA(stroke, '0.3'));
                pieSeries.showInLegend = false;
            } else {
                updateParams.doughnutChart.legend.addEventListener('click', (event: LegendClickEvent) => {
                    if (updateParams.opaqueSeries) {
                        updateParams.opaqueSeries.toggleSeriesItem(event.itemId as any, event.enabled);
                    }
                });
                pieSeries.fills = updateParams.fills;
                pieSeries.strokes = updateParams.strokes;
                pieSeries.callout.colors = calloutColors;
            }

            // disable series highlighting by default
            pieSeries.highlightStyle.fill = undefined;

            pieSeries.addEventListener('nodeClick', this.crossFilterCallback);

            updateParams.doughnutChart.tooltip.delay = 500;
        } else {
            pieSeries.fills = updateParams.fills;
            pieSeries.strokes = updateParams.strokes;
            pieSeries.callout.colors = calloutColors;
        }

        const offsetAmount = updateParams. numFields > 1 ? 20 : 40;
        pieSeries.outerRadiusOffset = updateParams.offset;
        updateParams.offset -= offsetAmount;
        pieSeries.innerRadiusOffset = updateParams.offset;
        updateParams.offset -= offsetAmount;

        if (!existingSeries) {
            updateParams.seriesMap[updateParams.field.colId] = pieSeries;
        }

        return {updatedOffset: updateParams.offset, pieSeries};
    }

    protected extractIChartOptionsFromTheme(theme: ChartTheme): PolarChartOptions<PieSeriesOptions> {
        const options = super.extractIChartOptionsFromTheme(theme);

        const seriesDefaults = theme.getConfig<AgPieSeriesOptions>('pie.series.pie');
        options.seriesDefaults = {
            title: seriesDefaults.title,
            label: seriesDefaults.label,
            callout: seriesDefaults.callout,
            shadow: seriesDefaults.shadow,
            tooltip: {
                enabled: seriesDefaults.tooltip && seriesDefaults.tooltip.enabled,
                renderer: seriesDefaults.tooltip && seriesDefaults.tooltip.renderer
            },
            fill: {
                colors: seriesDefaults.fills || theme.palette.fills,
                opacity: seriesDefaults.fillOpacity
            },
            stroke: {
                colors: seriesDefaults.strokes || theme.palette.strokes,
                opacity: seriesDefaults.strokeOpacity,
                width: seriesDefaults.strokeWidth
            },
            lineDash: seriesDefaults.lineDash,
            lineDashOffset: seriesDefaults.lineDashOffset,
            highlightStyle: seriesDefaults.highlightStyle as HighlightOptions,
            listeners: seriesDefaults.listeners
        } as PieSeriesOptions;

        return options;
    }

    protected getDefaultOptions(): PolarChartOptions<PieSeriesOptions> {
        const { strokes } = this.getPredefinedPalette();
        const options = this.getDefaultChartOptions() as PolarChartOptions<PieSeriesOptions>;
        const fontOptions = this.getDefaultFontOptions();

        options.seriesDefaults = {
            ...options.seriesDefaults,
            title: {
                ...fontOptions,
                enabled: true,
                fontSize: 12,
                fontWeight: 'bold',
            },
            callout: {
                colors: strokes,
                length: 10,
                strokeWidth: 2,
            },
            label: {
                ...fontOptions,
                enabled: false,
                offset: 3,
                minAngle: 0,
            },
            tooltip: {
                enabled: true,
            },
            shadow: this.getDefaultDropShadowOptions(),
        };

        return options;
    }
}
