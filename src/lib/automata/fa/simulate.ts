// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { naturalCompare, type StateNode } from "../machine.ts";
import { alphabetOf, type FaTransition, type FiniteAutomaton, initialStateOf } from "./model.ts";

/** The set of active states after reading a prefix of the input. */
export interface SimulationStep {
    /** Number of input symbols consumed so far. */
    position: number;
    /** Active state ids, already closed under ε-transitions. */
    states: ReadonlySet<string>;
}

/** Full run of an automaton on one word. */
export interface SimulationResult {
    input: string[];
    steps: SimulationStep[];
    accepted: boolean;
    /** Symbols of the input that are not part of the alphabet. */
    unknownSymbols: string[];
}

/** Extends a set of states by everything reachable via ε-transitions, including the start states. */
export function epsilonClosure(fa: FiniteAutomaton, states: Iterable<string>): Set<string> {
    const closure = new Set(states);
    const stack = [...closure];
    while (stack.length > 0) {
        const current = stack.pop()!;
        for (const transition of fa.transitions) {
            if (transition.from === current && transition.symbol === "" && !closure.has(transition.to)) {
                closure.add(transition.to);
                stack.push(transition.to);
            }
        }
    }
    return closure;
}

/** Successors of the given states on one non-empty symbol, without ε-closure. */
export function move(fa: FiniteAutomaton, states: ReadonlySet<string>, symbol: string): Set<string> {
    const result = new Set<string>();
    for (const transition of fa.transitions) {
        if (transition.symbol === symbol && states.has(transition.from)) {
            result.add(transition.to);
        }
    }
    return result;
}

/** Runs the automaton on a word by tracking all active states at once; every character is one symbol. */
export function simulate(fa: FiniteAutomaton, word: string): SimulationResult {
    const input = [...word];
    const initial = initialStateOf(fa);
    let current = initial ? epsilonClosure(fa, [initial.id]) : new Set<string>();
    const steps: SimulationStep[] = [{ position: 0, states: current }];
    for (let i = 0; i < input.length; i++) {
        current = epsilonClosure(fa, move(fa, current, input[i]));
        steps.push({ position: i + 1, states: current });
    }
    const finals = new Set(fa.states.filter((state) => state.final).map((state) => state.id));
    const alphabet = new Set(alphabetOf(fa));
    return {
        input,
        steps,
        accepted: [...current].some((id) => finals.has(id)),
        unknownSymbols: [...new Set(input.filter((symbol) => !alphabet.has(symbol)))],
    };
}

/**
 * Transitions taken to reach a step: the symbol moves from the previous step plus the ε-moves inside its closure.
 * @param step index into {@link SimulationResult.steps}, clamped to the last step
 */
export function stepTransitions(fa: FiniteAutomaton, result: SimulationResult, step: number): FaTransition[] {
    const index = Math.min(step, result.steps.length - 1);
    const current = result.steps[index].states;
    const previous = index > 0 ? result.steps[index - 1].states : null;
    const symbol = result.input[index - 1];
    return fa.transitions.filter((t) =>
        t.symbol === "" ? current.has(t.from) && current.has(t.to) : previous !== null && t.symbol === symbol && previous.has(t.from),
    );
}

/**
 * Lists every state/symbol pair on which a run dies, i.e. where an error (trap) state is missing.
 * ε-transitions are taken into account, so a symbol readable after an ε-move is not reported.
 */
export function missingTransitions(fa: FiniteAutomaton): { state: StateNode; symbol: string }[] {
    const alphabet = alphabetOf(fa);
    return [...fa.states]
        .sort((a, b) => naturalCompare(a.name, b.name))
        .flatMap((state) => {
            const closure = epsilonClosure(fa, [state.id]);
            return alphabet.filter((symbol) => move(fa, closure, symbol).size === 0).map((symbol) => ({ state, symbol }));
        });
}
