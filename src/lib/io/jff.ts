// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { createId } from "../automata/machine.ts";
import type { FiniteAutomaton } from "../automata/fa/model.ts";
import { escapeMarkup } from "../markup.ts";

/** Serializes a finite automaton into the JFLAP 7 .jff format. */
export function faToJff(fa: FiniteAutomaton): string {
    const index = new Map(fa.states.map((state, i) => [state.id, i]));
    const lines = ['<?xml version="1.0" encoding="UTF-8" standalone="no"?><!--Created with Automata.-->', "<structure>", "\t<type>fa</type>", "\t<automaton>"];
    for (const state of fa.states) {
        lines.push(`\t\t<state id="${index.get(state.id)}" name="${escapeMarkup(state.name)}">`);
        lines.push(`\t\t\t<x>${state.x.toFixed(1)}</x>`, `\t\t\t<y>${state.y.toFixed(1)}</y>`);
        if (state.label) {
            lines.push(`\t\t\t<label>${escapeMarkup(state.label)}</label>`);
        }
        if (state.initial) {
            lines.push("\t\t\t<initial/>");
        }
        if (state.final) {
            lines.push("\t\t\t<final/>");
        }
        lines.push("\t\t</state>");
    }
    for (const transition of fa.transitions) {
        lines.push("\t\t<transition>");
        lines.push(`\t\t\t<from>${index.get(transition.from)}</from>`, `\t\t\t<to>${index.get(transition.to)}</to>`);
        lines.push(transition.symbol === "" ? "\t\t\t<read/>" : `\t\t\t<read>${escapeMarkup(transition.symbol)}</read>`);
        lines.push("\t\t</transition>");
    }
    lines.push("\t</automaton>", "</structure>", "");
    return lines.join("\n");
}

/**
 * Parses a JFLAP .jff file containing a finite automaton; requires a browser DOMParser.
 * @throws Error with a German message if the file is malformed or not a finite automaton
 */
export function faFromJff(xml: string, title: string): FiniteAutomaton {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) {
        throw new Error("Die Datei ist kein gültiges XML.");
    }
    const type = document.querySelector("structure > type")?.textContent?.trim();
    if (type !== "fa") {
        throw new Error(`Nicht unterstützter JFLAP-Typ „${type ?? "unbekannt"}“. Derzeit werden nur endliche Automaten (fa) unterstützt.`);
    }
    // JFLAP 4 files list states directly below <structure>, JFLAP 7 wraps them in <automaton>.
    const ids = new Map<string, string>();
    const states = [...document.querySelectorAll("state")].map((element) => {
        const id = createId();
        ids.set(element.getAttribute("id") ?? "", id);
        const label = element.querySelector("label")?.textContent ?? undefined;
        return {
            id,
            name: element.getAttribute("name") ?? `q${element.getAttribute("id")}`,
            ...(label ? { label } : {}),
            x: Number(element.querySelector("x")?.textContent ?? 0),
            y: Number(element.querySelector("y")?.textContent ?? 0),
            initial: element.querySelector("initial") !== null,
            final: element.querySelector("final") !== null,
        };
    });
    let initialSeen = false;
    for (const state of states) {
        state.initial = state.initial && !initialSeen;
        initialSeen ||= state.initial;
    }
    const transitions = [...document.querySelectorAll("transition")].map((element) => {
        const from = ids.get(element.querySelector("from")?.textContent?.trim() ?? "");
        const to = ids.get(element.querySelector("to")?.textContent?.trim() ?? "");
        const symbol = element.querySelector("read")?.textContent ?? "";
        if (!from || !to) {
            throw new Error("Ein Übergang verweist auf einen unbekannten Zustand.");
        }
        if ([...symbol].length > 1) {
            throw new Error(`Übergänge mit mehreren Zeichen („${symbol}“) werden nicht unterstützt.`);
        }
        return { id: createId(), from, to, symbol };
    });
    return { kind: "fa", title, states, transitions };
}
