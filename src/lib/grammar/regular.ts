// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import {compareSymbols, type FaTransition, type FiniteAutomaton, initialStateOf, unreachableStates} from "../automata/fa/model.ts";
import {createId, naturalCompare, nextStateName, type StateNode} from "../automata/machine.ts";
import {applyLayout} from "../graph/layout.ts";
import {END_MARKER, type Grammar, isNonterminal, linearity, nonterminalsOf, type Production, tokenize} from "./grammar.ts";

const START_SYMBOL = "S";
const NONTERMINAL_LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((letter) => letter !== START_SYMBOL);

/**
 * Converts an automaton into an equivalent right-linear grammar: q -a→ p becomes Q → aP, q -ε→ p becomes Q → P
 * and a final state Q gets Q → ε. The initial state is S, the other reachable states follow as A, B, …, A1, B1, …
 * @throws Error if there is no initial state, the language is trivially empty or a symbol cannot be written as a terminal
 */
export function faToGrammar(fa: FiniteAutomaton): Grammar {
    const initial = initialStateOf(fa);
    if (!initial) {
        throw new Error("Der Automat hat keinen Startzustand.");
    }
    for (const symbol of new Set(fa.transitions.map((t) => t.symbol))) {
        if (!isTerminalText(symbol)) {
            throw new Error(`Das Symbol „${symbol}“ lässt sich nicht als Terminal schreiben (keine Großbuchstaben, Leerzeichen, |, ${END_MARKER}, ε oder λ).`);
        }
    }

    const unreachable = new Set(unreachableStates(fa).map((state) => state.id));
    const others = fa.states.filter((state) => state !== initial && !unreachable.has(state.id)).sort((a, b) => naturalCompare(a.name, b.name));
    const nonterminals = new Map([[initial.id, START_SYMBOL], ...others.map((state, i): [string, string] => [state.id, nonterminalName(i)])]);
    const order = [...nonterminals.keys()];

    const productions: Production[] = [];
    for (const state of [initial, ...others]) {
        const left = [nonterminals.get(state.id)!];
        const outgoing = fa.transitions
            .filter((t) => t.from === state.id)
            .sort((a, b) => compareSymbols(a.symbol, b.symbol) || order.indexOf(a.to) - order.indexOf(b.to));
        const seen = new Set<string>();
        for (const t of outgoing) {
            const right = [...(t.symbol === "" ? [] : [t.symbol]), nonterminals.get(t.to)!];
            const key = right.join("\u0000");
            if (!seen.has(key)) {
                seen.add(key);
                productions.push({left, right});
            }
        }
        if (state.final) {
            productions.push({left, right: []});
        }
    }
    if (productions.length === 0) {
        throw new Error("Der Automat akzeptiert kein Wort, daher gibt es keine Produktionen.");
    }
    return {start: START_SYMBOL, productions};
}

/**
 * Converts a regular grammar into an equivalent ε-NFA with one state per nonterminal, named after it, and q0, q1, … in between.
 * Right-linear A → wB becomes a path A -w→ B from S; left-linear A → Bw becomes B -w→ A from a new initial state, ending in S.
 * @throws Error if the grammar is neither right- nor left-linear
 */
export function grammarToFa(grammar: Grammar, title: string): FiniteAutomaton {
    const side = linearity(grammar);
    if (!side) {
        throw new Error("Nur reguläre Grammatiken (rechts- oder linkslinear) lassen sich in einen Automaten umwandeln.");
    }
    const states: StateNode[] = [];
    const transitions: FaTransition[] = [];
    const addState = (name = nextStateName(states)) => {
        const state = {id: createId(), name, x: 0, y: 0, initial: false, final: false};
        states.push(state);
        return state;
    };
    const path = (from: StateNode, word: readonly string[], to: StateNode) => {
        const stops = [from, ...word.slice(1).map(() => addState()), to];
        for (const [i, symbol] of (word.length === 0 ? [""] : word).entries()) {
            transitions.push({id: createId(), from: stops[i].id, to: stops[i + 1].id, symbol});
        }
    };

    const nonterminals = new Map(nonterminalsOf(grammar).map((symbol) => [symbol, addState(symbol)]));
    const start = nonterminals.get(grammar.start)!;
    let accept: StateNode | undefined;
    if (side === "right") {
        start.initial = true;
        for (const {left, right} of grammar.productions) {
            const from = nonterminals.get(left[0])!;
            const last = right.at(-1);
            if (last !== undefined && isNonterminal(last)) {
                path(from, right.slice(0, -1), nonterminals.get(last)!);
            } else if (right.length === 0) {
                from.final = true;
            } else {
                if (!accept) {
                    accept = addState();
                    accept.final = true;
                }
                path(from, right, accept);
            }
        }
    } else {
        const initial = addState();
        initial.initial = true;
        start.final = true;
        for (const {left, right} of grammar.productions) {
            const to = nonterminals.get(left[0])!;
            const first = right[0];
            if (first !== undefined && isNonterminal(first)) {
                path(nonterminals.get(first)!, right.slice(1), to);
            } else {
                path(initial, right, to);
            }
        }
    }
    applyLayout(states, transitions);
    return {kind: "fa", title, states, transitions};
}

function nonterminalName(index: number): string {
    const round = Math.floor(index / NONTERMINAL_LETTERS.length);
    return `${NONTERMINAL_LETTERS[index % NONTERMINAL_LETTERS.length]}${round === 0 ? "" : round}`;
}

function isTerminalText(symbol: string): boolean {
    const tokens = tokenize(symbol);
    return tokens.join("") === symbol && !tokens.some(isNonterminal) && !tokens.includes(END_MARKER) && !tokens.includes("|");
}
