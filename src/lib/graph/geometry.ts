// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { StateNode } from "../automata/machine.ts";

export const STATE_RADIUS = 26;
/** Vertical offset from a state center to the baseline of its name, which centers 15px text. */
export const NAME_BASELINE = 5;
/** Vertical offset from a state center to the baseline of its secondary label below the circle. */
export const LABEL_BASELINE = STATE_RADIUS + 18;
/** Distance from a state's edge to the far end of its self-loop. */
export const LOOP_HEIGHT = 58;
export const EDGE_LABEL_SIZE = 15;
// Half of the white halo stroke drawn behind edge labels.
const LABEL_HALO = 3;
// Hits slightly outside the circle still count, the stroke is part of the state.
const HIT_TOLERANCE = 2;

export interface Point {
    x: number;
    y: number;
}

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type MeasureText = (text: string, font: string) => number;

export interface TextLabel {
    x: number;
    y: number;
    anchor: "start" | "middle" | "end";
    width: number;
}

/** Topmost state whose circle contains the point, null if there is none. */
export function stateAt(states: readonly StateNode[], point: Point): StateNode | null {
    return states.findLast((state) => Math.hypot(state.x - point.x, state.y - point.y) <= STATE_RADIUS + HIT_TOLERANCE) ?? null;
}

export function snapToGrid(point: Point, grid: number): Point {
    return { x: Math.round(point.x / grid) * grid, y: Math.round(point.y / grid) * grid };
}

/** SVG path of the short arrow pointing at the initial state from the left. */
export function initialArrowPath(center: Point): string {
    return `M ${center.x - STATE_RADIUS - 40} ${center.y} L ${center.x - STATE_RADIUS - 2} ${center.y}`;
}

/** Bounding box of all drawn elements including loops, labels and the initial arrow, grown by margin on every side. */
export function graphBounds(states: readonly StateNode[], loops: ReadonlyMap<string, number>, labels: readonly TextLabel[] = [], margin = 24): Box {
    if (states.length === 0) {
        return { x: 0, y: 0, width: 400, height: 240 };
    }
    const points: Point[] = [];
    for (const s of states) {
        points.push({ x: s.x - STATE_RADIUS - (s.initial ? 44 : 0), y: s.y - STATE_RADIUS - 20 });
        points.push({ x: s.x + STATE_RADIUS + 20, y: s.y + STATE_RADIUS + (s.label ? 26 : 0) });
        const loop = loops.get(s.id);
        if (loop !== undefined) {
            const reach = STATE_RADIUS + LOOP_HEIGHT + 24;
            points.push({ x: s.x + Math.cos(loop) * reach, y: s.y + Math.sin(loop) * reach });
        }
    }
    for (const label of labels) {
        const left = label.x - (label.anchor === "start" ? 0 : label.anchor === "middle" ? label.width / 2 : label.width);
        points.push({ x: left - LABEL_HALO, y: label.y - EDGE_LABEL_SIZE - LABEL_HALO });
        points.push({ x: left + label.width + LABEL_HALO, y: label.y + EDGE_LABEL_SIZE / 3 + LABEL_HALO });
    }
    const minX = Math.min(...points.map((p) => p.x)) - margin;
    const maxX = Math.max(...points.map((p) => p.x)) + margin;
    const minY = Math.min(...points.map((p) => p.y)) - margin;
    const maxY = Math.max(...points.map((p) => p.y)) + margin;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
