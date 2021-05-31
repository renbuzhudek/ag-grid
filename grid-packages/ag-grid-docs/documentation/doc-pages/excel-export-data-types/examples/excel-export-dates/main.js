const gridOptions = {
    columnDefs: [
        {
            field: 'date',
            headerName: 'ISO Format',
            cellClass: 'dateISO',
            minWidth: 150 
        },
        { 
            field: 'date',
            headerName: 'dd/mm/yy',
            cellClass: 'dateUK',
            valueFormatter: function (params) {
                var date = new Date(params.value);
                var day = date.getDate().toString().padStart(2,0);
                var month = (date.getMonth() + 1).toString().padStart(2,0);
                var year = date.getFullYear().toString().substr(-2);
                return day + '/' + month  + '/' + year;
            }
        },
        {
            field: 'date',
            headerName: 'mm/dd/yy',
            cellClass: 'dateUS',
            valueFormatter: function (params) {
                var date = new Date(params.value);
                var day = date.getDate().toString().padStart(2,0);
                var month = (date.getMonth() + 1).toString().padStart(2,0);
                var year = date.getFullYear().toString().substr(-2);
                return month + '/' + day  + '/' + year;
            }
        },
        {
            field: 'date',
            headerName: 'dd/mm/yyy h:mm:ss AM/PM',
            cellClass: 'dateLong',
            minWidth: 150,
            valueFormatter: function (params) {
                var date = new Date(params.value);
                var day = date.getDate().toString().padStart(2,0);
                var month = (date.getMonth() + 1).toString().padStart(2,0);
                var year = date.getFullYear().toString();
                var hour = date.getHours() % 12;
                hour = (hour === 0 ? 12 : hour).toString().padStart(2,0);
                var min = date.getMinutes().toString().padStart(2,0);
                var sec = date.getSeconds().toString().padStart(2,0);
                var amPM = date.getHours() < 12 ? 'AM' : 'PM';

                return day + '/' + month  + '/' + year + ' ' + hour + ':' + min + ':' + sec + ' ' + amPM;
            }
        }
    ],
    defaultColDef: {
        flex: 1,
        minWidth: 100,
        resizable: true,
    },
    excelStyles: [
        {
            id: 'dateISO',
            dataType: 'DateTime',
            numberFormat: {
                format: 'yyy-mm-ddThh:mm:ss'
            }
        },
        {
            id: 'dateUK',
            dataType: 'DateTime',
            numberFormat: {
                format: 'dd/mm/yy'
            }
        },
        {
            id: 'dateUS',
            dataType: 'DateTime',
            numberFormat: {
                format: 'mm/dd/yy'
            }
        },
        {
            id: 'dateLong',
            dataType: 'DateTime',
            numberFormat: {
                format: 'dd/mm/yyy h:mm:ss AM/PM'
            }
        },
    ],
    rowData: [
        { date: '2020-05-30T10:01:00' },
        { date: '2015-04-21T16:30:00' },
        { date: '2010-02-19T12:02:00' },
        { date: '1995-10-04T03:27:00' }
    ],
};

function onBtnExportDataAsExcel() {
    gridOptions.api.exportDataAsExcel();
}

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);
});
