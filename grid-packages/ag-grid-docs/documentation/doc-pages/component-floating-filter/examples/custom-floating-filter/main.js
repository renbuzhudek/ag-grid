const columnDefs = [
    {field: 'athlete', filter: false},
    {
        field: 'gold',
        filter: 'agNumberColumnFilter',
        suppressMenu: true,
        floatingFilterComponent: 'customNumberFloatingFilter',
        floatingFilterComponentParams: {
            suppressFilterButton: true,
            color: 'red'
        }
    },
    {
        field: 'silver',
        filter: 'agNumberColumnFilter',
        suppressMenu: true,
        floatingFilterComponent: 'customNumberFloatingFilter',
        floatingFilterComponentParams: {
            suppressFilterButton: true,
            color: 'blue'
        }
    },
    {
        field: 'bronze',
        filter: 'agNumberColumnFilter',
        suppressMenu: true,
        floatingFilterComponent: 'customNumberFloatingFilter',
        floatingFilterComponentParams: {
            suppressFilterButton: true,
            color: 'green'
        }
    },
    {
        field: 'total',
        filter: 'agNumberColumnFilter',
        suppressMenu: true,
        floatingFilterComponent: 'customNumberFloatingFilter',
        floatingFilterComponentParams: {
            suppressFilterButton: true,
            color: 'orange'
        }
    }
];

const gridOptions = {
    defaultColDef: {
        editable: true,
        sortable: true,
        flex: 1,
        minWidth: 100,
        filter: true,
        floatingFilter: true,
        resizable: true,
    },
    components: {
        customNumberFloatingFilter: NumberFloatingFilterComponent
    },
    columnDefs: columnDefs,
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
