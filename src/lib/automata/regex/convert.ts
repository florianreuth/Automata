// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { applyLayout } from "../../graph/layout.ts";
import { createId, naturalCompare, type StateNode } from "../machine.ts";
import { type FaTransition, type FiniteAutomaton, initialStateOf } from "../fa/model.ts";
import { concat, EMPTY, EPSILON_REGEX, type Regex, star, symbol, union } from "./regex.ts";

const SOURCE = "#source";
const SINK = "#sink";

/** Builds an ε-NFA with the Thompson construction; the initial state is q0 and the only final state is the last one. */
export function regexToNfa(regex: Regex, title: string): FiniteAutomaton {
    const states: StateNode[] = [];
    const transitions: FaTransition[] = [];
    const addState = () => {
        const state = { id: createId(), name: `q${states.length}`, x: 0, y: 0, initial: false, final: false };
        states.push(state);
        return state.id;
    };
    const connect = (from: string, to: string, value = "") => transitions.push({ id: createId(), from, to, symbol: value });

    // Every fragment creates its entry state first and its exit state last, which keeps the numbering readable.
    const build = (node: Regex): { start: string; end: string } => {
        switch (node.kind) {
            case "empty":
                return { start: addState(), end: addState() };
            case "epsilon":
            case "symbol": {
                const start = addState();
                const end = addState();
                connect(start, end, node.kind === "symbol" ? node.symbol : "");
                return { start, end };
            }
            case "concat": {
                const parts = node.items.map(build);
                parts.slice(1).forEach((part, i) => connect(parts[i].end, part.start));
                return { start: parts[0].start, end: parts.at(-1)!.end };
            }
            case "union": {
                const start = addState();
                const parts = node.items.map(build);
                const end = addState();
                for (const part of parts) {
                    connect(start, part.start);
                    connect(part.end, end);
                }
                return { start, end };
            }
            case "star":
            case "plus":
            case "optional": {
                const start = addState();
                const inner = build(node.item);
                const end = addState();
                connect(start, inner.start);
                connect(inner.end, end);
                if (node.kind !== "plus") {
                    connect(start, end);
                }
                if (node.kind !== "optional") {
                    connect(inner.end, inner.start);
                }
                return { start, end };
            }
        }
    };

    const { start, end } = build(regex);
    states.find((state) => state.id === start)!.initial = true;
    states.find((state) => state.id === end)!.final = true;
    applyLayout(states, transitions);
    return { kind: "fa", title, states, transitions };
}

/**
 * Derives an equivalent regular expression by state elimination, removing the state with the fewest
 * paths through it first to keep the result short.
 * @throws Error if the automaton has no initial state
 */
export function faToRegex(fa: FiniteAutomaton): Regex {
    const initial = initialStateOf(fa);
    if (!initial) {
        throw new Error("Der Automat hat keinen Startzustand.");
    }
    const edges = new Map<string, Map<string, Regex>>();
    const add = (from: string, to: string, regex: Regex) => {
        const row = edges.get(from) ?? new Map<string, Regex>();
        edges.set(from, row);
        const existing = row.get(to);
        row.set(to, existing ? union(existing, regex) : regex);
    };
    add(SOURCE, initial.id, EPSILON_REGEX);
    for (const state of fa.states.filter((s) => s.final)) {
        add(state.id, SINK, EPSILON_REGEX);
    }
    for (const t of fa.transitions) {
        add(t.from, t.to, t.symbol === "" ? EPSILON_REGEX : symbol(t.symbol));
    }

    const incomingOf = (id: string) => [...edges].filter(([from, row]) => from !== id && row.has(id)).map(([from, row]) => [from, row.get(id)!] as const);
    const outgoingOf = (id: string) => [...(edges.get(id) ?? [])].filter(([to]) => to !== id);
    const remaining = [...fa.states].sort((a, b) => naturalCompare(a.name, b.name));
    while (remaining.length > 0) {
        const cost = (state: StateNode) => incomingOf(state.id).length * outgoingOf(state.id).length;
        const index = remaining.reduce((best, state, i) => (cost(state) < cost(remaining[best]) ? i : best), 0);
        const [state] = remaining.splice(index, 1);
        const incoming = incomingOf(state.id);
        const outgoing = outgoingOf(state.id);
        const loop = star(edges.get(state.id)?.get(state.id) ?? EMPTY);
        edges.delete(state.id);
        for (const row of edges.values()) {
            row.delete(state.id);
        }
        for (const [from, into] of incoming) {
            for (const [to, out] of outgoing) {
                add(from, to, concat(concat(into, loop), out));
            }
        }
    }
    return edges.get(SOURCE)?.get(SINK) ?? EMPTY;
}
