const gridOptions = {
    columnDefs: [
        { field: 'athlete', minWidth: 200 },
        { field: 'country', minWidth: 200, },
        { field: 'sport', minWidth: 150 },
        { field: 'gold' },
        { field: 'silver' },
        { field: 'bronze' },
        { field: 'total'}
    ],

    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
        flex: 1
    },

    popupParent: document.body
};

function getNumber(id) {
    var el = document.querySelector(id);

    if (isNaN(el.value)) {
        return 0;
    }

    return parseFloat(el.value);
}

function getValue(id) {
    return document.querySelector(id).value;
}

function getSheetConfig() {
    return {
        pageSetup: {
            orientation: getValue('#pageOrientation'),
            pageSize: getValue('#pageSize')
        },
        margins: {
            top: getNumber('#top'),
            right: getNumber('#right'),
            bottom: getNumber('#bottom'),
            left: getNumber('#left'),
            header: getNumber('#header'),
            footer: getNumber('#footer'),
        }
    }
}

function onBtExport() {
    const { pageSetup, margins } = getSheetConfig();
    gridOptions.api.exportDataAsExcel({ pageSetup, margins});
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    const gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);
    agGrid.simpleHttpRequest({url: 'https://www.ag-grid.com/example-assets/small-olympic-winners.json'})
    .then((data) => gridOptions.api.setRowData(data.filter(rec => rec.country != null)));
});
