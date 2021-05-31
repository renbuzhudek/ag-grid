[[only-javascript]]
|### Opening / Closing Groups
|
|Not all column groups can open and close, so you should display open / close features accordingly. To check if a column group should have open / close functionality, check the `isExpandable()` method on the column group.
|
|```js
|const showExpandableIcons = params.columnGroup.isExpandable()
|```
|
|To check if a column group is open or closed, check the `isExpanded()` method on the column group.
|
|```js
|const groupIsOpen = params.columnGroup.isExpanded();
|```
|
|To open / close a column group, use the `params.setExpanded(boolean)` method.
|
|```js
|// this code toggles the expanded state
|const oldValue = params.columnGroup.isExpanded();
|const newValue = !oldValue;
|params.setExpanded(newValue);
|```
|
|To know if a group is expanded or collapsed, listen for the `expandedChanged` event on the column group.
|
|```js
|// get a reference to the original column group
|const columnGroup = params.columnGroup.getOriginalColumnGroup();
|// create listener
|const listener = () => { console.log('group was opened or closed'); };
|// add listener
|columnGroup.addEventListener('expandedChanged', listener);
|
|// don't forget to remove the listener in your destroy method
|columnGroup.removeEventListener('expandedChanged', listener);
|```
