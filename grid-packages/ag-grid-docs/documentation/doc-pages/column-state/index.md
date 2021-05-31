---
title: "Column State"
---

[Column Definitions](/column-definitions/) contain both stateful and non-stateful attributes. Stateful attributes can
have their values changed by the grid (e.g. Column sort can be changed by the user clicking on the column header).
Non-stateful attributes do not change from what is set in the Column Definition (e.g. once the Header Name is set as
part of a Column Definition, it typically does not change).

[[note]]
| The DOM also has stateful vs non-stateful attributes. For example consider a DOM element and setting 
| `element.style.width="100px"` will indefinitely set width to 100 pixels, the browser will not change this value. 
| However setting `element.scrollTop=200` will set the scroll position, but the browser can change the scroll
| position further following user interaction, thus scroll position is stateful as the browser can change
| the state.


The full list of stateful attributes of Columns are as follows:

- Width
- Flex
- Pinned
- Sort
- Hide
- AggFunc
- Row Group
- Pivot
- Column Order

This section details how such state items can be manipulated without having to update Column Definitions.

## Save and Apply State {#save-and-apply}

There are two API methods provided for getting and setting Column State. `columnApi.getColumnState()` gets the current
column state and `columnApi.applyColumnState()` sets the column state.

<snippet>
// save the columns state
const savedState = gridOptions.columnApi.getColumnState();
// restore the column state
gridOptions.columnApi.applyColumnState({ state: savedState });
</snippet>

The example below demonstrates saving and restoring column state. Try the following:

1. Click 'Save State' to save the Column State.
1. Change some column state e.g. resize columns, move columns around, apply column sorting or row grouping etc.
1. Click 'Restore State' and the columns state is set back to where it was when you clicked 'Save State'.
1. Click 'Reset State' and the state will go back to what was defined in the Column Definitions.

<grid-example title='Save and Apply State' name='save-apply-state' type='generated' options='{ "enterprise": true }'></grid-example>

## Column State Interface

The structure of a Column State is as follows:

```ts
// Getting Column State
function getColumnState(): ColumnState[]

interface ColumnState {
    colId?: string; // ID of the column
    width?: number; // width of column in pixels
    flex?: number; // column's flex if flex is set
    hide?: boolean; // true if column is hidden
    sort?: string; // sort applied to the columns
    sortIndex?: number; // the order of the sort, if sorting by many columns
    aggFunc?: string | IAggFunc; // the aggregation function applied
    pivot?: boolean; // true if pivot active
    pivotIndex?: number; // the order of the pivot, if pivoting by many columns
    pinned?: string | 'left' | 'right'; // set if column is pinned
    rowGroup?: boolean; // true if row group active
    rowGroupIndex?: number | null; // the order of the row group, if row grouping by many columns
}

// Applying Column State
function applyColumnState(params: ApplyColumnStateParams): boolean

interface ApplyColumnStateParams {
    state?: ColumnState[]; // the state from getColumnState
    applyOrder?: boolean; // whether column order should be applied
    defaultState?: ColumnState; // state to apply to columns where state is missing for those columns
}
```

## Partial State

It is possible to focus on particular columns and / or particular attributes when getting and / or applying Column
State. This allows fine grained control over the Column State, e.g. setting what Columns are Pinned, without impacting
any other state attribute.

### Applying Partial State

When applying column state, in cases where some state attributes or columns are missing from the Column State,
the following rules apply:

- If a Column State is missing attributes, or attributes are provided as `undefined`, then those missing / undefined
attributes are not updated. For example if a Column has a Column State with just `pinned`, then Pinned is applied to
that Column but other attributes, such as Sort, are left intact.
- When state is applied and there are additional Columns in the grid that do not appear in the provided state, then the
`params.defaultState` is applied to those additional Columns.
- If `params.defaultState` is not provided, then any additional Columns in the grid will not be updated.

Combining these rules together leaves for flexible fine grained state control. Take the following code snippets as
examples:

<snippet>
// Sort Athlete column ascending
gridOptions.columnApi.applyColumnState({
    state: [
        {
            colId: 'athlete',
            sort: 'asc'
        }
    ]
});
// Sort Athlete column ascending and clear sort on all other columns
gridOptions.columnApi.applyColumnState({
    state: [
        {
            colId: 'athlete',
            sort: 'asc'
        }
    ],
    defaultState: {
        // important to say 'null' as undefined means 'do nothing'
        sort: null
    }
});
// Clear sorting on all columns, leave all other attributes untouched
gridOptions.columnApi.applyColumnState({
    defaultState: {
        // important to say 'null' as undefined means 'do nothing'
        sort: null
    }
});
// Clear sorting, row group, pivot and pinned on all columns, leave all other attributes untouched
gridOptions.columnApi.applyColumnState({
    defaultState: {
        // important to say 'null' as undefined means 'do nothing'
        sort: null,
        rowGroup: null,
        pivot: null,
        pinned: null
    }
});
// Order columns, but do nothing else
gridOptions.columnApi.applyColumnState({
    state: [
        { colId: 'athlete' },
        { colId: 'country' },
        { colId: 'age' },
        { colId: 'sport' }
    ],
    applyOrder: true
});
</snippet>

The example below shows some fine grained access to Column State.

<grid-example title='Fine Grained State' name='fine-grained-state' type='mixed' options='{ "enterprise": true }'></grid-example>

### Saving Partial State

Using the techniques above, it is possible to save and restore a subset of the parameters in the state.
The example below demonstrates this by selectively saving and restoring a) sort state and
b) column visibility and order state.

Note than when saving and restoring Sort state, other state attributes (width, row group, column order etc)
are not impacted.

Likewise when saving and restoring visibility and order, only visibility and order will be impacted when
re-applying the state.

<grid-example title='Selective State' name='selective-state' type='generated' options='{ "enterprise": true }'></grid-example>

## Considerations

There are a few items to note on specific state attributes. They are as follows:

### **null** vs **undefined**

For all state attributes, `undefined` means _"do not apply this attribute"_ and `null` means _"clear this attribute"_.

For example setting `sort=null` will clear sort on a column whereas setting
`sort=undefined` will leave whatever sort, if any, that is currently present.

The only exception is with regards to Column width. For width, both `undefined`
and `null` will skip the attribute. This is because Width is mandatory - there
is no such things as a Column with no width.

### Width and Flex

When Flex is active on a Column, the grid ignores the `width` attribute when setting the Width.

When `getColumnState()` is called, both `width` and `flex` are returned.
When `applyColumnState()` is called, if `flex` is present then `width` is
ignored.

If you want to restore a Column's width to the exact same pixel width as specified in the Column State,
set `flex=null` for that Column's state to turn Flex off.

### Row Group and Pivot

There are two attributes representing both Row Group and Pivot. First using the boolean attributes
`rowGroup` and `pivot` and then secondly using the index attributes `rowGroupIndex`
and `pivotIndex`.

When `getColumnState()` is called, all of `rowGroup`, `pivot`,
`rowGroupIndex` and `pivotIndex` are returned. When
`applyColumnState()` is called, preference is given to the index variants. For example
if both `rowGroup` and `rowGroupIndex` are present, `rowGroupIndex`
is applied.

## Column Events

Column Events will get raised when applying Column State as these events would
normally get raised. For example `columnPinned` event will get raised if applying
the state results in a column getting pinned or unpinned.

The example below demonstrates events getting raised based on Column State changes.
The example logs event information to the console, so best open the example in
a new tab and observe the dev console.

<grid-example title='Column Events' name='column-events' type='generated' options='{ "enterprise": true }'></grid-example>

## Column Group State

Column Group State is concerned with the state of Column Groups. There is only one state attribute for Column Groups,
which is whether the group is open or closed.

To get the state of Column Groups use the API method `columnApi.getColumnGroupState()`. To
set the Column Group state use the API method `columnApi.setColumnGroupState(state)`.

The example below demonstrates getting and setting Column Group State. Note the following:

- Clicking 'Save State' will save the opened / closed state of column groups.
- Clicking 'Restore State' will restore the previously saved state.
- Clicking 'Reset State' will reset the column state to match the Column Definitions,
i.e. all Column Groups will be closed.

<grid-example title='Column Group State' name='column-group-state' type='generated' options='{ "enterprise": true }'></grid-example>
