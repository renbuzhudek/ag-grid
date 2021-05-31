import {Component, OnDestroy} from "@angular/core";

import {ICellRendererParams} from "ag-grid-community";
import {AgRendererComponent} from "ag-grid-angular";

@Component({
    selector: 'square-cell',
    template: `{{valueSquared()}}`
})
export class SquareRenderer implements AgRendererComponent, OnDestroy {
    private params: ICellRendererParams;

    agInit(params: ICellRendererParams): void {
        this.params = params;
    }

    public valueSquared(): number {
        return this.params.value * this.params.value;
    }

    ngOnDestroy() {
        console.log(`Destroying SquareComponent`);
    }

    refresh(): boolean {
        return false;
    }
}
