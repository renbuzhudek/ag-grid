[[only-react]]
|## Header Component Interface
|
|The interface for a custom header component is as follows:
|
|```ts
|interface IHeaderReactComp {
|    // gets called when a new Column Definition has been set for this header
|    refresh?(params: IHeaderParams): HTMLElement;
|}
|```
|
|[[note]]
||Note that if you're using Hooks for Grid Components that have lifecycle/callbacks that the
||grid will call (for example, the `refresh` callback from an Editor Component), then you'll need to expose them with
||`forwardRef` & `useImperativeHandle`.
||
||Please refer to the [Hook](/react-hooks/) documentation (or the examples on this page) for more information.
|
|[[note]]
||Implementing `refresh` is entirely optional - if you omit it then the `props` of the Custom Header Component will get updated when changes occur 
||as per the normal React lifecycle.
||
|
|### Custom Header Parameters
|
|When a React component is instantiated the grid will make the grid APIs, a number of utility methods as well as the cell &
|row values available to you via `props` - the interface for what is provided is documented below.
|
|If the user provides params via the `colDef.headerComponentParams` attribute, these
|will be additionally added to the params object, overriding items of the same name if a name clash exists.
|
