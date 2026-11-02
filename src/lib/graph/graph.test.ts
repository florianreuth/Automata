// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faExamples } from "../automata/fa/examples.ts";
import { transitionLabel } from "../automata/fa/model.ts";
import { type StateNode } from "../automata/machine.ts";
import { edgeKey, EdgeRouter } from "./edges.ts";
import { graphBounds, snapToGrid, stateAt } from "./geometry.ts";
import { renderMachineSvg } from "./svg.ts";

const state = (id: string, x: number, y: number): StateNode => ({ id, name: id, x, y, initial: false, final: false });
const measure = (text: string) => text.length * 8;

describe("geometry", () => {
    it("hits the topmost state under the point", () => {
        const states = [state("a", 0, 0), state("b", 10, 0)];
        assert.equal(stateAt(states, { x: 5, y: 0 })?.id, "b");
        assert.equal(stateAt(states, { x: -27, y: 0 })?.id, "a");
        assert.equal(stateAt(states, { x: 100, y: 100 }), null);
    });

    it("snaps to the grid", () => {
        assert.deepEqual(snapToGrid({ x: 14, y: -6 }, 10), { x: 10, y: -10 });
    });

    it("grows the bounds to fit long edge labels", () => {
        const states = [state("a", 0, 0), state("b", 0, 200)];
        const router = new EdgeRouter(states, [{ id: "1", from: "a", to: "b" }]);
        const label = "hallo, welt, automat, grammatik";
        const [positioned] = router.labels(() => label, measure);
        assert.equal(positioned.width, measure(label));
        const box = graphBounds(states, router.loops, [positioned]);
        assert.ok(graphBounds(states, router.loops).width < box.width);
        const reach = positioned.anchor === "end" ? positioned.x - positioned.width : positioned.x + positioned.width;
        assert.ok(box.x < reach && reach < box.x + box.width, `${reach} outside ${JSON.stringify(box)}`);
    });
});

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
        const svg = renderMachineSvg(fa, (group) => transitionLabel(group.transitions), measure);
        const finals = fa.states.filter((s) => s.final).length;
        assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        assert.equal(svg.match(/<circle /g)?.length, fa.states.length + finals);
        assert.match(svg, />&#60;q0&#62;</);
    });
});
