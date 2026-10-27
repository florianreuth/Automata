// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Tool } from "./graph-editor.ts";
import { TOOLS } from "./tools.ts";

export type Command = "undo" | "redo" | "save" | "open" | "delete" | "rename" | "cancel" | "fit" | "arrange" | { tool: Tool };

type KeyPress = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">;

const WITH_MODIFIER: Record<string, Command> = { z: "undo", y: "redo", s: "save", o: "open" };
const WITHOUT_MODIFIER: Record<string, Command> = { Delete: "delete", Backspace: "delete", F2: "rename", Escape: "cancel", f: "fit", a: "arrange" };

/** Editor command bound to a key press, with Ctrl or Cmd as modifier; null if the key has no binding. */
export function commandFor(press: KeyPress): Command | null {
    const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
    if (press.ctrlKey || press.metaKey) {
        // Ctrl+Shift+Z is the common alternative to Ctrl+Y.
        return key === "z" && press.shiftKey ? "redo" : (WITH_MODIFIER[key] ?? null);
    }
    const tool = TOOLS.find((definition) => definition.key.toLowerCase() === key);
    return WITHOUT_MODIFIER[key] ?? (tool ? { tool: tool.id } : null);
}
