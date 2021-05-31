import React, { useCallback, useEffect, useState } from 'react';

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

const TwoGridsWithMultipleRecordsExample = () => {
    const [leftApi, setLeftApi] = useState(null);
    const [leftColumnApi, setLeftColumnApi] = useState(null);
    const [rightApi, setRightApi] = useState(null);
    const [rawData, setRawData] = useState([]);
    const [leftRowData, setLeftRowData] = useState(null);
    const [rightRowData, setRightRowData] = useState([]);
    const [radioChecked, setRadioChecked] = useState(0);
    const [checkBoxSelected, setCheckBoxSelected] = useState(true);

    useEffect(() => {
        if (!rawData.length) {
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
                setRawData(athletes);
            });
        }
    }, [rawData]);

    const loadGrids = useCallback(() => {
        setLeftRowData([...rawData]);
        setRightRowData([]);
        leftApi.deselectAll();
    }, [leftApi, rawData]);

    useEffect(() => {
        if (rawData.length) {
            loadGrids();
        }
    }, [rawData, loadGrids]);

    useEffect(() => {
        if (leftColumnApi && leftApi) {
            leftColumnApi.setColumnVisible('checkbox', checkBoxSelected);
            leftApi.setSuppressRowClickSelection(checkBoxSelected);
        }
    }, [leftColumnApi, leftApi, checkBoxSelected]);

    const reset = () => {
        setRadioChecked(0);
        setCheckBoxSelected(true);
        loadGrids();
    }

    const onRadioChange = (e) => {
        setRadioChecked(parseInt(e.target.value, 10));
    }

    const onCheckboxChange = (e) => {
        const checked = e.target.checked;
        setCheckBoxSelected(checked);
    }

    const getRowNodeId = data => data.athlete

    const onDragStop = useCallback(params => {
        var nodes = params.nodes;

        if (radioChecked === 0) {
            leftApi.applyTransaction({
                remove: nodes.map(function(node) { return node.data; })
            });
        } else if (radioChecked === 1) {
            nodes.forEach(function(node) {
                node.setSelected(false);
            });
        }
    }, [leftApi, radioChecked]);

    useEffect(() => {
        if (!leftApi || !rightApi) { return; }
        const dropZoneParams = rightApi.getRowDropZoneParams({ onDragStop });

        leftApi.removeRowDropZone(dropZoneParams);
        leftApi.addRowDropZone(dropZoneParams);
    }, [leftApi, rightApi, onDragStop]);

    const onGridReady = (params, side) => {
        if (side === 0) {
            setLeftApi(params.api);
            setLeftColumnApi(params.columnApi);
        }

        if (side === 1) {
            setRightApi(params.api);
        }
    };

    const getTopToolBar = () => (
        <div className="example-toolbar panel panel-default">
            <div className="panel-body">
                <div style={{ display: 'inline-flex'}} onChange={onRadioChange} >
                    <input type="radio" name="radio" value="0" checked={radioChecked === 0} />
                    <label for="move">Remove Source Rows</label>
                    <input type="radio" name="radio" value="1" checked={radioChecked === 1} />
                    <label for="deselect">Only Deselect Source Rows</label>
                    <input type="radio" name="radio" value="2" checked={radioChecked === 2} />
                    <label for="none">None</label>
                </div>
                <input type="checkbox" checked={checkBoxSelected} onChange={onCheckboxChange} />
                <label for="toggleCheck">Checkbox Select</label>
                <span className="input-group-button">
                    <button type="button" className="btn btn-default reset" style={{ marginLeft: '5px;'}} onClick={reset}>
                        <i className="fas fa-redo" style={{ marginRight: '5px;' }}></i>Reset
                    </button>
                </span>
            </div>
        </div>
    );

    const getGridWrapper = (id) => (
        <div className="panel panel-primary" style={{ marginRight: '10px'}}>
            <div className="panel-heading">{id === 0 ? 'Athletes' : 'Selected Athletes'}</div>
            <div className="panel-body">
                <AgGridReact
                    style={{ height: '100%;' }}
                    defaultColDef={defaultColDef}
                    getRowNodeId={getRowNodeId}
                    rowDragManaged={true}
                    animateRows={true}
                    immutableData={true}
                    rowSelection={id === 0 ? "multiple" : undefined}
                    enableMultiRowDragging={id === 0}
                    suppressRowClickSelection={id === 0}
                    suppressMoveWhenRowDragging={id === 0}
                    
                    rowData={id === 0 ? leftRowData : rightRowData}
                    columnDefs={id === 0 ? leftColumns : rightColumns}
                    onGridReady={(params) => onGridReady(params, id)}
                    modules={AllCommunityModules}>
                </AgGridReact>
            </div>
        </div>
    )

    return (
        <div className="top-container">
            { getTopToolBar() }
            <div class="grid-wrapper ag-theme-alpine">
                {getGridWrapper(0)}
                {getGridWrapper(1)}
            </div>
        </div>
    );
}

export default TwoGridsWithMultipleRecordsExample;