var gridOptions = {
    defaultColDef: {
        editable: true,
        resizable: true,
        minWidth: 100,
        flex: 1
    },

    suppressExcelExport: true,
    popupParent:document.body,

    columnDefs: [
        { field: 'make' },
        { field: 'model' },
        { field: 'price' }
    ],

    rowData: [
        { make: 'Toyota', model: 'Celica', price: 35000 },
        { make: 'Ford', model: 'Mondeo', price: 32000 },
        { make: 'Porsche', model: 'Boxter', price: 72000 }
    ]
};

function getBoolean(inputSelector) {
    return !!document.querySelector(inputSelector).checked;
}

function getParams() {
    return {
        suppressQuotes: getBoolean('#suppressQuotes')
    };
}

function onBtnExport() {
    const params = getParams();
    if (params.suppressQuotes) {
        alert('NOTE: you are downloading a file with non-standard quotes - it may not render correctly in Excel.');
    }
    gridOptions.api.exportDataAsCsv(params);
}

function onBtnUpdate() {
    document.querySelector('#csvResult').value = gridOptions.api.getDataAsCsv(getParams());
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);
});