// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { layeredLayout } from "../../graph/layout.ts";
import { createId, naturalCompare, type StateNode } from "../machine.ts";
import { alphabetOf, type FaTransition, type FiniteAutomaton, initialStateOf } from "./model.ts";
import { epsilonClosure, move } from "./simulate.ts";

/**
 * Converts an NFA into an equivalent complete DFA using the powerset construction.
 * Only reachable subsets are created, the empty subset becomes a trap state and state labels name the subsets.
 * @throws Error if the automaton has no initial state
 */
export function toDfa(fa: FiniteAutomaton): FiniteAutomaton {
    const initial = initialStateOf(fa);
    if (!initial) {
        throw new Error("Der Automat hat keinen Startzustand.");
    }
    const alphabet = alphabetOf(fa);
    const names = new Map(fa.states.map((state) => [state.id, state.name]));
    const finals = new Set(fa.states.filter((state) => state.final).map((state) => state.id));
    const keyOf = (set: ReadonlySet<string>) => [...set].map((id) => names.get(id)!).sort(naturalCompare).join(",");

    const subsets: Set<string>[] = [];
    const indexByKey = new Map<string, number>();
    const edges: { from: number; to: number; symbol: string }[] = [];
    const enqueue = (set: Set<string>) => {
        const key = keyOf(set);
        let index = indexByKey.get(key);
        if (index === undefined) {
            index = subsets.length;
            indexByKey.set(key, index);
            subsets.push(set);
        }
        return index;
    };

    enqueue(epsilonClosure(fa, [initial.id]));
    for (let i = 0; i < subsets.length; i++) {
        for (const symbol of alphabet) {
            const target = enqueue(epsilonClosure(fa, move(fa, subsets[i], symbol)));
            edges.push({ from: i, to: target, symbol });
        }
    }

    const states: StateNode[] = subsets.map((set, i) => ({
        id: createId(),
        name: `q${i}`,
        label: set.size === 0 ? "∅" : `{${keyOf(set).split(",").join(", ")}}`,
        x: 0,
        y: 0,
        initial: i === 0,
        final: [...set].some((id) => finals.has(id)),
    }));
    const transitions: FaTransition[] = edges.map((edge) => ({
        id: createId(),
        from: states[edge.from].id,
        to: states[edge.to].id,
        symbol: edge.symbol,
    }));
    const positions = layeredLayout(states, transitions);
    for (const state of states) {
        Object.assign(state, positions.get(state.id));
    }
    return { kind: "fa", title: `${fa.title} (DEA)`, states, transitions };
}

