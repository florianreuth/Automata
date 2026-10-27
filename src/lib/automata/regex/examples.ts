// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** A bundled regular expression shown in the examples menu, with words for the batch test. */
export interface RegexExample {
    id: string;
    title: string;
    description: string;
    source: string;
    words: string;
}

export const regexExamples: RegexExample[] = [
    {
        id: "ends-with-abb",
        title: "Endet auf abb",
        description: "Klassisches Beispiel aus dem Drachenbuch.",
        source: "(a|b)*abb",
        words: "ε\nabb\naabb\nbabb\nab\nabba",
    },
    {
        id: "binary",
        title: "Binärzahlen",
        description: "Ohne führende Nullen, mit optionalem Minus.",
        source: "0|-?1(0|1)*",
        words: "0\n101\n-110\n-0\n01\n-",
    },
    {
        id: "ab",
        title: "a* b*",
        description: "Erst beliebig viele a, dann beliebig viele b.",
        source: "a*b*",
        words: "ε\na\naabb\nb\nba\naba",
    },
];
