// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { FiniteAutomaton } from "../automata/fa/model.ts";
import { faFromJson } from "./document.ts";
import { faFromJff } from "./jff.ts";

/** Value for the accept attribute of a file input that offers every importable format. */
export const AUTOMATON_FILE_TYPES = ".json,.jff,application/json";

/**
 * Reads an automaton from a native JSON document or, by file extension, a JFLAP .jff file named after its title.
 * @throws Error with a German message if the content is invalid
 */
export function faFromFile(name: string, text: string): FiniteAutomaton {
    return name.toLowerCase().endsWith(".jff") ? faFromJff(text, name.replace(/\.[^.]+$/, "")) : faFromJson(text);
}
