const columnDefs = [
    {field: 'athlete', minWidth: 150, filter: 'personFilter'},
    {field: 'age', filter: 'agNumberColumnFilter'},
    {field: 'country', minWidth: 150},
    {field: 'year', filter: 'yearFilter'},
    {
        field: 'date', minWidth: 130, filter: 'agDateColumnFilter', filterParams: {
            comparator: function (filterLocalDateAtMidnight, cellValue) {
                const dateAsString = cellValue;
                const dateParts = dateAsString.split('/');
                const cellDate = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]));

                if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
                    return 0;
                }

                if (cellDate < filterLocalDateAtMidnight) {
                    return -1;
                }

                if (cellDate > filterLocalDateAtMidnight) {
                    return 1;
                }
            }
        }
    },
    {field: 'sport'},
    {field: 'gold', filter: 'agNumberColumnFilter'},
    {field: 'silver', filter: 'agNumberColumnFilter'},
    {field: 'bronze', filter: 'agNumberColumnFilter'},
    {field: 'total', filter: 'agNumberColumnFilter'}
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
    components: {
        'personFilter': PersonFilter,
        'yearFilter': YearFilter
    },
    columnDefs: columnDefs,
    rowData: null
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
