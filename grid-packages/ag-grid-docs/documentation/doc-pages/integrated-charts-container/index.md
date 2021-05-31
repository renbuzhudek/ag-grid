---
title: "Chart Container"
enterprise: true
---

This section describes how to specify an alternative chart container to the default grid-provided popup window.


Displaying the generated chart within the grid-provided popup window will suit most needs. However you may wish to display the chart in a different location. For example, your application may already have popup windows and you wish to use the same library for consistency.

## Specifying Chart Container

To provide an alternative container for popup windows use the grid callback `createChartContainer(chartRef)`. The interface is as follows:

```ts
function createChartContainer(chartRef: ChartRef): void;

interface ChartRef {
    chartElement: HTMLElement;
    destroyChart: () => void;
}
```

The callback is called each time the user elects to create a chart via the grid UI. The callback is provided with a `ChartRef` containing the following:

- `chartElement`: The chart DOM element, which the application is responsible for placing into the DOM.
- `destroyChart`: The application is responsible for calling this when the chart is no longer needed.

The example below demonstrates the `createChartContainer()` callback. The example does not use an alternative popup window, but instead places the charts into the DOM below the grid. This crude approach is on purpose to minimise the complexity of the example and focus on just the callback and the interactions of the grid.


[[note]]
| When providing an element to display your chart, it is important to always set the `popupParent` to be `document.body`. This will allow floating elements within the chart's menus to be positioned correctly.

From the example below, the following can be noted:

- Select a range of numbers (medal columns) and create a chart from the context menu.
- The chart appears below the grid rather than in a popup window. This is because the `createChartContainer()` is implemented.
- Each chart is displayed alongside a 'Destroy' button. The logic behind the destroy button calls `destroyChart()` to destroy the chart instance.

<grid-example title='Provided Container' name='provided-container' type='generated' options='{ "exampleHeight": 750, "enterprise": true }'></grid-example>

## Next Up

Continue to the next section to learn about: [Cross Filtering](/integrated-charts-cross-filtering/).

