import React, { useState } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { AllCommunityModules } from '@ag-grid-community/all-modules';

import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-alpine.css';

const topOptions = {
    alignedGrids: [],
    defaultColDef: {
        editable: true,
        sortable: true,
        resizable: true,
        filter: true,
        flex: 1,
        minWidth: 100
    },
    suppressHorizontalScroll: true
};

const bottomOptions = {
    alignedGrids: [],
    defaultColDef: {
        editable: true,
        sortable: true,
        resizable: true,
        filter: true,
        flex: 1,
        minWidth: 100
    }
};

topOptions.alignedGrids.push(bottomOptions);
bottomOptions.alignedGrids.push(topOptions);

const columnDefs = [
    { field: 'athlete', width: 200 },
    { field: 'age', width: 150 },
    { field: 'country', width: 150 },
    { field: 'year', width: 120 },
    { field: 'date', width: 150 },
    { field: 'sport', width: 150 },
    // in the total col, we have a value getter, which usually means we don't need to provide a field
    // however the master/slave depends on the column id (which is derived from the field if provided) in
    // order ot match up the columns
    {
        headerName: 'Total',
        field: 'total',
        valueGetter: 'data.gold + data.silver + data.bronze',
        width: 200
    },
    {field: 'gold', width: 100},
    {field: 'silver', width: 100},
    {field: 'bronze', width: 100}
];

const bottomData = [
    {
        athlete: 'Total',
        age: '15 - 61',
        country: 'Ireland',
        year: '2020',
        date: '26/11/1970',
        sport: 'Synchronised Riding',
        gold: 55,
        silver: 65,
        bronze: 12
    }
];

const SimpleGridComponent = () => {
    const [rowData, setRowData] = useState(null);
    const [topGrid, setTopGrid] = useState(null);

    const onGridReady = (params) => {
        setTopGrid(params);
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', 'https://www.ag-grid.com/example-assets/olympic-winners.json');
        httpRequest.send();
        httpRequest.onreadystatechange = () => {
            if (httpRequest.readyState === 4 && httpRequest.status === 200) {
                var httpResult = JSON.parse(httpRequest.responseText);
                setRowData(httpResult);
            }
        }
    }

    const onFirstDataRendered = () => {
        topGrid.columnApi.autoSizeAllColumns();
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="ag-theme-alpine">
            <div style={{ flex: '1 1 auto' }} >
                <AgGridReact rowData={rowData}
                    gridOptions={topOptions}
                    columnDefs={columnDefs}
                    onGridReady={onGridReady}
                    onFirstDataRendered={onFirstDataRendered}
                    modules={AllCommunityModules} />
            </div>

            <div style={{ flex: 'none', height: '60px' }}>
                <AgGridReact
                    rowData={bottomData}
                    gridOptions={bottomOptions}
                    columnDefs={columnDefs}
                    headerHeight="0"
                    modules={AllCommunityModules}
                    rowStyle={{ fontWeight: 'bold' }}
                />
            </div>
        </div>
    );
}

export default SimpleGridComponent;
