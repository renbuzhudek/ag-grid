import {Component} from "@angular/core";

import {AgFilterComponent} from "@ag-grid-community/angular";
import {IDoesFilterPassParams, IFilterParams, RowNode} from "@ag-grid-community/core";

@Component({
    selector: 'number-component',
    template: `
      <div style="padding: 4px">
      <div style="font-weight: bold;">Greater than:</div>
      <div>
        <input style="margin: 4px 0 4px 0;" type="number" [(ngModel)]="filterText" (input)="onInputBoxChanged($event)" placeholder="Number of medals..."/>
      </div>
      </div>
    `
})
export class NumberFilterComponent implements AgFilterComponent {
    params: IFilterParams;
    valueGetter: (rowNode: RowNode) => any;
    filterText: Number | null | string = null;

    agInit(params: IFilterParams): void {
        this.params = params;
        this.valueGetter = params.valueGetter;
    }

    doesFilterPass(params: IDoesFilterPassParams) {
        const valueGetter = this.valueGetter;
        const value = valueGetter(params);

        if (this.isFilterActive()) {
            if (!value) return false;
            return Number(value) > Number(this.filterText);
        }
    }

    isFilterActive() {
        return this.filterText !== null &&
            this.filterText !== undefined &&
            this.filterText !== '' &&
            this.isNumeric(this.filterText);
    }

    isNumeric(n: any) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    getModel() {
        return this.isFilterActive() ? Number(this.filterText) : null;
    }

    setModel(model: any) {
        this.filterText = model;
        this.params.filterChangedCallback();
    }

    myMethodForTakingValueFromFloatingFilter(value: any) {
        this.filterText = value;
        this.params.filterChangedCallback();
    }

    onInputBoxChanged() {
        this.params.filterChangedCallback();
    }
}
