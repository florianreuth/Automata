// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** A bundled grammar shown in the examples menu, with a word worth parsing. */
export interface GrammarExample {
    id: string;
    title: string;
    description: string;
    source: string;
    word: string;
}

export const grammarExamples: GrammarExample[] = [
    {
        id: "expressions",
        title: "Arithmetische Ausdrücke",
        description: "LL(1)-Grammatik ohne Linksrekursion für +, * und Klammern.",
        source: "E → TE'\nE' → +TE' | ε\nT → FT'\nT' → *FT' | ε\nF → (E) | a",
        word: "a+a*a",
    },
    {
        id: "anbn",
        title: "aⁿbⁿ",
        description: "Kontextfrei, aber nicht regulär.",
        source: "S → aSb | ε",
        word: "aabb",
    },
    {
        id: "parentheses",
        title: "Klammerausdrücke",
        description: "Mehrdeutige Grammatik: nicht LL(1), aber mit CYK entscheidbar.",
        source: "S → SS | (S) | ε",
        word: "(())()",
    },
    {
        id: "regular",
        title: "Reguläre Grammatik",
        description: "Rechtslinear: beliebig viele a, gefolgt von mindestens einem b.",
        source: "S → aS | bB\nB → bB | ε",
        word: "aabb",
    },
];
