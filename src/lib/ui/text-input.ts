// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Attachment } from "svelte/attachments";

type TextField = HTMLInputElement | HTMLTextAreaElement;

/** Replaces the selection with text and places the caret after it; fires an input event so bindings update. */
export function insertText(field: TextField, text: string): void {
    field.focus();
    field.setRangeText(text, field.selectionStart ?? field.value.length, field.selectionEnd ?? field.value.length, "end");
    field.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Turns typed shortcuts into symbols that are hard to type, e.g. "->" into "→", as soon as the shortcut is complete. */
export function autoReplace(replacements: Record<string, string>): Attachment<TextField> {
    return (field) => {
        const onInput = (event: Event) => {
            // Only react to typing, so pasted text and undo restore exactly what the user had.
            if (!(event instanceof InputEvent) || event.inputType !== "insertText") {
                return;
            }
            const caret = field.selectionStart ?? 0;
            const before = field.value.slice(0, caret);
            const shortcut = Object.keys(replacements).find((key) => before.endsWith(key));
            if (shortcut) {
                field.setRangeText(replacements[shortcut], caret - shortcut.length, caret, "end");
                field.dispatchEvent(new Event("input", { bubbles: true }));
            }
        };
        field.addEventListener("input", onInput);
        return () => field.removeEventListener("input", onInput);
    };
}
