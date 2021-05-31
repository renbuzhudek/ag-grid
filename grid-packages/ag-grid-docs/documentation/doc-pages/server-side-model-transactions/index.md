---
title: "SSRM Transactions"
enterprise: true
---

SSRM Transaction Updates allow large numbers of rows in the grid to be added, removed or updated in an efficient manner. Transactions work with the [Full Store](/server-side-model-row-stores/) only.

Transactions for the Server Side Row Model (SSRM) work similarly to [Client Side Row Model Transactions](/data-update-transactions/). The APIs are almost identical, but there are some important differences (such as the SSRM requiring a 'route') and as such the APIs are not shared.

Applying a SSRM transaction is done using the grid API `applyServerSideTransaction()`. Here are some introductory code snippets demonstrating how to use the API:

<snippet>
// Add 1 row at the top level group
gridOptions.api.applyServerSideTransaction({
    add: [
        { id: 24, name: 'Niall Crosby', status: 'Alive and kicking' }
    ]
});
// Remove 1 row under the group 'Ireland', '2002'
gridOptions.api.applyServerSideTransaction({
    route: ['Ireland','2002'],
    remove: [
        { id: 24, name: 'Niall Crosby', status: 'Alive and kicking' }
    ]
});
// Add, remove and update a bunch of rows under 'United Kingdom'
gridOptions.api.applyServerSideTransaction({
    route: ['United Kingdom'],
    add: [
        { id: 24, name: 'Niall Crosby', status: 'Alive and kicking' },
        { id: 25, name: 'Jillian Crosby', status: 'Alive and kicking' }
    ],
    update: [
        { id: 26, name: 'Kevin Flannagan', status: 'Alive and kicking' },
        { id: 27, name: 'Tony Smith', status: 'Alive and kicking' }
    ],
    remove: [
        { id: 28, name: 'Andrew Connel', status: 'Alive and kicking' },
        { id: 29, name: 'Bricker McGee', status: 'Alive and kicking' }
    ]
});
</snippet>

Here is a basic example with no grouping and a small dataset.

<grid-example title='Transactions Flat' name='transactions-flat' type='generated' options='{ "enterprise": true, "modules": ["serverside"] }'></grid-example>

## Transaction API

The full signature of the grid API `applyServerSideTransaction()` is as follows:

```ts
// call this API to apply a transaction to the data inside the grid
function applyServerSideTransaction(transaction: ServerSideTransaction): ServerSideTransactionResult;

// transaction record takes this shape
export interface ServerSideTransaction {

    // the Row Store to apply the transaction to, ie what group level.
    // eg ['Ireland','2002'] to update the child store found after expanding
    // Ireland and 2002 groups. passing in blank to empty applys the transation
    // to the top level.
    route?: string[];

    // rows to add.
    add?: any[];
    // index to add. if missing, rows will be added to the end
    addIndex?: number;

    // rows to remove.
    remove?: any[];

    // rows to update
    update?: any[];
}

// result object
export interface ServerSideTransactionResult {

    // the status of applying the transaction
    status: ServerSideTransactionResultStatus;

    // if rows were added, the newly created Row Nodes for those rows
    add?: RowNode[];

    // if rows were removed, the deleted Row Nodes
    remove?: RowNode[];

    // if rows were updated, the udpated Row Nodes
    update?: RowNode[];
}

export enum ServerSideTransactionResultStatus {

    // transaction was successully applied
    Applied = 'Applied',

    // store was not found, transaction not applied.
    // either invalid route, or the parent row has not yet been expanded.
    StoreNotFound = 'StoreNotFound',

    // store is loading, transaction not applied.
    StoreLoading = 'StoreLoading',

    // store is loading (as max loads exceeded), transaction not applied.
    StoreWaitingToLoad = 'StoreWaitingToLoad',

    // store load attempt failed, transaction not applied.
    StoreLoadingFailed = 'StoreLoadingFailed',

    // store is type Partial, which doesn't accept transactions
    StoreWrongType = 'StoreWrongType',

    // transaction was cancelled, due to grid
    // callback isApplyServerSideTransaction() returning false
    Cancelled = 'Cancelled'
}
```

## Matching Rows

In order for the grid to find rows to update and remove, it needs a way to identify these rows.

If the grid callback `getRowNodeId` is provided, the grid will match on row ID.

If the grid callback `getRowNodeId` is not provided, the grid will match on object reference.

## Targeting Stores

When updating grouped data, a transaction needs to be targeted against the group. This is done by using the transaction's `route` attribute.

If you require to update more than one store (ie update more than one group level), then a transaction needs to be applied for each individual store (group level) to update.

The example below demonstrates applying transactions to a store with groups. Note the following:

- The buttons **New Palm Oil** and **New Rubber** will add one row to each group accordingly and print the result to the console. The group must be open for the add to happen.
- The button **New Wool & Amber** will add one item to each group. Note that two transactions are require to achieve this, one for each group, and print the results to the console. The groups must be open for the add to happen.
- The button **New Product** will attempt to add an item to the top level, however it will fail as the top level has been configured to use an Partial store.
- The button **Store State** will print to the console the state of the existing stores.

<grid-example title='Transactions Hierarchy' name='transactions-hierarchy' type='generated' options='{ "enterprise": true, "modules": ["serverside","rowgrouping"] }'></grid-example>

## Partial Store

Transaction Updates work with the SSRM and Full Store only. For SSRM and Partial Store, Transactions are not allowed. Instead either move your application to use Full Store or use [Store Refresh](/server-side-model-refresh/) to have the grid data update.

## Next Up

Continue to the next section to learn how to perform [High Frequency Updates](/server-side-model-high-frequency/).
