const columnDefs = [
    {field: 'id'},
    {field: 'athlete', width: 150},
    {field: 'age'},
    {field: 'country'},
    {field: 'year'},
    {field: 'sport'},
    {field: 'gold'},
    {field: 'silver'},
    {field: 'bronze'}
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
        customLoadingCellRenderer: CustomLoadingCellRenderer,
    },

    loadingCellRenderer: 'customLoadingCellRenderer',
    loadingCellRendererParams: {
        loadingMessage: 'One moment please...'
    },

    columnDefs: columnDefs,

    // use the server-side row model
    rowModelType: 'serverSide',

    serverSideStoreType: 'partial',

    // fetch 100 rows per at a time
    cacheBlockSize: 100,

    // only keep 10 blocks of rows
    maxBlocksInCache: 10,

    animateRows: true,
    debug: true
};

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/olympic-winners.json' }).then(data => {
        // add id to data
        let idSequence = 0;
        data.forEach(item => {
            item.id = idSequence++;
        });

        const server = new FakeServer(data);
        const datasource = new ServerSideDatasource(server);
        gridOptions.api.setServerSideDatasource(datasource);
    });
});

function ServerSideDatasource(server) {
    return {
        getRows: params => {
            // adding delay to simulate real server call
            setTimeout(() => {

                const response = server.getResponse(params.request);

                if (response.success) {
                    // call the success callback
                    params.successCallback(response.rows, response.lastRow);
                } else {
                    // inform the grid request failed
                    params.failCallback();
                }

            }, 2000);
        }
    };
}

function FakeServer(allData) {
    return {
        getResponse: request => {
            console.log('asking for rows: ' + request.startRow + ' to ' + request.endRow);

            // take a slice of the total rows
            const rowsThisPage = allData.slice(request.startRow, request.endRow);

            // if on or after the last page, work out the last row.
            const lastRow = allData.length <= request.endRow ? data.length : -1;

            return {
                success: true,
                rows: rowsThisPage,
                lastRow: lastRow
            };
        }
    };
}
