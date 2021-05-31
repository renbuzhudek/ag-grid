import React, { Component } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { AllCommunityModules } from '@ag-grid-community/all-modules';

import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-alpine.css';

const leftColumns = [
    {
        rowDrag: true,
        maxWidth: 50,
        suppressMenu: true,
        rowDragText: function(params, dragItemCount) {
            if (dragItemCount > 1) {
                return dragItemCount + ' athletes';
            }
            return params.rowNode.data.athlete;
        },
    },
    {
        colId: 'checkbox',
        maxWidth: 50,
        checkboxSelection: true,
        suppressMenu: true,
        headerCheckboxSelection: true
    },
    { field: "athlete" },
    { field: "sport" }
];

const rightColumns = [
    {
        rowDrag: true,
        maxWidth: 50,
        suppressMenu: true,
        rowDragText: function(params, dragItemCount) {
            if (dragItemCount > 1) {
                return dragItemCount + ' athletes';
            }
            return params.rowNode.data.athlete;
        },
    },
    { field: "athlete" },
    { field: "sport" },
    {
        suppressMenu: true,
        maxWidth: 50,
        cellRenderer: (params) => {
            var button = document.createElement('i');

            button.addEventListener('click', function() {
                params.api.applyTransaction({ remove: [params.node.data] });
            });

            button.classList.add('far', 'fa-trash-alt');
            button.style.cursor = 'pointer';

            return button;
        }
    }
]

const defaultColDef = {
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true
};

export default class extends Component {

    constructor(props) {
        super(props);

        this.state = {
            leftApi: null,
            leftColumnApi: null,
            rightApi: null,
            rawData: [],
            leftRowData: null,
            rightRowData: [],
            radioChecked: 0,
            checkBoxSelected: true
        };
    }

    componentDidMount() {
        fetch('https://www.ag-grid.com/example-assets/olympic-winners.json')
            .then(resp => resp.json())
            .then(data => {
                const athletes = [];
                let i = 0;
    
                while (athletes.length < 20 && i < data.length) {
                    var pos = i++;
                    if (athletes.some(rec => rec.athlete === data[pos].athlete)) { continue; }
                    athletes.push(data[pos]);
                }
                this.setState({ rawData: athletes });
            });
    }

    componentDidUpdate(prevProps, prevState) {
        if (!prevState.rawData.length && this.state.rawData.length) {
            this.loadGrids();
        }

        if (prevState.checkBoxSelected !== this.state.checkBoxSelected) {
            this.state.leftColumnApi.setColumnVisible('checkbox', this.state.checkBoxSelected);
            this.state.leftApi.setSuppressRowClickSelection(this.state.checkBoxSelected);
        }
    }

    loadGrids = () => {
        this.setState({ 
            leftRowData: [...this.state.rawData],
            rightRowData: []
        });
        this.state.leftApi.deselectAll();
    }

    reset = () => {
        this.setState({
            radioChecked: 0,
            checkBoxSelected: true 
        });

        this.loadGrids();
    }

    onRadioChange = (e) => {
        this.setState({
            radioChecked: parseInt(e.target.value, 10)
        });
    }

    onCheckboxChange = (e) => {
        const checked = e.target.checked;
        this.setState({ checkBoxSelected: checked });
    }

    getRowNodeId = data => data.athlete


    addGridDropZone = () => {
        const dropZoneParams = this.state.rightApi.getRowDropZoneParams({
            onDragStop: params => {
                var nodes = params.nodes;
    
                if (this.state.radioChecked === 0) {
                    this.state.leftApi.applyTransaction({
                        remove: nodes.map(function(node) { return node.data; })
                    });
                } else if (this.state.radioChecked === 1) {
                    nodes.forEach(function(node) {
                        node.setSelected(false);
                    });
                }
            }
        });
    
        this.state.leftApi.addRowDropZone(dropZoneParams);
    }

    onGridReady(params, side) {
        if (side === 0) {
            this.setState({ 
                leftApi: params.api,
                leftColumnApi: params.columnApi
            });
        }

        if (side === 1) {
            this.setState({ 
                rightApi: params.api,
            });
            this.addGridDropZone();
        }
    }

    getTopToolBar = () => (
        <div className="example-toolbar panel panel-default">
            <div className="panel-body">
                <div style={{ display: 'inline-flex'}} onChange={this.onRadioChange} >
                    <input type="radio" name="radio" value="0" checked={this.state.radioChecked === 0} />
                    <label for="move">Remove Source Rows</label>
                    <input type="radio" name="radio" value="1" checked={this.state.radioChecked === 1} />
                    <label for="deselect">Only Deselect Source Rows</label>
                    <input type="radio" name="radio" value="2" checked={this.state.radioChecked === 2} />
                    <label for="none">None</label>
                </div>
                <input type="checkbox" checked={this.state.checkBoxSelected} onChange={this.onCheckboxChange} />
                <label for="toggleCheck">Checkbox Select</label>
                <span className="input-group-button">
                    <button type="button" className="btn btn-default reset" style={{ marginLeft: '5px;'}} onClick={this.reset}>
                        <i className="fas fa-redo" style={{ marginRight: '5px;' }}></i>Reset
                    </button>
                </span>
            </div>
        </div>
    );

    getGridWrapper = (id) => (
        <div className="panel panel-primary" style={{ marginRight: '10px'}}>
            <div className="panel-heading">{id === 0 ? 'Athletes' : 'Selected Athletes'}</div>
            <div className="panel-body">
                <AgGridReact
                    style={{ height: '100%;' }}
                    defaultColDef={defaultColDef}
                    getRowNodeId={this.getRowNodeId}
                    rowDragManaged={true}
                    animateRows={true}
                    immutableData={true}
                    rowSelection={id === 0 ? "multiple" : undefined}
                    enableMultiRowDragging={id === 0}
                    suppressRowClickSelection={id === 0}
                    suppressMoveWhenRowDragging={id === 0}
                    
                    rowData={id === 0 ? this.state.leftRowData : this.state.rightRowData}
                    columnDefs={id === 0 ? leftColumns : rightColumns}
                    onGridReady={(params) => this.onGridReady(params, id)}
                    modules={AllCommunityModules}>
                </AgGridReact>
            </div>
        </div>
    )

    render = () => (
        <div className="top-container">
            { this.getTopToolBar() }
            <div class="grid-wrapper ag-theme-alpine">
                {this.getGridWrapper(0)}
                {this.getGridWrapper(1)}
            </div>
        </div>
    );
}
