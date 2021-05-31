import React, { useCallback, useEffect, useState } from 'react';

import { AgGridReact } from '@ag-grid-community/react';
import { AllCommunityModules } from '@ag-grid-community/all-modules';
import { ExcelExportModule, exportMultipleSheetsAsExcel } from '@ag-grid-enterprise/excel-export';

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
        setLeftRowData([...rawData.slice(0, rawData.length / 2)]);
        setRightRowData([...rawData.slice(rawData.length / 2)]);
        leftApi.deselectAll();
    }, [leftApi, rawData]);

    useEffect(() => {
        if (rawData.length) {
            loadGrids();
        }
    }, [rawData, loadGrids]);

    const reset = () => {
        loadGrids();
    }

    const onExcelExport = () => {
        var spreadsheets = [];
        
        spreadsheets.push(
            leftApi.getSheetDataForExcel({ sheetName: 'Athletes' }),
            rightApi.getSheetDataForExcel({ sheetName: 'Selected Athletes' })
        );
    
        exportMultipleSheetsAsExcel({
            data: spreadsheets,
            fileName: 'ag-grid.xlsx'
        });
    }

    const getRowNodeId = data => data.athlete

    const onDragStop = useCallback(params => {
        var nodes = params.nodes;

        leftApi.applyTransaction({
            remove: nodes.map(function(node) { return node.data; })
        });
    }, [leftApi]);

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
        <div>
            <button type="button" className="btn btn-default excel" style={{ marginRight: 5 }} onClick={onExcelExport}>
                <i className="far fa-file-excel" style={{ marginRight: 5, color: 'green' }}></i>Export to Excel
            </button>
            <button type="button" className="btn btn-default reset" onClick={reset}>
                <i className="fas fa-redo" style={{ marginRight: 5 }}></i>Reset
            </button>
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
                    suppressMoveWhenRowDragging={id === 0}
                    
                    rowData={id === 0 ? leftRowData : rightRowData}
                    columnDefs={id === 0 ? leftColumns : rightColumns}
                    onGridReady={(params) => onGridReady(params, id)}
                    modules={[...AllCommunityModules, ExcelExportModule ]}>
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