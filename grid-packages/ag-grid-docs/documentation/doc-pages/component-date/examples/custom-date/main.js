const filterParams = {
    comparator: (filterLocalDateAtMidnight, cellValue) => {
        const dateAsString = cellValue;
        const dateParts = dateAsString.split("/");
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
};

const columnDefs = [
    {field: 'athlete'},
    {field: 'age', filter: 'agNumberColumnFilter'},
    {field: 'country'},
    {field: 'year'},
    {
        field: 'date', minWidth: 190, filter: 'agDateColumnFilter', filterParams: filterParams
    },
    {field: 'sport'},
    {field: 'gold', filter: 'agNumberColumnFilter'},
    {field: 'silver', filter: 'agNumberColumnFilter'},
    {field: 'bronze', filter: 'agNumberColumnFilter'},
    {field: 'total', filter: false}
];

const gridOptions = {
    defaultColDef: {
        editable: true,
        sortable: true,
        flex: 1,
        minWidth: 100,
        filter: true,
        floatingFilter: true,
        resizable: true
    },
    columnDefs: columnDefs,
    rowData: null,
    // Here is where we specify the component to be used as the date picker widget
    components: {
        agDateInput: CustomDateComponent
    }
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
