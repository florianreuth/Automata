// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { type Edge, EPSILON, type Machine, naturalCompare, type StateNode } from "../machine.ts";

/** A single FA transition; an empty symbol is an ε-transition. */
export interface FaTransition extends Edge {
    symbol: string;
}

/** A (non)deterministic finite automaton. */
export interface FiniteAutomaton extends Machine<FaTransition> {
    kind: "fa";
}

export function createFiniteAutomaton(title = "Unbenannter Automat"): FiniteAutomaton {
    return { kind: "fa", title, states: [], transitions: [] };
}

/** Sorted input alphabet, collected from all non-ε transitions. */
export function alphabetOf(fa: FiniteAutomaton): string[] {
    const symbols = new Set(fa.transitions.map((t) => t.symbol).filter((symbol) => symbol !== ""));
    return [...symbols].sort(naturalCompare);
}

export function initialStateOf(fa: FiniteAutomaton): StateNode | undefined {
    return fa.states.find((state) => state.initial);
}

/** States without a path from the initial state; empty if no initial state is marked. */
export function unreachableStates(fa: FiniteAutomaton): StateNode[] {
    const initial = initialStateOf(fa);
    if (!initial) {
        return [];
    }
    const reached = new Set([initial.id]);
    const stack = [initial.id];
    while (stack.length > 0) {
        const current = stack.pop()!;
        for (const t of fa.transitions) {
            if (t.from === current && !reached.has(t.to)) {
                reached.add(t.to);
                stack.push(t.to);
            }
        }
    }
    return fa.states.filter((state) => !reached.has(state.id));
}

/** True if there are no ε-transitions and every state has at most one successor per symbol. */
export function isDeterministic(fa: FiniteAutomaton): boolean {
    const seen = new Set<string>();
    for (const transition of fa.transitions) {
        if (transition.symbol === "") {
            return false;
        }
        const key = `${transition.from}\u0000${transition.symbol}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
    }
    return true;
}

/** True for a deterministic automaton with exactly one successor per state and alphabet symbol. */
export function isComplete(fa: FiniteAutomaton): boolean {
    if (!isDeterministic(fa)) {
        return false;
    }
    const alphabet = alphabetOf(fa);
    return fa.states.every((state) => alphabet.every((symbol) => fa.transitions.some((t) => t.from === state.id && t.symbol === symbol)));
}

/** Formats a stored symbol for display, the empty string becomes ε. */
export function displaySymbol(symbol: string): string {
    return symbol === "" ? EPSILON : symbol;
}

/** Parses an edge label such as "0, 1, ε" into distinct stored symbols, or returns a German error message. */
export function parseSymbols(input: string): { symbols: string[] } | { error: string } {
    const parts = input.split(/[,\s]+/).filter((part) => part.length > 0);
    if (parts.length === 0) {
        return { symbols: [""] };
    }
    const symbols = new Set<string>();
    for (const part of parts) {
        if (part === EPSILON || part === "λ" || part.toLowerCase() === "eps") {
            symbols.add("");
        } else if ([...part].length === 1) {
            symbols.add(part);
        } else {
            return { error: `„${part}“ ist kein einzelnes Zeichen. Mehrere Symbole mit Komma trennen.` };
        }
    }
    return { symbols: [...symbols] };
}

/** Formats stored symbols as an edge label such as "0, 1, ε". */
export function formatSymbols(symbols: readonly string[]): string {
    return [...symbols].sort(compareSymbols).map(displaySymbol).join(", ");
}

/** Label of an edge that combines the given transitions, e.g. "0, 1, ε". */
export function transitionLabel(transitions: readonly FaTransition[]): string {
    return formatSymbols(transitions.map((t) => t.symbol));
}

/** Sorts ε last and everything else naturally. */
export function compareSymbols(a: string, b: string): number {
    if (a === "" || b === "") {
        return a === b ? 0 : a === "" ? 1 : -1;
    }
    return naturalCompare(a, b);
}
