class NumberFilterComponent {
    init(params) {
        this.valueGetter = params.valueGetter;
        this.filterText = null;
        this.params = params;
        this.setupGui();
    }

    // not called by AG Grid, just for us to help setup
    setupGui() {
        this.gui = document.createElement('div');
        this.gui.innerHTML = `
            <div style="padding: 4px">
                <div style="font-weight: bold;">Greater than: </div>
                <div>
                    <input style="margin: 4px 0 4px 0;" type="number" id="filterText" placeholder="Number of medals..."/>
                </div>
            </div>
        `;

        this.onFilterChanged = () => {
            this.extractFilterText();
            this.params.filterChangedCallback();
        };

        this.eFilterText = this.gui.querySelector('#filterText');
        this.eFilterText.addEventListener('input', this.onFilterChanged);
    }

    isNumeric = n => !isNaN(parseFloat(n)) && isFinite(n);

    myMethodForTakingValueFromFloatingFilter(value) {
        this.eFilterText.value = value;
        this.onFilterChanged();
    }

    extractFilterText() {
        this.filterText = this.eFilterText.value;
    }

    getGui() {
        return this.gui;
    }

    doesFilterPass(params) {
        const valueGetter = this.valueGetter;
        const value = valueGetter(params);
        const filterValue = this.filterText;

        if (this.isFilterActive()) {
            if (!value) return false;
            return Number(value) > Number(filterValue);
        }
    }

    isFilterActive() {
        return this.filterText !== null &&
            this.filterText !== undefined &&
            this.filterText !== '' &&
            this.isNumeric(this.filterText);
    }

    getModel() {
        return this.isFilterActive() ? Number(this.eFilterText.value) : null;
    }

    setModel(model) {
        this.eFilterText.value = model;
        this.extractFilterText();
    }

    destroy() {
        this.eFilterText.removeEventListener('input', this.onFilterChanged);
    }
}
