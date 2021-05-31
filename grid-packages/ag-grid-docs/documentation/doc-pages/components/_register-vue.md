[[only-vue]]
|
|## Registering Custom Components
|
|The pages for each component type (cell renderer, cell editor etc) contain examples on how to register and use each component type.
|It is however useful here to step back and focus on the component registration process which is common across all component types.
|
|There are generally two ways to register custom components ("inline" components can only be registered by name):
|
|- By name.
|- Direct reference.
|
|Both options are fully supported by the grid, however registering by name is AG Grid's preferred option as it's more flexible.
|All of the examples in the documentation use this approach.
|The direct reference approach is kept for backwards compatibility as this was the original way to do it in AG Grid.
|
|## Registering Inline Custom Components
|
|Inline Custom Components can only be registered within the Grid by name:
|
|```js
|<template>
|   <ag-grid-vue :columnDefs="columnDefs" ...other properties>
|   </ag-grid-vue>
|</template>
|
|<script>
|//...other imports
|import {AgGridVue} from "@ag-grid-community/vue";
|
|export default {
|   components: {
|       AgGridVue,
|       CubeComponent: {
|           template: '<span>{{ valueCubed() }}</span>',
|           methods: {
|               valueCubed() {
|                   return this.params.value * this.params.value * this.params.value;
|               }
|           }
|       }
|   },
|   data() {
|       return {
|           columnDefs: [
|                {
|                   headerName: "Cube",
|                   field: "value",
|                   cellRendererFramework: 'CubeComponent',     
|               }
|           ]
|       }
|   }
|   //...other properties & methods
|}
|</script>
|```
|
|## Registering Non-Inline Custom Components
|
|### 1. By Name
| To use a component within the grid you will reference components by **case-sensitive**
| name, for example:
|
|```js
|<template>
|   <ag-grid-vue ...other properties>
|   </ag-grid-vue>
|</template>
|
|<script>
|//...other imports
|import {AgGridVue} from "@ag-grid-community/vue";
|import CubeComponent from './CubeComponent.vue';
|
|export default {
|   components: {
|       AgGridVue,
|       CubeComponent
|   }
|   data() {
|       return {
|           columnDefs: [
|                {
|                   headerName: "Cube",
|                   field: "value",
|                   cellRendererFramework: 'CubeComponent'     
|               }
|           ]
|       }
|   }
|   //...other properties & methods
|}
|</script>
|```
|### 2. By Direct Reference
|
|When registering components within the Grid by direct reference the target components *must* be wrapped in `Vue.extend(...)`:
|
|```js
|<template>
|   <ag-grid-vue ...other properties>
|   </ag-grid-vue>
|</template>
|
|<script>
|//...other imports
|import Vue from "vue";
|import {AgGridVue} from "@ag-grid-community/vue";
|
|// component wrapped in Vue.extend for direct reference
|const CubeComponent = Vue.extend({
|   template: '<span>{{ valueCubed() }}</span>',
|   methods: {
|       valueCubed() {
|           return this.params.value * this.params.value * this.params.value;
|       }
|   }
|};
|
|
|export default {
|   components: {
|       AgGridVue,
|       // CubeComponent does not have to be registered here when registering by direct reference
|   }
|   data() {
|       return {
|           columnDefs: [
|                {
|                   headerName: "Cube",
|                   field: "value",
|                   cellRendererFramework: CubeComponent
|               }
|           ]
|       }
|   }
|   //...other properties & methods
|}
|</script>
