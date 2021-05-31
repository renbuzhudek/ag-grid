---
title: "Column Filter"
---

Column filters are filters that are applied to the data at the column level. Many column filters can be active at once (e.g. filters set on different columns) and the grid will display rows that pass every column's filter.

Column filters are accessed in the grid UI either through the [Column Menu](/column-menu/) or the [Tool Panel](/tool-panel/).

<div style="display: flex; justify-content: center;">
    <image-caption src="filtering/resources/open-column.gif" alt="Open Column" width="25rem" constrained="true">
        Access via Column Menu
    </image-caption>
    <image-caption src="filtering/resources/open-tool-panel.gif" alt="Open Tool Panel" width="25rem" constrained="true">
        Access via Tool Panel
    </image-caption>
</div>

You can use the [Provided Filters](/filter-provided/) that come with the grid, or you can build your own [Filter Components](/component-filter/) if you want to customise the filter experience to your application.

### Example: Simple Filters

The example below demonstrates simple filters. The following can be noted:

- Column **Athlete** has a simple text filter.
- Column **Age** has a simple number filter.
- Column **Date** has a simple date filter.

<grid-example title='Provided Simple' name='provided-simple' type='generated' options='{ "exampleHeight": 560 }'></grid-example>

## Configuring Filters on Columns

Set filtering on a column using the column definition property `filter`. The property can have one of the following values:

- `boolean`: Set to `true` to enable the default filter. The default is [Text Filter](/filter-text/) for AG Grid Community and [Set Filter](/filter-set/) for AG Grid Enterprise.
- `string` / `Component`: Provide a specific filter to use instead of the default filter.

The code below shows some column definitions with filters set:

<snippet>
|const gridOptions = {
|    columnDefs: [
|        // sets the text filter
|        { field: 'athlete', filter: 'agTextColumnFilter' },
|
|        // sets the number filter
|        { field: 'age', filter: 'agNumberColumnFilter' },
|
|        // use the default filter
|        { field: 'gold', filter: true },
|
|        // use no filter (leaving unspecified means use no filter)
|        { field: 'sport' },
|    ]
|}
</snippet>

If you want to enable filters on all columns, you should set a filter on the [Default Column Definition](/column-definitions/#default-column-definitions). The following code snippet shows setting `filter=true` for all columns via the `defaultColDef` and then setting `filter=false` for the Sport column, so all columns have a filter except Sport.

<snippet spaceBetweenProperties="true">
|const gridOptions = {
|    // anything specified in defaultColDef gets applied to all columns
|    defaultColDef: {
|        // set filtering on for all columns
|        filter: true,
|    },
|    columnDefs: [
|        // filter not specified, defaultColDef setting is used
|        { field: 'athlete' },
|        { field: 'age' },
|
|        // filter specifically set to 'false', i.e. use no filter
|        { field: 'sport', filter: false },
|    ],
|}
</snippet>

## Filter Parameters

Each filter can take additional filter parameters by setting `colDef.filterParams`. The parameters each filter type accepts are specific to each filter; parameters for the provided filters are explained in their relevant sections.

The code below shows configuring the text filter on the Athlete column and providing extra filter parameters (what the `buttons` do is explained in [Apply, Clear, Reset and Cancel Buttons](/filter-provided/#apply-clear-reset-and-cancel-buttons)).

<snippet spaceBetweenProperties="true">
const gridOptions = {
    columnDefs: [
        // column configured to use text filter
        {
            field: 'athlete',
            filter: 'agTextColumnFilter',
            // pass in additional parameters to the text filter
            filterParams: {
                buttons: ['reset', 'apply'],
                debounceMs: 200
            }
        }
    ]
}
</snippet>

## Filter Events

Filtering causes the following events to be emitted:

- **Filter Changed:** Filter has changed and been applied by the grid.
- **Filter Modified:** Filter UI has changed but not necessarily applied. This is useful when using an apply button if you want to know if the filter changed but was not applied.

## Filtering Animation

To enable animation of the rows when filtering, set the grid property `animateRows=true`.

## Relation to Quick Filter and External Filter

Column filters work independently of [Quick Filter](/filter-quick/) and [External Filter](/filter-external/). If a quick filter and / or external filter are applied along with a column filter, each filter type is considered and the row will only show if it passes all three types.

Column filters are tied to a specific column. Quick filter and external filter are not tied to any particular column. This section of the documentation talks about column filters only. For quick filter and external filter, click the links above to learn more.

## Provided Filters

There are four filters that are provided by the grid. These are as follows:

<api-documentation source='filtering/resources/filtering.json' section="providedFilters"></api-documentation>

See the [Provided Filters](/filter-provided/) section for more details on using them.
