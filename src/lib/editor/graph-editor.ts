// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Edge, Machine } from "../automata/machine.ts";
import type { EdgeGroup } from "../graph/geometry.ts";

export type Tool = "select" | "state" | "transition" | "delete";

export type Selection = { kind: "state"; id: string } | { kind: "edge"; from: string; to: string } | null;

/** Contract between the generic graph canvas and a machine specific editor (FA today, PDA/TM later). */
export interface GraphEditor<T extends Edge = Edge> {
    readonly machine: Machine<T>;
    tool: Tool;
    selection: Selection;

    /** Captures the machine before a multi-step change such as dragging; pass it to {@link GraphEditor.commit} afterwards. */
    snapshot(): Machine<T>;

    /** Records a snapshot taken before a change on the undo stack. */
    commit(before: Machine<T>): void;

    addState(x: number, y: number): string;
    moveState(id: string, x: number, y: number): void;

    /** Renames a state; returns a German error message, or null on success. */
    renameState(id: string, name: string): string | null;

    toggleInitial(id: string): void;
    toggleFinal(id: string): void;
    clearLabel(id: string): void;
    deleteState(id: string): void;
    deleteEdge(from: string, to: string): void;

    /** Repositions all states with an automatic layout as one undoable step. */
    arrange(): void;

    /** Formats the label of an edge group as shown on the canvas. */
    edgeLabel(group: EdgeGroup<T>): string;

    /** Editable text of the edge between two states, empty if there is no edge yet. */
    edgeText(from: string, to: string): string;

    /** Replaces all transitions between two states by the parsed text; returns a German error message, or null on success. */
    applyEdgeText(from: string, to: string, text: string): string | null;

    /** Placeholder for the inline edge editor, e.g. "0, 1 oder leer für ε". */
    readonly edgeHint: string;
}
