'use strict'

import React, {Component} from 'react';
import {render} from 'react-dom';
import {AgGridReact} from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import DaysFrostRenderer from './daysFrostRenderer.jsx';

/*
* It's unlikely you'll use functions that create and manipulate DOM elements like this in a React application, but it
* demonstrates what is at least possible, and may be preferable in certain use cases
*/
const createImageSpan = (imageMultiplier, image) => {
    const resultElement = document.createElement('span');
    for (let i = 0; i < imageMultiplier; i++) {
        const imageElement = document.createElement('img');
        imageElement.src = 'https://www.ag-grid.com/example-assets/weather/' + image;
        resultElement.appendChild(imageElement);
    }
    return resultElement;
};

const deltaIndicator = params => {
    const element = document.createElement('span');
    const imageElement = document.createElement('img');
    if (params.value > 15) {
        imageElement.src = 'https://www.ag-grid.com/example-assets/weather/fire-plus.png';
    } else {
        imageElement.src = 'https://www.ag-grid.com/example-assets/weather/fire-minus.png';
    }
    element.appendChild(imageElement);
    element.appendChild(document.createTextNode(params.value));
    return element;
};

const daysSunshineRenderer = params => {
    const daysSunshine = params.value / 24;
    return createImageSpan(daysSunshine, params.rendererImage);
};

const rainPerTenMmRenderer = params => {
    const rainPerTenMm = params.value / 10;
    return createImageSpan(rainPerTenMm, params.rendererImage);
};

class GridExample extends Component {
    constructor(props) {
        super(props);

        this.state = {
            columnDefs: [
                {
                    headerName: "Month",
                    field: "Month",
                    width: 75,
                    cellStyle: {color: "darkred"}
                },
                {
                    headerName: "Max Temp (\u02DAC)",
                    field: "Max temp (C)",
                    width: 120,
                    cellRenderer: "deltaIndicator"
                },
                {
                    headerName: "Min Temp (\u02DAC)",
                    field: "Min temp (C)",
                    width: 120,
                    cellRenderer: "deltaIndicator"
                },
                {
                    headerName: "Days of Air Frost",
                    field: "Days of air frost (days)",
                    width: 233,
                    cellRenderer: "daysFrostRenderer",
                    cellRendererParams: {rendererImage: "frost.png"}
                },
                {
                    headerName: "Days Sunshine",
                    field: "Sunshine (hours)",
                    width: 190,
                    cellRenderer: "daysSunshineRenderer",
                    cellRendererParams: {rendererImage: "sun.png"}
                },
                {
                    headerName: "Rainfall (10mm)",
                    field: "Rainfall (mm)",
                    width: 180,
                    cellRenderer: "rainPerTenMmRenderer",
                    cellRendererParams: {rendererImage: "rain.png"}
                }
            ],
            rowData: null,
            components: {
                deltaIndicator: deltaIndicator,
                daysSunshineRenderer: daysSunshineRenderer,
                rainPerTenMmRenderer: rainPerTenMmRenderer
            },
            frameworkComponents: {
                "daysFrostRenderer": DaysFrostRenderer,
            },
            defaultColDef: {
                editable: true,
                sortable: true,
                flex: 1,
                minWidth: 100,
                filter: true,
                resizable: true
            }
        };

    }

    onGridReady = params => {
        this.gridApi = params.api;

        const updateData = (data) => params.api.setRowData(data);

        fetch('https://www.ag-grid.com/example-assets/weather-se-england.json')
            .then(resp => resp.json())
            .then(data => updateData(data));
    }

    /**
     * Updates the Days of Air Frost column - adjusts the value which in turn will demonstrate the Component refresh functionality
     * After a data update, cellRenderer Components.refresh method will be called to re-render the altered Cells
     */
    frostierYear() {
        const extraDaysFrost = Math.floor(Math.random() * 2) + 1;

        // iterate over the rows and make each "days of air frost"
        this.gridApi.forEachNode(rowNode => {
            rowNode.setDataValue('Days of air frost (days)', rowNode.data['Days of air frost (days)'] + extraDaysFrost);
        });
    }

    render() {
        return (
            <div style={{width: '100%', height: '100%'}}>
                <div className="example-wrapper">
                    <div style={{"marginBottom": "5px"}}>
                        <input type="button" defaultValue="Frostier Year"
                               onClick={() => this.frostierYear(Math.floor(Math.random() * 2) + 1)}/>
                    </div>

                    <div
                        style={{
                            height: '100%',
                            width: '100%'
                        }}
                        className="ag-theme-alpine">
                        <AgGridReact
                            columnDefs={this.state.columnDefs}
                            rowData={this.state.rowData}
                            components={this.state.components}
                            frameworkComponents={this.state.frameworkComponents}
                            defaultColDef={this.state.defaultColDef}
                            onGridReady={this.onGridReady}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

render(
    <GridExample></GridExample>,
    document.querySelector('#root')
)
