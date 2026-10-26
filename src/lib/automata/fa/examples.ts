// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { createId } from "../machine.ts";
import type { FiniteAutomaton } from "./model.ts";

/** A bundled example shown in the editor menu. */
export interface FaExample {
    id: string;
    title: string;
    description: string;
    create: () => FiniteAutomaton;
}

type StateSpec = [name: string, x: number, y: number, flags?: "initial" | "final" | "initial final"];
type TransitionSpec = [from: string, to: string, symbols: string];

function build(title: string, states: StateSpec[], transitions: TransitionSpec[]): FiniteAutomaton {
    const nodes = states.map(([name, x, y, flags = ""]) => ({
        id: createId(),
        name,
        x,
        y,
        initial: flags.includes("initial"),
        final: flags.includes("final"),
    }));
    const idOf = (name: string) => nodes.find((node) => node.name === name)!.id;
    return {
        kind: "fa",
        title,
        states: nodes,
        transitions: transitions.flatMap(([from, to, symbols]) =>
            symbols.split(",").map((symbol) => ({ id: createId(), from: idOf(from), to: idOf(to), symbol: symbol === "ε" ? "" : symbol })),
        ),
    };
}

export const faExamples: FaExample[] = [
    {
        id: "signed-binary",
        title: "Binärzahlen mit Vorzeichen",
        description: "DEA für Binärzahlen ohne führende Nullen mit optionalem Minus, z. B. 0, 101, -110.",
        create: () =>
            build(
                "Beispiel: Endlicher Automat zur Erkennung von Binärzahlen mit Vorzeichen",
                [
                    ["q0", 100, 220, "initial"],
                    ["q1", 300, 60, "final"],
                    ["q2", 300, 380],
                    ["q3", 500, 300, "final"],
                    ["q4", 700, 60],
                ],
                [
                    ["q0", "q2", "-"],
                    ["q0", "q1", "0"],
                    ["q0", "q3", "1"],
                    ["q1", "q4", "-,0,1"],
                    ["q2", "q3", "1"],
                    ["q2", "q4", "-,0"],
                    ["q3", "q3", "0,1"],
                    ["q3", "q4", "-"],
                    ["q4", "q4", "-,0,1"],
                ],
            ),
    },
    {
        id: "ends-with-01",
        title: "Endet auf 01",
        description: "NEA, der alle Wörter über {0, 1} akzeptiert, die auf 01 enden.",
        create: () =>
            build(
                "NEA: Wörter über {0, 1}, die auf 01 enden",
                [
                    ["q0", 140, 200, "initial"],
                    ["q1", 340, 200],
                    ["q2", 540, 200, "final"],
                ],
                [
                    ["q0", "q0", "0,1"],
                    ["q0", "q1", "0"],
                    ["q1", "q2", "1"],
                ],
            ),
    },
    {
        id: "epsilon-ab",
        title: "ε-Übergänge: a* b*",
        description: "NEA mit ε-Übergang für die Sprache a*b*.",
        create: () =>
            build(
                "NEA mit ε-Übergang: L = a*b*",
                [
                    ["q0", 160, 200, "initial final"],
                    ["q1", 400, 200, "final"],
                ],
                [
                    ["q0", "q0", "a"],
                    ["q0", "q1", "ε"],
                    ["q1", "q1", "b"],
                ],
            ),
    },
];
