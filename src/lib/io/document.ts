// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { FiniteAutomaton } from "../automata/fa/model.ts";
import { withSingleInitial, withUniqueNames } from "../automata/machine.ts";

const FORMAT = "automata";
const VERSION = 1;

export function faToJson(fa: FiniteAutomaton): string {
    return JSON.stringify({ format: FORMAT, version: VERSION, machine: fa }, null, 2);
}

/** @throws Error with a German message if the document is invalid */
export function faFromJson(json: string): FiniteAutomaton {
    let data: unknown;
    try {
        data = JSON.parse(json);
    } catch {
        throw new Error("Die Datei ist kein gültiges JSON.");
    }
    const document = data as { format?: unknown; version?: unknown; machine?: Partial<FiniteAutomaton> };
    if (document.format !== FORMAT || typeof document.version !== "number" || document.version > VERSION) {
        throw new Error("Unbekanntes Dateiformat oder neuere Version.");
    }
    const machine = document.machine;
    if (machine?.kind !== "fa" || !Array.isArray(machine.states) || !Array.isArray(machine.transitions)) {
        throw new Error("Die Datei enthält keinen endlichen Automaten.");
    }
    const statesValid = machine.states.every(
        (s) => isObject(s) && typeof s.id === "string" && typeof s.name === "string" && Number.isFinite(s.x) && Number.isFinite(s.y),
    );
    const ids = new Set(statesValid ? machine.states.map((state) => state.id) : []);
    const valid = statesValid && machine.transitions.every((t) => isObject(t) && ids.has(t.from) && ids.has(t.to) && typeof t.symbol === "string");
    if (!valid) {
        throw new Error("Die Datei enthält fehlerhafte Zustände oder Übergänge.");
    }
    const states = machine.states.map((s) => ({ ...s, initial: Boolean(s.initial), final: Boolean(s.final) }));
    return {
        kind: "fa",
        title: typeof machine.title === "string" ? machine.title : "Unbenannter Automat",
        states: withUniqueNames(withSingleInitial(states)),
        transitions: machine.transitions,
    };
}

function isObject(value: unknown): boolean {
    return typeof value === "object" && value !== null;
}
