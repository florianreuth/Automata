// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faExamples } from "../automata/fa/examples.ts";
import { escapeMarkup } from "../markup.ts";
import { faFromJson, faToJson } from "./document.ts";
import { faToJff } from "./jff.ts";

const example = (id: string) => faExamples.find((e) => e.id === id)!.create();

describe("JSON documents", () => {
    it("round-trip an automaton", () => {
        const fa = example("epsilon-ab");
        assert.deepEqual(faFromJson(faToJson(fa)), fa);
    });

    it("reject invalid documents with a German message", () => {
        const valid = JSON.parse(faToJson(example("ends-with-01")));
        const dangling = { ...valid, machine: { ...valid.machine, transitions: [{ id: "x", from: "nowhere", to: "nowhere", symbol: "a" }] } };
        assert.throws(() => faFromJson("{"), /kein gültiges JSON/);
        assert.throws(() => faFromJson(JSON.stringify({ ...valid, version: 99 })), /neuere Version/);
        assert.throws(() => faFromJson(JSON.stringify(dangling)), /fehlerhafte Zustände oder Übergänge/);
    });
});

describe("faToJff", () => {
    it("writes ε as an empty read and escapes names", () => {
        const fa = example("epsilon-ab");
        fa.states[0].name = "<q0>";
        const jff = faToJff(fa);
        assert.match(jff, /<read\/>/);
        assert.match(jff, /name="&#60;q0&#62;"/);
        assert.equal(jff.match(/<transition>/g)?.length, fa.transitions.length);
    });
});

describe("escapeMarkup", () => {
    it("escapes every character with a meaning in markup", () => {
        assert.equal(escapeMarkup(`<a href="x">'&'</a>`), "&#60;a href=&#34;x&#34;&#62;&#39;&#38;&#39;&#60;/a&#62;");
    });
});
