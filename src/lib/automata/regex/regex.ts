// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { EPSILON } from "../machine.ts";

export type Regex =
    | { kind: "empty" }
    | { kind: "epsilon" }
    | { kind: "symbol"; symbol: string }
    | { kind: "union"; items: Regex[] }
    | { kind: "concat"; items: Regex[] }
    | { kind: "star"; item: Regex }
    | { kind: "plus"; item: Regex }
    | { kind: "optional"; item: Regex };

export const EMPTY: Regex = { kind: "empty" };
export const EPSILON_REGEX: Regex = { kind: "epsilon" };

const EMPTY_SET = "∅";
const POSTFIX = new Map<string, "star" | "plus" | "optional">([
    ["*", "star"],
    ["+", "plus"],
    ["?", "optional"],
]);
const RESERVED = new Set(["|", "(", ")", "\\", EPSILON, "λ", EMPTY_SET, ...POSTFIX.keys()]);

/** A syntax error with the zero-based code point position in the source. */
export class RegexSyntaxError extends Error {
    readonly position: number;

    constructor(message: string, position: number) {
        super(message);
        this.position = position;
    }
}

/**
 * Parses a regular expression with |, *, +, ?, parentheses, ε, ∅ and \ for literal operators; whitespace is ignored.
 * @throws RegexSyntaxError with a German message
 */
export function parseRegex(source: string): Regex {
    return new RegexParser(source).parse();
}

/** Formats a regular expression with as few parentheses as possible. */
export function formatRegex(regex: Regex): string {
    return format(regex, Precedence.Union);
}

export function symbol(value: string): Regex {
    return { kind: "symbol", symbol: value };
}

/** Union that drops ∅, flattens nested unions and removes duplicates. */
export function union(a: Regex, b: Regex): Regex {
    if (a.kind === "empty") {
        return b;
    }
    if (b.kind === "empty") {
        return a;
    }
    const items = new Map<string, Regex>();
    for (const item of [...itemsOf(a, "union"), ...itemsOf(b, "union")]) {
        items.set(formatRegex(item), item);
    }
    // ε is redundant next to a starred alternative, which already matches the empty word.
    if ([...items.values()].some((item) => item.kind === "star")) {
        items.delete(EPSILON);
    }
    const unique = [...items.values()];
    return unique.length === 1 ? unique[0] : { kind: "union", items: unique };
}

/** Concatenation that absorbs ε, collapses with ∅ and flattens nested concatenations. */
export function concat(a: Regex, b: Regex): Regex {
    if (a.kind === "empty" || b.kind === "empty") {
        return EMPTY;
    }
    if (a.kind === "epsilon") {
        return b;
    }
    if (b.kind === "epsilon") {
        return a;
    }
    return { kind: "concat", items: [...itemsOf(a, "concat"), ...itemsOf(b, "concat")] };
}

/** Kleene star that simplifies ∅*, ε*, r**, (r+)* and (r?)*. */
export function star(a: Regex): Regex {
    switch (a.kind) {
        case "empty":
        case "epsilon":
            return EPSILON_REGEX;
        case "star":
            return a;
        case "plus":
        case "optional":
            return star(a.item);
        default:
            return { kind: "star", item: a };
    }
}

function itemsOf(regex: Regex, kind: "union" | "concat"): Regex[] {
    return regex.kind === kind ? regex.items : [regex];
}

const Precedence = { Union: 0, Concat: 1, Postfix: 2 } as const;

function format(regex: Regex, context: number): string {
    switch (regex.kind) {
        case "empty":
            return EMPTY_SET;
        case "epsilon":
            return EPSILON;
        case "symbol":
            return RESERVED.has(regex.symbol) ? `\\${regex.symbol}` : regex.symbol;
        case "union": {
            const text = regex.items.map((item) => format(item, Precedence.Union)).join("|");
            return context > Precedence.Union ? `(${text})` : text;
        }
        case "concat": {
            const text = regex.items.map((item) => format(item, Precedence.Concat)).join("");
            return context > Precedence.Concat ? `(${text})` : text;
        }
        case "star":
            return `${format(regex.item, Precedence.Postfix)}*`;
        case "plus":
            return `${format(regex.item, Precedence.Postfix)}+`;
        case "optional":
            return `${format(regex.item, Precedence.Postfix)}?`;
    }
}

interface Token {
    char: string;
    position: number;
}

// Recursive descent: union := concat ("|" concat)*, concat := postfix*, postfix := atom ("*" | "+" | "?")*.
class RegexParser {
    readonly #tokens: Token[] = [];
    readonly #length: number;
    #index = 0;

    constructor(source: string) {
        let position = 0;
        for (const char of source) {
            if (!/\s/.test(char)) {
                this.#tokens.push({ char, position });
            }
            position++;
        }
        this.#length = position;
    }

    parse(): Regex {
        const result = this.#union();
        const rest = this.#peek();
        if (rest) {
            throw new RegexSyntaxError(rest.char === ")" ? "Zu viele schließende Klammern." : `Unerwartetes Zeichen „${rest.char}“.`, rest.position);
        }
        return result;
    }

    #union(): Regex {
        const items = [this.#concat()];
        while (this.#peek()?.char === "|") {
            this.#index++;
            items.push(this.#concat());
        }
        return items.length === 1 ? items[0] : { kind: "union", items };
    }

    #concat(): Regex {
        const items: Regex[] = [];
        for (let token = this.#peek(); token && token.char !== "|" && token.char !== ")"; token = this.#peek()) {
            items.push(this.#postfix());
        }
        if (items.length === 0) {
            return EPSILON_REGEX;
        }
        return items.length === 1 ? items[0] : { kind: "concat", items };
    }

    #postfix(): Regex {
        let item = this.#atom();
        for (let kind = POSTFIX.get(this.#peek()?.char ?? ""); kind; kind = POSTFIX.get(this.#peek()?.char ?? "")) {
            this.#index++;
            item = { kind, item };
        }
        return item;
    }

    #atom(): Regex {
        const token = this.#tokens[this.#index++];
        switch (token.char) {
            case "(": {
                const inner = this.#union();
                const close = this.#tokens[this.#index++];
                if (close?.char !== ")") {
                    throw new RegexSyntaxError("Die schließende Klammer fehlt.", close?.position ?? this.#length);
                }
                return inner;
            }
            case EPSILON:
            case "λ":
                return EPSILON_REGEX;
            case EMPTY_SET:
                return EMPTY;
            case "\\": {
                const escaped = this.#tokens[this.#index++];
                if (!escaped) {
                    throw new RegexSyntaxError("Nach „\\“ fehlt ein Zeichen.", token.position);
                }
                return symbol(escaped.char);
            }
        }
        if (POSTFIX.has(token.char)) {
            throw new RegexSyntaxError(`Vor „${token.char}“ fehlt ein Ausdruck.`, token.position);
        }
        return symbol(token.char);
    }

    #peek(): Token | undefined {
        return this.#tokens[this.#index];
    }
}
