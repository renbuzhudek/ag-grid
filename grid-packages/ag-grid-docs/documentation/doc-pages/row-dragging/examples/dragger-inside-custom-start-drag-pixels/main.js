var columnDefs = [
    {
        field: "athlete",
        cellClass: 'custom-athlete-cell',
        cellRenderer: 'myCustomCell'
    },
    { field: "country" },
    { field: "year", width: 100 },
    { field: "date" },
    { field: "sport" },
    { field: "gold" },
    { field: "silver" },
    { field: "bronze" }
];

var gridOptions = {
    defaultColDef: {
        width: 170,
        sortable: true,
        filter: true
    },
    rowDragManaged: true,
    columnDefs: columnDefs,
    animateRows: true,
    components: {
        myCustomCell: CustomCellRenderer
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
