// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Point } from "../graph/geometry.ts";
import type { Tool } from "./graph-editor.ts";

/** What lies under the pointer; the canvas point is in world coordinates. */
export type Hit = { kind: "state"; id: string } | { kind: "edge"; from: string; to: string } | { kind: "canvas"; point: Point };

export type PointerTarget = Hit["kind"];

export type PointerAction = "pan" | "drag" | "connect" | "select-edge" | "edit-edge" | "delete" | "add-state" | "deselect-and-pan";

const ACTIONS: Record<Tool, Record<PointerTarget, PointerAction>> = {
    select: { state: "drag", edge: "select-edge", canvas: "deselect-and-pan" },
    state: { state: "drag", edge: "select-edge", canvas: "add-state" },
    transition: { state: "connect", edge: "edit-edge", canvas: "pan" },
    delete: { state: "delete", edge: "delete", canvas: "pan" },
};

/** What pressing the primary button does, depending on the active tool and what lies under the pointer. */
export function pointerAction(tool: Tool, target: PointerTarget, shiftKey: boolean): PointerAction {
    // Shift turns dragging a state into drawing a transition without switching tools.
    if (tool === "select" && target === "state" && shiftKey) {
        return "connect";
    }
    return ACTIONS[tool][target];
}
