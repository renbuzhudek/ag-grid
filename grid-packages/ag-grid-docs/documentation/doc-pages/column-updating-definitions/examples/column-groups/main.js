function createColSetA() {
    return [
        {
            headerName: 'Group A',
            groupId: 'groupA',
            children: [
                { field: 'athlete' },
                { field: 'age' },
                { field: 'country', columnGroupShow: 'open' },
            ],
        },
        {
            headerName: 'Group B',
            children: [
                { field: 'sport' },
                { field: 'year' },
                { field: 'date', columnGroupShow: 'open' }
            ]
        },
        {
            headerName: 'Group C',
            groupId: 'groupC',
            children: [
                { field: 'total' },
                { field: 'gold', columnGroupShow: 'open' },
                { field: 'silver', columnGroupShow: 'open' },
                { field: 'bronze', columnGroupShow: 'open' }
            ],
        }
    ];
}

function createColSetB() {
    return [
        {
            headerName: 'GROUP A',
            groupId: 'groupA',
            children: [
                { field: 'athlete' },
                { field: 'age' },
                { field: 'country', columnGroupShow: 'open' },
            ],
        },
        {
            headerName: 'Group B',
            children: [
                { field: 'sport' },
                { field: 'year' },
                { field: 'date', columnGroupShow: 'open' }
            ]
        },
        {
            headerName: 'Group C',
            groupId: 'groupC',
            children: [
                { field: 'total' },
                { field: 'gold', columnGroupShow: 'open' },
                { field: 'silver', columnGroupShow: 'open' },
                { field: 'bronze', columnGroupShow: 'open' },
                { field: 'extraA' },
                { field: 'extraB', columnGroupShow: 'open' }
            ],
        }
    ];
}

var gridOptions = {
    defaultColDef: {
        initialWidth: 100,
        sortable: true,
        resizable: true
    },
    columnDefs: createColSetA()
};

function onBtSetA() {
    gridOptions.api.setColumnDefs(createColSetA());
}

function onBtSetB() {
    gridOptions.api.setColumnDefs(createColSetB());
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/olympic-winners.json' })
        .then(function(data) {
            gridOptions.api.setRowData(data);
        });
});
