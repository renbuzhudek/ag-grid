---
title: "Tool Panels"
enterprise: true
---

This section covers Tool Panels, available via the grid's Side Bar, which allow for easy access to powerful grid operations such as grouping, pivoting, and filtering. Custom Tool Panels can also be provided to the grid.

## Overview

Tool Panels are panels that sit in the Side Bar to the right of the grid. The Side Bar allows access to the tool panels via buttons that work like tabs. The Side Bar and a Tool Panel are highlighted in the screenshot below.

<image-caption src="tool-panel/resources/sideBar.png" maxwidth="52rem" alt="Side Bar" constrained="true"></image-caption>

[[note]]
| Version 19 of AG Grid received a major overhaul of the tool panels. It did not make sense to keep
| the older configuration options. The old property `showToolPanel` is no longer
| used. The tool panel is also not included by default - if the tool panel is not configured, no
| tool panel is shown.
|<br/><br/>
| If moving from an earlier version, set `sideBar='columns'` to receive similar behaviour.

## Provided Tool Panels

The grid provides the following Tool Panels:

- [Columns Tool Panel](/tool-panel-columns/) - to control aggregations, grouping and pivoting.
- [Filters Tool Panel](/tool-panel-filters/) - to perform multiple column filters.

## Custom Tool Panel Components

In addition to the provided Tool Panels, it is also possible to provide custom Tool Panels.

For more details refer to the section: [Custom Tool Panel Components](/component-tool-panel/).

## Next Up

Before covering the Tool Panels in detail, continue to the next section to learn about the [Side Bar](/side-bar/).
