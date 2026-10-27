// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Tool } from "./graph-editor.ts";

export interface ToolDefinition {
    id: Tool;
    label: string;
    /** Single-letter keyboard shortcut. */
    key: string;
    /** Usage hint shown below the canvas while the tool is active. */
    hint: string;
    /** SVG path data on a 24×24 grid. */
    icon: string;
}

export const TOOLS: ToolDefinition[] = [
    {
        id: "select",
        label: "Auswählen und verschieben",
        key: "V",
        hint: "Ziehen verschiebt · Umschalt+Ziehen erzeugt Übergänge · Doppelklick legt Zustände an · Rechtsklick öffnet Optionen",
        icon: "M5 3l14 8-6 1.5L10 19z",
    },
    {
        id: "state",
        label: "Zustand hinzufügen",
        key: "Z",
        hint: "Klicken legt einen Zustand an · der erste Zustand wird Startzustand",
        icon: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4v8m-4-4h8",
    },
    {
        id: "transition",
        label: "Übergang ziehen",
        key: "U",
        hint: "Von Zustand zu Zustand ziehen · Klick auf einen Zustand erzeugt eine Schleife",
        icon: "M4 18C8 6 16 6 20 10m0 0-1-5m1 5-5 1",
    },
    {
        id: "delete",
        label: "Löschen",
        key: "L",
        hint: "Zustände oder Übergänge anklicken, um sie zu löschen",
        icon: "M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13",
    },
];

export function toolDefinition(tool: Tool): ToolDefinition {
    return TOOLS.find((definition) => definition.id === tool)!;
}
