const columnDefs = [
    {field: 'athlete', minWidth: 170, tooltipField: 'athlete'},
    {field: 'age'},
    {field: 'country', minWidth: 150, tooltipField: 'country'},
    {field: 'year'},
    {field: 'date', minWidth: 150},
    {field: 'sport'},
    {field: 'gold'},
    {field: 'silver'},
    {field: 'bronze'},
    {field: 'total'}
];

const gridOptions = {
    defaultColDef: {
        editable: true,
        sortable: true,
        flex: 1,
        minWidth: 100,
        filter: true,
        resizable: true
    },

    enableBrowserTooltips: true,

    // set rowData to null or undefined to show loading panel by default
    rowData: null,
    columnDefs: columnDefs
};

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/olympic-winners.json' })
        .then(data => {
            gridOptions.api.setRowData(data);
        });
});
