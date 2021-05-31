---
title: "Keyboard Interaction"
---

The grid responds to keyboard interactions from the user as well as emitting events when key presses happen on the grid cells. Below shows all the keyboards interactions that can be done with the grid.

## Navigation

Use the arrow keys (<kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd>) to move focus up, down, left and right. If the focused cell is already on the boundary for that position (e.g. if on the first column and the left key is pressed) then the key press has no effect. Use <kbd>Ctrl</kbd>+<kbd>←</kbd> to move to the start of the line, and <kbd>Ctrl</kbd>+<kbd>→</kbd> to move to the end.

If a cell on the first grid row is focused and you press <kbd>↑</kbd>, the focus will be moved into the grid header. The header navigation focus navigation works the same as the grid's: arrows will move up/down/left/right, <kbd>Tab</kbd> will move the focus horizontally until the last header cell and then move on to the next row.

Use <kbd>Page Up</kbd> and <kbd>Page Down</kbd> to move the scroll up and down by one page. Use <kbd>Home</kbd> and <kbd>End</kbd> to go to the first and last rows.

[[note]]
| When a header cell is focused, commands like <kbd>Page Up</kbd>, <kbd>Page Down</kbd>, <kbd>Home</kbd>, <kbd>End</kbd>, <kbd>Ctrl</kbd>+<kbd>←</kbd>/<kbd>→</kbd> will not work as they do when a grid cell is focused.

## Groups

If on a group element, hitting the <kbd>Enter</kbd> key will expand or collapse the group.

## Editing

Pressing the <kbd>Enter</kbd> key on a cell will put the cell into edit mode, if editing is allowed on the cell. This will work for the default cell editor.

## Selection

Pressing the <kbd>Space</kbd> key on a cell will select the cells row, or deselect the row if already selected. If multi-select is enabled, then the selection will not remove any previous selections.

## Suppress Cell Selection

If you want keyboard navigation turned off, then set `suppressCellSelection=true` in the `gridOptions`.

## Header Navigation

The grid header supports full keyboard navigation, however the behaviour may differ based on the type of header that is currently focused.

### Grouped Headers

While navigating grouped headers, if the current grouped header is expandable, pressing <kbd>Enter</kbd> will toggle the expanded state of the group.

### Normal Headers

Regular headers may have selection checkboxes, sorting functions and menus, so to access all these functions while focusing a header, you can do the following:

- Press <kbd>Space</kbd> to toggle the header checkbox selection.
- Press <kbd>Enter</kbd> to toggle the sorting state of that column.
- Press <kbd>Shift</kbd>+<kbd>Enter</kbd> to toggle multi-sort for that column.
- Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to open the menu for the focused header.
- When a menu is open, simply press <kbd>Esc</kbd> to close it and the focus will return to the header.

### Floating Filters

While navigation the floating filters header with the keyboard pressing left/right the focus will move from header cell to header cell, if you wish to navigate within the cell, press <kbd>Enter</kbd> to focus the first enabled element within the current floating filter cell, and press <kbd>Esc</kbd> to return the focus to the floating filter cell.

## Example

The example below has grouped headers, headers and floating filters to demonstrate the features mentioned above:

<grid-example title='Keyboard Navigation' name='grid-keyboard-navigation' type='generated' options='{ "enterprise": true }'></grid-example>

## Custom Navigation

Most people will be happy with the default navigation the grid does when you use the arrow keys and the <kbd>Tab</kbd> key. Some people will want to override this (e.g. you may want the <kbd>Tab</kbd> key to navigate to the cell below, not the cell to the right). To facilitate this, the grid offers four methods: `navigateToNextCell`, `tabToNextCell`, `navigateToNextHeader` and `tabToNextHeader`.

### navigateToNextCell

Provide a callback `navigateToNextCell` if you want to override the arrow key navigation. The parameter object is as follows:

```ts
interface NavigateToNextCellParams {
    // the keycode for the arrow key pressed, left = 37, up = 38, right = 39, down = 40
    key: number;

    // the cell that currently has focus
    previousCellPosition: CellPosition;

    // the cell the grid would normally pick as the next cell for this navigation
    nextCellPosition: CellPosition;

    event: KeyboardEvent;
}
```

### tabToNextCell

Provide a callback `tabToNextCell` if you want to override the <kbd>Tab</kbd> key navigation. The parameter object is as follows:

```ts
interface TabToNextCellParams {
    // true if the Shift key is also down
    backwards: boolean;

    // true if the current cell is editing (you may want to skip cells that are not editable,
    // as the grid will enter the next cell in editing mode also if tabbing)
    editing: boolean;

    // the cell that currently has focus
    previousCellPosition: CellPosition;

    // the cell the grid would normally pick as the next cell for this navigation
    nextCellPosition: CellPosition;
}
```

### CellPosition

Both functions above use `CellPosition`. This is an object that represents a cell in the grid. Its interface is as follows:

```ts
interface CellPosition {
    // either 'top', 'bottom' or undefined/null (for not pinned)
    rowPinned: string;

    // a positive number from 0 to n, where n is the last row the grid is rendering
    // or -1 if you want to navigate to the grid header
    rowIndex: number;

    // the grid column
    column: Column;
}
```

The functions take a `CellPosition` for current and next cells, as well as returning a `CellPosition` object. The returned `CellPosition` will be the one the grid puts focus on next. Return the provided `nextCellPosition` to stick with the grid default behaviour. Return `null`/`undefined` to skip the navigation.

### navigateToNextHeader

Provide a callback `navigateToNextHeader` if you want to override the arrow key navigation. The parameter object is as follows:

```ts
interface NavigateToNextHeaderParams {
    // the key for the arrow key pressed, left = 'ArrowLeft', up = 'ArrowUp', right = 'ArrowRight', down = 'ArrowDown'
    key: string;

    // the header that currently has focus
    previousHeaderPosition: HeaderPosition;

    // the header the grid would normally pick as the next header for this navigation
    nextHeaderPosition: HeaderPosition;

    // the number of header rows present in the grid
    headerRowCount: number;

    event: KeyboardEvent;
}
```

### tabToNextHeader

Provide a callback `tabToNextHeader` if you want to override the <kbd>Tab</kbd> key navigation. The parameter object is as follows:

```ts
interface TabToNextHeaderParams {
    // true if the Shift key is also down
    backwards: boolean;

    // the header that currently has focus
    previousHeaderPosition: HeaderPosition;

    // the header the grid would normally pick as the next header for this navigation
    nextHeaderPosition: HeaderPosition;

    // the number of header rows present in the grid
    headerRowCount: number;
}
```

### HeaderPosition

Both `navigateToNextHeader` and `tabToNextHeader` use `HeaderPosition`. This is an object that represents a header in the grid. Its interface is as follows:

```ts
interface HeaderPosition {
    // a number from 0 to n, where n is the last header row the grid is rendering
    headerRowIndex: number;

    // the grid column or column group
    column: Column | ColumnGroup;
}
```

You should return the `HeaderPosition` you want in the `navigateToNextHeader` and `tabToNextHeader` functions to have it focused. Returning `null` or `undefined` in `navigateToNextHeader` will do nothing (same as focusing the current focused cell), however, doing the same thing in `tabToNextHeader` will allow the browser default behaviour for <kbd>Tab</kbd> to happen. This is useful for tabbing outside of the grid from the last cell or <kbd>Shift</kbd> tabbing out of the grid from the first cell.

[[note]]
| The `navigateToNextCell` and `tabToNextCell` are only called while navigating across grid cells, while
| `navigateToNextHeader` and `tabToNextHeader` are only called while navigating across grid headers.
| If you need to navigate from one container to another, pass `rowIndex: -1` in `CellPosition`
| or `headerRowIndex: -1` in `HeaderPosition`.

## Example Custom Cell Navigation

The example below shows how to use `navigateToNextCell`, `tabToNextCell`,  `navigateToNextHeader` and `tabToNextHeader` in practice.

Note the following:

- `navigateToNextCell` swaps the up and down arrow keys.
- `tabToNextCell` uses tabbing to go up and down rather than right and left.
- `navigateToNextHeader` swaps the up and down arrow keys.
- `tabToNextHeader` uses tabbing to go up and down rather than right and left.
- When a cell in the first grid row is focused, pressing the down arrow will navigate to  the header by passing `rowIndex: -1`.
- When a header cell in the last header row is focused, pressing the up arrow will navigate  to the first grid row by passing `headerRowIndex: -1`.
- Tabbing/Shift tabbing will move the focus until the first header or the last grid row, but focus will not leave the grid.

<grid-example title='Custom Keyboard Navigation' name='custom-keyboard-navigation' type='mixed'></grid-example>

## Tabbing into the Grid

In applications where the grid is embedded into a larger page, by default, when tabbing into the grid, the first column header will be focused.

You could override this behaviour to focus the first grid cell, if that is a preferred scenario using a combination of DOM event listeners and Grid API calls shown in the following code snippet:

<snippet>
|// obtain reference to input element
|const myInput = document.getElementById("my-input");
|
|// intercept key strokes within input element
|myInput.addEventListener("keydown", event => {
|     // code for tab key
|     const tabKeyCode = 9;
|
|    // ignore non tab key strokes
|    if(event.keyCode !== tabKeyCode) return;
|
|    // prevents tabbing into the url section
|    event.preventDefault();
|
|    // scrolls to the first row
|    gridApi.ensureIndexVisible(0);
|
|    // scrolls to the first column
|    const firstCol = columnApi.getAllDisplayedColumns()[0];
|    gridApi.ensureColumnVisible(firstCol);
|
|    // sets focus into the first grid cell
|    gridApi.setFocusedCell(0, firstCol);
|
|}, true);
</snippet>

### Example: Tabbing into the Grid

In the following example there is an input box provided to test tabbing into the grid. Notice the following:

- Tabbing out of the first input box will gain focus on the first grid cell.
- When the first cell is out of view due to either scrolling down (rows) or across (columns), tabbing out of the first input will cause the grid to navigate to the first cell.
- Tabbing out of the second input box will have the default behaviour which is to focus the first grid header.
- When the first header is out of view due to horizontal scroll, tabbing into the grid will cause the grid to scroll to focus the first header.
- Shift-Tabbing out third input (below the grid) will have the default focus behaviour, which is to focus the last element of the grid. This element will vary depending on how many features have been enabled (eg. Row Pagination, Tool Panels, etc...).

<grid-example title='Tabbing into the Grid' name='tabbing-into-grid' type='vanilla'></grid-example>

## Keyboard Events

It is possible to add custom behaviour to any key event that you want using the grid events `cellKeyPress` (gets called when a DOM `keyPress` event fires on a cell) and `cellKeyDown` (gets called when a DOM `keyDown` event fires on a cell).

[[note]]
| These keyboard events are monitored by the grid panel, so they will not be fired
| when the `keydown` or `keypress` happen inside of a popup editor, as popup elements are
| rendered in a different DOM tree.

The grid events wrap the DOM events and provides additional information such as row and column details.

The example below shows processing grid cell keyboard events. The following can be noted:

- Each time a `cellKeyPress` or `cellKeyDown` is fired, the details of the event are logged to the console.
- When the user hits <kbd>S</kbd> on a row, the row selection is toggled. This is achieved through the `cellKeyPress` listener.

<grid-example title='Keyboard Events' name='keyboard-events' type='generated' options='{ "enterprise": true }'></grid-example>

## Suppress Keyboard Events

It is possible to stop the grid acting on particular events. To do this implement `suppressHeaderKeyboardEvent` and/or `suppressKeyboardEvent` callback. The callback should return `true` if the grid should suppress the events, or `false` to continue as normal.

### suppressHeaderKeyboardEvent

The callback has the following signature:

```ts
function suppressHeaderKeyboardEvent(params: SuppressHeaderKeyboardEventParams) => boolean;

interface SuppressHeaderKeyboardEventParams {
    api: GridApi; // grid API
    columnApi: ColumnApi; // column API
    context: any; // context object
    event: KeyboardEvent; // the keyboard event the grid received. inspect this to see what key was pressed
    headerRowIndex: number; // the index of the header row of the current focused header
    column: Column | ColumnGroup; // the current Column or Column Group
    colDef: ColDef | ColGroupDef; // Column Definition or Column Group Definition
}
```

### suppressKeyboardEvent

The callback has the following signature:

```ts
function suppressKeyboardEvent(params: SuppressKeyboardEventParams) => boolean;

interface SuppressKeyboardEventParams {
    // the keyboard event the grid received. inspect this to see what key was pressed
    event: KeyboardEvent;

    // whether the cell is editing or not. sometimes you might want to suppress event
    // only when cell is editing.
    editing: boolean;

    node: RowNode; // row node
    data: any; // row data
    column: Column; // column
    colDef: ColDef; // column definition
    context: any; // context object
    api: GridApi | null | undefined; // grid API
    columnApi: ColumnApi | null | undefined; // column API
}
```

The callback is available as a [column callback](/column-properties/) (set on the column definition). If you provide the callback on both the grid and column definition, then if either return `true` the event will be suppressed.

### Example: Suppress Keyboard Navigation

The example below demonstrates suppressing the following keyboard events:

- On the Athlete column cells only:
    - <kbd>Enter</kbd> will not start or stop editing.
- On the Country column cells only:
    - <kbd>↑</kbd> <kbd>↓</kbd> arrow keys are allowed. This is the only column that allows navigation from the grid to the header.
- On all cells (including the cells of the Athlete Column):
    - <kbd>Ctrl</kbd>+<kbd>A</kbd> will not select all cells into a range.
    - <kbd>Ctrl</kbd>+<kbd>C</kbd> will not copy to clipboard.
    - <kbd>Ctrl</kbd>+<kbd>V</kbd> will not paste from clipboard.
    - <kbd>Ctrl</kbd>+<kbd>D</kbd> will not copy range down.
    - <kbd>Page Up</kbd> and <kbd>Page Down</kbd> will not get handled by the grid.
    - <kbd>Home</kbd> will not focus top left cell.
    - <kbd>End</kbd> will not focus bottom right cell.
    - <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> Arrow keys will not navigate focused cell.
    - <kbd>F2</kbd> will not start editing.
    - <kbd>Delete</kbd> will not start editing.
    - <kbd>Backspace</kbd> will not start editing.
    - <kbd>Escape</kbd> will not cancel editing.
    - <kbd>Space</kbd> will not select current row.
    - <kbd>Tab</kbd> will not be handled by the grid.
- On the Country header only:
    - Navigation is blocked from the left to right using arrows but is allowed using <kbd>Tab</kbd>.
    - Navigation up and down is allowed. This is the only header that allows navigation from the header to the grid cells.
    - <kbd>Enter</kbd> is blocked. This is the only header that blocks sorting / opening menu via keyboard.
- On all headers (excluding country):
    - Navigation is blocked up and down, but navigation left / right is allowed using arrows and <kbd>Tab</kbd>.

<grid-example title='Suppress Keys' name='suppress-keys' type='generated' options='{ "enterprise": true }'></grid-example>
