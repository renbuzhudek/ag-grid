import {Node} from "./node";
import {Scene} from "./scene";
import {Group} from "./group";

type ValueFn<P, GDatum, PDatum> = (parent: P, data: PDatum, index: number, groups: (P | undefined)[]) => GDatum[];
type KeyFn<N, G, GDatum> = (node: N, datum: GDatum, index: number, groups: (G | undefined)[]) => string;
type NodeCallback<G, GDatum> = (node: G, datum: GDatum, index: number, group: (G | undefined)[]) => void;
type NodeSelector<N, G, GDatum> = (node: G, datum: GDatum, index: number, group: (G | undefined)[]) => N;
type NodeSelectorAll<N, G, GDatum> = (node: G, datum: GDatum, index: number, group: (G | undefined)[]) => N[];

export class EnterNode {

    constructor(parent: Node | EnterNode, datum: any) {
        this.scene = parent.scene;
        this.parent = parent;
        this.datum = datum;
    }

    scene: Scene | null;
    parent: Node | EnterNode;
    datum: any;
    next: Node | EnterNode | null = null;

    appendChild<T extends Node>(node: T): T {
        if (!Group.isGroup(this.parent)) {
            throw new Error(`${this.parent} cannot have any children.`);
        }
        // if (!Node.isNode(this.next)) {
        //     throw new Error(`${this.next} cannot be appended to ${this.parent}.`);
        // }
        if (this.next && !Node.isNode(this.next)) {
            throw new Error(`${this.next} is not a Node.`);
        }
        return this.parent.insertBefore(node, this.next);
    }

    insertBefore<T extends Node>(node: T, nextNode?: Node | null): T {
        if (!Group.isGroup(this.parent)) {
            throw new Error(`${this.parent} cannot have any children.`);
        }
        return this.parent.insertBefore(node, nextNode);
    }
}

/**
 * G - type of the selected node(s).
 * GDatum - type of the datum of the selected node(s).
 * P - type of the parent node(s).
 * PDatum - type of the datum of the parent node(s).
 */
export class Selection<G extends Node | EnterNode, P extends Node | EnterNode, GDatum = any, PDatum = any> {

    constructor(groups: (G | undefined)[][], parents: (P | undefined)[]) {
        this.groups = groups;
        this.parents = parents;
    }

    groups: (G | undefined)[][];
    parents: (P | undefined)[];

    private static root = [undefined];

    static select<T extends Node>(node: T | (() => T)) {
        return new Selection([[typeof node === 'function' ? node() : node]], Selection.root);
    }

    static selectAll<G extends Node>(nodes?: G[] | null) {
        return new Selection([nodes == null ? [] : nodes], Selection.root);
    }

    append<N extends Node>(Class: new () => N): Selection<N, G, GDatum, GDatum> {
        return this.select<N>(node => {
            return node.appendChild(new Class());
        });
    }

    appendFn<N extends Node>(creator: NodeSelector<N, G, GDatum>): Selection<N, G, GDatum, GDatum> {
        return this.select<N>((node, data, index, group) => {
            return node.appendChild(creator(node, data, index, group));
        });
    }

    /**
     * Runs the given selector that returns a single node for every node in each group.
     * The original nodes are then replaced by the nodes returned by the selector
     * and returned as a new selection.
     * The selected nodes inherit the datums and the parents of the original nodes.
     */
    select<N extends Node>(selector: (node: G, datum: GDatum, index: number, group: (G | undefined)[]) => N): Selection<N, G, GDatum, GDatum> {
        const groups = this.groups;
        const numGroups = groups.length;

        const subgroups: N[][] = [];

        for (let j = 0; j < numGroups; j++) {
            const group = groups[j];
            const groupSize = group.length;
            const subgroup = subgroups[j] = new Array<N>(groupSize);

            for (let i = 0; i < groupSize; i++) {
                const node = group[i];

                if (node) {
                    const subnode = selector(node, node.datum, i, group);

                    if (subnode) {
                        subnode.datum = node.datum;
                    }
                    subgroup[i] = subnode;
                }
                // else this can be a group of the `enter` selection,
                // for example, with no nodes at the i-th position,
                // only nodes at the end of the group
            }
        }

        return new Selection<N, G, GDatum, GDatum>(subgroups, this.parents as (G | undefined)[]);
    }

    private selectNone(): [] {
        return [];
    }

    /**
     * Runs the given selector that returns a group of nodes for every node in each group.
     * The original nodes are then replaced by the groups of nodes returned by the selector
     * and returned as a new selection. The original nodes become the parent nodes for each
     * group in the new selection. The selected nodes do not inherit the datums of the original nodes.
     */
    selectAll<N extends Node, NDatum = any>(
        selectorAll?: (node: G, datum: GDatum, index: number, group: (G | undefined)[]) => N[]
    ): Selection<N, G, NDatum, GDatum> {

        if (!selectorAll) {
            selectorAll = this.selectNone;
        }

        // Each subgroup is populated with the selector (run on each group node) results.
        const subgroups: N[][] = [];
        // In the new selection that we return, subgroups become groups,
        // and group nodes become parents.
        const parents: G[] = [];

        const groups = this.groups;
        const groupCount = groups.length;

        for (let j = 0; j < groupCount; j++) {
            const group = groups[j];
            const groupLength = group.length;

            for (let i = 0; i < groupLength; i++) {
                const node = group[i];

                if (Group.isGroup(node)) {
                    subgroups.push(selectorAll(node, node.datum, i, group));
                    parents.push(node);
                }
                else {
                    throw new Error(`${node} is not a Group node.`);
                }
            }
        }

        return new Selection<N, G, NDatum, GDatum>(subgroups, parents);
    }

    /**
     * Runs the given callback for every node in the selection.
     * @param cb
     */
    each(cb: (node: G, datum: GDatum, index: number, group: (G | undefined)[]) => void): this {
        const groups = this.groups;
        const numGroups = groups.length;

        for (let j = 0; j < numGroups; j++) {
            const group = groups[j];
            const groupSize = group.length;

            for (let i = 0; i < groupSize; i++) {
                const node = group[i];

                if (node) {
                    cb(node, node.datum as GDatum, i, group);
                }
            }
        }

        return this;
    }

    remove(): this {
        return this.each(node => {
            if (Node.isNode(node)) {
                const parent = node.parent;
                if (parent) {
                    parent.removeChild(node);
                }
            }
        });
    }

    merge(other: Selection<G, P, GDatum, PDatum>): Selection<G, P, GDatum, PDatum> {
        const groups0 = this.groups;
        const groups1 = other.groups;
        const m0 = groups0.length;
        const m1 = groups1.length;
        const m = Math.min(m0, m1);
        const merges = new Array<(G | undefined)[]>(m0);

        let j = 0;

        for (; j < m; j++) {
            const group0 = groups0[j];
            const group1 = groups1[j];
            const n = group0.length;
            const merge = merges[j] = new Array<G | undefined>(n);

            for (let i = 0; i < n; i++) {
                const node = group0[i] || group1[i];

                merge[i] = node || undefined;
            }
        }

        for (; j < m0; j++) {
            merges[j] = groups0[j];
        }

        return new Selection<G, P, GDatum, PDatum>(merges, this.parents);
    }

    node(): G | null {
        const groups = this.groups;
        const numGroups = groups.length;

        for (let j = 0; j < numGroups; j++) {
            const group = groups[j];
            const groupSize = group.length;

            for (let i = 0; i < groupSize; i++) {
                const node = group[i];

                if (node) {
                    return node;
                }
            }
        }

        return null;
    }

    attr<K extends keyof G>(name: K, value: Exclude<G[K], Function>): this {
        this.each(node => {
            node[name] = value;
        });

        return this;
    }

    attrFn<K extends keyof G>(name: K, value: (node: G, datum: GDatum, index: number, group: (G | undefined)[]) => Exclude<G[K], Function>): this {
        this.each((node, datum, index, group) => {
            node[name] = value(node, datum, index, group);
        });

        return this;
    }

    call(cb: (selection: this) => void) {
        cb(this);

        return this;
    }

    get size(): number {
        let size = 0;

        this.each(() => size++);

        return size;
    }

    get data(): GDatum[] {
        const data: GDatum[] = [];

        this.each((_, datum) => data.push(datum));

        return data;
    }

    private enterGroups?: (EnterNode | undefined)[][];
    private exitGroups?: (G | undefined)[][];

    get enter() {
        return new Selection<EnterNode, Node | EnterNode, GDatum, PDatum>(this.enterGroups ? this.enterGroups : [[]], this.parents);
    }

    get exit() {
        return new Selection<Node | EnterNode, Node | EnterNode, GDatum, PDatum>(this.exitGroups ? this.exitGroups : [[]], this.parents);
    }

    setDatum<GDatum>(value: GDatum): Selection<G, P, GDatum, PDatum> {
        const node = this.node();

        if (node) {
            node.datum = value;
        }

        return this as unknown as Selection<G, P, GDatum, PDatum>;
    }

    setData<GDatum>(value: GDatum[] | ValueFn<P, GDatum, PDatum>,
                    key?: KeyFn<Node | EnterNode, G | GDatum, GDatum>) {

        if (typeof value !== 'function') {
            const data = value;
            value = () => data;
        }

        const groups = this.groups;
        const parents = this.parents;
        const numGroups = groups.length;
        const updateGroups: (G | undefined)[][] = new Array(numGroups);
        const enterGroups: (EnterNode | undefined)[][] = new Array(numGroups);
        const exitGroups: (G | undefined)[][] = new Array(numGroups);

        for (let j = 0; j < numGroups; j++) {
            const group = groups[j];
            const parent = parents[j];

            if (!parent) {
                throw new Error(`Group #${j} has no parent: ${group}`);
            }

            const groupSize = group.length;
            const data: GDatum[] = value(parent, parent.datum, j, parents);
            const dataSize = data.length;

            const enterGroup = enterGroups[j] = new Array<EnterNode | undefined>(dataSize);
            const updateGroup = updateGroups[j] = new Array<G | undefined>(dataSize);
            const exitGroup = exitGroups[j] = new Array<G | undefined>(groupSize);

            if (key)
                this.bindKey(parent, group, enterGroup, updateGroup, exitGroup, data, key);
            else
                this.bindIndex(parent, group, enterGroup, updateGroup, exitGroup, data);

            // Now connect the enter nodes to their following update node, such that
            // appendChild can insert the materialized enter node before this node,
            // rather than at the end of the parent node.
            for (let i0 = 0, i1 = 0; i0 < dataSize; i0++) {
                const previous = enterGroup[i0];
                if (previous) {
                    if (i0 >= i1) {
                        i1 = i0 + 1;
                    }
                    let next;
                    while (!(next = updateGroup[i1]) && ++i1 < dataSize);
                    previous.next = next || null;
                }
            }
        }

        const result = new Selection<G, P, GDatum, PDatum>(updateGroups, parents);
        result.enterGroups = enterGroups;
        result.exitGroups = exitGroups;

        return result;
    }

    private bindIndex<GDatum>(parent: P, group: (G | undefined)[],
                              enter: (EnterNode | undefined)[], update: (G | undefined)[], exit: (G | undefined)[],
                              data: GDatum[]) {

        const groupSize = group.length;
        const dataSize = data.length;

        let i = 0;

        for (; i < dataSize; i++) {
            const node = group[i];

            if (node) {
                node.datum = data[i];
                update[i] = node;
            } else { // more datums than group nodes
                enter[i] = new EnterNode(parent, data[i]);
            }
        }

        // more group nodes than datums
        for (; i < groupSize; i++) {
            const node = group[i];

            if (node) {
                exit[i] = node;
            }
        }
    }

    private static keyPrefix = '$'; // Protect against keys like '__proto__'.

    private bindKey<GDatum>(parent: P, group: (G | undefined)[],
                            enter: (EnterNode | undefined)[], update: (G | undefined)[], exit: (G | undefined)[],
                            data: GDatum[], key: KeyFn<Node | EnterNode, G | GDatum, GDatum>) {
        // Compute the key for each node.
        // If multiple nodes have the same key, the duplicates are added to exit.
        const groupSize = group.length;
        const dataSize = data.length;
        const keyValues = new Array(groupSize);
        const nodeByKeyValue: { [key: string]: G | undefined } = {};

        // Compute the key for each node.
        // If multiple nodes have the same key, the duplicates are added to exit.
        for (let i = 0; i < groupSize; i++) {
            const node = group[i];

            if (node) {
                const keyValue = keyValues[i] = Selection.keyPrefix + key(node, node.datum, i, group);
                if (keyValue in nodeByKeyValue)
                    exit[i] = node;
                else
                    nodeByKeyValue[keyValue] = node;
            }
        }

        // Compute the key for each datum.
        // If there a node associated with this key, join and add it to update.
        // If there is not (or the key is a duplicate), add it to enter.
        for (let i = 0; i < dataSize; i++) {
            const keyValue = Selection.keyPrefix + key(parent, data[i], i, data);
            const node = nodeByKeyValue[keyValue];

            if (node) {
                update[i] = node;
                node.datum = data[i];
                nodeByKeyValue[keyValue] = undefined;
            } else {
                enter[i] = new EnterNode(parent, data[i]);
            }
        }

        // Add any remaining nodes that were not bound to data to exit.
        for (let i = 0; i < groupSize; i++) {
            const node = group[i];

            if (node && (nodeByKeyValue[keyValues[i]] === node)) {
                exit[i] = node;
            }
        }
    }
}
