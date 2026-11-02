// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import {compareSymbols, type FiniteAutomaton, initialStateOf, unreachableStates} from "../automata/fa/model.ts";
import {naturalCompare} from "../automata/machine.ts";
import {END_MARKER, type Grammar, isNonterminal, type Production, tokenize} from "./grammar.ts";

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

function nonterminalName(index: number): string {
    const round = Math.floor(index / NONTERMINAL_LETTERS.length);
    return `${NONTERMINAL_LETTERS[index % NONTERMINAL_LETTERS.length]}${round === 0 ? "" : round}`;
}

function isTerminalText(symbol: string): boolean {
    const tokens = tokenize(symbol);
    return tokens.join("") === symbol && !tokens.some(isNonterminal) && !tokens.includes(END_MARKER) && !tokens.includes("|");
}
