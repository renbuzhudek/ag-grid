/**
 * This configures the options to show in the Standalone Charts API Explorer. Each option can use different editors
 * depending on the type of data to be supplied for that option. We also generate a configuration JSON file to be used
 * for the API documentation from this file, so this is the source of truth; you can run `npm run generate-config` in
 * this folder in order to generate it.
 */

import { StringEditor, NumberEditor, BooleanEditor, PresetEditor, ColourEditor, ArrayEditor } from './Editors.jsx';
import isServerSideRendering from 'utils/is-server-side-rendering';

const getFontOptions = (name, fontWeight = 'normal', fontSize = 12) => ({
    fontStyle: {
        default: 'normal',
        options: ['normal', 'italic', 'oblique'],
        description: `The font style to use for the ${name}.`,
        editor: PresetEditor,
    },
    fontWeight: {
        default: fontWeight,
        options: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
        description: `The font weight to use for the ${name}.`,
        editor: PresetEditor,
        breakIndex: 4,
    },
    fontSize: {
        default: fontSize,
        description: `The font size in pixels to use for the ${name}.`,
        editor: NumberEditor,
        min: 1,
        max: 30,
        unit: 'px',
    },
    fontFamily: {
        default: 'Verdana, sans-serif',
        suggestions: ['Verdana, sans-serif', 'Arial, sans-serif', 'Times New Roman, serif'],
        description: `The font family to use for the ${name}.`,
        editor: PresetEditor,
    },
});

const getCaptionOptions = (name, description, defaultText, fontSize = 10, fontWeight = 'normal') => ({
    meta: {
        description,
    },
    enabled: {
        default: true,
        description: `Whether or not the ${name} should be shown.`,
        editor: BooleanEditor,
    },
    text: {
        type: 'string',
        default: defaultText,
        description: `The text to show in the ${name}.`,
        editor: StringEditor,
    },
    color: {
        default: '#000000',
        description: `The colour to use for the ${name}.`,
        editor: ColourEditor,
    },
    ...getFontOptions(name, fontWeight, fontSize)
});

const getNavigatorHandleOptions = (description) => ({
    meta: {
        description,
    },
    fill: {
        default: '#f2f2f2',
        description: `The fill colour used by the handle.`,
        editor: ColourEditor,
    },
    stroke: {
        default: '#999999',
        description: `The stroke colour used by the handle.`,
        editor: ColourEditor,
    },
    strokeWidth: {
        default: 1,
        description: `The stroke width used by the handle.`,
        editor: NumberEditor,
        min: 0,
        max: 5,
        unit: 'px',
    },
    width: {
        default: 8,
        description: `The width of the handle.`,
        editor: NumberEditor,
        min: 4,
        max: 20,
        unit: 'px',
    },
    height: {
        default: 16,
        description: `The height of the handle.`,
        editor: NumberEditor,
        min: 8,
        max: 26,
        unit: 'px',
    },
    gripLineLength: {
        default: 8,
        description: `The length of the handle's grip lines.`,
        editor: NumberEditor,
        min: 4,
        max: 16,
        unit: 'px',
    },
    gripLineGap: {
        default: 2,
        description: `The distance between the handle's grip lines.`,
        editor: NumberEditor,
        min: 1,
        max: 8,
        unit: 'px',
    },
});

const getPaddingOption = position => ({
    default: 20,
    description: `The number of pixels of padding at the ${position} of the chart area.`,
    editor: NumberEditor,
    min: 0,
    max: 40,
});

const getChartContainer = () => (!isServerSideRendering() && document.querySelector('#chart-container')) || { offsetWidth: 800, offsetHeight: 600 };

export const chart = Object.freeze({
    meta: {
        displayName: 'General Configuration',
        description: 'Configuration common to all charts.',
    },
    data: {
        type: 'object[]',
        isRequired: true,
        description: 'The data to render the chart from. If this is not specified, it must be set on individual series instead.',
    },
    container: {
        type: 'HTMLElement',
        description: 'The element to place the rendered chart into.<br/><strong>Important:</strong> make sure to read the <code>autoSize</code> config description for information on how the container element affects the chart size (by default).'
    },
    autoSize: {
        default: true,
        description: 'By default, the chart will resize automatically to fill the container element. Set this to <code>false</code> to disable this behaviour. If either the <code>width</code> or <code>height</code> are set, auto-sizing will be disabled unless this is explicitly set to <code>true</code>.<br/><strong>Important:</strong> if this config is set to <code>true</code>, make sure to give the chart\'s <code>container</code> element an explicit size, otherwise you will run into a chicken and egg situation where the container expects to size itself according to the content and the chart expects to size itself according to the container.',
        editor: BooleanEditor,
    },
    width: {
        type: 'number',
        description: 'The width of the chart in pixels. Has no effect if <code>autoSize</code> is set to <code>true</code>.',
        editor: NumberEditor,
        min: 1,
        max: () => getChartContainer().offsetWidth - 20 - (getChartContainer().offsetWidth % 10),
        unit: 'px',
    },
    height: {
        type: 'number',
        description: 'The height of the chart in pixels. Has no effect if <code>autoSize</code> is set to <code>true</code>.',
        editor: NumberEditor,
        min: 1,
        max: () => getChartContainer().offsetHeight - 10 - (getChartContainer().offsetHeight % 10),
        unit: 'px',
    },
    tooltip: {
        meta: {
            description: 'Global configuration that applies to all tooltips in the chart.',
        },
        enabled: {
            type: 'boolean',
            default: true,
            description: 'Set to false to disable tooltips for all series in the chart.',
            editor: BooleanEditor
        },
        tracking: {
            type: 'boolean',
            default: true,
            description: 'If true, for series with markers the tooltip will be shown to the closest marker.',
            editor: BooleanEditor
        },
        class: {
            type: 'string',
            description: 'A class name to be added to the tooltip element of the chart.',
        },

    },
    padding: {
        meta: {
            description: 'Configuration for the padding shown around the chart.',
        },
        top: getPaddingOption('top'),
        right: getPaddingOption('right'),
        bottom: getPaddingOption('bottom'),
        left: getPaddingOption('left'),
    },
    background: {
        meta: {
            description: 'Configuration for the background shown behind the chart.',
        },
        fill: {
            default: '#FFFFFF',
            description: 'Colour of the chart background.',
            editor: ColourEditor,
        },
        visible: {
            default: true,
            description: 'Whether or not the background should be visible.',
            editor: BooleanEditor,
        }
    },
    title: getCaptionOptions('title', 'Configuration for the title shown at the top of the chart.', 'Title', 18, 'bold'),
    subtitle: {
        ...getCaptionOptions('subtitle', 'Configuration for the subtitle shown beneath the chart title. Note: a subtitle will only be shown if a title is also present.', 'Subtitle', 14, 'normal'),
    },
    legend: {
        meta: {
            description: 'Configuration for the chart legend.',
        },
        enabled: {
            default: true,
            description: 'Whether or not to show the legend.',
            editor: BooleanEditor,
        },
        position: {
            default: 'right',
            description: 'Where the legend should show in relation to the chart.',
            options: ['top', 'right', 'bottom', 'left'],
            editor: PresetEditor,
        },
        spacing: {
            default: 20,
            description: 'The spacing in pixels to use outside the legend.',
            editor: NumberEditor,
            min: 0,
            max: 40,
            unit: 'px',
        },
        layoutHorizontalSpacing: {
            default: 16,
            description: 'The horizontal spacing in pixels to use between legend items.',
            editor: NumberEditor,
            min: 0,
            max: 40,
            unit: 'px',
        },
        layoutVerticalSpacing: {
            default: 8,
            description: 'The vertical spacing in pixels to use between legend items.',
            editor: NumberEditor,
            min: 0,
            max: 40,
            unit: 'px',
        },
        itemSpacing: {
            default: 8,
            description: 'The spacing in pixels between a legend marker and the corresponding label.',
            editor: NumberEditor,
            min: 0,
            max: 40,
            unit: 'px',
        },
        markerShape: {
            type: 'string',
            description:
                `If set, overrides the marker shape from the series and the legend will show the
                specified marker shape instead. If not set, will use a marker shape matching the
                shape from the series, or fall back to <code>'square'</code> if there is none.`,
            editor: PresetEditor,
            options: ['circle', 'cross', 'diamond', 'plus', 'square', 'triangle'],
        },
        markerSize: {
            default: 15,
            description: 'The size in pixels of the markers in the legend.',
            editor: NumberEditor,
            min: 0,
            max: 30,
            unit: 'px',
        },
        strokeWidth: {
            default: 1,
            description: 'The width in pixels of the stroke for markers in the legend.',
            editor: NumberEditor,
            min: 0,
            max: 10,
            unit: 'px',
        },
        color: {
            default: 'black',
            description: 'The colour of the text.',
            editor: ColourEditor
        },
        ...getFontOptions('legend'),
    },
    navigator: {
        meta: {
            description: 'Configuration for the chart navigator. This config is only supported by cartesian charts.',
        },
        enabled: {
            default: false,
            description: 'Whether or not to show the navigator.',
            editor: BooleanEditor,
        },
        height: {
            default: 30,
            description: 'The height of the navigator.',
            editor: NumberEditor,
            min: 10,
            max: 100,
            unit: 'px',
        },
        margin: {
            default: 10,
            description: 'The distance between the navigator and the bottom axis.',
            editor: NumberEditor,
            min: 0,
            max: 100,
            unit: 'px',
        },
        min: {
            default: 0,
            description: 'The start of the visible range in the <code>[0, 1]</code> interval.',
            editor: NumberEditor,
            min: 0,
            max: 1,
            step: 0.01,
        },
        max: {
            default: 1,
            description: 'The end of the visible range in the <code>[0, 1]</code> interval.',
            editor: NumberEditor,
            min: 0,
            max: 1,
            step: 0.01,
        },
        mask: {
            meta: {
                description: `Configuration for the navigator's visible range mask.`,
            },
            fill: {
                default: '#999999',
                description: `The fill colour used by the mask.`,
                editor: ColourEditor,
            },
            stroke: {
                default: '#999999',
                description: `The stroke colour used by the mask.`,
                editor: ColourEditor,
            },
            strokeWidth: {
                default: 1,
                description: `The stroke width used by the mask.`,
                editor: NumberEditor,
                min: 0,
                max: 5,
                unit: 'px',
            },
            fillOpacity: {
                default: 0.2,
                description: `The opacity of the mask's fill in the <code>[0, 1]</code> interval, where <code>0</code> is effectively no masking.`,
                editor: NumberEditor,
                min: 0,
                max: 1,
                step: 0.05,
            },
        },
        minHandle: getNavigatorHandleOptions(`Configuration for the navigator's left handle.`),
        maxHandle: getNavigatorHandleOptions(`Configuration for the navigator's right handle.`),
    }
});

export const axis = Object.freeze({
    meta: {
        displayName: 'Axis Configuration',
        description: 'Configuration for axes in cartesian charts.',
    },
    type: {
        type: 'string',
        description: 'The type of the axis.',
        options: ['category', 'number', 'time'],
    },
    position: {
        type: 'string',
        description: 'The position on the chart where the axis should be rendered.',
        editor: PresetEditor,
        options: ['top', 'right', 'bottom', 'left'],
    },
    min: {
        type: 'number',
        description: 'User override for the automatically determinted min value (based on series data). Only applied to "number" axes.',
    },
    max: {
        type: 'number',
        description: 'User override for the automatically determinted max value (based on series data). Only applied to "number" axes.',
    },
    title: getCaptionOptions('axis title', 'Configuration for the title shown next to the axis.', 'Axis Title', 14, 'bold'),
    line: {
        meta: {
            description: 'Configuration for the axis line.',
        },
        width: {
            default: 1,
            description: 'The width in pixels of the axis line.',
            editor: NumberEditor,
            min: 0,
            max: 10,
            unit: 'px',
        },
        color: {
            default: 'rgba(195, 195, 195, 1)',
            description: 'The colour of the axis line.',
            editor: ColourEditor,
        }
    },
    tick: {
        meta: {
            description: 'Configuration for the axis ticks.',
        },
        width: {
            default: 1,
            description: 'The width in pixels of the axis ticks (and corresponding grid line).',
            editor: NumberEditor,
            min: 0,
            max: 10,
            unit: 'px',
        },
        size: {
            default: 6,
            description: 'The length in pixels of the axis ticks.',
            editor: NumberEditor,
            min: 0,
            max: 20,
            unit: 'px',
        },
        color: {
            default: 'rgba(195, 195, 195, 1)',
            description: 'The colour of the axis ticks.',
            editor: ColourEditor,
        },
        count: {
            default: 10,
            description:
                `A hint of how many ticks to use across an axis. The axis is not guaranteed to use exactly
                this number of ticks, but will try to use a number of ticks that is close to the number given.`,
            editor: NumberEditor,
            min: 0,
            max: 50,
        }
    },
    label: {
        meta: {
            description: 'Configuration for the axis labels, shown next to the ticks.',
        },
        ...getFontOptions('labels'),
        color: {
            default: '#000000',
            description: `The colour to use for the labels.`,
            editor: ColourEditor,
        },
        padding: {
            default: 5,
            description: 'Padding in pixels between the axis label and the tick.',
            editor: NumberEditor,
            min: 0,
            max: 20,
            unit: 'px',
        },
        rotation: {
            default: 0,
            description: 'The rotation of the axis labels in degrees. Note: for integrated charts the default is 335 degrees, unless the axis shows grouped or default categories (indexes). The first row of labels in a grouped category axis is rotated perpendicular to the axis line.',
            editor: NumberEditor,
            min: -359,
            max: 359,
            unit: '&deg;',
        },
        format: {
            type: 'string',
            description: 'Format string used when rendering labels for time axes. For more information on the structure of the string, <a href="../charts-axes/#time-label-format-string">click here</a>.',
        },
        formatter: {
            type: {
                parameters: {
                    value: 'any',
                    index: 'number',
                    fractionDigits: 'number',
                    formatter: '(x: any) => string',
                },
                returnType: 'string',
            },
            description: 'Function used to render axis labels. If <code>value</code> is a number, <code>fractionDigits</code> will also be provided, which indicates the number of fractional digits used in the step between ticks; for example, a tick step of <code>0.0005</code> would have <code>fractionDigits</code> set to <code>4</code>.',
        }
    },
    gridStyle: {
        meta: {
            requiresWholeObject: true,
            description: 'Configuration of the lines used to form the grid in the chart area.',
        },
        stroke: {
            default: 'rgba(195, 195, 195, 1)',
            description: 'The colour of the grid line.',
            editor: ColourEditor,
        },
        lineDash: {
            default: [4, 2],
            type: 'number[]',
            description: 'Defines how the gridlines are rendered. Every number in the array specifies the length in pixels of alternating dashes and gaps. For example, <code>[6, 3]</code> means dashes with a length of <code>6</code> pixels with gaps between of <code>3</code> pixels.',
            editor: ArrayEditor,
        }
    }
});

const series = {
    data: {
        type: 'object[]',
        isRequired: true,
        description: 'The data to use when rendering the series. If this is not supplied, data must be set on the chart instead.',
    },
    visible: {
        default: true,
        description: 'Whether or not to display the series.',
        editor: BooleanEditor,
    },
    showInLegend: {
        default: true,
        description: 'Whether or not to include the series in the legend.',
        editor: BooleanEditor,
    },
    tooltip: {
        meta: {
            description: 'Series-specific tooltip configuration.'
        },
        enabled: {
            default: true,
            description: 'Whether or not to show tooltips when the series are hovered over.',
            editor: BooleanEditor,
        },
        renderer: {
            type: {
                parameters: {
                    'datum': 'any',
                    'title?': 'string',
                    'color?': 'string',
                    'xKey': 'string',
                    'xValue': 'any',
                    'xName?': 'string',
                    'yKey': 'string',
                    'yValue': 'any',
                    'yName?': 'string',
                },
                returnType: 'string',
            },
            description: 'Function used to create the content for tooltips.',
        },
    },
};

const getLineDashConfig = (description = '') => ({
    lineDash: {
        default: [],
        type: 'number[]',
        description: description + ' Every number in the array specifies the length in pixels of alternating dashes and gaps. For example, <code>[6, 3]</code> means dashes with a length of <code>6</code> pixels with gaps between of <code>3</code> pixels.',
        editor: ArrayEditor,
    },
});

const getLineDashOffsetConfig = () => ({
    lineDashOffset: {
        default: 0,
        type: 'number',
        description: 'The initial offset of the dashed line in pixels.',
        editor: NumberEditor,
        min: 0,
        max: 200,
        unit: 'px',
    },
});

const getMarkerConfig = ({ enabledByDefault = true } = { enabledByDefault: true }) => ({
    marker: {
        meta: {
            description: 'Configuration for the markers used in the series.',
        },
        enabled: {
            default: enabledByDefault,
            description: 'Whether or not to show markers.',
            editor: BooleanEditor,
        },
        shape: {
            type: 'string | Marker',
            default: 'circle',
            description: 'The shape to use for the markers. You can also supply a custom marker by providing a <code>Marker</code> subclass.',
            editor: PresetEditor,
            options: ['circle', 'cross', 'diamond', 'plus', 'square', 'triangle']
        },
        size: {
            default: 8,
            description: 'The size in pixels of the markers.',
            editor: NumberEditor,
            min: 1,
            max: 20,
            unit: 'px',
        },
        maxSize: {
            default: 30,
            description: 'For series where the size of the marker is determined by the data, this determines the largest size a marker can be in pixels.',
            editor: NumberEditor,
            min: 1,
            max: 20,
            unit: 'px',
        },
        fill: {
            type: 'string',
            description: 'The colour to use for marker fills. If this is not specified, the markers will take their fill from the series.',
            editor: ColourEditor,
        },
        stroke: {
            type: 'string',
            description: 'The colour to use for marker strokes. If this is not specified, the markers will take their stroke from the series.',
            editor: ColourEditor,
        },
        strokeWidth: {
            type: 'number',
            description: 'The width in pixels of the marker stroke. If this is not specified, the markers will take their stroke width from the series.',
            editor: NumberEditor,
            min: 0,
            max: 10,
            unit: 'px',
        },
        formatter: {
            type: {
                parameters: {
                    datum: 'any',
                    fill: 'string',
                    stroke: 'string',
                    strokeWidth: 'number',
                    size: 'number',
                    highlighted: 'boolean',
                    xKey: 'string',
                    yKey: 'string',
                },
                returnType: {
                    fill: 'string',
                    stroke: 'string',
                    strokeWidth: 'number',
                    size: 'number',
                },
            },
            description:
                `Function used to return formatting for individual markers, based on the supplied information. If the
                current marker is highlighted, the <code>highlighted</code> property will be set to <code>true</code>;
                make sure to check this if you want to differentiate between the highlighted and un-highlighted states.`,
        }
    }
});

const getCartesianKeyConfig = (hasMultipleYValues = false, mandatoryY = true) => {
    const config = {
        xKey: {
            type: 'string',
            isRequired: true,
            description: 'The key to use to retrieve x-values from the data.',
        },
        xName: {
            type: 'string',
            description: 'A human-readable description of the x-values.',
        },
    };

    if (hasMultipleYValues) {
        config.yKeys = {
            type: 'string[]',
            isRequired: mandatoryY,
            description: 'The keys to use to retrieve y-values from the data.',
        };

        config.yNames = {
            type: 'string[]',
            description: 'Human-readable descriptions of the y-values.',
        };
    } else {
        config.yKey = {
            type: 'string',
            isRequired: mandatoryY,
            description: 'The key to use to retrieve y-values from the data.',
        };

        config.yName = {
            type: 'string',
            description: 'A human-readable description of the y-values.',
        };
    }

    return config;
};

const fills = [
    '#f3622d',
    '#fba71b',
    '#57b757',
    '#41a9c9',
    '#4258c9',
    '#9a42c8',
    '#c84164',
    '#888888',
];

const strokes = [
    '#aa4520',
    '#b07513',
    '#3d803d',
    '#2d768d',
    '#2e3e8d',
    '#6c2e8c',
    '#8c2d46',
    '#5f5f5f'
];

const getColourConfig = (name = 'markers', hasMultipleSeries = false, includeFill = true) => {
    const config = {};

    if (includeFill) {
        if (hasMultipleSeries) {
            config.fills = {
                type: 'string[]',
                default: fills,
                description: `The colours to cycle through for the fills of the ${name}.`,
            };
        } else {
            config.fill = {
                default: fills[0],
                description: `The colour of the fill for the ${name}.`,
                editor: ColourEditor,
            };
        }

        config.fillOpacity = {
            default: 1,
            description: `The opacity of the fill for the ${name}.`,
            editor: NumberEditor,
            min: 0,
            max: 1,
            step: 0.05,
        };
    }

    if (hasMultipleSeries) {
        config.strokes = {
            type: 'string[]',
            default: strokes,
            description: `The colours to cycle through for the strokes of the ${name}.`,
        };
    } else {
        config.stroke = {
            default: strokes[0],
            description: `The colour of the stroke for the ${name}.`,
            editor: ColourEditor,
        };
    }

    config.strokeOpacity = {
        default: 1,
        description: `The opacity of the stroke for the ${name}.`,
        editor: NumberEditor,
        min: 0,
        max: 1,
        step: 0.05,
    };

    config.strokeWidth = {
        default: 1,
        description: `The width in pixels of the stroke for the ${name}.`,
        editor: NumberEditor,
        min: 0,
        max: 20,
        unit: 'px',
    };

    return config;
};

const shadowConfig = {
    shadow: {
        meta: {
            description: 'Configuration for the shadow used behind the chart series.',
        },
        enabled: {
            default: true,
            description: 'Whether or not the shadow is visible.',
            editor: BooleanEditor,
        },
        color: {
            default: 'rgba(0, 0, 0, 0.5)',
            description: 'The colour of the shadow.',
            editor: ColourEditor,
        },
        xOffset: {
            default: 0,
            description: 'The horizontal offset in pixels for the shadow.',
            editor: NumberEditor,
            min: -20,
            max: 20,
            unit: 'px',
        },
        yOffset: {
            default: 0,
            description: 'The vertical offset in pixels for the shadow.',
            editor: NumberEditor,
            min: -20,
            max: 20,
            unit: 'px',
        },
        blur: {
            default: 5,
            description: 'The radius of the shadow\'s blur, given in pixels.',
            editor: NumberEditor,
            min: 0,
            max: 20,
            unit: 'px',
        }
    },
};

const getHighlightConfig = (name = 'markers') => ({
    highlightStyle: {
        meta: {
            requiresWholeObject: true,
            description: `Configuration for the highlighting used when the ${name} are hovered over.`,
        },
        fill: {
            default: 'yellow',
            description: `The fill colour of the ${name} when hovered over.`,
            editor: ColourEditor,
        },
        stroke: {
            type: 'string',
            description: `The colour of the stroke around the ${name} when hovered over.`,
            editor: ColourEditor,
        },
    },
});

export const bar = Object.freeze({
    meta: {
        displayName: 'Bar/Column Series Configuration',
        description: 'Configuration for bar/column series.',
    },
    ...getCartesianKeyConfig(true),
    ...series,
    grouped: {
        default: false,
        description: 'Whether to show different y-values as separate bars (grouped) or not (stacked).',
        editor: BooleanEditor,
    },
    normalizedTo: {
        type: 'number',
        description:
            `The number to normalise the bar stacks to. Has no effect when <code>grouped</code> is <code>true</code>.
            For example, if <code>normalizedTo</code> is set to <code>100</code>, the bar stacks will all be scaled
            proportionally so that each of their totals is 100.`,
        editor: NumberEditor,
        min: 1,
        max: 100,
    },
    ...getColourConfig('bars', true),
    ...getHighlightConfig('bars'),
    ...shadowConfig,
    ...getLineDashConfig('Defines how the bar/column strokes are rendered.'),
    ...getLineDashOffsetConfig(),
    label: {
        meta: {
            description: 'Configuration for the labels shown on bars.',
        },
        enabled: {
            default: true,
            description: `Whether or not the labels should be shown.`,
            editor: BooleanEditor,
        },
        color: {
            default: 'rgba(70, 70, 70, 1)',
            description: `The colour to use for the labels.`,
            editor: ColourEditor,
        },
        ...getFontOptions('labels'),
    },
    formatter: {
        type: {
            parameters: {
                datum: 'any',
                fill: 'string',
                stroke: 'string',
                strokeWidth: 'number',
                highlighted: 'boolean',
                xKey: 'string',
                yKey: 'string',
            },
            returnType: {
                fill: 'string',
                stroke: 'string',
                strokeWidth: 'number',
            },
        },
        description:
            `Function used to return formatting for individual bars/columns, based on the given parameters. If the
            current bar/column is highlighted, the <code>highlighted</code> property will be set to <code>true</code>;
            make sure to check this if you want to differentiate between the highlighted and un-highlighted states.`,
    },
    listeners: {
        meta: {
            description: "A map of event names to event listeners."
        },
        nodeClick: {
            type: {
                parameters: {
                    type: "'nodeClick'",
                    series: 'BarSeries',
                    datum: 'any',
                    xKey: 'string',
                    yKey: 'string',
                },
                returnType: 'any',
            },
            description: 'The listener to call when a bar/column node is clicked.'
        }
    },
});

export const line = Object.freeze({
    meta: {
        displayName: 'Line Series Configuration',
        description: 'Configuration for line series.',
    },
    ...getCartesianKeyConfig(),
    ...series,
    title: {
        type: 'string',
        description: 'The title to use for the series. Defaults to <code>yName</code> if it exists, or <code>yKey</code> if not.',
        editor: StringEditor,
    },
    ...getColourConfig('lines', false, false),
    ...getMarkerConfig(),
    ...getHighlightConfig(),
    ...getLineDashConfig('Defines how the line stroke is rendered.'),
    ...getLineDashOffsetConfig(),
    listeners: {
        meta: {
            description: "A map of event names to event listeners."
        },
        nodeClick: {
            type: {
                parameters: {
                    type: "'nodeClick'",
                    series: 'LineSeries',
                    datum: 'any',
                    xKey: 'string',
                    yKey: 'string',
                },
                returnType: 'any',
            },
            description: 'The listener to call when a line series node (marker) is clicked.'
        }
    },
});

export const area = Object.freeze({
    meta: {
        displayName: 'Area Series Configuration',
        description: 'Configuration for area series.',
    },
    ...getCartesianKeyConfig(true),
    ...series,
    normalizedTo: {
        type: 'number',
        description:
            `The number to normalise the area stacks to. For example, if <code>normalizedTo</code> is set to
            <code>100</code>, the stacks will all be scaled proportionally so that their total height is always 100.`,
        editor: NumberEditor,
        min: 1,
        max: 100,
    },
    ...getColourConfig('areas', true),
    ...getMarkerConfig({ enabledByDefault: false }),
    ...getHighlightConfig(),
    ...getLineDashConfig('Defines how the area strokes are rendered.'),
    ...getLineDashOffsetConfig(),
    ...shadowConfig,
});

export const scatter = Object.freeze({
    meta: {
        displayName: 'Scatter/Bubble Series Configuration',
        description: 'Configuration for scatter/bubble series.',
    },
    ...getCartesianKeyConfig(),
    sizeKey: {
        type: 'string',
        description: 'The key to use to retrieve size values from the data, used to control the size of the markers in bubble charts.'
    },
    sizeName: {
        type: 'string',
        description: 'A human-readable description of the size values.',
    },
    labelKey: {
        type: 'string',
        description: 'The key to use to retrieve values from the data to use as labels for the markers.',
    },
    labelName: {
        type: 'string',
        description: 'A human-readable description of the label values.',
    },
    ...series,
    tooltip: {
        meta: {
            description: 'Series-specific tooltip configuration.'
        },
        enabled: {
            default: true,
            description: 'Whether or not to show tooltips when the series are hovered over.',
            editor: BooleanEditor,
        },
        renderer: {
            type: {
                parameters: {
                    'datum': 'any',
                    'title?': 'string',
                    'color?': 'string',
                    'xKey': 'string',
                    'xValue': 'any',
                    'xName?': 'string',
                    'yKey': 'string',
                    'yValue': 'any',
                    'yName?': 'string',
                    'sizeKey?': 'string',
                    'sizeName?': 'string',
                    'labelKey?': 'string',
                    'labelName?': 'string',
                },
                returnType: 'string',
            },
            description: 'Function used to create the content for tooltips.'
        },
    },
    title: {
        type: 'string',
        description: 'The title to use for the series. Defaults to <code>yName</code> if it exists, or <code>yKey</code> if not.',
        editor: StringEditor,
    },
    ...getColourConfig(),
    ...getMarkerConfig(),
    ...getHighlightConfig(),
    listeners: {
        meta: {
            description: "A map of event names to event listeners."
        },
        nodeClick: {
            type: {
                parameters: {
                    type: "'nodeClick'",
                    series: 'ScatterSeries',
                    datum: 'any',
                    xKey: 'string',
                    yKey: 'string',
                    'sizeKey?': 'string'
                },
                returnType: 'any'
            },
            description: 'The listener to call when a scatter series node (marker) is clicked.'
        }
    },
});

export const pie = Object.freeze({
    meta: {
        displayName: 'Pie/Doughnut Series Configuration',
        description: 'Configuration for pie/doughnut series.',
    },
    angleKey: {
        type: 'string',
        isRequired: true,
        description: 'The key to use to retrieve angle values from the data.',
    },
    angleName: {
        type: 'string',
        description: 'A human-readable description of the angle values.',
    },
    labelKey: {
        type: 'string',
        isRequired: true,
        description: 'The key to use to retrieve label values from the data.',
    },
    labelName: {
        type: 'string',
        description: 'A human-readable description of the label values.',
    },
    radiusKey: {
        type: 'string',
        description: 'The key to use to retrieve radius values from the data.',
    },
    radiusName: {
        type: 'string',
        description: 'A human-readable description of the radius values.',
    },
    ...series,
    ...getLineDashConfig('Defines how the pie sector strokes are rendered.'),
    ...getLineDashOffsetConfig(),
    tooltip: {
        meta: {
            description: 'Series-specific tooltip configuration.'
        },
        enabled: {
            default: true,
            description: 'Whether or not to show tooltips when the series are hovered over.',
            editor: BooleanEditor,
        },
        renderer: {
            type: {
                parameters: {
                    'datum': 'any',
                    'title?': 'string',
                    'color?': 'string',
                    'angleKey': 'string',
                    'angleValue': 'any',
                    'angleName?': 'string',
                    'radiusKey?': 'string',
                    'radiusValue?': 'any',
                    'radiusName?': 'string',
                    'labelKey?': 'string',
                    'labelName?': 'string'
                },
                returnType: 'string',
            },
            description: 'Function used to create the content for tooltips.'
        },
    },
    rotation: {
        default: 0,
        description: 'The rotation of the pie series in degrees.',
        editor: NumberEditor,
        min: -359,
        max: 359,
        unit: '&deg',
    },
    innerRadiusOffset: {
        default: 0,
        description:
            `The offset in pixels of the inner radius of the series. Used to construct doughnut charts. If
            this is not given, or a value of zero is given, a pie chart will be rendered.`,
        editor: NumberEditor,
        min: -50,
        max: 50,
        unit: 'px',
    },
    outerRadiusOffset: {
        default: 0,
        description: 'The offset in pixels of the outer radius of the series. Used to construct doughnut charts.',
        editor: NumberEditor,
        min: -50,
        max: 50,
        unit: 'px',
    },
    title: {
        ...getCaptionOptions('title', 'Configuration for the series title.'),
    },
    ...getColourConfig('segments', true),
    ...getHighlightConfig('segments'),
    label: {
        meta: {
            description: 'Configuration for the labels used for the segments.',
        },
        enabled: {
            default: true,
            description: `Whether or not the labels should be shown.`,
            editor: BooleanEditor,
        },
        color: {
            default: '#000000',
            description: `The colour to use for the labels.`,
            editor: ColourEditor,
        },
        ...getFontOptions('labels'),
        offset: {
            default: 3,
            description: 'Distance in pixels between the callout line and the label text.',
            editor: NumberEditor,
            min: 0,
            max: 20,
            unit: 'px',
        },
        minAngle: {
            default: 20,
            description: 'Minimum angle in degrees required for a segment to show a label.',
            editor: NumberEditor,
            min: 0,
            max: 360,
            unit: '&deg;'
        },
    },
    callout: {
        meta: {
            description: 'Configuration for the callouts used with the labels for the segments.',
        },
        colors: {
            type: 'string[]',
            default: strokes,
            description: 'The colours to cycle through for the strokes of the callouts.',
        },
        strokeWidth: {
            default: 1,
            description: 'The width in pixels of the stroke for callout lines.',
            editor: NumberEditor,
            min: 1,
            max: 10,
            unit: 'px',
        },
        length: {
            default: 10,
            description: 'The length in pixels of the callout lines.',
            editor: NumberEditor,
            min: 0,
            max: 20,
            unit: 'px',
        },
    },
    ...shadowConfig,
    listeners: {
        meta: {
            description: "A map of event names to event listeners."
        },
        nodeClick: {
            type: {
                parameters: {
                    type: "'nodeClick'",
                    series: 'PieSeries',
                    datum: 'any',
                    angleKey: 'string',
                    "radiusKey?": 'string',
                },
                returnType: 'any',
            },
            description: 'The listener to call when a pie slice is clicked.'
        }
    },
});

export const histogram = Object.freeze({
    ...series,
    ...getCartesianKeyConfig(false, false),
    meta: {
        displayName: "Histogram Series Configuration",
        description: "Configuration for histogram series."
    },
    binCount: {
        type: "number",
        description: "The number of bins to try to split the x axis into. Clashes with the <code>bins</code> setting.",
        editor: NumberEditor,
        default: 10,
        min: 1,
        max: 30,
    },
    bins: {
        type: "number[][]",
        description: "Set the bins explicitly. The bins need not be of equal width. Clashes with the <code>binCount</code> setting."
    },
    aggregation: {
        "type": "string",
        "description": "Dictates how the bins are aggregated. If set to 'sum', the value shown for the bins will be the total of the yKey values. If set to 'mean', it will display the average yKey value of the bin",
        "default": "sum",
        "options": ["sum", "mean"]
    },
    areaPlot: {
        "type": "boolean",
        "description": "For variable width bins, if true the histogram will represent the aggregated <code>yKey</code> values using the area of the bar. Otherwise, the height of the var represents the value as per a normal bar chart. This is useful for keeping an undistorted curve displayed when using variable-width bins",
        "default": "false"
    },
    ...getLineDashConfig('Defines how the column strokes are rendered.'),
    ...getLineDashOffsetConfig(),
    tooltip: {
        meta: {
            description: 'Series-specific tooltip configuration.'
        },
        enabled: {
            default: true,
            description: 'Whether or not to show tooltips when the series are hovered over.',
            editor: BooleanEditor,
        },
        renderer: {
            type: {
                parameters: {
                    'datum': 'any',
                    'title?': 'string',
                    'color?': 'string',
                    'xKey': 'string',
                    'xValue': 'any',
                    'xName?': 'string',
                    'yKey': 'string',
                    'yValue': 'any',
                    'yName?': 'string',
                    'sizeKey?': 'string',
                    'sizeName?': 'string',
                    'labelKey?': 'string',
                    'labelName?': 'string'
                },
                returnType: "string"
            },
            description: "Function used to create the content for tooltips."
        },
    },
    ...getHighlightConfig('bars'),
    ...getColourConfig('histogram bars', false, true),
    listeners: {
        meta: {
            description: "A map of event names to event listeners."
        },
        nodeClick: {
            type: {
                parameters: {
                    type: "'nodeClick'",
                    series: 'HistogramSeries',
                    datum: 'any',
                    xKey: 'string',
                },
                returnType: 'any',
            },
            description: 'The listener to call when a histogram bar is clicked.'
        }
    },
});
