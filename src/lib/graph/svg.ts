// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Edge, Machine } from "../automata/machine.ts";
import { edgeBend, edgeShape, type EdgeGroup, graphBounds, groupEdges, initialArrowPath, loopDirections, STATE_RADIUS } from "./geometry.ts";

const INK = "#1a1b2e";
const MUTED = "#5f6178";
const PAPER = "#ffffff";
const FONT = "Geist, Inter, Helvetica, Arial, sans-serif";

/**
 * Renders a state graph as a standalone, print friendly SVG document with fixed light colors.
 * @param machine the machine to draw
 * @param edgeLabel formats the label of an edge group
 * @return the SVG markup including the xmlns declaration
 */
export function renderMachineSvg<T extends Edge>(machine: Machine<T>, edgeLabel: (group: EdgeGroup<T>) => string): string {
    const loops = loopDirections(machine.states, machine.transitions);
    const box = graphBounds(machine.states, loops);
    const byId = new Map(machine.states.map((state) => [state.id, state]));
    const groups = groupEdges(machine.transitions);
    const keys = new Set(groups.map((group) => group.key));
    const parts: string[] = [];

    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${Math.round(box.width)}" height="${Math.round(box.height)}" font-family="${FONT}">`,
        `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${INK}"/></marker></defs>`,
        `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${PAPER}"/>`,
    );
    for (const group of groups) {
        const from = byId.get(group.from);
        const to = byId.get(group.to);
        if (!from || !to) {
            continue;
        }
        const shape = edgeShape(from, to, edgeBend(from, to, group.from !== group.to && keys.has(`${group.to}>${group.from}`), machine.states), loops.get(group.from));
        parts.push(
            `<path d="${shape.path}" fill="none" stroke="${INK}" stroke-width="1.6" marker-end="url(#arrow)"/>`,
            `<text x="${shape.labelX}" y="${shape.labelY}" text-anchor="${shape.labelAnchor}" font-size="15" fill="${INK}" stroke="${PAPER}" stroke-width="5" paint-order="stroke">${escape(edgeLabel(group))}</text>`,
        );
    }
    for (const state of machine.states) {
        if (state.initial) {
            parts.push(`<path d="${initialArrowPath(state)}" stroke="${INK}" stroke-width="1.6" marker-end="url(#arrow)"/>`);
        }
        parts.push(`<circle cx="${state.x}" cy="${state.y}" r="${STATE_RADIUS}" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`);
        if (state.final) {
            parts.push(`<circle cx="${state.x}" cy="${state.y}" r="${STATE_RADIUS - 5}" fill="none" stroke="${INK}" stroke-width="1.4"/>`);
        }
        parts.push(`<text x="${state.x}" y="${state.y + 5}" text-anchor="middle" font-size="15" fill="${INK}">${escape(state.name)}</text>`);
        if (state.label) {
            parts.push(`<text x="${state.x}" y="${state.y + STATE_RADIUS + 18}" text-anchor="middle" font-size="12" fill="${MUTED}">${escape(state.label)}</text>`);
        }
    }
    parts.push("</svg>");
    return parts.join("\n");
}

function escape(text: string): string {
    return text.replace(/[<>&"]/g, (char) => `&#${char.charCodeAt(0)};`);
}
