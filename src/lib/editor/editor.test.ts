// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pointerAction } from "./pointer.ts";
import { commandFor } from "./shortcuts.ts";
import { TOOLS } from "./tools.ts";

const press = (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}) =>
    commandFor({ key, ctrlKey: false, metaKey: false, shiftKey: false, ...modifiers });

describe("pointerAction", () => {
    it("maps tool and target to an action", () => {
        assert.equal(pointerAction("select", "state", false), "drag");
        assert.equal(pointerAction("select", "state", true), "connect");
        assert.equal(pointerAction("select", "canvas", false), "deselect-and-pan");
        assert.equal(pointerAction("state", "canvas", false), "add-state");
        assert.equal(pointerAction("transition", "edge", false), "edit-edge");
        assert.equal(pointerAction("delete", "edge", true), "delete");
    });
});

describe("commandFor", () => {
    it("binds editing commands with and without modifier", () => {
        assert.equal(press("z", { ctrlKey: true }), "undo");
        assert.equal(press("Z", { metaKey: true, shiftKey: true }), "redo");
        assert.equal(press("y", { ctrlKey: true }), "redo");
        assert.equal(press("s", { ctrlKey: true }), "save");
        assert.equal(press("Backspace"), "delete");
        assert.equal(press("F2"), "rename");
        assert.equal(press("A"), "arrange");
    });

    it("selects tools by their letter and ignores unbound keys", () => {
        for (const tool of TOOLS) {
            assert.deepEqual(press(tool.key), { tool: tool.id });
        }
        assert.equal(press("q"), null);
        assert.equal(press("v", { ctrlKey: true }), null);
    });
});
