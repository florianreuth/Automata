// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faExamples } from "../fa/examples.ts";
import { simulate } from "../fa/simulate.ts";
import { faToRegex, regexToNfa } from "./convert.ts";
import { parseRegex, RegexSyntaxError } from "./parser.ts";
import { concat, formatRegex, star, symbol, union } from "./regex.ts";

const nfaOf = (source: string) => regexToNfa(parseRegex(source), source);
const accepts = (source: string, word: string) => simulate(nfaOf(source), word).accepted;

describe("parseRegex", () => {
    it("respects precedence and formats with minimal parentheses", () => {
        assert.equal(formatRegex(parseRegex("(a | b)* a b b")), "(a|b)*abb");
        assert.equal(formatRegex(parseRegex("((ab))|c")), "ab|c");
        assert.equal(formatRegex(parseRegex("(ab)*c?")), "(ab)*c?");
        assert.equal(formatRegex(parseRegex("\\*\\(")), "\\*\\(");
    });

    it("reports syntax errors with their position", () => {
        for (const [source, position] of [["*a", 0], ["(ab", 3], ["ab)", 2], ["a\\", 1]] as const) {
            assert.throws(() => parseRegex(source), (error: unknown) => error instanceof RegexSyntaxError && error.position === position, source);
        }
    });
});

describe("simplification", () => {
    it("removes neutral elements and duplicates", () => {
        const a = symbol("a");
        assert.equal(formatRegex(union(a, union(parseRegex("∅"), a))), "a");
        assert.equal(formatRegex(concat(parseRegex("ε"), concat(a, parseRegex("b")))), "ab");
        assert.equal(formatRegex(star(star(parseRegex("a+")))), "a*");
        assert.equal(formatRegex(union(parseRegex("ε"), parseRegex("a*"))), "a*");
    });
});

describe("regexToNfa", () => {
    it("accepts exactly the described language", () => {
        for (const word of ["abb", "aabb", "babb"]) {
            assert.equal(accepts("(a|b)*abb", word), true, word);
        }
        for (const word of ["", "ab", "abba"]) {
            assert.equal(accepts("(a|b)*abb", word), false, word);
        }
        assert.equal(accepts("a+b?", ""), false);
        assert.equal(accepts("a+b?", "aab"), true);
        assert.equal(accepts("∅", ""), false);
        assert.equal(accepts("ε", ""), true);
    });

    it("numbers states from the initial q0", () => {
        const nfa = nfaOf("a|b");
        assert.equal(nfa.states.find((state) => state.initial)?.name, "q0");
        assert.equal(nfa.states.filter((state) => state.final).length, 1);
    });
});

describe("faToRegex", () => {
    it("produces an equivalent expression", () => {
        const words = ["", "0", "1", "01", "101", "-1", "-0", "-110", "a", "ab", "ba", "aab", "0011", "1101"];
        for (const { create } of faExamples) {
            const fa = create();
            const regex = formatRegex(faToRegex(fa));
            for (const word of words) {
                assert.equal(accepts(regex, word), simulate(fa, word).accepted, `${fa.title} as ${regex}: ${word}`);
            }
        }
    });

    it("round-trips through the Thompson construction", () => {
        const regex = formatRegex(faToRegex(nfaOf("(a|b)*abb")));
        for (const word of ["abb", "babb", "ab", "", "abba"]) {
            assert.equal(accepts(regex, word), accepts("(a|b)*abb", word), word);
        }
    });
});
