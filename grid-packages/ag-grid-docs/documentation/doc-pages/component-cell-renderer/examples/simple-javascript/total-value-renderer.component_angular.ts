import {Component} from "@angular/core";

import {AgRendererComponent} from "@ag-grid-community/angular";
import {ICellRendererParams} from "@ag-grid-community/core";

@Component({
    selector: 'total-value-component',
    template: `
          <span>
              <span>{{cellValue}}</span>&nbsp;
              <button (click)="buttonClicked()">Push For Total</button>
          </span>
    `
})
export class TotalValueRenderer implements AgRendererComponent {
    private cellValue: string;

    // gets called once before the renderer is used
    agInit(params: ICellRendererParams): void {
        this.cellValue = this.getValueToDisplay(params);
    }

    // gets called whenever the user gets the cell to refresh
    refresh(params: ICellRendererParams) {
        // set value into cell again
        this.cellValue = this.getValueToDisplay(params);
    }

    buttonClicked() {
        alert(`${this.cellValue} medals won!`)
    }

    getValueToDisplay(params: ICellRendererParams) {
        return params.valueFormatted ? params.valueFormatted : params.value;
    }
}
