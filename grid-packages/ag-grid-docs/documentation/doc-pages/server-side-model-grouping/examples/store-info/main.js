var gridOptions = {
    columnDefs: [
        { field: 'country', enableRowGroup: true, rowGroup: true },
        { field: "sport", enableRowGroup: true, rowGroup: true },
        { field: "year", minWidth: 100 },
        { field: "gold", aggFunc: 'sum' },
        { field: "silver", aggFunc: 'sum' },
        { field: "bronze", aggFunc: 'sum' }
    ],
    defaultColDef: {
        flex: 1,
        minWidth: 120,
        resizable: true,
        sortable: true
    },
    rowGroupPanelShow: 'always',
    serverSideStoreType: 'full',
    autoGroupColumnDef: {
        flex: 1,
        minWidth: 280,
    },

    // rowBuffer: 0,
    cacheBlockSize: 4,

    // use the server-side row model
    rowModelType: 'serverSide',

    getServerSideStoreParams: function(params) {

        var noGroupingActive = params.rowGroupColumns.length == 0;
        var res;
        if (noGroupingActive) {
            res = {
                // infinite scrolling
                storeType: 'partial',
                // 100 rows per block
                cacheBlockSize: 100,
                // purge blocks that are not needed
                maxBlocksInCache: 2
            };
        } else {
            var topLevelRows = params.level == 0;
            res = {
                storeType: topLevelRows ? 'full' : 'partial',
                cacheBlockSize: params.level == 1 ? 5 : 2,
                maxBlocksInCache: -1 // never purge blocks
            };
        }

        console.log('############## NEW STORE ##############');
        console.log('getServerSideStoreParams, level = ' + params.level + ', result = ' + JSON.stringify(res));

        return res;
    },

    suppressAggFuncInHeader: true,

    animateRows: true
};

function onBtStoreState() {
    var storeState = gridOptions.api.getServerSideStoreState();
    console.log('Store States:');
    storeState.forEach(function(state, index) {
        console.log(index + ' - ' + JSON.stringify(state).replace(/"/g, '').replace(/,/g, ", "));
    });
}

function ServerSideDatasource(server) {
    return {
        getRows: function(params) {
            console.log('[Datasource] - rows requested by grid: ', params.request);

            var response = server.getData(params.request);

            // adding delay to simulate real server call
            setTimeout(function() {
                if (response.success) {
                    // call the success callback
                    params.success({
                        rowData: response.rows,
                        rowCount: response.lastRow,
                        storeInfo: { lastLoadedTime: new Date().toLocaleString(), randomValue: Math.random() }
                    });
                } else {
                    // inform the grid request failed
                    params.failCallback();
                }
            }, 400);
        }
    };
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/olympic-winners.json' }).then(function(data) {
        // setup the fake server with entire dataset
        var fakeServer = new FakeServer(data);

        // create datasource with a reference to the fake server
        var datasource = new ServerSideDatasource(fakeServer);

        // register the datasource with the grid
        gridOptions.api.setServerSideDatasource(datasource);
    });
});

