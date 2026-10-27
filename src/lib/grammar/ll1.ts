// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { END_MARKER, formatProduction, type Grammar, isContextFree, isNonterminal, nonterminalsOf, type Production, terminalsOf } from "./grammar.ts";
import type { ParseTree } from "./tree.ts";

const STEP_LIMIT = 10_000;

export interface Ll1Analysis {
    nonterminals: string[];
    /** Table columns: all terminals followed by the end marker. */
    columns: string[];
    nullable: ReadonlySet<string>;
    first: ReadonlyMap<string, ReadonlySet<string>>;
    /** FOLLOW sets, including the end marker. */
    follow: ReadonlyMap<string, ReadonlySet<string>>;
    /** Productions per nonterminal and lookahead; more than one entry is a conflict. */
    table: ReadonlyMap<string, ReadonlyMap<string, Production[]>>;
    conflicts: { nonterminal: string; terminal: string }[];
}

export interface Ll1Step {
    /** Stack contents, top first. */
    stack: string[];
    /** Unread input including the end marker. */
    input: string[];
    action: string;
}

export interface Ll1Run {
    steps: Ll1Step[];
    accepted: boolean;
    /** Parse tree, complete only if the word was accepted. */
    tree: ParseTree;
    /** German reason for the rejection, null if accepted. */
    error: string | null;
}

/**
 * Computes nullable, FIRST and FOLLOW sets and the LL(1) parse table.
 * @throws Error if the grammar is not context-free
 */
export function analyzeLl1(grammar: Grammar): Ll1Analysis {
    if (!isContextFree(grammar)) {
        throw new Error("LL(1)-Analyse ist nur für kontextfreie Grammatiken möglich.");
    }
    const nonterminals = nonterminalsOf(grammar);
    const nullable = new Set<string>();
    const first = new Map(nonterminals.map((n) => [n, new Set<string>()]));
    const follow = new Map(nonterminals.map((n) => [n, new Set<string>()]));
    follow.get(grammar.start)!.add(END_MARKER);

    // Both fixpoints only ever grow the sets, so iterating until nothing changes terminates.
    for (let changed = true; changed; ) {
        changed = false;
        for (const p of grammar.productions) {
            const left = p.left[0];
            const sequence = firstOfSequence(p.right, first, nullable);
            changed = addAll(first.get(left)!, sequence.first) || changed;
            if (sequence.nullable && !nullable.has(left)) {
                nullable.add(left);
                changed = true;
            }
        }
    }
    for (let changed = true; changed; ) {
        changed = false;
        for (const p of grammar.productions) {
            p.right.forEach((symbol, i) => {
                if (!isNonterminal(symbol)) {
                    return;
                }
                const rest = firstOfSequence(p.right.slice(i + 1), first, nullable);
                changed = addAll(follow.get(symbol)!, rest.first) || changed;
                if (rest.nullable) {
                    changed = addAll(follow.get(symbol)!, follow.get(p.left[0])!) || changed;
                }
            });
        }
    }

    const table = new Map(nonterminals.map((n) => [n, new Map<string, Production[]>()]));
    for (const p of grammar.productions) {
        const sequence = firstOfSequence(p.right, first, nullable);
        const lookaheads = new Set([...sequence.first, ...(sequence.nullable ? follow.get(p.left[0])! : [])]);
        const row = table.get(p.left[0])!;
        for (const terminal of lookaheads) {
            row.set(terminal, [...(row.get(terminal) ?? []), p]);
        }
    }
    const columns = [...terminalsOf(grammar), END_MARKER];
    const conflicts = nonterminals.flatMap((nonterminal) =>
        columns.filter((terminal) => (table.get(nonterminal)!.get(terminal)?.length ?? 0) > 1).map((terminal) => ({ nonterminal, terminal })),
    );
    return { nonterminals, columns, nullable, first, follow, table, conflicts };
}

/** FIRST set of a symbol sequence and whether the whole sequence can derive ε. */
function firstOfSequence(
    symbols: readonly string[],
    first: ReadonlyMap<string, ReadonlySet<string>>,
    nullable: ReadonlySet<string>,
): { first: Set<string>; nullable: boolean } {
    const result = new Set<string>();
    for (const symbol of symbols) {
        if (!isNonterminal(symbol)) {
            result.add(symbol);
            return { first: result, nullable: false };
        }
        addAll(result, first.get(symbol) ?? new Set());
        if (!nullable.has(symbol)) {
            return { first: result, nullable: false };
        }
    }
    return { first: result, nullable: true };
}

/**
 * Runs the table-driven LL(1) parser and records every step; conflicting cells use their first production.
 * @param word input symbols, one terminal each
 */
export function parseLl1(grammar: Grammar, analysis: Ll1Analysis, word: readonly string[]): Ll1Run {
    const tree: ParseTree = { symbol: grammar.start, children: [] };
    const stack: (ParseTree | null)[] = [null, tree];
    const input = [...word, END_MARKER];
    const steps: Ll1Step[] = [];
    let position = 0;
    const record = (action: string) => steps.push({ stack: stack.map((node) => node?.symbol ?? END_MARKER).reverse(), input: input.slice(position), action });
    const fail = (message: string): Ll1Run => {
        record(`Fehler: ${message}`);
        return { steps, accepted: false, tree, error: message };
    };

    while (steps.length < STEP_LIMIT) {
        const top = stack.at(-1)!;
        const lookahead = input[position];
        if (top === null) {
            if (lookahead !== END_MARKER) {
                return fail(`Eingabe „${lookahead}“ übrig, Stapel leer.`);
            }
            record("Akzeptiert");
            return { steps, accepted: true, tree, error: null };
        }
        if (!isNonterminal(top.symbol)) {
            if (top.symbol !== lookahead) {
                return fail(`„${top.symbol}“ erwartet, „${lookahead}“ gelesen.`);
            }
            record(`„${lookahead}“ lesen`);
            stack.pop();
            position++;
            continue;
        }
        const production = analysis.table.get(top.symbol)?.get(lookahead)?.[0];
        if (!production) {
            return fail(`kein Eintrag M[${top.symbol}, ${lookahead}].`);
        }
        record(formatProduction(production));
        stack.pop();
        top.children = production.right.length === 0 ? [{ symbol: "", children: [] }] : production.right.map((symbol) => ({ symbol, children: [] }));
        if (production.right.length > 0) {
            stack.push(...[...top.children].reverse());
        }
    }
    return fail("zu viele Schritte, Abbruch.");
}

function addAll(target: Set<string>, source: Iterable<string>): boolean {
    const size = target.size;
    for (const item of source) {
        target.add(item);
    }
    return target.size !== size;
}
