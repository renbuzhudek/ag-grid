---
title: "Loading Cell Renderer"
---

Loading cell renderers allow you to add your own loading renderers to AG Grid. Use these when the provided loading renderers do not meet your requirements.

## Simple Loading Cell Renderer Component

md-include:simple-renderer-javascript.md
md-include:simple-renderer-angular.md
md-include:simple-renderer-react.md
md-include:simple-renderer-vue.md
 
## Example: Custom Loading Cell Renderer

The example below demonstrates how to provide custom loading cell renderer component to the grid. Notice the following:
 
- **Custom Loading Cell Renderer** is supplied by name via `gridOptions.loadingCellRenderer`.
- **Custom Loading Cell Renderer Parameters** are supplied using `gridOptions.loadingCellRendererParams`.

<grid-example title='Custom Loading Cell Renderer' name='custom-loading-cell-renderer' type='generated' options='{ "enterprise": true, "extras": ["fontawesome"] }'></grid-example>

md-include:component-interface-javascript.md
md-include:component-interface-angular.md
md-include:component-interface-react.md
md-include:component-interface-vue.md

```ts
interface ILoadingCellRendererParams {
    // an optional template for the loading cell renderer
    loadingMessage?: string

    // The grid API
    api: GridApi;
}
```

## Registering Loading Cell Renderer Components

See the section [registering custom components](/components/#registering-custom-components) for details on registering and using custom loading cell renderers.

