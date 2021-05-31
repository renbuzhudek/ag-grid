import { OriginalColumnGroupChild } from "./originalColumnGroupChild";
import { ColGroupDef } from "./colDef";
import { ColumnGroup } from "./columnGroup";
import { Column } from "./column";
import { EventService } from "../eventService";
import { IEventEmitter } from "../interfaces/iEventEmitter";
import { AgEvent } from "../events";

export class OriginalColumnGroup implements OriginalColumnGroupChild, IEventEmitter {

    public static EVENT_EXPANDED_CHANGED = 'expandedChanged';
    public static EVENT_EXPANDABLE_CHANGED = 'expandableChanged';

    private localEventService = new EventService();

    private colGroupDef: ColGroupDef | null;
    private originalParent: OriginalColumnGroup | null;

    private children: OriginalColumnGroupChild[];
    private groupId: string;
    private expandable = false;

    private expanded: boolean;
    private padding: boolean;

    private level: number;

    constructor(colGroupDef: ColGroupDef | null, groupId: string, padding: boolean, level: number) {
        this.colGroupDef = colGroupDef;
        this.groupId = groupId;
        this.expanded = !!colGroupDef && !!colGroupDef.openByDefault;
        this.padding = padding;
        this.level = level;
    }

    public setOriginalParent(originalParent: OriginalColumnGroup | null): void {
        this.originalParent = originalParent;
    }

    public getOriginalParent(): OriginalColumnGroup | null {
        return this.originalParent;
    }

    public getLevel(): number {
        return this.level;
    }

    public isVisible(): boolean {
        // return true if at least one child is visible
        if (this.children) {
            return this.children.some(child => child.isVisible());
        }

        return false;
    }

    public isPadding(): boolean {
        return this.padding;
    }

    public setExpanded(expanded: boolean | undefined): void {
        this.expanded = expanded === undefined ? false : expanded;
        const event: AgEvent = {
            type: OriginalColumnGroup.EVENT_EXPANDED_CHANGED
        };
        this.localEventService.dispatchEvent(event);
    }

    public isExpandable(): boolean {
        return this.expandable;
    }

    public isExpanded(): boolean {
        return this.expanded;
    }

    public getGroupId(): string {
        return this.groupId;
    }

    public getId(): string {
        return this.getGroupId();
    }

    public setChildren(children: OriginalColumnGroupChild[]): void {
        this.children = children;
    }

    public getChildren(): OriginalColumnGroupChild[] {
        return this.children;
    }

    public getColGroupDef(): ColGroupDef | null {
        return this.colGroupDef;
    }

    public getLeafColumns(): Column[] {
        const result: Column[] = [];
        this.addLeafColumns(result);
        return result;
    }

    private addLeafColumns(leafColumns: Column[]): void {
        if (!this.children) { return; }

        this.children.forEach((child: OriginalColumnGroupChild) => {
            if (child instanceof Column) {
                leafColumns.push(child);
            } else if (child instanceof OriginalColumnGroup) {
                child.addLeafColumns(leafColumns);
            }
        });
    }

    public getColumnGroupShow(): string | undefined {
        const colGroupDef = this.colGroupDef;

        if (!colGroupDef) { return; }

        return colGroupDef.columnGroupShow;
    }

    // need to check that this group has at least one col showing when both expanded and contracted.
    // if not, then we don't allow expanding and contracting on this group

    public setupExpandable() {
        this.setExpandable();
        // note - we should be removing this event listener
        this.getLeafColumns().forEach(col => col.addEventListener(Column.EVENT_VISIBLE_CHANGED, this.onColumnVisibilityChanged.bind(this)));
    }

    public setExpandable() {
        if (this.isPadding()) { return; }
        // want to make sure the group doesn't disappear when it's open
        let atLeastOneShowingWhenOpen = false;
        // want to make sure the group doesn't disappear when it's closed
        let atLeastOneShowingWhenClosed = false;
        // want to make sure the group has something to show / hide
        let atLeastOneChangeable = false;

        const children = this.findChildrenRemovingPadding();

        for (let i = 0, j = children.length; i < j; i++) {
            const abstractColumn = children[i];
            if (!abstractColumn.isVisible()) {
                continue;
            }
            // if the abstractColumn is a grid generated group, there will be no colDef
            const headerGroupShow = abstractColumn.getColumnGroupShow();

            if (headerGroupShow === ColumnGroup.HEADER_GROUP_SHOW_OPEN) {
                atLeastOneShowingWhenOpen = true;
                atLeastOneChangeable = true;
            } else if (headerGroupShow === ColumnGroup.HEADER_GROUP_SHOW_CLOSED) {
                atLeastOneShowingWhenClosed = true;
                atLeastOneChangeable = true;
            } else {
                atLeastOneShowingWhenOpen = true;
                atLeastOneShowingWhenClosed = true;
            }
        }

        const expandable = atLeastOneShowingWhenOpen && atLeastOneShowingWhenClosed && atLeastOneChangeable;

        if (this.expandable !== expandable) {
            this.expandable = expandable;
            const event: AgEvent = {
                type: OriginalColumnGroup.EVENT_EXPANDABLE_CHANGED
            };
            this.localEventService.dispatchEvent(event);
        }
    }

    private findChildrenRemovingPadding(): OriginalColumnGroupChild[] {
        const res: OriginalColumnGroupChild[] = [];

        const process = (items: OriginalColumnGroupChild[]) => {
            items.forEach(item => {
                // if padding, we add this children instead of the padding
                const skipBecausePadding = item instanceof OriginalColumnGroup && item.isPadding();
                if (skipBecausePadding) {
                    process((item as OriginalColumnGroup).children);
                } else {
                    res.push(item);
                }
            });
        };

        process(this.children);

        return res;
    }

    private onColumnVisibilityChanged(): void {
        this.setExpandable();
    }

    public addEventListener(eventType: string, listener: Function): void {
        this.localEventService.addEventListener(eventType, listener);
    }

    public removeEventListener(eventType: string, listener: Function): void {
        this.localEventService.removeEventListener(eventType, listener);
    }
}
