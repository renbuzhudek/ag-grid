'use strict'

import React, {Component} from 'react';
import {render} from 'react-dom';
import {AgGridReact} from '@ag-grid-community/react';
import {AllCommunityModules} from '@ag-grid-community/all-modules';
import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-alpine.css';
import ChildMessageRenderer from './childMessageRenderer.jsx';
import CubeRenderer from './cubeRenderer.jsx';
import CurrencyRenderer from './currencyRenderer.jsx';
import ParamsRenderer from './paramsRenderer.jsx';
import SquareRenderer from './squareRenderer.jsx';

class GridExample extends Component {
    constructor(props) {
        super(props);

        this.state = {
            modules: AllCommunityModules,
            columnDefs: [
                {
                    headerName: "Row",
                    field: "row",
                    width: 150
                },
                {
                    headerName: "Square",
                    field: "value",
                    cellRenderer: "squareRenderer",
                    editable: true,
                    colId: "square",
                    width: 150
                },
                {
                    headerName: "Cube",
                    field: "value",
                    cellRenderer: "cubeRenderer",
                    colId: "cube",
                    width: 150
                },
                {
                    headerName: "Row Params",
                    field: "row",
                    cellRenderer: "paramsRenderer",
                    colId: "params",
                    width: 150
                },
                {
                    headerName: "Currency (Pipe)",
                    field: "currency",
                    cellRenderer: "currencyRenderer",
                    colId: "currency",
                    width: 120
                },
                {
                    headerName: "Child/Parent",
                    field: "value",
                    cellRenderer: "childMessageRenderer",
                    colId: "params",
                    editable: false,
                    minWidth: 150
                }
            ],
            rowData: this.createRowData(),
            context: {componentParent: this},
            frameworkComponents: {
                squareRenderer: SquareRenderer,
                cubeRenderer: CubeRenderer,
                paramsRenderer: ParamsRenderer,
                currencyRenderer: CurrencyRenderer,
                childMessageRenderer: ChildMessageRenderer
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
        this.gridColumnApi = params.columnApi;

    }

    refreshEvenRowsCurrencyData = () => {
        this.gridApi.forEachNode(rowNode => {
            if (rowNode.data.value % 2 === 0) {
                rowNode.setDataValue('currency', rowNode.data.value + Number(Math.random().toFixed(2)));
            }
        });
        this.gridApi.refreshCells({columns: ['currency']});
    }

    methodFromParent = (cell) => {
        alert("Parent Component Method from " + cell + "!");
    }

    createRowData = () => {
        const rowData = [];
        for (let i = 0; i < 15; i++) {
            rowData.push({
                row: 'Row ' + i,
                value: i,
                currency: i + Number(Math.random().toFixed(2))
            });
        }
        return rowData;
    }

    render() {
        return (
            <div style={{width: '100%', height: '100%'}}>
                <div className="example-wrapper">
                    <button onClick={() => this.refreshEvenRowsCurrencyData()} style={{"marginBottom": "10px"}}
                            className="btn btn-primary">
                        Refresh Even Row Currency Data
                    </button>
                    <div
                        id="myGrid"
                        style={{
                            height: '100%',
                            width: '100%'
                        }}
                        className="ag-theme-alpine">
                        <AgGridReact
                            modules={this.state.modules}
                            columnDefs={this.state.columnDefs}
                            rowData={this.state.rowData}
                            context={this.state.context}
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
