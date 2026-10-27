// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCnf, toCnf } from "./cnf.ts";
import { cyk } from "./cyk.ts";
import { grammarExamples } from "./examples.ts";
import { classify, formatGrammar, type Grammar, parseGrammar, tokenize } from "./grammar.ts";
import { analyzeLl1, parseLl1 } from "./ll1.ts";
import { layoutTree, type ParseTree } from "./tree.ts";

const grammarOf = (source: string): Grammar => {
    const result = parseGrammar(source);
    assert.ok("grammar" in result, JSON.stringify(result));
    return result.grammar;
};
const example = (id: string) => grammarOf(grammarExamples.find((e) => e.id === id)!.source);
const yieldOf = (tree: ParseTree): string => (tree.children.length === 0 ? tree.symbol : tree.children.map(yieldOf).join(""));

describe("parseGrammar", () => {
    it("reads alternatives, ε and multi-character nonterminals", () => {
        const grammar = example("expressions");
        assert.equal(grammar.start, "E");
        assert.equal(grammar.productions.length, 8);
        assert.deepEqual(tokenize("+TE'"), ["+", "T", "E'"]);
        assert.deepEqual(grammarOf("S -> a | ").productions.map((p) => p.right), [["a"], []]);
        assert.equal(formatGrammar(grammarOf("S → aSb\nS → ε")), "S → aSb | ε");
    });

    it("reports errors per line", () => {
        assert.deepEqual(parseGrammar("S → a\nab\na → b\nS → $"), {
            errors: [
                { line: 2, message: "Der Pfeil → (oder ->) fehlt." },
                { line: 3, message: "Die linke Seite braucht mindestens ein Nichtterminal (Großbuchstabe)." },
                { line: 4, message: "„$“ ist als Endmarke reserviert." },
            ],
        });
    });
});

describe("classify", () => {
    it("finds the most specific Chomsky type", () => {
        assert.equal(classify(example("regular")).type, 3);
        assert.equal(classify(grammarOf("S → Sa | b")).type, 3);
        assert.equal(classify(example("anbn")).type, 2);
        assert.equal(classify(grammarOf("S → aSBc | abc\ncB → Bc\nbB → bb")).type, 1);
        assert.equal(classify(grammarOf("S → aSb\naSb → a")).type, 0);
    });
});

describe("LL(1)", () => {
    it("computes FIRST and FOLLOW sets", () => {
        const analysis = analyzeLl1(example("expressions"));
        assert.deepEqual([...analysis.first.get("E")!].sort(), ["(", "a"]);
        assert.deepEqual([...analysis.follow.get("E")!].sort(), ["$", ")"]);
        assert.deepEqual([...analysis.follow.get("T'")!].sort(), ["$", ")", "+"]);
        assert.ok(analysis.nullable.has("E'") && !analysis.nullable.has("E"));
        assert.deepEqual(analysis.conflicts, []);
    });

    it("parses words and builds the derivation tree", () => {
        const grammar = example("expressions");
        const analysis = analyzeLl1(grammar);
        const run = parseLl1(grammar, analysis, tokenize("a+a*a"));
        assert.equal(run.accepted, true);
        assert.equal(yieldOf(run.tree), "a+a*a");
        assert.equal(run.steps.at(-1)!.action, "Akzeptiert");
        assert.equal(parseLl1(grammar, analysis, tokenize("a+*a")).accepted, false);
    });

    it("detects conflicts", () => {
        const conflicts = analyzeLl1(example("parentheses")).conflicts;
        assert.ok(conflicts.some((c) => c.nonterminal === "S" && c.terminal === "("));
    });
});

describe("CNF and CYK", () => {
    it("produces an equivalent grammar in Chomsky normal form", () => {
        const cases: [string, string[], string[]][] = [
            ["anbn", ["", "ab", "aabb", "aaabbb"], ["a", "ba", "abb", "aab"]],
            ["parentheses", ["", "()", "(())()", "()()()"], ["(", ")(", "(()"]],
            ["expressions", ["a", "a+a*a", "(a+a)*a"], ["", "a+", "(a", "a*+a"]],
            ["regular", ["b", "aab", "abbb"], ["", "a", "ba"]],
        ];
        for (const [id, accepted, rejected] of cases) {
            const cnf = toCnf(example(id));
            assert.ok(isCnf(cnf), `${id}:\n${formatGrammar(cnf)}`);
            for (const word of accepted) {
                assert.equal(cyk(cnf, tokenize(word)).accepted, true, `${id}: ${word}`);
            }
            for (const word of rejected) {
                assert.equal(cyk(cnf, tokenize(word)).accepted, false, `${id}: ${word}`);
            }
        }
    });

    it("fills the triangular table", () => {
        const result = cyk(toCnf(example("anbn")), tokenize("aabb"));
        assert.equal(result.cells.length, 4);
        assert.deepEqual(result.cells.map((row) => row.length), [4, 3, 2, 1]);
    });
});

describe("layoutTree", () => {
    it("centers parents above their leaves", () => {
        const layout = layoutTree({ symbol: "S", children: [{ symbol: "a", children: [] }, { symbol: "", children: [] }] });
        const [a, epsilon, root] = layout.nodes;
        assert.equal(root.x, (a.x + epsilon.x) / 2);
        assert.equal(epsilon.label, "ε");
        assert.ok(root.y < a.y);
    });
});
