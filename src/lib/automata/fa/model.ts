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

/**
 * Creates an empty automaton.
 * @param title document title
 * @return a new automaton without states
 */
export function createFiniteAutomaton(title = "Unbenannter Automat"): FiniteAutomaton {
    return { kind: "fa", title, states: [], transitions: [] };
}

/**
 * Collects the input alphabet from all non-ε transitions.
 * @param fa the automaton
 * @return the sorted symbols
 */
export function alphabetOf(fa: FiniteAutomaton): string[] {
    const symbols = new Set(fa.transitions.map((t) => t.symbol).filter((symbol) => symbol !== ""));
    return [...symbols].sort(naturalCompare);
}

/**
 * Returns the initial state.
 * @param fa the automaton
 * @return the initial state or undefined if none is marked
 */
export function initialStateOf(fa: FiniteAutomaton): StateNode | undefined {
    return fa.states.find((state) => state.initial);
}

/**
 * Checks for ε-transitions and multiple transitions on the same symbol.
 * @param fa the automaton
 * @return true if every state has at most one successor per symbol and there are no ε-transitions
 */
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

/**
 * Checks whether every state has exactly one successor per alphabet symbol.
 * @param fa the automaton
 * @return true for a deterministic automaton with a total transition function
 */
export function isComplete(fa: FiniteAutomaton): boolean {
    if (!isDeterministic(fa)) {
        return false;
    }
    const alphabet = alphabetOf(fa);
    return fa.states.every((state) => alphabet.every((symbol) => fa.transitions.some((t) => t.from === state.id && t.symbol === symbol)));
}

/**
 * Formats a stored symbol for display.
 * @param symbol stored symbol, empty for ε
 * @return the symbol or ε
 */
export function displaySymbol(symbol: string): string {
    return symbol === "" ? EPSILON : symbol;
}

/**
 * Parses an edge label such as "0, 1, ε" into stored symbols.
 * @param input user input, symbols separated by commas or whitespace
 * @return the distinct symbols (empty string for ε) or an error message in German
 */
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

/**
 * Formats the symbols of all transitions between two states as an edge label.
 * @param symbols stored symbols
 * @return e.g. "0, 1, ε"
 */
export function formatSymbols(symbols: readonly string[]): string {
    return [...symbols].sort(compareSymbols).map(displaySymbol).join(", ");
}

/**
 * Sorts ε last and everything else naturally.
 * @param a first stored symbol
 * @param b second stored symbol
 * @return comparison result
 */
export function compareSymbols(a: string, b: string): number {
    if (a === "" || b === "") {
        return a === b ? 0 : a === "" ? 1 : -1;
    }
    return naturalCompare(a, b);
}
