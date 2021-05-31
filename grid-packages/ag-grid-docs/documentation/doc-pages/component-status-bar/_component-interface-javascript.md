[[only-javascript]]
|## Status Bar Panel Interface
|
|Implement this interface to create a status bar component.
|
|```ts
|interface IStatusPanel {
|    /** The init(params) method is called on the status bar component once.
|        See below for details on the parameters. */
|    init?(params: IStatusPanelParams): void;
|
|    /** A hook to perform any necessary operation just after the gui for this component has been
|        renderered in the screen. */
|    afterGuiAttached?(params?: IAfterGuiAttachedParams): void;
|
|    /** Gets called when the grid is destroyed - if your status bar components needs to do any
|        cleanup, do it here */
|    destroy?(): void;
|}
|```
|
|The interface for the init parameters is as follows:
|


