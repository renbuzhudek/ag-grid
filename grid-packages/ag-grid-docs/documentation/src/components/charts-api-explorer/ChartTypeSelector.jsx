import React from 'react';
import { PresetEditor } from './Editors.jsx';
import styles from './ChartTypeSelector.module.scss';
/**
 * This is used for choosing the chart type in the Standalone Charts API Explorer.
 */
export const ChartTypeSelector = ({ type, onChange }) => {
    const options = {
        bar: 'Bar',
        line: 'Line',
        scatter: 'Scatter',
        area: 'Area',
        pie: 'Pie',
        histogram: 'Histogram'
    };

    return <div className={styles['chart-type-selector']}><PresetEditor value={type} options={options} onChange={onChange} /></div>;
};