import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { RowNode } from '../entities/rowNode';
import { Column } from '../entities/column';
import { SuppressHeaderKeyboardEventParams, SuppressKeyboardEventParams } from '../entities/colDef';
import { isBrowserEdge, isBrowserIE } from './browser';
import { ColumnGroup } from '../entities/columnGroup';
import { exists } from './generic';

const NUMPAD_DEL_NUMLOCK_ON_KEY = 'Del';
const NUMPAD_DEL_NUMLOCK_ON_CHARCODE = 46;

export function isKeyPressed(event: KeyboardEvent, keyToCheck: number) {
    return (event.which || event.keyCode) === keyToCheck;
}

export function isEventFromPrintableCharacter(event: KeyboardEvent): boolean {
    // no allowed printable chars have alt or ctrl key combinations
    if (event.altKey || event.ctrlKey || event.metaKey) { return false; }

    // if key is length 1, eg if it is 'a' for the a key, or '2' for the '2' key.
    // non-printable characters have names, eg 'Enter' or 'Backspace'.
    const printableCharacter = event.key.length === 1;

    // IE11 & Edge treat the numpad del key differently - with numlock on we get "Del" for key,
    // so this addition checks if its IE11/Edge and handles that specific case the same was as all other browsers
    const numpadDelWithNumlockOnForEdgeOrIe = isNumpadDelWithNumlockOnForEdgeOrIe(event);

    return printableCharacter || numpadDelWithNumlockOnForEdgeOrIe;
}

/**
 * Allows user to tell the grid to skip specific keyboard events
 * @param {GridOptionsWrapper} gridOptionsWrapper
 * @param {KeyboardEvent} keyboardEvent
 * @param {RowNode} rowNode
 * @param {Column} column
 * @param {boolean} editing
 * @returns {boolean}
 */
export function isUserSuppressingKeyboardEvent(
    gridOptionsWrapper: GridOptionsWrapper,
    keyboardEvent: KeyboardEvent,
    rowNode: RowNode,
    column: Column,
    editing: boolean
): boolean {
    const gridOptionsFunc = gridOptionsWrapper.getSuppressKeyboardEventFunc();
    const colDefFunc = column ? column.getColDef().suppressKeyboardEvent : undefined;

    // if no callbacks provided by user, then do nothing
    if (!gridOptionsFunc && !colDefFunc) { return false; }

    const params: SuppressKeyboardEventParams = {
        event: keyboardEvent,
        editing,
        column,
        api: gridOptionsWrapper.getApi(),
        node: rowNode,
        data: rowNode.data,
        colDef: column.getColDef(),
        context: gridOptionsWrapper.getContext(),
        columnApi: gridOptionsWrapper.getColumnApi()
    };

    // colDef get first preference on suppressing events
    if (colDefFunc) {
        const colDefFuncResult = colDefFunc(params);
        // if colDef func suppressed, then return now, no need to call gridOption func
        if (colDefFuncResult) { return true; }
    }

    if (gridOptionsFunc) {
        // if gridOption func, return the result
        return gridOptionsFunc(params);
    }

    // otherwise return false, don't suppress, as colDef didn't suppress and no func on gridOptions
    return false;
}

export function isUserSuppressingHeaderKeyboardEvent(
    gridOptionsWrapper: GridOptionsWrapper,
    keyboardEvent: KeyboardEvent,
    headerRowIndex: number,
    column: Column | ColumnGroup
): boolean {
    const colDef = column.getDefinition();
    const colDefFunc = colDef && colDef.suppressHeaderKeyboardEvent;

    if (!exists(colDefFunc)) { return false; }

    const params: SuppressHeaderKeyboardEventParams = {
        api: gridOptionsWrapper.getApi(),
        columnApi: gridOptionsWrapper.getColumnApi(),
        context: gridOptionsWrapper.getContext(),
        colDef: colDef,
        column,
        headerRowIndex,
        event: keyboardEvent
    };

    return !!colDefFunc(params);
}

function isNumpadDelWithNumlockOnForEdgeOrIe(event: KeyboardEvent) {
    return (isBrowserEdge() || isBrowserIE()) &&
        event.key === NUMPAD_DEL_NUMLOCK_ON_KEY &&
        event.charCode === NUMPAD_DEL_NUMLOCK_ON_CHARCODE;
}
