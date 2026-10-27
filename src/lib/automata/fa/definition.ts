// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { EPSILON, naturalCompare } from "../machine.ts";
import { alphabetOf, displaySymbol, type FiniteAutomaton, isDeterministic } from "./model.ts";

/** One row of the transition table. */
export interface TransitionRow {
    state: string;
    initial: boolean;
    final: boolean;
    /** Successor names per column, sorted. */
    cells: string[][];
}

/** The 5-tuple A = (Q, Σ, δ, q0, F) in a renderer independent form. */
export interface FormalDefinition {
    name: string;
    title: string;
    states: string[];
    alphabet: string[];
    initial: string | null;
    finals: string[];
    deterministic: boolean;
    /** Table columns as stored symbols; ε ("") is appended if ε-transitions exist. */
    columns: string[];
    rows: TransitionRow[];
}

/** Derives the formal definition from an automaton, with states sorted by name. */
export function formalDefinition(fa: FiniteAutomaton, name = "A"): FormalDefinition {
    const names = new Map(fa.states.map((state) => [state.id, state.name]));
    const states = [...fa.states].sort((a, b) => naturalCompare(a.name, b.name));
    const alphabet = alphabetOf(fa);
    const columns = fa.transitions.some((t) => t.symbol === "") ? [...alphabet, ""] : alphabet;
    return {
        name,
        title: fa.title,
        states: states.map((state) => state.name),
        alphabet,
        initial: fa.states.find((state) => state.initial)?.name ?? null,
        finals: states.filter((state) => state.final).map((state) => state.name),
        deterministic: isDeterministic(fa),
        columns,
        rows: states.map((state) => ({
            state: state.name,
            initial: state.initial,
            final: state.final,
            cells: columns.map((symbol) => {
                const targets = fa.transitions.filter((t) => t.from === state.id && t.symbol === symbol).map((t) => names.get(t.to)!);
                return [...new Set(targets)].sort(naturalCompare);
            }),
        })),
    };
}

/** Formats the signature of δ depending on determinism and ε-transitions, e.g. "δ: Q × Σ → 𝒫(Q)". */
export function transitionSignature(definition: FormalDefinition): string {
    if (definition.deterministic) {
        return "δ: Q × Σ → Q";
    }
    const domain = definition.columns.includes("") ? `Q × (Σ ∪ {${EPSILON}})` : "Q × Σ";
    return `δ: ${domain} → 𝒫(Q)`;
}

/** Formats one table cell: a DFA shows a single state or "–", an NFA a set or "∅". */
export function formatCell(definition: FormalDefinition, targets: readonly string[]): string {
    if (definition.deterministic) {
        return targets[0] ?? "–";
    }
    return targets.length === 0 ? "∅" : `{${targets.join(", ")}}`;
}

/** Renders the definition as plain Unicode text with an aligned table. */
export function definitionToText(definition: FormalDefinition): string {
    const lines: string[] = [];
    if (definition.title.trim()) {
        lines.push(definition.title.trim(), "");
    }
    lines.push(tupleLine(definition), "");
    lines.push(`${setsLine(definition)}    δ ist dargestellt durch`, "");

    const header = ["δ", ...definition.columns.map(displaySymbol)];
    const body = definition.rows.map((row) => [rowLabel(row), ...row.cells.map((cell) => formatCell(definition, cell))]);
    const widths = header.map((_, column) => Math.max(...[header, ...body].map((line) => [...line[column]].length)));
    const pad = (line: string[]) => line.map((cell, column) => cell + " ".repeat(widths[column] - [...cell].length)).join(" │ ").trimEnd();
    lines.push(pad(header));
    lines.push(widths.map((width) => "─".repeat(width)).join("─┼─"));
    lines.push(...body.map(pad));
    lines.push("", "→ Startzustand, * Endzustand");
    return lines.join("\n");
}

/** Renders the definition as GitHub flavored Markdown. */
export function definitionToMarkdown(definition: FormalDefinition): string {
    const escape = (text: string) => text.replace(/([\\|*_`[\]])/g, "\\$1");
    const lines: string[] = [];
    if (definition.title.trim()) {
        lines.push(`**${escape(definition.title.trim())}**`, "");
    }
    lines.push(escape(tupleLine(definition)), "");
    lines.push(`${escape(setsLine(definition))}    δ ist dargestellt durch:`, "");
    lines.push(`| δ | ${definition.columns.map((symbol) => escape(displaySymbol(symbol))).join(" | ")} |`);
    lines.push(`|${" --- |".repeat(definition.columns.length + 1)}`);
    for (const row of definition.rows) {
        const cells = row.cells.map((cell) => escape(formatCell(definition, cell)));
        lines.push(`| ${escape(rowLabel(row).trim())} | ${cells.join(" | ")} |`);
    }
    lines.push("", "→ Startzustand, \\* Endzustand");
    return lines.join("\n");
}

/** Renders the definition as a LaTeX fragment that compiles without extra packages. */
export function definitionToLatex(definition: FormalDefinition): string {
    const set = (items: readonly string[], format: (item: string) => string) => (items.length === 0 ? "\\emptyset" : `\\{${items.map(format).join(", ")}\\}`);
    const cell = (targets: readonly string[]) => {
        if (definition.deterministic) {
            return targets.length === 0 ? "-" : latexState(targets[0]);
        }
        return set(targets, latexState);
    };
    const lines: string[] = [];
    if (definition.title.trim()) {
        lines.push(`\\textbf{${latexText(definition.title.trim())}}`, "");
    }
    const initial = definition.initial ? latexState(definition.initial) : "q_0";
    lines.push(`$${latexText(definition.name)} = (Q, \\Sigma, \\delta, ${initial}, F)$`, "");
    lines.push(
        `$Q = ${set(definition.states, latexState)}$ \\quad $\\Sigma = ${set(definition.alphabet, latexSymbol)}$ \\quad $F = ${set(definition.finals, latexState)}$ \\quad $\\delta$ ist dargestellt durch`,
        "",
    );
    lines.push(`\\begin{tabular}{r|${"c".repeat(definition.columns.length)}}`);
    lines.push(`$\\delta$ & ${definition.columns.map((symbol) => `$${latexSymbol(symbol)}$`).join(" & ")} \\\\ \\hline`);
    for (const row of definition.rows) {
        const marker = `${row.initial ? "\\rightarrow " : ""}${row.final ? "{*}" : ""}`;
        lines.push(`$${marker}${latexState(row.state)}$ & ${row.cells.map((targets) => `$${cell(targets)}$`).join(" & ")} \\\\`);
    }
    lines.push("\\end{tabular}");
    return lines.join("\n");
}

function tupleLine(definition: FormalDefinition): string {
    return `${definition.name} = (Q, Σ, δ, ${definition.initial ?? "q0"}, F)`;
}

function setsLine(definition: FormalDefinition): string {
    const set = (items: readonly string[]) => (items.length === 0 ? "∅" : `{${items.join(", ")}}`);
    return `Q = ${set(definition.states)}    Σ = ${set(definition.alphabet)}    F = ${set(definition.finals)}`;
}

function rowLabel(row: TransitionRow): string {
    return `${row.initial ? "→" : " "}${row.final ? "*" : " "}${row.state}`;
}

function latexText(text: string): string {
    const replacements: Record<string, string> = { "\\": "\\textbackslash{}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" };
    return text.replace(/[\\{}$&#^_%~]/g, (char) => replacements[char] ?? `\\${char}`);
}

function latexState(name: string): string {
    const match = /^([A-Za-z]+)(\d+)$/.exec(name);
    if (match) {
        return `${match[1]}_{${match[2]}}`;
    }
    return /^[A-Za-z]$/.test(name) ? name : `\\text{${latexText(name)}}`;
}

function latexSymbol(symbol: string): string {
    if (symbol === "") {
        return "\\varepsilon";
    }
    return /^[A-Za-z0-9]$/.test(symbol) ? symbol : `\\text{${latexText(symbol)}}`;
}
