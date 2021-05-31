[[only-angular]]
|Below is a simple example of cell renderer class:
|
|```js
|import { AfterViewInit, Component, ViewChild, ViewContainerRef } from "@angular/core";
|import { ICellEditorAngularComp } from "@ag-grid-community/angular";
|
|@Component({
|    selector: 'editor-cell',
|    template: `<input type="number" [value]="value" #input style="width: 100%" />`
|})
|export class DoublingEditor implements ICellEditorAngularComp, AfterViewInit {
|    private params: any;
|    private value: number;
|
|    @ViewChild('input', { read: ViewContainerRef }) public input: ViewContainerRef;
|
|    ngAfterViewInit() {
|        // focus on the input
|        setTimeout(() => this.input.element.nativeElement.focus());
|    }
|
|    agInit(params: any): void {
|        this.params = params;
|
|        this.value = parseInt(this.params.value);
|    }
|
|    /* Component Editor Lifecycle methods */
|    // the final value to send to the grid, on completion of editing
|    getValue() {
|        // this simple editor doubles any value entered into the input
|        return this.value * 2;
|    }
|
|    // Gets called once before editing starts, to give editor a chance to
|    // cancel the editing before it even starts.
|    isCancelBeforeStart() {
|        return false;
|    }
|
|    // Gets called once when editing is finished (eg if Enter is pressed).
|    // If you return true, then the result of the edit will be ignored.
|    isCancelAfterEnd() {
|        // our editor will reject any value greater than 1000
|        return this.value > 1000;
|    }
|}
|```
