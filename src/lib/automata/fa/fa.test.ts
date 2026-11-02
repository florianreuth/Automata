// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addTrapState, minimizeDfa, toDfa } from "./convert.ts";
import { definitionToLatex, definitionToText } from "./definition-export.ts";
import { formalDefinition, transitionSignature } from "./definition.ts";
import { faExamples } from "./examples.ts";
import { layeredLayout } from "../../graph/layout.ts";
import { createFiniteAutomaton, isComplete, isDeterministic, parseSymbols, unreachableStates } from "./model.ts";
import { blockedStep, missingTransitions, simulate, stepTransitions, tokenizeWord } from "./simulate.ts";

const example = (id: string) => faExamples.find((e) => e.id === id)!.create();

describe("simulate", () => {
    it("recognizes signed binary numbers", () => {
        const fa = example("signed-binary");
        for (const word of ["0", "1", "101", "-1", "-110"]) {
            assert.equal(simulate(fa, word).accepted, true, word);
        }
        for (const word of ["", "-", "-0", "01", "1-0", "--1"]) {
            assert.equal(simulate(fa, word).accepted, false, word);
        }
    });

    it("follows nondeterministic branches", () => {
        const fa = example("ends-with-01");
        assert.equal(simulate(fa, "1101").accepted, true);
        assert.equal(simulate(fa, "0110").accepted, false);
        assert.deepEqual(simulate(fa, "0").steps.map((step) => step.states.size), [1, 2]);
    });

    it("applies the ε-closure", () => {
        const fa = example("epsilon-ab");
        assert.equal(simulate(fa, "").accepted, true);
        assert.equal(simulate(fa, "aabbb").accepted, true);
        assert.equal(simulate(fa, "aba").accepted, false);
        assert.deepEqual(simulate(fa, "c").unknownSymbols, ["c"]);
    });
});

describe("stepTransitions", () => {
    it("lists the symbol moves into a step and the ε-moves inside it", () => {
        const fa = example("epsilon-ab");
        const result = simulate(fa, "ab");
        const used = (step: number) => stepTransitions(fa, result, step).map((t) => t.symbol || "ε").sort();
        assert.deepEqual(used(0), ["ε"]);
        assert.deepEqual(used(1), ["a", "ε"]);
        assert.deepEqual(used(2), ["b"]);
    });
});

describe("unreachableStates", () => {
    it("finds states without a path from the initial state", () => {
        const fa = example("ends-with-01");
        assert.deepEqual(unreachableStates(fa), []);
        fa.transitions = fa.transitions.filter((t) => t.symbol !== "0" || t.from === t.to);
        assert.deepEqual(unreachableStates(fa).map((state) => state.name), ["q1", "q2"]);
    });
});

describe("toDfa", () => {
    it("produces an equivalent complete DFA", () => {
        for (const { create } of faExamples) {
            const nfa = create();
            const dfa = toDfa(nfa);
            assert.equal(isDeterministic(dfa), true);
            assert.equal(isComplete(dfa), true);
            for (const word of ["", "0", "1", "01", "101", "-1", "-0", "ab", "ba", "aab", "0011"]) {
                assert.equal(simulate(dfa, word).accepted, simulate(nfa, word).accepted, `${nfa.title}: ${word}`);
            }
        }
    });
});

describe("minimizeDfa", () => {
    const words = ["", "0", "1", "01", "101", "-1", "-0", "ab", "ba", "aab", "0011", "abab", "1101"];

    it("produces an equivalent complete DFA that cannot shrink further", () => {
        for (const { create } of faExamples) {
            const fa = create();
            const minimal = minimizeDfa(fa);
            assert.equal(isComplete(minimal), true);
            assert.equal(minimizeDfa(minimal).states.length, minimal.states.length, fa.title);
            assert.ok(minimal.states.length <= toDfa(fa).states.length, fa.title);
            for (const word of words) {
                assert.equal(simulate(minimal, word).accepted, simulate(fa, word).accepted, `${fa.title}: ${word}`);
            }
        }
        assert.equal(minimizeDfa(example("ends-with-01")).states.length, 3);
    });

    it("merges equivalent states, drops unreachable ones and adds a trap state", () => {
        const fa = createFiniteAutomaton();
        const state = (name: string, initial = false, final = false) => ({ id: name, name, x: 0, y: 0, initial, final });
        fa.states = [state("q0", true), state("q1"), state("q2"), state("q3", false, true), state("q4", false, true)];
        fa.transitions = [
            ["q0", "q1", "a"], ["q0", "q2", "b"], ["q1", "q3", "a"], ["q1", "q3", "b"], ["q2", "q3", "a"], ["q2", "q3", "b"], ["q4", "q0", "a"],
        ].map(([from, to, symbol], i) => ({ id: `t${i}`, from, to, symbol }));
        const minimal = minimizeDfa(fa);
        assert.deepEqual(minimal.states.map((s) => s.label), ["{q0}", "{q1, q2}", "{q3}", "∅"]);
        assert.deepEqual(minimal.states.map((s) => s.final), [false, false, true, false]);
    });

    it("rejects automata without an initial state", () => {
        assert.throws(() => minimizeDfa(createFiniteAutomaton()), /Startzustand/);
    });
});

describe("formalDefinition", () => {
    it("matches the textbook layout", () => {
        const definition = formalDefinition(example("signed-binary"));
        assert.deepEqual(definition.states, ["q0", "q1", "q2", "q3", "q4"]);
        assert.deepEqual(definition.alphabet, ["-", "0", "1"]);
        assert.deepEqual(definition.finals, ["q1", "q3"]);
        assert.equal(transitionSignature(definition), "δ: Q × Σ → Q");
        const text = definitionToText(definition);
        assert.match(text, /^Beispiel: Endlicher Automat zur Erkennung von Binärzahlen mit Vorzeichen\n\nA = \(Q, Σ, δ, q0, F\)\n/);
        assert.match(text, /Q = \{q0, q1, q2, q3, q4\} {4}Σ = \{-, 0, 1\} {4}F = \{q1, q3\} {4}δ ist dargestellt durch/);
        assert.match(definitionToLatex(definition), /\$\\rightarrow q_\{0\}\$ & \$q_\{2\}\$ & \$q_\{1\}\$ & \$q_\{3\}\$/);
    });

    it("uses sets and ε for nondeterministic automata", () => {
        const definition = formalDefinition(example("epsilon-ab"));
        assert.equal(transitionSignature(definition), "δ: Q × (Σ ∪ {ε}) → 𝒫(Q)");
        assert.deepEqual(definition.columns, ["a", "b", ""]);
        assert.match(definitionToText(definition), /→\*q0 │ \{q0\} │ ∅ +│ \{q1\}/);
    });
});

describe("parseSymbols", () => {
    it("splits labels, keeps multi-character symbols and maps ε", () => {
        assert.deepEqual(parseSymbols("0, 1 ε"), ["0", "1", ""]);
        assert.deepEqual(parseSymbols(""), [""]);
        assert.deepEqual(parseSymbols("hallo, welt, hallo"), ["hallo", "welt"]);
    });
});

describe("tokenizeWord", () => {
    const alphabet = ["a", "hallo", "hal", "welt"];

    it("splits at whitespace if present, otherwise by the longest alphabet symbol", () => {
        assert.deepEqual(tokenizeWord("hallo  welt", alphabet), ["hallo", "welt"]);
        assert.deepEqual(tokenizeWord("hallowelta", alphabet), ["hallo", "welt", "a"]);
        assert.deepEqual(tokenizeWord("halx", alphabet), ["hal", "x"]);
        assert.deepEqual(tokenizeWord("0101", ["0", "1"]), ["0", "1", "0", "1"]);
        assert.deepEqual(tokenizeWord("", alphabet), []);
    });

    it("lets automata read words as symbols", () => {
        const fa = createFiniteAutomaton();
        fa.states = [
            { id: "s", name: "q0", x: 0, y: 0, initial: true, final: false },
            { id: "f", name: "q1", x: 0, y: 0, initial: false, final: true },
        ];
        fa.transitions = [{ id: "t0", from: "s", to: "s", symbol: "hallo" }, { id: "t1", from: "s", to: "f", symbol: "welt" }];
        assert.equal(simulate(fa, "hallo hallo welt").accepted, true);
        assert.equal(simulate(fa, "hallowelt").accepted, true);
        assert.deepEqual(simulate(fa, "hallo welt!").unknownSymbols, ["welt!"]);
        assert.equal(minimizeDfa(fa).states.length, 3);
    });
});

describe("blockedStep", () => {
    it("finds the symbol on which a run dies", () => {
        const fa = example("epsilon-ab");
        assert.equal(blockedStep(simulate(fa, "aabb")), null);
        const blocked = blockedStep(simulate(fa, "aba"))!;
        assert.equal(blocked.position, 3);
        assert.equal(blocked.symbol, "a");
        assert.deepEqual([...blocked.from].map((id) => fa.states.find((s) => s.id === id)!.name), ["q1"]);
    });
});

describe("missingTransitions", () => {
    it("lists pairs without a successor", () => {
        assert.deepEqual(missingTransitions(example("signed-binary")), []);
        const missing = missingTransitions(example("ends-with-01")).map((m) => `${m.state.name}:${m.symbol}`);
        assert.deepEqual(missing, ["q1:0", "q2:0", "q2:1"]);
        assert.deepEqual(missingTransitions(example("epsilon-ab")).map((m) => `${m.state.name}:${m.symbol}`), ["q1:a"]);
    });
});

describe("addTrapState", () => {
    it("routes every missing transition into a looping trap state without changing the language", () => {
        const fa = example("ends-with-01");
        const completed = addTrapState(fa);
        const trap = completed.states.at(-1)!;
        assert.equal(completed.states.length, fa.states.length + 1);
        assert.equal(trap.final, false);
        assert.ok(trap.x > Math.max(...fa.states.map((state) => state.x)));
        assert.deepEqual(completed.states.slice(0, -1), fa.states);
        assert.deepEqual(missingTransitions(completed), []);
        assert.equal(isComplete(completed), false, "still nondeterministic");
        for (const word of ["", "0", "01", "101", "0110", "11", "1001"]) {
            assert.equal(simulate(completed, word).accepted, simulate(fa, word).accepted, word);
        }
    });

    it("makes a partial DFA complete and leaves complete automata alone", () => {
        const partial = example("signed-binary");
        partial.transitions = partial.transitions.filter((t) => t.to !== partial.states[4].id);
        partial.states = partial.states.slice(0, 4);
        assert.equal(isComplete(addTrapState(partial)), true);
        const complete = example("signed-binary");
        assert.equal(addTrapState(complete), complete);
    });
});

describe("layeredLayout", () => {
    it("places every state on a distinct position, columns by distance from the initial state", () => {
        const fa = example("signed-binary");
        const positions = layeredLayout(fa.states, fa.transitions);
        assert.equal(positions.size, fa.states.length);
        assert.equal(new Set([...positions.values()].map((p) => `${p.x},${p.y}`)).size, fa.states.length);
        const x = (name: string) => positions.get(fa.states.find((s) => s.name === name)!.id)!.x;
        assert.ok(x("q0") < x("q1") && x("q1") === x("q2") && x("q2") === x("q3"));
    });
});
