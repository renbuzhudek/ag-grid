var columnDefs = [
    {
        field: 'athlete',
        minWidth: 150,
        filter: 'agTextColumnFilter',
        filterParams: {
            debounceMs: 2000
        }
    },
    {
        field: 'age',
        filter: 'agNumberColumnFilter',
        filterParams: {
            debounceMs: 0
        }
    },
    { field: 'country' },
    { field: 'year' },
    {
        field: 'date',
        minWidth: 180,
        filter: 'date',
        filterParams: {
            comparator: function(filterLocalDateAtMidnight, cellValue) {
                var dateAsString = cellValue;
                var dateParts = dateAsString.split('/');
                var cellDate = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]));

                if (filterLocalDateAtMidnight.getTime() == cellDate.getTime()) {
                    return 0;
                }

                if (cellDate < filterLocalDateAtMidnight) {
                    return -1;
                }

                if (cellDate > filterLocalDateAtMidnight) {
                    return 1;
                }
            }
        },
        floatingFilterComponentParams: {
            suppressFilterButton: true
        }
    },
    { field: 'sport' },
    {
        field: 'gold',
        floatingFilterComponent: 'numberFloatingFilter',
        floatingFilterComponentParams: {
            maxValue: 7,
            suppressFilterButton: true
        },
        filter: 'numberFilter'
    },
    {
        field: 'silver',
        floatingFilterComponent: 'numberFloatingFilter',
        floatingFilterComponentParams: {
            maxValue: 3,
            suppressFilterButton: true
        },
        filter: 'numberFilter'
    },
    {
        field: 'bronze',
        floatingFilterComponent: 'numberFloatingFilter',
        floatingFilterComponentParams: {
            maxValue: 2,
            suppressFilterButton: true
        },
        filter: 'numberFilter'
    },
    {
        field: 'total',
        floatingFilterComponent: 'numberFloatingFilter',
        floatingFilterComponentParams: {
            maxValue: 5,
            suppressFilterButton: true
        },
        filter: 'numberFilter'
    }
];

var gridOptions = {
    defaultColDef: {
        editable: true,
        sortable: true,
        flex: 1,
        minWidth: 100,
        filter: true,
        floatingFilter: true,
        resizable: true
    },
    components: {
        numberFloatingFilter: NumberFloatingFilter,
        numberFilter: NumberFilter
    },
    columnDefs: columnDefs,
    rowData: null
};

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function NumberFilter() {
}

NumberFilter.prototype.init = function(params) {
    this.valueGetter = params.valueGetter;
    this.filterText = null;
    this.params = params;
    this.setupGui();
};

// not called by AG Grid, just for us to help setup
NumberFilter.prototype.setupGui = function() {
    this.gui = document.createElement('div');
    this.gui.innerHTML =
        '<div style="padding: 4px;">' +
        '<div style="font-weight: bold;">Greater than: </div>' +
        '<div><input style="margin: 4px 0px 4px 0px;" type="number" id="filterText" placeholder="Number of medals..."/></div>' +
        '</div>';

    var that = this;
    this.onFilterChanged = function() {
        that.extractFilterText();
        that.params.filterChangedCallback();
    };

    this.eFilterText = this.gui.querySelector('#filterText');
    this.eFilterText.addEventListener('input', this.onFilterChanged);
};

NumberFilter.prototype.extractFilterText = function() {
    this.filterText = this.eFilterText.value;
};

NumberFilter.prototype.getGui = function() {
    return this.gui;
};

NumberFilter.prototype.doesFilterPass = function(params) {
    var valueGetter = this.valueGetter;
    var value = valueGetter(params);
    var filterValue = this.filterText;

    if (this.isFilterActive()) {
        if (!value) return false;
        return Number(value) > Number(filterValue);
    }
};

NumberFilter.prototype.isFilterActive = function() {
    return this.filterText !== null &&
        this.filterText !== undefined &&
        this.filterText !== '' &&
        isNumeric(this.filterText);
};

NumberFilter.prototype.getModel = function() {
    return this.isFilterActive() ? Number(this.eFilterText.value) : null;
};

NumberFilter.prototype.setModel = function(model) {
    this.eFilterText.value = model;
    this.extractFilterText();
};

NumberFilter.prototype.myMethodForTakingValueFromFloatingFilter = function(value) {
    this.eFilterText.value = value;
    this.onFilterChanged();
};

NumberFilter.prototype.destroy = function() {
    this.eFilterText.removeEventListener('input', this.onFilterChanged);
};

function NumberFloatingFilter() {
}

NumberFloatingFilter.prototype.init = function(params) {
    this.onFloatingFilterChanged = params.onFloatingFilterChanged;
    this.eGui = document.createElement('div');
    this.eGui.innerHTML = '<div style="width:75%; margin-left:10px" class="slider"></div>';
    this.eSlider = $(this.eGui.querySelector('div'));
    this.currentValue = 0;
    var that = this;
    this.eSlider.slider({
        min: 0,
        max: params.maxValue,
        change: function(e, ui) {
            //Every time the value of the slider changes
            if (!e.originalEvent) {
                //If this event its triggered from outside. ie setModel() on the parent Filter we
                //would be in this area of the code and we need to prevent an infinite loop:
                //onParentModelChanged => onFloatingFilterChanged => onParentModelChanged => onFloatingFilterChanged ...
                return;
            }
            that.currentValue = ui.value;
            params.parentFilterInstance(function(instance) {
                instance.myMethodForTakingValueFromFloatingFilter(that.buildModel());
            });
        }
    });
};

NumberFloatingFilter.prototype.onParentModelChanged = function(parentModel) {
    // When the filter is empty we will receive a null message her
    if (!parentModel) {
        //If there is no filtering set to the minimun
        this.eSlider.slider('option', 'value', 0);
        this.currentValue = null;
    } else {
        if (parentModel.filter !== this.currentValue) {
            this.eSlider.slider('option', 'value', parentModel);
        }
        this.currentValue = parentModel;
    }
    //Print a summary on the slider button
    this.eSlider.children('.ui-slider-handle').html(this.currentValue ? '>' + this.currentValue : '');
};

NumberFloatingFilter.prototype.getGui = function() {
    return this.eGui;
};

NumberFloatingFilter.prototype.buildModel = function() {
    if (this.currentValue === 0) return null;
    return this.currentValue;
};

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/olympic-winners.json' })
        .then(function(data) {
            gridOptions.api.setRowData(data);
        });
});
