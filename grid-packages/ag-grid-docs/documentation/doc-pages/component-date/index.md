---
title: "Date Component"
---

You can create your own date components, and AG Grid will use them every time it needs to ask the user for a date value. The date components are currently used in **date filters**.

## Simple Date Component

md-include:simple-date-javascript.md
md-include:simple-date-angular.md
md-include:simple-date-react.md
md-include:simple-date-vue.md

## Example: Custom Date Component

The example below shows how to register a custom date component that contains an extra floating calendar picker rendered from the filter field. The problem with this approach is that we have no control over third party components and therefore no way to implement a `preventDefault` when the user clicks on the Calendar Picker (for more info see [Custom Floating Filter Example](/component-floating-filter/#example-custom-floating-filter)). Our way of fixing this problem is to add the `ag-custom-component-popup` class to the floating calendar.

<grid-example title='Custom Date Component' name='custom-date' type='generated' options='{ "extras": ["fontawesome", "flatpickr"] }'></grid-example>

## Registering Date Components

By default the grid will use the browser provided date picker for Chrome and Firefox (as we think it's nice), but for all other browsers it will just provide a simple text field.
You can use your own date picker to AG Grid by providing a custom Date Component as follows:

[[only-javascript]]
|```js
|const gridOptions = {
|    // Here is where we specify the component to be used as the date picker widget
|    components: {
|        agDateInput: CustomDateComponent
|    }
|};
|
[[only-angular]]
|```ts
|@Component({
|    selector: 'my-app',
|    template: `
|      <ag-grid-angular
|          class="ag-theme-alpine"
|          [frameworkComponents]="frameworkComponents"
|          ...other properties...  
|      ></ag-grid-angular>
|    `
|})
|export class AppComponent {
|    private frameworkComponents = {
|        agDateInput: CustomDateComponent
|    };
|```
[[only-react]]
|```jsx
|<AgGridReact
|    frameworkComponents={{ agDateInput: CustomDateComponent }}
|    ...other properties...
|/>
|```
[[only-vue]]
|```js
|const MyApp = {
|    template: `
|      <ag-grid-vue
|          :frameworkComponents="frameworkComponents"
|          ...other properties...  
|      >
|      </ag-grid-vue>
|    `,
|    components: {
|        'ag-grid-vue': AgGridVue
|    },
|    data: function () {
|        return {
|            frameworkComponents: {
|                agDateInput: CustomDateComponent
|            },
|            // other properties/values
|        }
|    },
|```
 
Please see [Provided Components](../components/#grid-provided-components) for more information about overrided AG Grid provided components (as we're doing here
by overriding `agDateInput`).

md-include:component-interface-javascript.md
md-include:component-interface-angular.md
md-include:component-interface-react.md
md-include:component-interface-vue.md

```ts
interface IDateParams {
    // Callback method to call when the date has changed
    onDateChanged: () => void;
}
```



