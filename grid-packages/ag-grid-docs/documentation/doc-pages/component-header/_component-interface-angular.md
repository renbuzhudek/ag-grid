[[only-angular]]
|## Header Component Interface
|
|The interface for a custom header component is as follows:
|
|```ts
|interface IHeaderAngularComp {
|    // The agInit(params) method is called on the header component once.
|    // See below for details on the parameters.
|    agInit(params: IHeaderParams): void;
|
|    // gets called when a new Column Definition has been set for this header
|    refresh(params: IHeaderParams): HTMLElement;
|}
|```
|
|### Custom Header Parameters
|
|The `agInit(params)` method takes a params object with the items listed below. If the user provides params via the `colDef.headerComponentParams` attribute, these
|will be additionally added to the params object, overriding items of the same name if a name clash exists.
|
