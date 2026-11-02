// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

export interface Module {
    id: string;
    title: string;
    description: string;
    /** Route of the editor without the site base; modules without one are hidden on the start page. */
    href?: string;
}

export const modules: Module[] = [
    {
        id: "fa",
        title: "Endliche Automaten",
        description: "NEA und DEA zeichnen, Wörter Schritt für Schritt simulieren und in DEA, Minimal-DEA, regulären Ausdruck oder Grammatik umwandeln.",
        href: "/endlicher-automat",
    },
    {
        id: "pda",
        title: "Kellerautomaten",
        description: "Nichtdeterministische Kellerautomaten mit Akzeptanz über Endzustand oder leeren Keller.",
    },
    {
        id: "tm",
        title: "Turingmaschinen",
        description: "Ein- und Mehrband-Turingmaschinen mit Bausteinen.",
    },
    {
        id: "grammar",
        title: "Grammatiken & Parsing",
        description: "Den Chomsky-Typ bestimmen, in Chomsky-Normalform bringen und Wörter mit CYK oder LL(1) ableiten.",
        href: "/grammatik",
    },
    {
        id: "regex",
        title: "Reguläre Ausdrücke",
        description: "Ausdrücke an vielen Wörtern testen und mit der Thompson-Konstruktion in einen NEA umwandeln.",
        href: "/regulaerer-ausdruck",
    },
    {
        id: "lsystem",
        title: "L-Systeme",
        description: "Lindenmayer-Systeme ableiten und als Turtle-Grafik darstellen.",
    },
];
