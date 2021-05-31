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

    pinnedTopRowData: [
        { make: 'Top Make', model: 'Top Model', price: 00000000 }
    ],

    pinnedBottomRowData: [
        { make: 'Bottom Make', model: 'Bottom Model', price: 10101010 }
    ],

    rowData: [
        { make: 'Toyota', model: 'Celica', price: 35000 },
        { make: 'Ford', model: 'Mondeo', price: 32000 },
        { make: 'Porsche', model: 'Boxter', price: 72000 }
    ]
};

function getBoolean(id) {
    var field = document.querySelector('#' + id);

    return !!field.checked;
}

function getParams() {
    return {
        skipPinnedTop: getBoolean('skipPinnedTop'),
        skipPinnedBottom: getBoolean('skipPinnedBottom')
    }
}

function onBtnExport() {
    gridOptions.api.exportDataAsCsv(getParams());
}

function onBtnUpdate() {
    document.querySelector('#csvResult').value = gridOptions.api.getDataAsCsv(getParams());
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);
});