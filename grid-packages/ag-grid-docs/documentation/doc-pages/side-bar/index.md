---
title: "Side Bar"
enterprise: true
---

This section covers how to configure the Side Bar which contains Tool Panels.

## Configuring the Side Bar

The side bar is configured using the grid property `sideBar`. The property takes multiple forms to allow easy configuration or more advanced configuration. The different forms for the `sideBar` property are as follows:

| Type                       | Description                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| undefined                  | No side bar provided.                                                                              |
| boolean                    | Set to `true` to display the side bar with default configuration.                       |
| string                     | Set to 'columns' or 'filters' to display side bar with just one of Columns or Filters tool panels. |
| SideBarDef<br/>(long form) | An object of type `SideBarDef` (explained below) to allow detailed configuration of the side bar. Use this to configure the provided tool panels (e.g. pass parameters to the columns or filters panel) or to include custom tool panels. |


### Boolean Configuration

The default side bar contains the Columns and Filters tool panels. To use the default side bar, set the grid property `sideBar=true`. The Columns panel will be open by default.

The default configuration doesn't allow customisation of the tool panels. More detailed configuration are explained below.

In the following example note the following:

- The grid property `sideBar` is set to `true`.
- The side bar is displayed with tool panels Columns and Filters.
- The Columns panel is displayed by default.

<grid-example title='Boolean Configuration' name='boolean-configuration' type='generated' options='{ "enterprise": true }'></grid-example>

### String Configuration

To display just one of the provided tool panels, set either `sideBar='columns'` or `sideBar='filters'`. This will display the desired item with default configuration.

The example below demonstrates using the string configuration. Note the following:

- The grid property `sideBar` is set to `'filters'`.
- The side bar is displayed showing only the Filters panel.

<grid-example title='Side Bar - Only Filters' name='only-filters' type='generated' options='{ "enterprise": true }'></grid-example>

### SideBarDef Configuration

The previous configurations are shortcuts for the full fledged configuration using a `SideBarDef` object. For full control over the configuration, you must provide a `SideBarDef` object. The properties of `SideBarDef` are as follows:

<api-documentation source='side-bar/resources/sideBar.json' section='sideBarProperties'></api-documentation>

Each panel has the following properties:

<api-documentation source='side-bar/resources/sideBar.json' section='toolPanelProperties'></api-documentation>

The following snippet shows configuring the tool panel using a `SideBarDef` object:


<snippet>
const gridOptions = {
    sideBar: {
        toolPanels: [
            {
                id: 'columns',
                labelDefault: 'Columns',
                labelKey: 'columns',
                iconKey: 'columns',
                toolPanel: 'agColumnsToolPanel',
            },
            {
                id: 'filters',
                labelDefault: 'Filters',
                labelKey: 'filters',
                iconKey: 'filter',
                toolPanel: 'agFiltersToolPanel',
            }
        ],
        position: 'left',
        defaultToolPanel: 'filters'
    }
}
</snippet>

The snippet above is demonstrated in the following example:

<grid-example title='SideBarDef' name='sideBarDef' type='generated' options='{ "enterprise": true, "exampleHeight": 600 }'></grid-example>

## Configuration Shortcuts

The `boolean` and `string` configurations are shortcuts for more detailed configurations. When you use a shortcut the grid replaces it with the equivalent long form of the configuration by building the equivalent `SideBarDef`.

The following code snippets show an example of the `boolean` shortcut and the equivalent `SideBarDef` long form.

<snippet>
const gridOptions = {
    // shortcut
    sideBar: true,
}
</snippet>

<snippet>
const gridOptions = {
    // equivalent detailed long form
    sideBar: {
        toolPanels: [
            {
                id: 'columns',
                labelDefault: 'Columns',
                labelKey: 'columns',
                iconKey: 'columns',
                toolPanel: 'agColumnsToolPanel',
            },
            {
                id: 'filters',
                labelDefault: 'Filters',
                labelKey: 'filters',
                iconKey: 'filter',
                toolPanel: 'agFiltersToolPanel',
            }
        ],
        defaultToolPanel: 'columns',
    }
}
</snippet>

The following code snippets show an example of the `string` shortcut and the equivalent `SideBarDef` long form.

<snippet>
const gridOptions = {
    // shortcut
    sideBar: 'filters',
}
</snippet>

<snippet>
const gridOptions = {
    // equivalent detailed long form
    sideBar: {
        toolPanels: [
            {
                id: 'filters',
                labelDefault: 'Filters',
                labelKey: 'filters',
                iconKey: 'filter',
                toolPanel: 'agFiltersToolPanel',
            }
        ],
        defaultToolPanel: 'filters',
    }
}
</snippet>

You can also use shortcuts inside the `toolPanel.items` array for specifying the Columns and Filters items.

<snippet>
const gridOptions = {
    // shortcut
    sideBar: {
        toolPanels: ['columns', 'filters']
    }
}
</snippet>

<snippet>
const gridOptions = {
    // equivalent detailed long form
    sideBar: {
        toolPanels: [
            {
                id: 'columns',
                labelDefault: 'Columns',
                labelKey: 'columns',
                iconKey: 'columns',
                toolPanel: 'agColumnsToolPanel',
            },
            {
                id: 'filters',
                labelDefault: 'Filters',
                labelKey: 'filters',
                iconKey: 'filter',
                toolPanel: 'agFiltersToolPanel',
            }
        ]
    }
}
</snippet>

## Side Bar Customisation

If you are using the long form (providing a `SideBarDef` object) then it is possible to customise. The example below shows changing the label and icon for the columns and filters tab.

<grid-example title='Side Bar Fine Tuning' name='fine-tuning' type='generated' options='{ "enterprise": true }'></grid-example>

## Providing Parameters to Tool Panels

Parameters are passed to tool panels via the `componentParams` object. For example, the following code snippet sets `suppressRowGroups: true` and `suppressValues: true` for the [columns tool panel](/tool-panel-columns/).

<snippet>
const gridOptions = {
    sideBar: {
        toolPanels: [
            {
                id: 'columns',
                labelDefault: 'Columns',
                labelKey: 'columns',
                iconKey: 'columns',
                toolPanel: 'agColumnsToolPanel',
                toolPanelParams: {
                    suppressRowGroups: true,
                    suppressValues: true,
                }
            }
        ]
    }
}
</snippet>

This example configures the columns tool panel. See the [columns tool panel](/tool-panel-columns/) documentation for the full list of possible parameters to this tool panel.

## Side Bar API

The list below details all the API methods relevant to the tool panel.

<api-documentation source='side-bar/resources/sideBar.json' section='toolPanelApi'></api-documentation>

The example below demonstrates different usages of the tool panel API methods. The following can be noted:

- Initially the side bar is not visible as `sideBar.hiddenByDefault=true`.
- **Visibility Buttons:** These toggle visibility of the tool panel. Note that when you make `visible=false`, the entire tool panel is hidden including the tabs. Make sure the tool panel is left visible before testing the other API features so you can see the impact.
- **Open / Close Buttons:** These open and close different tool panel items.
- **Reset Buttons:** These reset the tool panel to a new configuration. Notice that [shortcuts](#shortcuts) are provided as configuration however `getSideBar()` returns back the long form.
- **Position Buttons:** These change the position of the side bar relative to the grid.


<grid-example title='Side Bar API' name='api' type='generated' options='{ "enterprise": true, "exampleHeight": 630 }'></grid-example>

## Next Up

Now that we covered the Side bar, continue to the next section to learn about the [Columns Tool Panel](/tool-panel-columns/).
