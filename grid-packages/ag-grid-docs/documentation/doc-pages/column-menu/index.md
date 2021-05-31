---
title: "Column Menu"
enterprise: true
---

The column menu appears when you click on the menu icon in the column header. For AG Grid Community, only the filter is shown. For AG Grid Enterprise, a tabbed component containing a 1) Menu, 2) Filter and 3) Column Management panel is shown.

## Showing the Column Menu

The menu will be displayed by default and will be made up of three panels. If you want to change the order or what panels are shown, or hide them, you can specify the property `menuTabs` in the `colDef`.

The property `menuTabs` is an array of strings. The valid values are: `'filterMenuTab'`, `'generalMenuTab'` and `'columnsMenuTab'`.

- `generalMenuTab`: Include in the `menuTabs` array to show the main panel.
- `filterMenuTab`: Include in the `menuTabs` array to show the filter panel.
- `columnsMenuTab`: Include in the `menuTabs` array to show the column selection panel.

To not show the menu at all, set this property to an empty array`[]`. In addition, you can set the attribute `suppressMenu=true` to the column definition to not show the menu for a particular column.

The order of the menu tabs shown in the menu will match the order you specify in this array.

If you don't specify a `menuTabs` for a `colDef` the default is: `['generalMenuTab', 'filterMenuTab','columnsMenuTab']`

## Customising the General Menu Tab

The main menu panel, by default, will show a set of items. You can adjust which of these items get display, or you can start from scratch and provide your own items. To customise the menu, provide the `getMainMenuItems()` callback.

`getMainMenuItems()` takes the following object as parameters:

```ts
GetMainMenuItemsParams {
    column: Column, // the column that was clicked
    api: GridApi, // the grid API
    columnApi: ColumnAPI, // the column API
    context: any, // the grid context
    defaultItems: string[] // list of the items that would be displayed by default
}
```

The result of `getMainMenuItems()` should be a list with each item either a) a string or b) a MenuItem description. Use 'string' to pick from built in menu items (listed below) and use MenuItem descriptions for your own menu items.

A MenuItem description looks as follows (items with question marks are optional):

```ts
MenuItem {
    name: string, // name of menu item
    disabled?: boolean, // if item should be enabled / disabled
    shortcut?: string, // shortcut (just display text, saying the shortcut here does nothing)
    action?: () => void, // function that gets executed when item is chosen
    checked?: boolean, // set to true to provide a check beside the option
    icon?: HTMLElement | string, // the icon to display, either a DOM element or HTML string
    subMenu?: MenuItemDef[] // if this item is a sub menu, contains a list of menu item definitions
}
```

## Built In Menu Items

The following is a list of all the default built in menu items with the rules about when they are shown.

- `pinSubMenu`: Submenu for pinning. Always shown.
- `valueAggSubMenu`: Submenu for value aggregation. Always shown.
- `autoSizeThis`: Auto-size the current column. Always shown.
- `autoSizeAll`: Auto-size all columns. Always shown.
- `rowGroup`: Group by this column. Only shown if column is not grouped. Note this will appear once there is row grouping.
- `rowUnGroup`: Un-group by this column. Only shown if column is grouped. Note this will appear once there is row grouping.
- `resetColumns`: Reset column details. Always shown.
- `expandAll`: Expand all groups. Only shown if grouping by at least one column.
- `contractAll`: Contract all groups. Only shown if grouping by at least one column.

Reading the list above it can be understood that the list `defaultItems` changes on different calls to the `getMainMenuItems()` callback, depending on, for example, what columns are current used for grouping.

If you do not provide a `getMainMenuItems()` callback, then the rules alone decides what gets shown. If you do provide a `getMainMenuItems()`, then the `defaultItems` will be filled using the rules above and you return from the callback whatever you want, using the `defaultItems` only if you want to.

## Menu Item Separators

You can add menu item separators as follows:

```js
menuItems.push('separator')
```

## Repositioning the Popup

If not happy with the position of the popup, you can override it's position using `postProcessPopup(params)` callback. This gives you the popup HTML element so you can change it's position should you wish to.

The params for the callback are as follows:

```ts
interface PostProcessPopupParams {
    // the popup we are showing
    ePopup: HTMLElement;

    // The different types are: 'contextMenu', 'columnMenu', 'aggFuncSelect', 'popupCellEditor'
    type: string;

    // if popup is for a column, this gives the Column
    column?: Column,
    // if popup is for a row, this gives the RowNode
    rowNode?: RowNode,

    // if the popup is as a result of a button click (eg menu button),
    // this is the component that the user clicked
    eventSource?: HTMLElement;

    // if the popup is as a result of a click or touch, this is the event
    // eg user showing context menu
    mouseEvent?: MouseEvent | Touch;
}
```

## Overriding Column Menu Width

You can override the menu width by overriding the corresponding CSS:

```css
.ag-set-filter-list {
    width: 500px !important;
}
```

## Hiding the Column Menu

Hide the column menu with the grid API `hidePopupMenu()`, which will hide either the [context menu](/context-menu/) or the column menu, whichever is showing.

## Example Column Menu

The example below shows the `getMainMenuItems()` in action. To demonstrate different scenarios, the callback returns something different based on the selected column as follows:

- Athlete column appends custom items to the list of built in items.
- Athlete column contains a sub menu.
- Age column provides custom items and adds one built in default item.
- Country column trims down the default items by removing values.
- Date column changes the order of the tabs to `['filterMenuTab', 'generalMenuTab', 'columnsMenuTab']`
- Sport column changes the order of the tabs to `['filterMenuTab', 'columnsMenuTab']`. Note that the `'generalMenuTab'` is suppressed.
- Gold column changes the order of the tabs to `['generalMenuTab', 'gibberishMenuTab']`. Note that the `'filterMenuTab'` and `'columnsMenuTab'` are suppressed. Also there is a warning on the console letting the user know that `'gibberishMenuTab'` is an invalid option and it is ignored.
- Silver column hides the menu by suppressing all the menuTabs that can be shown: `[]`.
- All other columns return the default list.
- `postProcessPopup` is used on the Gold column to reposition the menu 25px lower.

<grid-example title='Column Menu' name='column-menu' type='generated' options='{ "enterprise": true }'></grid-example>

## Customising the Columns Menu Tab

The behaviour and appearance of the Columns Menu tab can be customised by supplying `ColumnsMenuParams` to the column definition: `colDef.columnsMenuParams`.

The available properties are shown below:

```ts
ColumnsMenuParams {
    // to suppress updating the layout of columns as they are rearranged in the grid
    suppressSyncLayoutWithGrid?: boolean,

    // to suppress Column Filter section
    suppressColumnFilter?: boolean,

    // to suppress Select / Un-select all widget
    suppressColumnSelectAll?: boolean,

    // to suppress Expand / Collapse all widget
    suppressColumnExpandAll?: boolean,

    // by default, column groups start expanded. Pass true to default to contracted groups
    contractColumnSelection?: boolean
}
```

Note that all of the above properties are initially set to `false`.

The following example demonstrates all of the above columns menu tab properties. Note the following:

- All columns menu tabs have been configured to ignore column moves in the grid by setting `suppressSyncLayoutWithGrid = true` on the default column definition.
- The **Name** column doesn't show the top filter section as `suppressColumnFilter`, `suppressColumnSelectAll` and `suppressColumnExpandAll` are all set to `true`.
- The **Age** column shows the group columns in a collapsed state as `contractColumnSelection` is set to `true`.

<grid-example title='Customising Columns Menu Tab' name='customising-columns-menu-tab' type='generated' options='{ "enterprise": true }'></grid-example>

## Popup Parent

Under most scenarios, the menu will fit inside the grid. However if the grid is small and / or the menu is very large, then the menu will not fit inside the grid and it will be clipped. This will lead to a bad user experience.

To fix this, you should set property `popupParent` which is explained in the [popup parent](/context-menu/#popup-parent) for context menus.
