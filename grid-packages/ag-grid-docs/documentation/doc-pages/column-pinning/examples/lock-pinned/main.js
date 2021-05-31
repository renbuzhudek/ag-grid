var columnDefs = [
    {
        headerName: 'Athlete (locked as pinned)',
        field: "athlete",
        width: 240,
        pinned: 'left',
        lockPinned: true,
        cellClass: 'lock-pinned'
    },
    {
        headerName: 'Age (locked as not pinnable)',
        field: "age",
        width: 260,
        lockPinned: true,
        cellClass: 'lock-pinned'
    },
    { field: "country", width: 150 },
    { field: "year", width: 90 },
    { field: "date", width: 150 },
    { field: "sport", width: 150 },
    { field: "gold" },
    { field: "silver" },
    { field: "bronze" },
    { field: "total" }
];

var gridOptions = {
    columnDefs: columnDefs,
    defaultColDef: {
        resizable: true
    }
};

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/olympic-winners.json' })
        .then(function(data) {
            gridOptions.api.setRowData(data);
        });
});
