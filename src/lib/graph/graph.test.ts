// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faExamples } from "../automata/fa/examples.ts";
import { transitionLabel } from "../automata/fa/model.ts";
import { type StateNode } from "../automata/machine.ts";
import { edgeKey, EdgeRouter } from "./geometry.ts";
import { renderMachineSvg } from "./svg.ts";

const state = (id: string, x: number, y: number): StateNode => ({ id, name: id, x, y, initial: false, final: false });

describe("EdgeRouter", () => {
    const states = [state("a", 0, 0), state("b", 200, 0), state("c", 400, 0)];

    it("draws single edges straight and bends reverse pairs apart", () => {
        const router = new EdgeRouter(states, [
            { id: "1", from: "a", to: "b" },
            { id: "2", from: "b", to: "a" },
            { id: "3", from: "b", to: "c" },
        ]);
        assert.deepEqual(router.groups.map((group) => group.key), [edgeKey("a", "b"), edgeKey("b", "a"), edgeKey("b", "c")]);
        assert.match(router.shape("a", "b")!.path, / Q /);
        assert.match(router.shape("b", "c")!.path, / L /);
        assert.equal(router.shape("a", "missing"), null);
    });

    it("bends straight edges around states in the way", () => {
        const router = new EdgeRouter(states, [{ id: "1", from: "a", to: "c" }]);
        assert.match(router.shape("a", "c")!.path, / Q /);
    });

    it("draws self-loops as curves and records their direction", () => {
        const router = new EdgeRouter(states, [{ id: "1", from: "a", to: "a" }]);
        assert.match(router.shape("a", "a")!.path, / C /);
        assert.ok(router.loops.has("a"));
    });
});

describe("renderMachineSvg", () => {
    it("renders every state and escapes text", () => {
        const fa = faExamples[0].create();
        fa.states[0].name = "<q0>";
        const svg = renderMachineSvg(fa, (group) => transitionLabel(group.transitions));
        const finals = fa.states.filter((s) => s.final).length;
        assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        assert.equal(svg.match(/<circle /g)?.length, fa.states.length + finals);
        assert.match(svg, />&#60;q0&#62;</);
    });
});
