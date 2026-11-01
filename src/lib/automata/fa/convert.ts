// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { applyLayout } from "../../graph/layout.ts";
import { createId, formatSet, naturalCompare, type StateNode } from "../machine.ts";
import { alphabetOf, type FaTransition, type FiniteAutomaton, initialStateOf, isDeterministic } from "./model.ts";
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
    const sortedNames = (set: ReadonlySet<string>) => [...set].map((id) => names.get(id)!).sort(naturalCompare);
    const keyOf = (set: ReadonlySet<string>) => sortedNames(set).join(",");

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
        label: formatSet(sortedNames(set)),
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
    applyLayout(states, transitions);
    return { kind: "fa", title: `${fa.title} (DEA)`, states, transitions };
}

/**
 * Converts an automaton into the minimal complete DFA of its language using Moore's partition refinement.
 * NFAs are determinized first. For DFA input, state labels list the merged original states (∅ for an added trap state).
 * @throws Error if the automaton has no initial state
 */
export function minimizeDfa(fa: FiniteAutomaton): FiniteAutomaton {
    const deterministic = isDeterministic(fa);
    const dfa = deterministic ? fa : toDfa(fa);
    const initial = initialStateOf(dfa);
    if (!initial) {
        throw new Error("Der Automat hat keinen Startzustand.");
    }
    const alphabet = alphabetOf(dfa);
    const { states, delta } = reachableTable(dfa, initial, alphabet);
    const blocks = refinePartition(states.map((state) => state?.final ?? false), delta);

    const representatives: number[] = [];
    const members: string[][] = [];
    blocks.forEach((block, i) => {
        representatives[block] ??= i;
        members[block] ??= [];
        const name = states[i]?.name;
        if (name !== undefined) {
            members[block].push(name);
        }
    });
    const result: StateNode[] = representatives.map((representative, block) => ({
        id: createId(),
        name: `q${block}`,
        ...(deterministic && { label: formatSet(members[block].sort(naturalCompare)) }),
        x: 0,
        y: 0,
        initial: block === 0,
        final: states[representative]?.final ?? false,
    }));
    const transitions: FaTransition[] = representatives.flatMap((representative, block) =>
        alphabet.map((symbol, k) => ({
            id: createId(),
            from: result[block].id,
            to: result[blocks[delta[representative][k]]].id,
            symbol,
        })),
    );
    applyLayout(result, transitions);
    return { kind: "fa", title: `${fa.title} (Minimal-DEA)`, states: result, transitions };
}

/** Reachable states of a DFA in BFS order with a complete successor table; `null` is the trap state for missing transitions. */
function reachableTable(dfa: FiniteAutomaton, initial: StateNode, alphabet: readonly string[]) {
    const byId = new Map(dfa.states.map((state) => [state.id, state]));
    const successors = new Map<string, Map<string, string>>();
    for (const t of dfa.transitions) {
        successors.set(t.from, (successors.get(t.from) ?? new Map<string, string>()).set(t.symbol, t.to));
    }
    const states: (StateNode | null)[] = [];
    const indexById = new Map<string | null, number>();
    const visit = (id: string | null) => {
        let index = indexById.get(id);
        if (index === undefined) {
            index = states.length;
            indexById.set(id, index);
            states.push(id === null ? null : byId.get(id)!);
        }
        return index;
    };

    visit(initial.id);
    const delta: number[][] = [];
    for (let i = 0; i < states.length; i++) {
        const id = states[i]?.id;
        delta.push(alphabet.map((symbol) => visit((id === undefined ? undefined : successors.get(id)?.get(symbol)) ?? null)));
    }
    return { states, delta };
}

/** Splits final from non-final states until each block agrees on the successor blocks; returns the block of every state. */
function refinePartition(finals: readonly boolean[], delta: readonly number[][]): number[] {
    let blocks = numberByKey(finals.map(String));
    for (;;) {
        const current = blocks;
        const refined = numberByKey(current.map((block, i) => [block, ...delta[i].map((target) => current[target])].join(",")));
        // Refinement only ever splits blocks, so an unchanged block count means the partition is stable.
        if (Math.max(...refined) === Math.max(...current)) {
            return refined;
        }
        blocks = refined;
    }
}

/** Numbers distinct keys in order of first appearance, so block 0 always holds the initial state. */
function numberByKey(keys: readonly string[]): number[] {
    const ids = new Map<string, number>();
    return keys.map((key) => {
        if (!ids.has(key)) {
            ids.set(key, ids.size);
        }
        return ids.get(key)!;
    });
}

