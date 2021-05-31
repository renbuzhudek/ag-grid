[[only-angular]]
|
|```js
|// define cellRenderer to be reused
|@Component({
|    selector: 'my-app',
|    template: `<span [style.colour]="params.color">{{params.value}}</span>`
|})
|class ColourCellRenderer {
|    params: ICellRendererParams;
|
|    agInit(ICellRendererParams) {
|        this.params = params;
|    }
|}
|
|@Component({
|    selector: 'my-app',
|    template: `
|        <ag-grid-angular
|                class="ag-theme-alpine"
|                [columnDefs]="columnDefs"
|                [frameworkComponents]="frameworkComponents"
|                ...other properties>        
|        </ag-grid-angular>`
|})
|export class AppComponent {
|    private columnDefs = [
|        {
|            headerName: "Colour 1",
|            field: "value",
|            cellRendererParams: {
|               color: 'guinnessBlack'
|            }
|        },
|        {
|            headerName: "Colour 2",
|            field: "value",
|            cellRendererParams: {
|               color: 'irishGreen'
|            }
|        }
|    ];
|
|   private frameworkComponents = {
|       'colourCellRenderer': ColourCellRenderer
|   };
|
|   ..other methods
|}
|
|```
