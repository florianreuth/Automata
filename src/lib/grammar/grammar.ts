// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { EPSILON, naturalCompare } from "../automata/machine.ts";

/** End-of-input marker of the parsers; reserved, so it cannot be used as a terminal. */
export const END_MARKER = "$";

/** A rule left → right; an empty right side is an ε-production. */
export interface Production {
    left: string[];
    right: string[];
}

export interface Grammar {
    start: string;
    productions: Production[];
}

export interface GrammarError {
    /** One-based line number in the source text. */
    line: number;
    message: string;
}

export interface ChomskyType {
    type: 0 | 1 | 2 | 3;
    label: string;
}

const ARROW = /->|→|::=/;
const SYMBOL = /[A-Z][0-9']*|\S/gu;

/** Nonterminals are an uppercase letter optionally followed by digits or primes, e.g. S, A1, E'. */
export function isNonterminal(symbol: string): boolean {
    return /^[A-Z][0-9']*$/.test(symbol);
}

/**
 * Parses one production per line such as "S → aSb | ε"; the left side of the first line is the start symbol.
 * Every character that is not part of a nonterminal is a terminal; ε, λ or an empty alternative stand for the empty word.
 */
export function parseGrammar(source: string): { grammar: Grammar } | { errors: GrammarError[] } {
    const productions: Production[] = [];
    const errors: GrammarError[] = [];
    source.split("\n").forEach((text, index) => {
        const line = index + 1;
        if (text.trim() === "") {
            return;
        }
        const arrow = ARROW.exec(text);
        if (!arrow) {
            errors.push({ line, message: "Der Pfeil → (oder ->) fehlt." });
            return;
        }
        const left = tokenize(text.slice(0, arrow.index));
        if (!left.some(isNonterminal)) {
            errors.push({ line, message: "Die linke Seite braucht mindestens ein Nichtterminal (Großbuchstabe)." });
            return;
        }
        const alternatives = text.slice(arrow.index + arrow[0].length).split("|").map(tokenize);
        if ([...left, ...alternatives.flat()].includes(END_MARKER)) {
            errors.push({ line, message: `„${END_MARKER}“ ist als Endmarke reserviert.` });
            return;
        }
        productions.push(...alternatives.map((right) => ({ left, right })));
    });
    if (errors.length > 0) {
        return { errors };
    }
    if (productions.length === 0) {
        return { errors: [{ line: 1, message: "Die Grammatik enthält keine Produktionen." }] };
    }
    return { grammar: { start: productions[0].left[0], productions } };
}

/** Nonterminals in order of appearance, the start symbol first. */
export function nonterminalsOf(grammar: Grammar): string[] {
    const symbols = [grammar.start, ...grammar.productions.flatMap((p) => [...p.left, ...p.right])];
    return [...new Set(symbols.filter(isNonterminal))];
}

/** Terminals, sorted naturally. */
export function terminalsOf(grammar: Grammar): string[] {
    const symbols = grammar.productions.flatMap((p) => [...p.left, ...p.right]);
    return [...new Set(symbols.filter((symbol) => !isNonterminal(symbol)))].sort(naturalCompare);
}

export function isContextFree(grammar: Grammar): boolean {
    return grammar.productions.every((p) => p.left.length === 1 && isNonterminal(p.left[0]));
}

/** Most specific Chomsky type; regular means uniformly right-linear or left-linear. */
export function classify(grammar: Grammar): ChomskyType {
    if (isContextFree(grammar)) {
        const linear = (right: string[], nonterminalAt: "start" | "end") => {
            const nonterminals = right.map((symbol, i) => (isNonterminal(symbol) ? i : -1)).filter((i) => i >= 0);
            return nonterminals.length === 0 || (nonterminals.length === 1 && nonterminals[0] === (nonterminalAt === "end" ? right.length - 1 : 0));
        };
        if (grammar.productions.every((p) => linear(p.right, "end")) || grammar.productions.every((p) => linear(p.right, "start"))) {
            return { type: 3, label: "Typ 3 (regulär)" };
        }
        return { type: 2, label: "Typ 2 (kontextfrei)" };
    }
    const startOnRight = grammar.productions.some((p) => p.right.includes(grammar.start));
    const monotone = grammar.productions.every(
        (p) => p.left.length <= p.right.length || (p.right.length === 0 && !startOnRight && p.left.length === 1 && p.left[0] === grammar.start),
    );
    return monotone ? { type: 1, label: "Typ 1 (kontextsensitiv)" } : { type: 0, label: "Typ 0 (unbeschränkt)" };
}

/** Joins symbols without spaces unless a multi-character nonterminal would make that ambiguous; ε if empty. */
function formatSentence(symbols: readonly string[]): string {
    if (symbols.length === 0) {
        return EPSILON;
    }
    return symbols.join(symbols.some((symbol) => symbol.length > 1) ? " " : "");
}

export function formatProduction(production: Production): string {
    return `${formatSentence(production.left)} → ${formatSentence(production.right)}`;
}

/** Formats the grammar in the input syntax, one line per left side with alternatives joined by |. */
export function formatGrammar(grammar: Grammar): string {
    const lines = new Map<string, string[]>();
    for (const p of grammar.productions) {
        const left = formatSentence(p.left);
        lines.set(left, [...(lines.get(left) ?? []), formatSentence(p.right)]);
    }
    return [...lines].map(([left, rights]) => `${left} → ${rights.join(" | ")}`).join("\n");
}

/** Splits text into grammar symbols; ε and λ denote the empty word and are dropped. */
export function tokenize(text: string): string[] {
    return (text.match(SYMBOL) ?? []).filter((symbol) => symbol !== EPSILON && symbol !== "λ");
}
