import {Component, ViewChild} from "@angular/core";

import {AgFilterComponent} from "@ag-grid-community/angular";
import {IDoesFilterPassParams, IFilterParams, RowNode} from "@ag-grid-community/core";

@Component({
    selector: 'year-component',
    template: `
      <div style="padding: 4px; width: 200px;">
      <div style="font-weight: bold;">Custom Athlete Filter</div>
      <div>
        <input style="margin: 4px 0 4px 0;" type="text" [(ngModel)]="filterText" (ngModelChange)="onInputChanged()" placeholder="Full name search..."/>
      </div>
      <div style="margin-top: 20px;">This filter does partial word search on multiple words, eg "mich phel" still brings back Michael Phelps.</div>
      <div style="margin-top: 20px;">Just to emphasise that anything can go in here, here is an image!!</div>
      <div>
        <img src="https://www.ag-grid.com/images/ag-Grid2-200.png"
             style="width: 150px; text-align: center; padding: 10px; margin: 10px; border: 1px solid lightgrey;"/>
      </div>
      </div>
    `
})
export class PersonFilter implements AgFilterComponent {
    params: IFilterParams;
    valueGetter: (rowNode: RowNode) => any;
    filterText: string = '';

    agInit(params: IFilterParams): void {
        this.params = params;
        this.valueGetter = params.valueGetter;
    }

    doesFilterPass(params: IDoesFilterPassParams) {
        // make sure each word passes separately, ie search for firstname, lastname
        let passed = true;
        this.filterText.toLowerCase().split(' ').forEach(filterWord => {
            const value = this.valueGetter(params);

            if (value.toString().toLowerCase().indexOf(filterWord) < 0) {
                passed = false;
            }
        });

        return passed;
    }

    isFilterActive(): boolean {
        return this.filterText != null && this.filterText !== '';
    }

    getModel() {
        return {value: this.filterText};
    }

    setModel(model: any) {
        this.filterText = model.value;
    }

    onInputChanged() {
        this.params.filterChangedCallback();
    }
}
