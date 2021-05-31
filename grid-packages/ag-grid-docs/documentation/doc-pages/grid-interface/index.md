---
title: "Grid Interface"
---

This section details the public interface that your application can use to interact with the grid, including methods, properties and events.

The grid interface is the combination of the following items:

- [Grid Properties](/grid-properties/): properties used to configure the grid, e.g. `pagination = true`.
- [Grid API](/grid-api/): methods used to interact with the grid after it's created, e.g. `api.getSelectedRows()`.
- [Grid Events](/grid-events/): events published by the grid to inform applications of changes in state, e.g. `rowSelected`.
- [Grid Callbacks](/grid-callbacks/): callbacks are used by the grid to retrieve required information from your application, e.g. `getRowHeight()`.
- [Row Node](/row-object/): each row in the grid is represented by a Row Node object, which in turn has a reference to the piece of row data provided by the application. The Row Node wraps the row data item. The Row Node has attributes, methods and events for interacting with the specific row e.g. `rowNode.setSelected(true)`.

md-include:index-javascript.md
md-include:index-angular.md
md-include:index-react.md
md-include:index-vue.md

## Events Are Asynchronous

Grid events are asynchronous so that the state of the grid will be settled by the time your event callback gets invoked.

## Default Boolean Properties

Where the property is a boolean (`true` or `false`), then `false` (or left blank) is the default value. For this reason, on / off items are presented in a way that causes the most common behaviour
to be used when the value is `false`. For example, `suppressCellSelection` is named as such because most people will want cell selection to be enabled.

## Next Steps

That's it, Doc! Now you know how to interface with the grid. Go now and find out about all the great [properties](/grid-properties/), [methods](/grid-api/), [callbacks](/grid-callbacks/) and [events](/grid-events/) you can use.
