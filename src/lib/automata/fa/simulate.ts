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

/** Splits a word at whitespace if it has any, otherwise greedily by the longest alphabet symbol; other characters become single symbols. */
export function tokenizeWord(word: string, alphabet: readonly string[]): string[] {
    if (/\s/.test(word)) {
        return word.split(/\s+/).filter((part) => part.length > 0);
    }
    const longestFirst = [...alphabet].sort((a, b) => b.length - a.length);
    const symbols: string[] = [];
    for (let i = 0; i < word.length; ) {
        const symbol = longestFirst.find((candidate) => word.startsWith(candidate, i)) ?? String.fromCodePoint(word.codePointAt(i)!);
        symbols.push(symbol);
        i += symbol.length;
    }
    return symbols;
}

/** Runs the automaton on a word, split by {@link tokenizeWord}, by tracking all active states at once. */
export function simulate(fa: FiniteAutomaton, word: string): SimulationResult {
    const alphabet = alphabetOf(fa);
    const input = tokenizeWord(word, alphabet);
    const initial = initialStateOf(fa);
    let current = initial ? epsilonClosure(fa, [initial.id]) : new Set<string>();
    const steps: SimulationStep[] = [{ position: 0, states: current }];
    for (let i = 0; i < input.length; i++) {
        current = epsilonClosure(fa, move(fa, current, input[i]));
        steps.push({ position: i + 1, states: current });
    }
    const finals = new Set(fa.states.filter((state) => state.final).map((state) => state.id));
    return {
        input,
        steps,
        accepted: [...current].some((id) => finals.has(id)),
        unknownSymbols: [...new Set(input.filter((symbol) => !alphabet.includes(symbol)))],
    };
}

/** Where a run dies: the step without active states, the symbol read there and the states it was read in; null if it never dies. */
export function blockedStep(result: SimulationResult): { position: number; symbol: string; from: ReadonlySet<string> } | null {
    // Once the set of active states is empty it stays empty, so the first empty step is where the run got stuck.
    const position = result.steps.findIndex((step, i) => i > 0 && step.states.size === 0 && result.steps[i - 1].states.size > 0);
    return position < 0 ? null : { position, symbol: result.input[position - 1], from: result.steps[position - 1].states };
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

/** State/symbol pairs on which a run dies (a missing trap state); a symbol readable after an ε-move is not reported. */
export function missingTransitions(fa: FiniteAutomaton): { state: StateNode; symbol: string }[] {
    const alphabet = alphabetOf(fa);
    return [...fa.states]
        .sort((a, b) => naturalCompare(a.name, b.name))
        .flatMap((state) => {
            const closure = epsilonClosure(fa, [state.id]);
            return alphabet.filter((symbol) => move(fa, closure, symbol).size === 0).map((symbol) => ({ state, symbol }));
        });
}
