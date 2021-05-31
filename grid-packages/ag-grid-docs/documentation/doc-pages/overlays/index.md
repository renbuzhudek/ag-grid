---
title: "Overlays"
---

At present, there are two overlays for the grid when using [Client-side Data Row Model](/client-side-model/):

- **Loading**: Gets displayed when the grid is loading data.
- **No Rows**: Gets displayed when loading has complete but no rows to show.

The grid manages showing and hiding of the overlays for you, so you may not ever need to call the above API methods. When the table is first initialised, the loading panel is displayed if `rowData` is set to `null` or `undefined`. When the API function `setRowData` is called, the loading panel is hidden.

[[note]]
| Overlays are not used when using [Server-side Data Row Models](/row-models/). This is because data is
| loaded differently.
|
| The Loading overlay doesn't make sense as rows are loaded in sections, access to the entire grid shouldn't
| be blocked as some rows will be loaded while others are loading.
|
| The No Rows overlay doesn't make sense as there could be rows on the server, but a filter could be applied
| that filters out all rows. This would be equivalent to the Client Side Row Model and applying a filter to
| some data (no overlay would be shown, and a grid with a filter and no rows would be shown).

## Overlay API

At any point, you can show or hide any of the overlays using the methods below. You may never use these methods, as the grid manages the overlays for you. However you may find some edge cases where you need complete control (such as showing 'loading' if an option outside the grid is changed).

<snippet>
|// show 'loading' overlay
|gridOptions.api.showLoadingOverlay();
|
|// show 'no rows' overlay
|gridOptions.api.showNoRowsOverlay();
|
|// clear all overlays
|gridOptions.api.hideOverlay();
</snippet>

The overlays are mutually exclusive, you cannot show more than one overlay at any given time.

## Custom Templates

If you're not happy with the provided overlay templates, you can provide your own. This is done with the grid properties `overlayLoadingTemplate` and `overlayNoRowsTemplate`. These templates should be plain HTML.

## Example

The example below demonstrates how the loading overlay is shown automatically while the data is loading. You can also use the buttons to show / hide the different overlays at your will.

<grid-example title='Overlays' name='overlays' type='generated' options='{ "exampleHeight": 580 }'></grid-example>

[[note]]
| It is also possible to provide your own custom Overlay Components - please see [Overlay Component](/component-overlay/) for more information

