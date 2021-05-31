---
title: "SSRM Refresh"
enterprise: true
---

It is possible to get the grid to refresh its rows. In other words reload previously loaded rows.
This is useful when the data has changed at the source (typically on the server) and the UI needs refresh.

## Refresh API

The grid has the following API's to assist with refreshing:

| Method | Description |
| ------ | ----------- |
| refreshServerSideStore(params) | Refresh part of the grid's data. If you pass no parameters, then the top level cache is purged. To purge a child cache, pass in the string of keys to get to the child cache. For example, to purge the cache two levels down under 'Canada' and then '2002', pass in the string array `['Canada','2002']`. If you purge a cache, then all row nodes for that cache will be reset to the closed state, and all child caches will be destroyed. |
| getCacheBlockState() | Returns an object representing the state of the cache. This is useful for debugging and understanding how the cache is working. |

The `params` for `refreshServerSideStore` is as follows:

```ts
interface RefreshStoreParams {
    // List of group keys, pointing to the store to refresh.
    // For example, to purge the cache two levels down under 'Canada'
    // and then '2002', pass in the string array ['Canada','2002'].
    // If no route is passed, or an empty array, then the top level store is refreshed.
    route?: string[];

    // If true, then all rows at the level getting refreshed are immediatly destroyed
    // and 'loading' rows will appear.
    //
    // If false, then all rows at the level getting refreshed are kept until rows
    // are loaded (no 'loading' rows appear).
    purge?: boolean;
}
```

The following example demonstrates the refresh API. The following can be noted:

- Button **Refresh Top Level** refreshes the top level store. Note the Version column has changed its value.

- Button **Refresh [Canada]** refreshes the Canada cache only. To see this in action, make sure you have Canada expanded. Note the Version column has changed it's value.

- Button **Refresh [Canada,2002]** refreshes the 2002 cache under Canada only. To see this in action, make sure you have Canada and then 2002 expanded. Note the Version column has changed it's value.

- Button **Print Block State** prints the state of the blocks in the cache to the console.

- Toggle **Purge** to change whether loading rows are shown or not during the refresh.

<grid-example title='Refresh Store' name='refresh-store' type='generated' options='{ "enterprise": true, "exampleHeight":  615, "extras": ["alasql"], "modules": ["serverside", "rowgrouping"] }'></grid-example>

## Purge vs Refresh

When a purge is executed (`params.purge=true`) then the data is replaced with loading rows
while the data is refreshed. There are a few more subtle differences between purging and
refreshing which are as follows:

- While purging, the loading icons prevent the user from interacting with the data while the rows are re-fetched.<br/><br/>

- When purging, all open groups will always get closed and children destroyed. This is explained in more detail
  in the section Maintaining Open Groups below.<br/><br/>

- When Partial Store is used (i.e. data is loaded in blocks), purging will destroy all blocks
  and remove them from the cache and only re-create blocks needed to show data the user is looking at. <br/><br/>
  For example if the user had scrolled down and 5 blocks are in the cache, after a purge it could
  be only 1 block exists in the cache after purging. This means only one block request is sent to the server.<br/><br/>
  Refreshing however will refresh all existing blocks. Thus if 5 blocks exist in the cache, all blocks
  will get refreshed resulting in 5 requests sent to the server.


## Maintaining Open Groups

It is possible to have open groups remain open during a refresh, thus maintaining the context
of open groups.

Maintaining open groups is achieved when all of the following are configured:

- Full Store (`serverSideStoreType=full`). When using Partial Store, groups and children will be lost.

- Refreshing (`params.purge=false`). When using a purge, groups and children will be lost.

- Row Id's are provided (`getRowNodeId()` implemented, see [Row IDs](/row-object/#application-assigned-ids)). If not providing row Id's, groups and children will be lost

When all the above is true, when a refresh is done, open groups will remain open and children will be kept.

The example below shows refreshing using the Full Store and keeping group state. The example is similar to the
previous example with the addition `getRowNodeId()` is implemented. Note the following:

- When 'Purge' is not checked, refreshing using any refresh button will maintain any open groups and children at that level.<br/><br/>
  For example expand 'United States' and hit 'Refresh Top Level' - note that the
  top level countries are refreshed (the version column changes once the load is
  complete) and the open 'United States' group is left open and the child rows
  (displaying year groups) are left intact.<br/><br/>

- When 'Purge' is checked, refreshing using any refresh button will close all open groups and destroy all children at that level.<br/><br/>
  For example expand 'United States' and hit 'Refresh Top Level' - note that the
  list of countries is reset, including closing 'United States' and losing
  all child rows to 'United States'. When 'United States' is expanded again, the
  child rows are loaded again from scratch.

Because the grid is getting provided ID's with via `getRowNodeId()` it allows the grid to update rows rather than
replace rows. This also means when grid property `enableCellChangeFlash = true` the cells will flash when their data
changes. If `getRowNodeId()` is not implemented, rows are replaced and cells are re-created from scratch, no flashing
is possible.


<grid-example title='Keep Group State' name='keep-group-state' type='generated' options='{ "enterprise": true, "exampleHeight": 615, "extras": ["alasql"], "modules": ["serverside", "rowgrouping"] }'></grid-example>

[[note]]
| If using the Partial Store, the grid does not provide for keeping open groups. Refreshing a Partial Store will always
| reset groups and destroy children.
|
| This is because the Partial Store loads rows in blocks, so it's unreliable to expect rows that existed before to
| exist in the new load, as the row could appear in a different block.
|
|If you are using the Partial Store and need to restore groups to their previously open state, then this logic can
|be implemented in your application using the [Open by Default](/server-side-model-grouping/#open-by-default) API.


## Next Up

Continue to the next section to learn how to perform [Pivoting](/server-side-model-pivoting/).

