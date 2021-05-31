[[only-react]]
|## Custom Floating Filter Interface
|
|The interface for a custom filter component is as follows:
|
|```ts
|interface {
|    // Gets called every time the parent filter changes. Your floating
|    // filter would typically refresh its UI to reflect the new filter
|    // state. The provided parentModel is what the parent filter returns
|    // from its getModel() method. The event is the FilterChangedEvent
|    // that the grid fires.
|    onParentModelChanged(parentModel: any, event: FilterChangedEvent): void;
|
|}
|```
|
|[[note]]
||Note that if you're using Hooks for Grid Components that have lifecycle/callbacks that the
||grid will call (for example, the `onParentModelChanged` callback from an Editor Component), then you'll need to expose them with
||`forwardRef` & `useImperativeHandle`.
||
||Please refer to the [Hook](/react-hooks/) documentation (or the examples on this page) for more information.
|
|### Custom Filter Parameters
|
|When a React component is instantiated the grid will make the grid APIs, a number of utility methods as well as the cell &
|row values available to you via `props` - the interface for what is provided is documented below.
|
|If the user provides params via the `colDef.floatingFilterParams` attribute, these
|will be additionally added to the params object, overriding items of the same name if a name clash exists.
|
