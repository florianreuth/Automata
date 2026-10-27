// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { FiniteAutomaton } from "../automata/fa/model.ts";
import { faFromJson, faToJson } from "./document.ts";

const HANDOFF_KEY = "automata:fa:handoff";

/** Hands an automaton to the FA editor page in this tab; false if session storage is unavailable. */
export function handOffAutomaton(fa: FiniteAutomaton): boolean {
    try {
        sessionStorage.setItem(HANDOFF_KEY, faToJson(fa));
        return true;
    } catch {
        return false;
    }
}

/** Takes the handed-off automaton exactly once; null if there is none. */
export function takeHandedOffAutomaton(): FiniteAutomaton | null {
    try {
        const json = sessionStorage.getItem(HANDOFF_KEY);
        sessionStorage.removeItem(HANDOFF_KEY);
        return json ? faFromJson(json) : null;
    } catch {
        return null;
    }
}
