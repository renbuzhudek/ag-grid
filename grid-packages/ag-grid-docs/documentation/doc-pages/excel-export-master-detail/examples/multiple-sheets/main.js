var gridOptions = {
    columnDefs: [
        // group cell renderer needed for expand / collapse icons
        { field: 'name', cellRenderer: 'agGroupCellRenderer' },
        { field: 'account' },
        { field: 'calls' },
        { field: 'minutes', valueFormatter: "x.toLocaleString() + 'm'" }
    ],
    defaultColDef: {
        flex: 1
    },
    getRowNodeId: function(data) {
        return data.name;
    },
    groupDefaultExpanded: 1,
    rowBuffer: 100,
    masterDetail: true,
    detailCellRendererParams: {
        detailGridOptions: {
            columnDefs: [
                { field: 'callId' },
                { field: 'direction' },
                { field: 'number', minWidth: 150 },
                { field: 'duration', valueFormatter: "x.toLocaleString() + 's'" },
                { field: 'switchCode', minWidth: 150 }
            ],
            defaultColDef: {
                flex: 1
            },
        },
        getDetailRowData: function(params) {
            params.successCallback(params.data.callRecords);
        }
    }
};

function onFirstDataRendered(params) {
    params.api.forEachNode(function(node) {
        node.setExpanded(true);
    });
}

function onBtExport() {
    var spreadsheets = [];

    spreadsheets.push(gridOptions.api.getSheetDataForExcel());

    gridOptions.api.forEachDetailGridInfo(function(node) {
        spreadsheets.push(node.api.getSheetDataForExcel({
            sheetName: node.id.replace('detail_', '')
        }));
    });

    gridOptions.api.exportMultipleSheetsAsExcel({
        data: spreadsheets,
        fileName: 'ag-grid.xlsx'
    });
}


// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/master-detail-data.json' }).then(function(data) {
        gridOptions.api.setRowData(data);
    });
});
