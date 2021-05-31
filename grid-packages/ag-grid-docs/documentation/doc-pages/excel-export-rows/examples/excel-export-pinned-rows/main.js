const columnDefs = [{
    headerName: 'Top Level Column Group',
    children: [{
        headerName: 'Group A',
        children: [
            { field: 'athlete', minWidth: 200 },
            { field: 'country', minWidth: 200, },
            { headerName: 'Group', valueGetter: 'data.country.charAt(0)', },
        ]
    }, {
        headerName: 'Group B',
        children: [
            { field: 'date', minWidth: 150 },
            { field: 'sport', minWidth: 150 },
            { field: 'gold' },
            { field: 'silver' },
            { field: 'bronze' },
            { field: 'total', }
        ]
    }]
}];

const gridOptions = {
    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
        flex: 1
    },

    columnDefs: columnDefs,
    popupParent: document.body,

    pinnedTopRowData: [
        {
            athlete: 'Floating <Top> Athlete',
            country: 'Floating <Top> Country',
            date: '01/08/2020',
            sport: 'Track & Field',
            gold: 22,
            silver: '003',
            bronze: 44,
            total: 55
        }
    ],

    pinnedBottomRowData: [
        {
            athlete: 'Floating <Bottom> Athlete',
            country: 'Floating <Bottom> Country',
            date: '01/08/2030',
            sport: 'Track & Field',
            gold: 222,
            silver: '005',
            bronze: 244,
            total: 255
        }
    ]
};

function getBoolean(id) {
    return !!document.querySelector('#' + id).checked;
}

function getParams() {
    return ({
        skipPinnedTop: getBoolean('skipPinnedTop'),
        skipPinnedBottom: getBoolean('skipPinnedBottom')
    });
}

function onBtExport(){
    gridOptions.api.exportDataAsExcel(getParams());
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);
    agGrid.simpleHttpRequest({url: 'https://www.ag-grid.com/example-assets/small-olympic-winners.json'})
    .then((data) => gridOptions.api.setRowData(data.filter(rec => rec.country != null)));
});
