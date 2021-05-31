---
title: "Set Filter - Filter List"
enterprise: true
---

This section describes how Filter List values can be managed through custom sorting and formatting. Supplying filter values directly to the Set Filter is also discussed.

## Sorting Filter Lists

Values inside a Set Filter will be sorted by default, where the values are converted to a string value and sorted in ascending order according to their UTF-16 codes.

When a different sort order is required, a Comparator can be supplied to the set filter as shown below:

<snippet>
const gridOptions = {
    columnDefs: [
        {
            field: 'age',
            filter: 'agSetColumnFilter',
            filterParams: {
                comparator: (a, b) => {
                    const valA = parseInt(a);
                    const valB = parseInt(b);
                    if (valA === valB) return 0;
                    return valA > valB ? 1 : -1;
                }
            }
        }
    ]
}
</snippet>

The Comparator used by the Set Filter is only provided the values in the first two parameters, whereas the Comparator for the Column Definition (`colDef`) is also provided the row data as additional parameters. This is because when sorting rows, row data exists. For example, take 100 rows split across the colour values `[white, black]`. The column will be sorting 100 rows, however the filter will be only sorting two values.

If you are providing a Comparator that depends on the row data and you are using the Set Filter, be sure to provide the Set Filter with an alternative Comparator that doesn't depend on the row data.

The following example demonstrates sorting Set Filter values using a comparator. Note the following:

- The **Age (no Comparator)** filter values are sorted using the default string order: `1, 10, 100...`
- The **Age (with Comparator)** filter has a custom Comparator supplied in the `filterParams` that sorts the ages by numeric value: `1, 2, 3...`

<grid-example title='Sorting Filter Lists' name='sorting-set-filter-values' type='generated' options='{ "enterprise": true, "exampleHeight": 720, "modules": ["clientside", "setfilter", "menu", "filterpanel"] }'></grid-example>

## Formatting Values

This section covers different ways to format the displayed Filter List values in the Set Filter.

[[note]]
| Formatting Filter List values will not change the underlying value or Filter Model.

### Value Formatter

A [Value Formatter](/value-formatters/) is a good choice when the string value displayed in the Filter List needs to
be modified, for example adding country codes in parentheses after a country name, as shown below:

<snippet>
const countryValueFormatter = params => {
    const country = params.value;
    return country + ' (' + COUNTRY_CODES[country].toUpperCase() + ')';
}
</snippet>

The following snippet shows how to provide the `countryValueFormatter` to the Set Filter:

<snippet>
const gridOptions = {
    columnDefs: [
        // column definition using the same value formatter to format cell and filter values
        {
            field: 'country',
            valueFormatter: countryValueFormatter,
            filter: 'agSetColumnFilter',
            filterParams: {
                valueFormatter: countryValueFormatter,
            },
        }
    ]
}
</snippet>

In the code above, the same value formatter is supplied to the Column and Filter params, however separate Value Formatters can be used.

The following example shows how Set Filter values are formatted using a Value Formatter. Note the following:

- **No Value Formatter** does not have a Value Formatter supplied to the Set Filter. The column is supplied a Value Formatter through `colDef.valueFormatter = countryValueFormatter`.
- **With Value Formatter** has the same Value Formatter supplied to the Column and Set Filter. The Set Filter is supplied the value formatter through `filterParams.valueFormatter = countryValueFormatter`.
- Click **Print Filter Model** with a filter applied and note the logged Filter Model (dev console) has not been modified.

<grid-example title='Filter List Value Formatters' name='filter-list-value-formatter' type='generated' options='{ "enterprise": true, "exampleHeight": 745, "modules": ["clientside", "setfilter", "menu", "filterpanel"] }'></grid-example>

### Cell Renderer


A [Cell Renderer](/cell-rendering/) is a good choice when the value displayed requires markup. For instance if a
country flag image is to be shown alongside country names.

The same Cell Renderer can used to format the grid cells and filter values, or different renderers can be supplied to
each. Note that the Cell Renderer will be supplied additional info when used to format cells inside the grid (as grid
cells have row details that are not present for values inside a Filter List).

Given the following Cell Renderer:

<snippet>
const countryCellRenderer = params => {
    return '&lt;span style="font-weight: bold"&gt;' + params.value + '&lt;/span&gt;';
}
</snippet>

The following snippet shows how to provide the `countryCellRenderer` to the Set Filter:

<snippet>
const gridOptions = {
    columnDefs: [
        // column definition using the same cell renderer to format cell and filter values
        {
            field: 'country',
            cellRenderer: countryCellRenderer,
            filter: 'agSetColumnFilter',
            filterParams: {
                cellRenderer: countryCellRenderer
            }
        }
    ]
}
</snippet>

[[note]]
| A custom [Cell Renderer Component](/component-cell-renderer/#cell-renderer-component) can also be supplied to `filterParams.cellRenderer`.


The following example shows how Set Filter values are rendered using a Cell Renderer. Note the following:

- **No Cell Renderer** does not have a Cell Renderer supplied to the Set Filter. The Column has a Cell Renderer supplied to the Column using `colDef.cellRenderer = countryCellRenderer`.
- **With Cell Renderer** uses the same Cell Renderer to format the cells and filter values. The Set Filter is supplied the Value Formatter using `filterParams.cellRenderer = countryCellRenderer`.
- Click **Print Filter Model** with a filter applied and note the logged filter model (dev console) has not been modified.

<grid-example title='Filter List Cell Renderers' name='filter-list-cell-renderer' type='generated' options='{ "enterprise": true, "exampleHeight": 745, "modules": ["clientside", "setfilter", "menu", "filterpanel"] }'></grid-example>

## Supplying Filter Values

The Set Filter will obtain the filter values from the row data by default. However it is also possible to provide values, either synchronously or asynchronously, for the Filter List.

### Synchronous Values

The simplest approach is to supply a list of values to `filterParams.values` as shown below:

<snippet>
const gridOptions = {
    columnDefs: [
        {
            field: 'days',
            filter: 'agSetColumnFilter',
            filterParams: {
                // provide all days, even if days are missing in data!
                values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            }
        }
    ],
}
</snippet>

Note that if there are missing values in the row data, the filter list will display all provided values. This could give users the impression that filtering is broken.

[[note]]
| When providing filter values which are already sorted it is often useful to disable the default filter list sorting using `filterParams.suppressSorting=true`.

The following example demonstrates providing filter values using `filterParams.values`. Note the following:

- The **Days (Values Not Provided)** set filter obtains values from the row data to populate the filter list and as `'Saturday'` and `'Sunday'` are not present in the data they do not appear in the filter list.
- As the **Days (Values Not Provided)** filter values come from the row data they are sorted using a [Custom Sort Comparator](/filter-set-filter-list/#sorting-filter-lists) to ensure the days are ordered according to the week day.
- The **Days (Values Provided)** set filter is given values using `filterParams.values`. As all days are supplied the filter list also contains `'Saturday'` and `'Sunday'`.
- As the **Days (Values Provided)** filter values are provided in the correct order, the default filter list sorting is turned off using: `filterParams.suppressSorting=true`.

<grid-example title='Providing Filter Values' name='providing-filter-values' type='generated' options='{ "enterprise": true, "exampleHeight": 720, "modules": ["clientside", "setfilter", "menu", "filterpanel"] }'></grid-example>

### Asynchronous Values

It is also possible to supply values asynchronously to the set filter. This is done by providing a callback function instead of a list of values as shown below:

<snippet>
const gridOptions = {
    columnDefs: [
        {
            filter: 'agSetColumnFilter',
            filterParams: {
                values: params => {
                    // async update simulated using setTimeout()
                    setTimeout(() => {
                        // fetch values from server
                        const values = getValuesFromServer();
                        // supply values to the set filter
                        params.success(values);
                    }, 3000);
                }
            }
        }
    ],
}
</snippet>

Note in the snippet above the values callback receives a parameter object which contains `params.success()`which allows values obtained asynchronously to be supplied to the set filter.

The interface for this parameter object is as follows:

```ts
interface SetFilterValuesFuncParams {
    // The function to call with the values to load into the filter once they are ready
    success: (values: string[]) => void;

    // The column definition object from which the set filter is invoked
    colDef: ColDef;
}
```

[[note]]
| If you are providing values to the Set Filter asynchronously, when setting the model using `setModel` you need to wait for changes to be applied before performing any further actions by waiting on the returned grid promise, e.g.:
|
| ```js
| filter.setModel({ values: ['a', 'b'] })
|   .then(() => gridApi.onFilterChanged(); );
| ```

The following example demonstrates loading set filter values asynchronously. Note the following:

- `filterParams.values` is assigned a callback function that loads the filter values after a 3 second delay using the callback supplied in the params: `params.success(['value1', 'value2'])`.
- Opening the set filter shows a loading message before the values are set. See the [Localisation](/localisation/) section for details on how to change this message.
- The callback is only invoked the first time the filter is opened. The next time the filter is opened the values are not loaded again.

<grid-example title='Callback/Async' name='callback-async' type='generated' options='{ "enterprise": true, "exampleHeight": 510, "modules": ["clientside", "setfilter", "menu", "columnpanel"] }'></grid-example>

### Refreshing Values

By default, when values are passed to the set filter they are only loaded once when the set filter is initially created. It may be desirable to refresh the values at a later point, for example to reflect other filtering that has occurred in the grid. To achieve this, you can call `refreshFilterValues` on the relevant filter that you would like to refresh. This will cause the values used in the filter to be refreshed from the original source, whether that is by looking at the provided `values` array again, or by re-executing the `values` callback. For example, you might use something like the following:

<snippet>
const gridOptions = {
    onFilterChanged: params => {
        const setFilter = params.api.getFilterInstance('columnName');
        setFilter.refreshFilterValues();
    }
}
</snippet>

If you are using the grid as a source of values (i.e. you are not providing values yourself), calling this method will also refresh the filter values using values taken from the grid, but this should not be necessary as the values are automatically refreshed for you whenever any data changes in the grid.

If instead you want to refresh the values every time the Set Filter is opened, you can configure that using `refreshValuesOnOpen`:

<snippet>
const gridOptions = {
    columnDefs: [
        {
            filter: 'agSetColumnFilter',
            filterParams: {
                values: params => params.success(getValuesFromServer()),
                refreshValuesOnOpen: true,
            }
        }
    ],
}
</snippet>

When you refresh the values, any values that were selected in the filter that still exist in the new values will stay selected, but any other selected values will be discarded.

The following example demonstrates refreshing values. Note the following:

- The Values Array column has values provided as an array. Clicking the buttons to change the values will update the values in the array provided to the filter and call `refreshFilterValues()` to immediately refresh the filter for the column.
- The Values Callback column has values provided as a callback and is configured with `'refreshValuesOnOpen = true'`. Clicking the buttons to change the values will update the values that will be returned the next time the callback is called. Note that the values are not updated until the next time the filter is opened.
- If you select `'Elephant'` and change the values, it will stay selected as it is present in both lists.
- If you select any of the other options, that selection will be lost when you change to different values.
- A filter is re-applied after values have been refreshed.

<grid-example title='Refreshing Values' name='refreshing-values' type='generated' options='{ "enterprise": true, "exampleHeight": 755, "modules": ["clientside", "setfilter", "menu", "columnpanel", "filterpanel"] }'></grid-example>

## Missing Values

If there are missing / empty values in the row data of the grid, or missing values in the list of [Supplied Values](#supplying-filter-values), the Filter List will contain an entry called `(Blanks)` which can be used to select / deselect all of these values. If this not the desired behaviour, provide a [Formatter](#value-formatter) to present blank values in a different way.

## Complex Objects

If you are providing complex objects as values, then you need to provide a Key Creator function (`colDef.keyCreator`) to convert the objects to strings when using the Set Filter. Note the string is used to compare objects when filtering and to render a label in the filter UI.

<snippet spaceBetweenProperties="true">
const gridOptions = {
    columnDefs: [
        {
            field: 'country',
            keyCreator: params => params.value.name,
            valueFormatter: params => params.value.name,
            filter: 'agSetColumnFilter',
        }
    ],
}
</snippet>

The snippet above shows a Key Creator function that returns the country name from the complex object. If the Key Creator was not provided on the Column Definition, the Set Filter would not work.

If the value returned by Key Creator is not human-readable then you should consider also providing a Formatter for the Filter List label.


The following example shows the Key Creator handling complex objects for the Set Filter. Note the following:


- **Country (Complex Object)** column is supplied a complex object through `colDef.field`.
- A Key Creator is supplied to the column using `colDef.keyCreator = countryKeyCreator` which extracts the `name` property for the Set Filter.
- A value formatter is supplied to the column using `colDef.valueFormatter = countryValueFormatter` which extracts the `name` property for the cell values.
- Click **Print Filter Model** with a filter active and note the logged Filter Model (dev console) uses the `name` property from the complex object.

<grid-example title='Complex Objects' name='complex-objects' type='generated' options='{ "enterprise": true, "exampleHeight": 505, "modules": ["clientside", "setfilter", "menu", "filterpanel"] }'></grid-example>

## Multiple Values Per Cell

Sometimes you might wish to support multiple values in a single cell, for example when using tags. In this case, the Set Filter can extract each of the individual values from the cells, creating an entry in the Filter List for each individual value. Selecting a value will then show rows where any of the values in the cell match the selected value.

The example below demonstrates this in action. Note the following:

- The **Animals (array)** column uses an array in the data containing multiple values.
- The **Animals (string)** column uses a single string in the data to represent multiple values, with a [Value Getter](/value-getters/) used to extract an array of values from the data.
- The **Animals (objects)** column retrieves values from an array of objects, using a [Key Creator](#complex-objects).
- For all scenarios, the Set Filter displays a list of all the individual, unique values present from the data.
- Selecting values in the Set Filter will show rows where the data for that row contains **any** of the selected values.

<grid-example title='Multiple Values' name='multiple-values' type='generated' options='{ "enterprise": true, "modules": ["clientside", "setfilter", "menu"] }'></grid-example>

## Default State

By default, when the Set Filter is created all values are selected. If you would prefer to invert this behaviour and have everything de-selected by default, you can use the following:

<snippet>
const gridOptions = {
    columnDefs: [
        {
            field: 'country',
            filter: 'agSetColumnFilter',
            filterParams: {
                defaultToNothingSelected: true,
            }
        }
    ],
}
</snippet>

In this case, no filtering will occur until at least one value is selected.

The following example demonstrates different default states. Note the following:

- The Athlete column has everything selected when the Set Filter is first opened, which is the default
- The Country column has nothing selected by default, as `defaultToNothingSelected = true`.
- When the Set Filter for the Country column is opened, the grid is not filtered until at least one value has been selected.

<grid-example title='Default State' name='default-state' type='generated' options='{ "enterprise": true, "modules": ["clientside", "setfilter", "menu"] }'></grid-example>

## Filter Value Tooltips

Set filter values that are too long to be displayed are truncated by default with ellipses. To allow users to see the full filter value, tooltips can be enabled as shown below:

<snippet>
const gridOptions = {
    columnDefs: [
        {
            field: 'country',
            filter: 'agSetColumnFilter',
            filterParams: {
                showTooltips: true,
            }
        }
    ],
}
</snippet>

The default tooltip component will be used unless a [Custom Tooltip Component](/component-tooltip/) is provided.

The following example demonstrates tooltips in the Set Filter. Note the following:

- Filter values are automatically truncated with ellipses when the values are too long.
- **Col A** does not have Set Filter Tooltips enabled.
- **Col B** has Set Filter Tooltips enabled via `filterParams.showTooltips=true`.
- **Col C** has Set Filter Tooltips enabled and is supplied a Custom Tooltip Component.

<grid-example title='Filter Value Tooltips' name='filter-value-tooltips' type='generated' options='{ "enterprise": true, "exampleHeight": 500, "modules": ["clientside", "setfilter", "menu", "columnpanel"] }'></grid-example>

## Next Up

Continue to the next section: [Data Updates](/filter-set-data-updates/).

