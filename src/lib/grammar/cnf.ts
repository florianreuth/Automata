// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { type Grammar, isContextFree, isNonterminal, nonterminalsOf } from "./grammar.ts";

type Rule = [left: string, right: string[]];

/**
 * Converts a context-free grammar into Chomsky normal form (START, TERM, BIN, DEL, UNIT) and drops useless
 * nonterminals; new nonterminals are named S0, T1, T2, … and X1, X2, …
 * @throws Error if the grammar is not context-free
 */
export function toCnf(grammar: Grammar): Grammar {
    if (!isContextFree(grammar)) {
        throw new Error("Nur kontextfreie Grammatiken lassen sich in Chomsky-Normalform bringen.");
    }
    const used = new Set(nonterminalsOf(grammar));
    const fresh = (prefix: string, from = 1) => {
        for (let i = from; ; i++) {
            const name = `${prefix}${i}`;
            if (!used.has(name)) {
                used.add(name);
                return name;
            }
        }
    };
    let start = grammar.start;
    let rules: Rule[] = grammar.productions.map((p) => [p.left[0], p.right]);

    if (rules.some(([, right]) => right.includes(start))) {
        const newStart = fresh(start, 0);
        rules.unshift([newStart, [start]]);
        start = newStart;
    }
    rules = replaceTerminals(rules, fresh);
    rules = binarize(rules, fresh);
    rules = removeEpsilonRules(rules, start);
    rules = removeUnitRules(rules);
    rules = removeUselessRules(rules, start);

    const unique = new Map(rules.map((rule) => [`${rule[0]}→${rule[1].join(" ")}`, rule]));
    const ordered = [...unique.values()].sort(([a], [b]) => Number(b === start) - Number(a === start));
    return { start, productions: ordered.map(([left, right]) => ({ left: [left], right })) };
}

/** True if every production is A → BC, A → a, or start → ε with the start symbol never on a right side. */
export function isCnf(grammar: Grammar): boolean {
    const startOnRight = grammar.productions.some((p) => p.right.includes(grammar.start));
    return (
        isContextFree(grammar) &&
        grammar.productions.every(
            ({ left, right }) =>
                (right.length === 2 && right.every(isNonterminal)) ||
                (right.length === 1 && !isNonterminal(right[0])) ||
                (right.length === 0 && left[0] === grammar.start && !startOnRight),
        )
    );
}

function replaceTerminals(rules: Rule[], fresh: (prefix: string) => string): Rule[] {
    const names = new Map<string, string>();
    const nameOf = (terminal: string) => {
        if (!names.has(terminal)) {
            names.set(terminal, fresh("T"));
        }
        return names.get(terminal)!;
    };
    const replaced: Rule[] = rules.map(([left, right]) => {
        if (right.length < 2) {
            return [left, right];
        }
        return [left, right.map((symbol) => (isNonterminal(symbol) ? symbol : nameOf(symbol)))];
    });
    return [...replaced, ...[...names].map(([terminal, name]): Rule => [name, [terminal]])];
}

function binarize(rules: Rule[], fresh: (prefix: string) => string): Rule[] {
    return rules.flatMap(([left, right]) => {
        const result: Rule[] = [];
        let current = left;
        let rest = right;
        while (rest.length > 2) {
            const next = fresh("X");
            result.push([current, [rest[0], next]]);
            current = next;
            rest = rest.slice(1);
        }
        result.push([current, rest]);
        return result;
    });
}

function removeEpsilonRules(rules: Rule[], start: string): Rule[] {
    const nullable = new Set<string>();
    for (let changed = true; changed; ) {
        changed = false;
        for (const [left, right] of rules) {
            if (!nullable.has(left) && right.every((symbol) => nullable.has(symbol))) {
                nullable.add(left);
                changed = true;
            }
        }
    }
    // Right sides have at most two symbols here, so expanding every subset of nullable symbols stays small.
    const variants = (right: string[]): string[][] => {
        if (right.length === 0) {
            return [[]];
        }
        const tails = variants(right.slice(1));
        const withHead = tails.map((tail) => [right[0], ...tail]);
        return nullable.has(right[0]) ? [...withHead, ...tails] : withHead;
    };
    const result: Rule[] = rules.flatMap(([left, right]) => variants(right).filter((variant) => variant.length > 0).map((variant): Rule => [left, variant]));
    return nullable.has(start) ? [[start, []], ...result] : result;
}

function removeUnitRules(rules: Rule[]): Rule[] {
    const isUnit = ([, right]: Rule) => right.length === 1 && isNonterminal(right[0]);
    const nonterminals = [...new Set(rules.map(([left]) => left))];
    return nonterminals.flatMap((nonterminal) => {
        const reachable = new Set([nonterminal]);
        const stack = [nonterminal];
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const rule of rules) {
                if (rule[0] === current && isUnit(rule) && !reachable.has(rule[1][0])) {
                    reachable.add(rule[1][0]);
                    stack.push(rule[1][0]);
                }
            }
        }
        return rules.filter((rule) => reachable.has(rule[0]) && !isUnit(rule)).map(([, right]): Rule => [nonterminal, right]);
    });
}

function removeUselessRules(rules: Rule[], start: string): Rule[] {
    const productive = new Set<string>();
    for (let changed = true; changed; ) {
        changed = false;
        for (const [left, right] of rules) {
            if (!productive.has(left) && right.every((symbol) => !isNonterminal(symbol) || productive.has(symbol))) {
                productive.add(left);
                changed = true;
            }
        }
    }
    const productiveRules = rules.filter(([left, right]) => productive.has(left) && right.every((symbol) => !isNonterminal(symbol) || productive.has(symbol)));
    const reachable = new Set([start]);
    for (let changed = true; changed; ) {
        changed = false;
        for (const [left, right] of productiveRules) {
            for (const symbol of right) {
                if (reachable.has(left) && isNonterminal(symbol) && !reachable.has(symbol)) {
                    reachable.add(symbol);
                    changed = true;
                }
            }
        }
    }
    return productiveRules.filter(([left]) => reachable.has(left));
}
