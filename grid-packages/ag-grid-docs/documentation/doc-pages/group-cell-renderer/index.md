---
title: "Group Cell Renderer"
---

If you are grouping in the grid, then you will need to provide a group cell renderer as the group cell renderer is what provides the user with the expand and collapse functionality.

The key for the group cell renderer is `agGroupCellRenderer`.

The grid's group cell renderer takes many parameters to configure it. Here is an example of a column and it's configuration:

<snippet>
const gridOptions = {
    columnDefs: [
        // column definition configured to show group values with the cell renderer set to 'group'
        {
            showRowGroup: true,
            cellRenderer:'agGroupCellRenderer',
            // provide extra params to the cellRenderer
            cellRendererParams: {
                // turn off the row count
                suppressCount: true,
                // turn off double click for expand
                suppressDoubleClickExpand: true,
                // enable checkbox selection
                checkbox: true,
                // provide an inner renderer
                innerRenderer: myInnerRenderer,
                // provide a footer value getter
                footerValueGetter: myFooterValueGetter
            }
        }
    ]
}
</snippet>

The set of parameters for the group cell renderer are:

- **suppressCount:** One of `[true, false]`, if `true`, count is not displayed beside the name.
- **checkbox:** One of `[true, false]`, if `true`, a selection checkbox is included.
- **suppressPadding:** Set to `true` to not including any padding (indentation) in the child rows.
- **suppressDoubleClickExpand:** Set to `true` to suppress expand on double click.
- **suppressEnterExpand:** Set to `true` to suppress expand on <kbd>Enter</kbd> key.
- **innerRenderer:** The renderer to use for inside the cell (after grouping functions are added).
- **footerValueGetter:** The value getter for the footer text. Can be a function or expression.

### Example Group cellRenderer

Below shows an example of configuring a group cell renderer. The example setup is not realistic as it has many columns configured for the showing the groups. The reason for this is to demonstrate different group column configurations side by side. In your application, you will typically have one column for showing the groups.

The example is built up as follows:

- The data is grouped by two columns: **Type** (one of 'Fiction' or 'Non-Fiction') and **Country** (a country name, eg Ireland or United Kingdom).

- The column **'Country Group - No Renderer'** configures the grid to put the 'Country' group data only into this column by setting `showRowGroup='country'`. All rows that are not this group are blank. There is no cell renderer configured, so the grid just places the text for the group into the cell, there is not expand / collapse functionality.

- The column **'All Groups - no Renderer'** builds on before, but adds all groups by setting `showRowGroup=true`. This gets the column to display all groups, but again no cell renderer so not expand / collapse functionality.

- The column **Group Renderer A** builds on before, but adds the group cell renderer with `cellRenderer='group'`. The values are exactly as per the previous column, except now we have expand and collapse functionality.

- The column **Group Renderer B** builds on before, but adds `field=city` so that the city is displayed in the leave nodes in the group column.

- The column **Group Renderer C** builds on before, but adds the following `cellRendererParams`:

    - `suppressCount=true`: Suppresses the row count.
    - `suppressDoubleClickExpand=true`: Suppress double click for expanding.
    - `checkbox=true`: Adds a selection checkbox.
    - `innerRenderer=SimpleCellRenderer`: Puts custom rendering for displaying the value. The group cellRenderer will take care of all the expand / collapse, selection etc, but then allow you to customise the display of the value. In this example we add a border when the value is a group, and we add the Ireland <img src="https://flags.fmcdn.net/data/flags/mini/ie.png" style="width: 20px; position: relative; top: -2px;" alt="Ireland" /> flag (because Niall Crosby is from Ireland) to the leaf levels.

<grid-example title='Group Renderers' name='group-renderer' type='generated' options='{"enterprise": true}'></grid-example>
