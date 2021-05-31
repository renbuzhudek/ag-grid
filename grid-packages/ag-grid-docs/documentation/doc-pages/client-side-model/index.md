---
title: "Client-Side Data"
---

By default the grid expects you to provide all the data up front. In other words, your application loads the full set of data into the client and then passes it in its entirety to the grid. This is in contrast to [Server-Side Data](/row-models/) where the data is mostly kept on the server and loaded into the grid in parts.

## Row Models

The grid has different Row Models depending on whether you want to use client-side or server-side data. There is only one client-side row model, aptly named the "Client-Side Row Model". You don't need to configure the grid to use the Client-Side Row Model as it's used by default. Check [Server-Side Data](/row-models/) to see what other row models are available and how to use them.

## Client-Side Row-Model

Once the grid has all of the data, it can perform many operations on it for you, such as filtering, sorting and grouping.

## Deep Dive (advanced section)

You do not need to know how the Client-Side Row Model works, however it can be helpful for those who are interested.

The Client-Side Row Model is responsible for working out how to display the rows inside the grid. It has a complex data structure, representing the data in different states. The states are as follows:

### State 1: Row Data

The data as provided by the application. The grid never modifies this array. It just takes the `rowData` items from it. This example is of three data items.

<image-caption src="client-side-model/resources/allData.jpg" alt="Row Data" width="22rem" centered="true">
    Example: Row Data
</image-caption>

**API:** There is no API to get this data. However it was provided by the application so you should already have it.

### State 2: All Rows

`allRows` is similar to `rowData` except a new array is created which contains row nodes, with each row node pointing to exactly one data item. The length of the `allRows` array is the same as the `rowData` array.

<image-caption src="client-side-model/resources/allRows.jpg" alt="All Rows" width="22rem" centered="true">
    Example: All Rows
</image-caption>

**API:** There is no API to get this data. However there is no benefit over the `rowsAfterGroup` data.

### State 3: Rows After Group

`rowsAfterGroup` takes `allRows`, and if grouping, groups the data. If no grouping is done, then `rowsAfterGroup` will be identical to `allRows`. This example shows grouping on the colour field, creating two groups.

<image-caption src="client-side-model/resources/rowsAfterGroup.jpg" alt="Rows After Group" width="22rem" centered="true">
    Example: Rows After Group
</image-caption>

**API:** Use `api.forEachNode()` to access this structure.

### State 4: Rows After Filter

`rowsAfterFilter` goes through `rowsAfterGroup` and filters the data. This example shows filtering on the colour black (thus removing the second group).

<image-caption src="client-side-model/resources/rowsAfterFilter.jpg" alt="Rows After Filter" width="22rem" centered="true">
    Example: Rows After Filter
</image-caption>

**API:** Use `api.forEachNodeAfterFilter()` to access this structure.

### State 5: Rows After Sort

`rowsAfterSort` goes through `rowsAfterFilter` and sorts the data. This example shows sorting on car make.

<image-caption src="client-side-model/resources/rowsAfterSort.jpg" alt="Rows After Sort" width="22rem" centered="true">
    Example: Rows After Sort
</image-caption>

**API:** Use `api.forEachNodeAfterFilterAndSort()` to access this structure.

### State 6: Rows After Map

`rowsAfterMap` maps the data to what should be drawn inside the grid, taking into account what groups are open and closed. This list is what is iterated through when the grid draws the rows. Two examples are provided below, the first when open (so three rows in the grid, the group row plus two children), the second when closed (so one row in the grid, the closed group).

<image-caption src="client-side-model/resources/rowsAfterMapOpen.jpg" alt="Rows After Map - Open Group" width="22rem" centered="true">
    Example: Rows After Map - Open Group
</image-caption>

<image-caption src="client-side-model/resources/rowsAfterMapClosed.jpg" alt="Rows After Map - Closed Group" width="22rem" centered="true">
    Example: Rows After Map - Closed Group
</image-caption>

**API:** Use `api.getModel()` and then `model.getVirtualRowCount()` and `getVirtualRow()` to get the nodes.

## Refreshing the Client-Side Model

If you do want to refresh the Client-Side Row Model, call `api.refreshClientSideRowModel(startingStage)`, where `startingStage` can be one of the stages above, i.e.:

1. `group`
1. `filter`
1. `pivot`
1. `aggregate`
1. `sort`
1. `map`

Because each stage depends on the stage before, refreshing any particular stage means that stage executes and then all the stages after it will also execute again. For example if you call `api.refreshClientSideRowModel('filter')` it will execute the stages Filter, Pivot, Aggregate, Sort and Map.
