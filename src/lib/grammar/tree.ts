// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { EPSILON } from "../automata/machine.ts";

const COLUMN_WIDTH = 44;
const ROW_HEIGHT = 56;
const PADDING = 24;
// Offsets around a node center that keep edges clear of its 15px label and center the label vertically.
const TEXT_BASELINE = 5;
const EDGE_GAP_BELOW = 8;
const EDGE_GAP_ABOVE = 12;

/** A node of a derivation tree; the empty symbol is an ε-leaf. */
export interface ParseTree {
    symbol: string;
    children: ParseTree[];
}

export interface TreeLayout {
    /** Labels positioned at their text baseline. */
    nodes: { label: string; x: number; y: number; leaf: boolean }[];
    edges: { x1: number; y1: number; x2: number; y2: number }[];
    width: number;
    height: number;
}

/** Places leaves left to right in reading order and centers every parent above its children. */
export function layoutTree(tree: ParseTree): TreeLayout {
    const layout: TreeLayout = { nodes: [], edges: [], width: 0, height: 0 };
    let nextLeaf = 0;
    const place = (node: ParseTree, depth: number): { x: number; y: number } => {
        const y = PADDING + depth * ROW_HEIGHT;
        const children = node.children.map((child) => place(child, depth + 1));
        const x = children.length > 0 ? (children[0].x + children.at(-1)!.x) / 2 : PADDING + nextLeaf++ * COLUMN_WIDTH;
        layout.nodes.push({ label: node.symbol === "" ? EPSILON : node.symbol, x, y: y + TEXT_BASELINE, leaf: children.length === 0 });
        layout.edges.push(...children.map((child) => ({ x1: x, y1: y + EDGE_GAP_BELOW, x2: child.x, y2: child.y - EDGE_GAP_ABOVE })));
        layout.width = Math.max(layout.width, x + PADDING);
        layout.height = Math.max(layout.height, y + PADDING);
        return { x, y };
    };
    place(tree, 0);
    return layout;
}
