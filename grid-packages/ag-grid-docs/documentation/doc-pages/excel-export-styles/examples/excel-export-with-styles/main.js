var columnDefs = [
    {
        headerName: 'Top Level Column Group',
        children: [
            {
                headerName: 'Group A',
                children: [
                    { field: 'athlete', minWidth: 200 },
                    {
                        field: 'age',
                        cellClass: 'twoDecimalPlaces',
                        cellClassRules: {
                            greenBackground: function(params) {
                                return params.value < 23;
                            },
                            redFont: function(params) {
                                return params.value < 20;
                            }
                        }
                    },
                    {
                        field: 'country',
                        minWidth: 200,
                        cellClassRules: {
                            redFont: function(params) {
                                return params.value === 'United States';
                            }
                        }
                    },
                    {
                        headerName: 'Group',
                        valueGetter: 'data.country.charAt(0)',
                        cellClassRules: {
                            boldBorders: function(params) {
                                return params.value === 'U';
                            }
                        },
                        cellClass: ['redFont', 'greenBackground']
                    },
                    {
                        field: 'year',
                        cellClassRules: {
                            notInExcel: function(params) {
                                return true;
                            }
                        }
                    }
                ]
            },
            {
                headerName: 'Group B',
                children: [
                    {
                        field: 'date',
                        minWidth: 150,
                        cellClass: 'dateFormat',
                        valueGetter: function(params) {
                            var val = params.data.date;

                            if (val.indexOf('/') < 0) { return val; }

                            var split = val.split('/');

                            return split[2] + '-' + split[1] + '-' + split[0];

                        }
                    },
                    { field: 'sport', minWidth: 150 },
                    {
                        field: 'gold',
                        cellClassRules: {
                            boldBorders: function(params) {
                                return params.value > 2;
                            }
                        }
                    },
                    { field: 'silver', cellClass: 'textFormat' },
                    { field: 'bronze' },
                    { field: 'total', }
                ]
            }
        ]
    }
];

var gridOptions = {
    defaultColDef: {
        cellClassRules: {
            darkGreyBackground: function(params) {
                return params.node.rowIndex % 2 == 0;
            }
        },
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
        flex: 1
    },

    columnDefs: columnDefs,

    onGridReady: function(params) {
        document.getElementById("fontSize").checked = true;
        document.getElementById("rowHeight").checked = true;
        document.getElementById("headerRowHeight").checked = true;
    },

    pinnedTopRowData: [
        {
            athlete: 'Floating <Top> Athlete',
            age: 999,
            country: 'Floating <Top> Country',
            year: 2020,
            date: '2020-08-01',
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
            age: 888,
            country: 'Floating <Bottom> Country',
            year: 2030,
            date: '2030-08-01',
            sport: 'Track & Field',
            gold: 222,
            silver: '005',
            bronze: 244,
            total: 255
        }
    ],

    excelStyles: [
        {
            id: 'cell',
            alignment: {
                vertical: 'Center'
            }
        },
        {
            id: 'header',
            alignment: {
                vertical: 'Center'
            },
            interior: {
                color: '#f8f8f8',
                pattern: 'Solid'
            },
            borders: {
                borderBottom: {
                    color: '#babfc7',
                    lineStyle: 'Continuous',
                    weight: 1
                }
            }
        },
        {
            id: 'headerGroup',
            font: {
                bold: true
            }
        },
        {
            id: 'greenBackground',
            interior: {
                color: '#b5e6b5',
                pattern: 'Solid'
            }
        },
        {
            id: 'redFont',
            font: {
                fontName: 'Calibri Light',
                underline: 'Single',
                italic: true,
                color: '#ff0000'
            }
        },
        {
            id: 'darkGreyBackground',
            interior: {
                color: '#888888',
                pattern: 'Solid'
            },
            font: {
                fontName: 'Calibri Light',
                color: '#ffffff'
            }
        },
        {
            id: 'boldBorders',
            borders: {
                borderBottom: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 3
                },
                borderLeft: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 3
                },
                borderRight: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 3
                },
                borderTop: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 3
                }
            }
        },
        {
            id: 'dateFormat',
            dataType: 'dateTime',
            numberFormat: {
                format: 'mm/dd/yyyy;@'
            }
        },
        {
            id: 'twoDecimalPlaces',
            numberFormat: {
                format: '#,##0.00'
            }
        },
        {
            id: 'textFormat',
            dataType: 'string'
        }
    ]
};

function getBooleanValue(cssSelector) {
    return document.querySelector(cssSelector).checked === true;
}

function getTextValue(cssSelector) {
    return document.querySelector(cssSelector).value;
}

function getNumericValue(cssSelector) {
    var value = parseFloat(getTextValue(cssSelector));
    if (isNaN(value)) {
        var message = "Invalid number entered in " + cssSelector + " field";
        alert(message);
        throw new Error(message);
    }
    return value;
}

function onBtExport() {
    var params = {
        fontSize: getBooleanValue('#fontSize') ? getNumericValue('#fontSizeValue') : undefined,
        rowHeight: getBooleanValue('#rowHeight') ? getNumericValue('#rowHeightValue') : undefined,
        headerRowHeight: getBooleanValue('#headerRowHeight') ? getNumericValue('#headerRowHeightValue') : undefined
    };

    gridOptions.api.exportDataAsExcel(params);
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
