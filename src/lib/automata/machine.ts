// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** Display symbol for the empty word. Stored internally as the empty string, like JFLAP does. */
export const EPSILON = "ε";

/** A state as drawn on the canvas; shared by all machine types. */
export interface StateNode {
    id: string;
    name: string;
    /** Optional secondary text shown below the state, e.g. the subset after a powerset construction. */
    label?: string;
    x: number;
    y: number;
    initial: boolean;
    final: boolean;
}

/** A directed edge between two states; machine types extend it with their transition payload. */
export interface Edge {
    id: string;
    from: string;
    to: string;
}

/** Common shape of every machine that is edited as a state graph (FA, PDA, TM). */
export interface Machine<T extends Edge = Edge> {
    kind: string;
    title: string;
    states: StateNode[];
    transitions: T[];
}

/** Generates a short random id that is unique within a document. */
export function createId(): string {
    return Math.random().toString(36).slice(2, 10);
}

/** Compares state names or symbols naturally so that q2 sorts before q10. */
export function naturalCompare(a: string, b: string): number {
    return a.localeCompare(b, "de", { numeric: true });
}

/** Proposes the lowest unused state name prefix + n. */
export function nextStateName(states: readonly StateNode[], prefix = "q"): string {
    const used = new Set(states.map((state) => state.name));
    let index = 0;
    while (used.has(`${prefix}${index}`)) {
        index++;
    }
    return `${prefix}${index}`;
}
