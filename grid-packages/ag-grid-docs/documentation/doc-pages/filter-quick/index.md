---
title: "Quick Filter"
---

In addition to the column specific filtering, a 'quick filter' (influenced by how filtering is done in Google's Gmail) can also be applied. Set the quick filter by using the Grid's API:

<snippet>
gridOptions.api.setQuickFilter('new filter text');
</snippet>

If you are using a framework such as Angular or React, you can bind the quick filter text to the `quickFilter` attribute.

The quick filter text will check all words provided against the full row. For example if the text provided is "Tony Ireland", the quick filter will only include rows with both "Tony" AND "Ireland" in them.

## Overriding the Quick Filter Value

If your data contains complex objects, the quick filter will end up comparing against `[object Object]` instead of searchable string values. Alternatively, you might want to format string values specifically for searching (e.g. replace accented characters in strings, or remove commas from numbers). If you want to do this, provide `getQuickFilterText` to the column definition, e.g.:

<snippet>
const gridOptions = {
    columnDefs: [
        {
            field: 'country',
            getQuickFilterText: params => {
                return params.value.name;
            }
        }
    ]
}
</snippet>

The `params` object contains `{ value, node, data, column, colDef, context }`.

[[note]]
| The quick filter will work 'out of the box' in most cases, so you should only override the quick filter value if you have a particular problem to resolve.

## Quick Filter Cache

By default, the quick filter checks each column's value, including running value getters if present, every time the quick filter is executed. If your data set is large, you may wish to enable the quick filter cache by setting `cacheQuickFilter = true`.

When the cache is enabled, a 'quick filter text' is generated for each node by concatenating all the values for each column. For example, a table with columns of "Employee Name" and "Job" could have a row with quick filter text of `'NIALL CROSBY\nCOFFEE MAKER'`. The grid then performs a simple string search, so if you search for `'Niall'`, it will find our example text. Joining all the column's values into one string gives a huge performance boost. The values are joined after the quick filter is requested for the first time and stored in the `rowNode` - the original data that you provide is not changed.

## Reset Cache Text

When in use, the quick filter cache text can be reset in any of the following ways:

- Each rowNode has a `resetQuickFilterAggregateText` method on it, which can be called to reset the cache text
- `rowNode.setDataValue(colKey, newValue)` will also reset the cache text
- Lastly, if using the grid editing features, when you update a cell, the cache text will be reset

## Example: Quick Filter

The example below shows the quick filter working on different data types. Each column demonstrates something different as follows:

- A - Simple column, nothing complex.
- B - Complex object with 'dot' in field, quick filter works fine.
- C - Complex object and value getter used, again quick filter works fine.
- D - Complex object, quick filter would call `toString` on the complex object, so `getQuickFilterText` is provided.
- E - Complex object, no `getQuickFilterText` is provided, so the quick filter text ends up with `[object Object]` for this column.

The example also demonstrates having the quick filter cache turned on or off. The grid works very fast even when the cache is turned off, so you probably don't need it. However, for those with very large data sets (e.g. over 10,000 rows), turning the cache on will improve quick filter speed. The cache is demonstrated as follows:

- **Normal Quick Filter:** The cache is not used. Value getters are executed on every node each time the filter is executed. Hitting 'Print Quick Filter Texts' will always return `undefined` for every row because the cache is not used.
- **Cache Quick Filter:** The cache is used. Value getters are executed the first time the quick filter is run. Hitting 'Print Quick Filter Texts' will return back the quick filter text for each row which will initially be `undefined` and then return the quick filter text after the quick filter is executed for the first time. You will notice the quick filter text is correct for each column except E (which would be fixed by adding an appropriate `getQuickFilterText` method as we do for D).

<grid-example title='Quick Filter' name='quick-filter' type='vanilla' options='{ "exampleHeight": 580 }'></grid-example>

## Server Side Data

Quick Filters only make sense with client side data (i.e. when using the [client-side row model](/client-side-model/)). For the other row models you would need to implement your own server-side filtering to replicate Quick Filter functionality.

