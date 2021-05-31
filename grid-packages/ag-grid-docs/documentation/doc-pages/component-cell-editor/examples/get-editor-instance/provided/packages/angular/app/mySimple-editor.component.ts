import {AfterViewInit, Component, ViewChild, ViewContainerRef} from "@angular/core";
import {ICellEditorParams} from "ag-grid-community";
import {AgEditorComponent} from "ag-grid-angular";

const KEY_BACKSPACE = 8;
const KEY_DELETE = 46;

@Component({
    selector: 'editor-cell',
    template: `<input class="my-simple-editor" [value]="value" #input /> `
})
export class MySimpleEditor implements AgEditorComponent, AfterViewInit {
    private params: ICellEditorParams;
    private value: any;

    @ViewChild('input', {read: ViewContainerRef}) public input;

    agInit(params: ICellEditorParams): void {
        this.params = params;

        this.value = this.getInitialValue(params);
    }

    getValue(): any {
        return this.value;
    }

    getInitialValue(params: ICellEditorParams): any {
        let startValue = params.value;

        const keyPressBackspaceOrDelete = params.keyPress === KEY_BACKSPACE || params.keyPress === KEY_DELETE;
        if (keyPressBackspaceOrDelete) {
            startValue = '';
        } else if (params.charPress) {
            startValue = params.charPress;
        }

        if (startValue !== null && startValue !== undefined) {
            return startValue;
        }

        return '';
    }

    myCustomFunction() {
        return {
            rowIndex: this.params.rowIndex,
            colId: this.params.column.getId()
        };
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.input.element.nativeElement.focus();
        });
    }
}
