// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toDfa } from "./convert.ts";
import { definitionToLatex, definitionToText, formalDefinition, transitionSignature } from "./definition.ts";
import { faExamples } from "./examples.ts";
import { layeredLayout } from "../../graph/layout.ts";
import { isComplete, isDeterministic, parseSymbols, unreachableStates } from "./model.ts";
import { missingTransitions, simulate, stepTransitions } from "./simulate.ts";

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
    it("splits labels and maps ε", () => {
        assert.deepEqual(parseSymbols("0, 1 ε"), { symbols: ["0", "1", ""] });
        assert.deepEqual(parseSymbols(""), { symbols: [""] });
        assert.ok("error" in parseSymbols("ab"));
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
