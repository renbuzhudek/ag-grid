const columnDefs = [
    {field: "country", width: 120, rowGroup: true},
    {field: "year", width: 90, rowGroup: true},
    {field: "sport", width: 110},
    {field: "athlete", width: 200},
    {field: "gold", width: 100},
    {field: "silver", width: 100},
    {field: "bronze", width: 100},
    {field: "total", width: 100},
    {field: "age", width: 90},
    {field: "date", width: 110}
];

const gridOptions = {
    autoGroupColumnDef: {
        headerTooltip: 'Group',
        minWidth: 190,
        tooltipValueGetter: params => {
            const count = params.node.allChildrenCount;

            if (count != null) {
                return params.value + ' (' + count + ')';
            }

            return params.value;

        }
    },
    defaultColDef: {
        editable: true,
        sortable: true,
        flex: 1,
        minWidth: 100,
        filter: true,
        resizable: true
    },
    columnDefs: columnDefs,
    animateRows: true,
    rowData: null
};

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({url: 'https://www.ag-grid.com/example-assets/olympic-winners.json'})
        .then(data => {
            gridOptions.api.setRowData(data);
        });
});
