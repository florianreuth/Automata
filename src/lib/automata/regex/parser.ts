// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { EPSILON } from "../machine.ts";
import { EMPTY, EMPTY_SET, EPSILON_REGEX, POSTFIX_OPERATORS, type Regex, symbol } from "./regex.ts";

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
        for (let kind = POSTFIX_OPERATORS.get(this.#peek()?.char ?? ""); kind; kind = POSTFIX_OPERATORS.get(this.#peek()?.char ?? "")) {
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
        if (POSTFIX_OPERATORS.has(token.char)) {
            throw new RegexSyntaxError(`Vor „${token.char}“ fehlt ein Ausdruck.`, token.position);
        }
        return symbol(token.char);
    }

    #peek(): Token | undefined {
        return this.#tokens[this.#index];
    }
}
