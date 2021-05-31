const gridOptions = {
    columnDefs: [
        {field: 'athlete', minWidth: 200},
        {field: 'country', minWidth: 200,},
        {field: 'sport', minWidth: 150},
        {field: 'gold'},
        {field: 'silver'},
        {field: 'bronze'},
        {field: 'total'}
    ],

    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
        flex: 1
    },

    popupParent: document.body
};

const getRows = () => [
    [],
    [
        {data: {value: 'Here is a comma, and a some "quotes".', type: "String"}}
    ],
    [
        {data: {value: 'They are visible when the downloaded file is opened in Excel because custom content is properly escaped.', type: "String"}}
    ],
    [
        {data: {value: "this cell:", type: "String"}, mergeAcross: 1},
        {data: {value: "is empty because the first cell has mergeAcross=1", type: "String"}}
    ],
    []
];

const getBoolean = (inputSelector) => !!document.querySelector(inputSelector).checked;

const getParams = () => ({
    prependContent: getBoolean('#prependContent') ? getRows() : undefined,
    appendContent: getBoolean('#appendContent') ? getRows() : undefined
});

function onBtExport() {
    gridOptions.api.exportDataAsExcel(getParams());
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({url: 'https://www.ag-grid.com/example-assets/small-olympic-winners.json'})
        .then(data => gridOptions.api.setRowData(data.filter(rec => rec.country != null)));
});
