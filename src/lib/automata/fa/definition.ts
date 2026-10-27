// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { EPSILON, formatSet, naturalCompare } from "../machine.ts";
import { alphabetOf, type FiniteAutomaton, isDeterministic } from "./model.ts";

export interface TransitionRow {
    state: string;
    initial: boolean;
    final: boolean;
    /** Successor names per column, sorted. */
    cells: string[][];
}

/** The 5-tuple A = (Q, Σ, δ, q0, F) in a renderer independent form. */
export interface FormalDefinition {
    name: string;
    title: string;
    states: string[];
    alphabet: string[];
    initial: string | null;
    finals: string[];
    deterministic: boolean;
    /** Table columns as stored symbols; ε ("") is appended if ε-transitions exist. */
    columns: string[];
    rows: TransitionRow[];
}

/** Derives the formal definition from an automaton, with states sorted by name. */
export function formalDefinition(fa: FiniteAutomaton, name = "A"): FormalDefinition {
    const names = new Map(fa.states.map((state) => [state.id, state.name]));
    const states = [...fa.states].sort((a, b) => naturalCompare(a.name, b.name));
    const alphabet = alphabetOf(fa);
    const columns = fa.transitions.some((t) => t.symbol === "") ? [...alphabet, ""] : alphabet;
    return {
        name,
        title: fa.title,
        states: states.map((state) => state.name),
        alphabet,
        initial: fa.states.find((state) => state.initial)?.name ?? null,
        finals: states.filter((state) => state.final).map((state) => state.name),
        deterministic: isDeterministic(fa),
        columns,
        rows: states.map((state) => ({
            state: state.name,
            initial: state.initial,
            final: state.final,
            cells: columns.map((symbol) => {
                const targets = fa.transitions.filter((t) => t.from === state.id && t.symbol === symbol).map((t) => names.get(t.to)!);
                return [...new Set(targets)].sort(naturalCompare);
            }),
        })),
    };
}

/** Formats the signature of δ depending on determinism and ε-transitions, e.g. "δ: Q × Σ → 𝒫(Q)". */
export function transitionSignature(definition: FormalDefinition): string {
    if (definition.deterministic) {
        return "δ: Q × Σ → Q";
    }
    const domain = definition.columns.includes("") ? `Q × (Σ ∪ {${EPSILON}})` : "Q × Σ";
    return `δ: ${domain} → 𝒫(Q)`;
}

/** Formats one table cell: a DFA shows a single state or "–", an NFA a set or "∅". */
export function formatCell(definition: FormalDefinition, targets: readonly string[]): string {
    if (definition.deterministic) {
        return targets[0] ?? "–";
    }
    return formatSet(targets);
}
