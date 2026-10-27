// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { type Edge, naturalCompare, type StateNode } from "../automata/machine.ts";
import type { Point } from "./geometry.ts";

const LAYER_SPACING = 200;
const ROW_SPACING = 140;
const COMPONENT_SPACING = 100;
const ORIGIN = 120;

/**
 * Computes a left-to-right layered layout: columns by distance from the initial state, rows ordered to reduce crossings.
 * Disconnected parts are stacked below each other; self-loops are ignored.
 */
export function layeredLayout(states: readonly StateNode[], edges: readonly Edge[]): Map<string, Point> {
    const neighbors = new Map(states.map((state) => [state.id, new Set<string>()]));
    for (const edge of edges) {
        if (edge.from !== edge.to && neighbors.has(edge.from) && neighbors.has(edge.to)) {
            neighbors.get(edge.from)!.add(edge.to);
            neighbors.get(edge.to)!.add(edge.from);
        }
    }
    const roots = [...states].sort((a, b) => Number(b.initial) - Number(a.initial) || naturalCompare(a.name, b.name));
    const positions = new Map<string, Point>();
    let top = ORIGIN;
    for (const root of roots) {
        if (positions.has(root.id)) {
            continue;
        }
        const layers = bfsLayers(root.id, neighbors);
        orderLayers(layers, neighbors);
        const height = Math.max(...layers.map((layer) => layer.length)) - 1;
        layers.forEach((layer, depth) => {
            const offset = ((height - (layer.length - 1)) * ROW_SPACING) / 2;
            // Shifting every other column keeps edges that skip a column from running straight through a state.
            const stagger = depth % 2 === 1 && layers.length > 2 ? ROW_SPACING / 3 : 0;
            layer.forEach((id, row) => positions.set(id, { x: ORIGIN + depth * LAYER_SPACING, y: top + offset + row * ROW_SPACING + stagger }));
        });
        top += height * ROW_SPACING + ROW_SPACING / 3 + COMPONENT_SPACING + ROW_SPACING;
    }
    return positions;
}

/** Moves every state to its position from {@link layeredLayout}, mutating the given states. */
export function applyLayout(states: StateNode[], edges: readonly Edge[]): void {
    const positions = layeredLayout(states, edges);
    for (const state of states) {
        Object.assign(state, positions.get(state.id));
    }
}

function bfsLayers(root: string, neighbors: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
    const depth = new Map([[root, 0]]);
    const layers: string[][] = [[root]];
    const queue = [root];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const next of neighbors.get(current)!) {
            if (!depth.has(next)) {
                const d = depth.get(current)! + 1;
                depth.set(next, d);
                (layers[d] ??= []).push(next);
                queue.push(next);
            }
        }
    }
    return layers;
}

// Barycenter heuristic: alternately sorts each column by the mean row of its neighbors in the adjacent column.
function orderLayers(layers: string[][], neighbors: ReadonlyMap<string, ReadonlySet<string>>): void {
    for (let sweep = 0; sweep < 4; sweep++) {
        const downward = sweep % 2 === 0;
        const indices = layers.map((_, i) => i);
        for (const i of downward ? indices.slice(1) : indices.slice(0, -1).reverse()) {
            const reference = layers[downward ? i - 1 : i + 1];
            const rowOf = new Map(reference.map((id, row) => [id, row]));
            const barycenter = new Map(
                layers[i].map((id, row) => {
                    const rows = [...neighbors.get(id)!].filter((n) => rowOf.has(n)).map((n) => rowOf.get(n)!);
                    return [id, rows.length > 0 ? rows.reduce((a, b) => a + b, 0) / rows.length : row];
                }),
            );
            layers[i].sort((a, b) => barycenter.get(a)! - barycenter.get(b)!);
        }
    }
}
