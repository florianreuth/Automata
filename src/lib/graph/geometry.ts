// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Edge, StateNode } from "../automata/machine.ts";

export const STATE_RADIUS = 26;
const LOOP_HEIGHT = 58;
const BEND = 26;
const OBSTACLE_BEND = 44;
const UP = -Math.PI / 2;

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

/** All transitions between one ordered pair of states, drawn as a single arrow. */
export interface EdgeGroup<T extends Edge = Edge> {
    key: string;
    from: string;
    to: string;
    transitions: T[];
}

/** Precomputed drawing data of an edge group. */
export interface EdgeShape {
    path: string;
    labelX: number;
    labelY: number;
    labelAnchor: "start" | "middle" | "end";
}

/** Identifies the arrow from one state to another, see {@link EdgeGroup.key}. */
export function edgeKey(from: string, to: string): string {
    return `${from}>${to}`;
}

/** Routes all edges of one graph snapshot so that reverse edges, self-loops and states in the way stay readable. */
export class EdgeRouter<T extends Edge = Edge> {
    readonly groups: EdgeGroup<T>[];
    /** Loop direction in radians per state id that has a self-loop. */
    readonly loops: Map<string, number>;
    readonly #states: readonly StateNode[];
    readonly #byId: Map<string, StateNode>;
    readonly #keys: Set<string>;

    constructor(states: readonly StateNode[], transitions: readonly T[]) {
        this.#states = states;
        this.#byId = new Map(states.map((state) => [state.id, state]));
        this.groups = groupEdges(transitions);
        this.#keys = new Set(this.groups.map((group) => group.key));
        this.loops = loopDirections(states, transitions);
    }

    hasEdge(from: string, to: string): boolean {
        return this.#keys.has(edgeKey(from, to));
    }

    /** Shape of the arrow between two states, whether or not it exists yet; null if a state is unknown. */
    shape(from: string, to: string): EdgeShape | null {
        const a = this.#byId.get(from);
        const b = this.#byId.get(to);
        if (!a || !b) {
            return null;
        }
        return edgeShape(a, b, edgeBend(a, b, from !== to && this.hasEdge(to, from), this.#states), this.loops.get(from));
    }
}

/** Groups transitions by their (from, to) pair, in first-seen order. */
function groupEdges<T extends Edge>(transitions: readonly T[]): EdgeGroup<T>[] {
    const groups = new Map<string, EdgeGroup<T>>();
    for (const transition of transitions) {
        const key = edgeKey(transition.from, transition.to);
        let group = groups.get(key);
        if (!group) {
            group = { key, from: transition.from, to: transition.to, transitions: [] };
            groups.set(key, group);
        }
        group.transitions.push(transition);
    }
    return [...groups.values()];
}

/**
 * Signed offset of the curve apex from the straight line, 0 for a straight edge. Edges with a reverse
 * counterpart bend so both stay visible, straight edges that would cross another state bend around it.
 */
function edgeBend(from: StateNode, to: StateNode, hasReverse: boolean, states: readonly StateNode[]): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) {
        return 0;
    }
    const normal = { x: dy / length, y: -dx / length };
    let obstacle: number | null = null;
    for (const state of states) {
        if (state.id === from.id || state.id === to.id) {
            continue;
        }
        const t = ((state.x - from.x) * dx + (state.y - from.y) * dy) / (length * length);
        const offset = (state.x - from.x) * normal.x + (state.y - from.y) * normal.y;
        if (t > 0 && t < 1 && Math.abs(offset) < STATE_RADIUS + 10 && (obstacle === null || Math.abs(offset) < Math.abs(obstacle))) {
            obstacle = offset;
        }
    }
    if (obstacle === null) {
        return hasReverse ? BEND : 0;
    }
    if (hasReverse) {
        return OBSTACLE_BEND;
    }
    return obstacle > 0 ? -OBSTACLE_BEND : OBSTACLE_BEND;
}

/** Computes the arrow of an edge group from a {@link edgeBend} offset; loopDirection (radians) only applies to self-loops. */
function edgeShape(from: Point, to: Point, bend: number, loopDirection = UP): EdgeShape {
    if (Math.hypot(to.x - from.x, to.y - from.y) < 1) {
        return loopShape(from, loopDirection);
    }
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const normal = { x: dy / length, y: -dx / length };
    if (bend === 0) {
        const start = along(from, to, STATE_RADIUS);
        const end = along(to, from, STATE_RADIUS + 2);
        // Labels sit on the upper side of the line so they do not flip while dragging.
        const side = normal.y > 0 || (normal.y === 0 && normal.x > 0) ? -1 : 1;
        return {
            path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
            labelX: (from.x + to.x) / 2 + normal.x * 12 * side,
            labelY: (from.y + to.y) / 2 + normal.y * 12 * side + 4,
            labelAnchor: anchorFor(normal.x * side),
        };
    }
    const side = Math.sign(bend);
    const control = { x: (from.x + to.x) / 2 + normal.x * bend * 2, y: (from.y + to.y) / 2 + normal.y * bend * 2 };
    const start = along(from, control, STATE_RADIUS);
    const end = along(to, control, STATE_RADIUS + 2);
    const apex = { x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x, y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y };
    return {
        path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
        labelX: apex.x + normal.x * 12 * side,
        labelY: apex.y + normal.y * 12 * side + 4,
        labelAnchor: anchorFor(normal.x * side),
    };
}

// Labels next to steep edges grow away from the line instead of being centered on it.
function anchorFor(horizontalOffset: number): EdgeShape["labelAnchor"] {
    if (Math.abs(horizontalOffset) < 0.8) {
        return "middle";
    }
    return horizontalOffset > 0 ? "start" : "end";
}

/** Computes a self-loop pointing away from the state; direction in radians, -π/2 points up. */
function loopShape(center: Point, direction = UP): EdgeShape {
    const out = { x: Math.cos(direction), y: Math.sin(direction) };
    const side = { x: -out.y, y: out.x };
    const at = (lateral: number, outward: number) => ({ x: center.x + side.x * lateral + out.x * outward, y: center.y + side.y * lateral + out.y * outward });
    const spread = STATE_RADIUS * Math.sin((20 * Math.PI) / 180);
    const base = STATE_RADIUS * Math.cos((20 * Math.PI) / 180);
    const start = at(-spread, base);
    const end = at(spread, base + 2);
    const c1 = at(-34, STATE_RADIUS + LOOP_HEIGHT);
    const c2 = at(34, STATE_RADIUS + LOOP_HEIGHT);
    const label = at(0, STATE_RADIUS + LOOP_HEIGHT - 6);
    const horizontal = Math.abs(out.x) > 0.5;
    return {
        path: `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`,
        labelX: label.x,
        labelY: label.y + (out.y > 0.5 ? 14 : 4),
        labelAnchor: horizontal ? (out.x > 0 ? "start" : "end") : "middle",
    };
}

/** Picks for every state with a self-loop the side (up, down, right, left) farthest from its other edges, in radians. */
function loopDirections(states: readonly StateNode[], transitions: readonly Edge[]): Map<string, number> {
    const byId = new Map(states.map((state) => [state.id, state]));
    const result = new Map<string, number>();
    for (const state of states) {
        if (!transitions.some((t) => t.from === state.id && t.to === state.id)) {
            continue;
        }
        // The initial arrow and the subset label block the left and bottom side like an edge would.
        const angles: number[] = [...(state.initial ? [Math.PI] : []), ...(state.label ? [Math.PI / 2] : [])];
        for (const t of transitions) {
            const other = t.from === state.id ? byId.get(t.to) : t.to === state.id ? byId.get(t.from) : undefined;
            if (other && other.id !== state.id) {
                angles.push(Math.atan2(other.y - state.y, other.x - state.x));
            }
        }
        let best = UP;
        let bestScore = -1;
        for (const candidate of [UP, Math.PI / 2, 0, Math.PI]) {
            const score = Math.min(Math.PI, ...angles.map((angle) => angularDistance(angle, candidate)));
            // Small bias so loops stay on top unless another side is clearly freer.
            if (score > bestScore + 0.05) {
                best = candidate;
                bestScore = score;
            }
        }
        result.set(state.id, best);
    }
    return result;
}

/** SVG path of the short arrow pointing at the initial state from the left. */
export function initialArrowPath(center: Point): string {
    return `M ${center.x - STATE_RADIUS - 40} ${center.y} L ${center.x - STATE_RADIUS - 2} ${center.y}`;
}

/** Bounding box of all drawn elements including loops, labels and the initial arrow, grown by margin on every side. */
export function graphBounds(states: readonly StateNode[], loops: ReadonlyMap<string, number>, margin = 24): Box {
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
    const minX = Math.min(...points.map((p) => p.x)) - margin;
    const maxX = Math.max(...points.map((p) => p.x)) + margin;
    const minY = Math.min(...points.map((p) => p.y)) - margin;
    const maxY = Math.max(...points.map((p) => p.y)) + margin;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function angularDistance(a: number, b: number): number {
    const difference = Math.abs(a - b) % (2 * Math.PI);
    return difference > Math.PI ? 2 * Math.PI - difference : difference;
}

function along(from: Point, towards: Point, distance: number): Point {
    const dx = towards.x - from.x;
    const dy = towards.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
}
