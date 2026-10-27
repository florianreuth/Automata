// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** A topic area of the application; only modules with an href are shown on the start page. */
export interface Module {
    id: string;
    title: string;
    description: string;
    /** Route of the editor without the site base; only set once the module is available. */
    href?: string;
    features: string[];
}

export const modules: Module[] = [
    {
        id: "fa",
        title: "Endliche Automaten",
        description: "Nichtdeterministische und deterministische endliche Automaten zeichnen, simulieren und formal beschreiben.",
        href: "/endlicher-automat",
        features: ["NEA mit ε-Übergängen", "Schrittweise Simulation", "Mehrfachtest", "NEA → DEA", "Formale Definition", "JFLAP-Import"],
    },
    {
        id: "pda",
        title: "Kellerautomaten",
        description: "Nichtdeterministische Kellerautomaten mit Akzeptanz über Endzustand oder leeren Keller.",
        features: ["NKA", "Konfigurationsbaum"],
    },
    {
        id: "tm",
        title: "Turingmaschinen",
        description: "Ein- und Mehrband-Turingmaschinen mit Bausteinen.",
        features: ["Mehrband", "Bausteine"],
    },
    {
        id: "grammar",
        title: "Grammatiken & Parsing",
        description: "Reguläre, kontextfreie und unbeschränkte Grammatiken mit Brute-Force-, LL(1)-, SLR(1)- und CYK-Parsern.",
        features: ["LL(1)", "SLR(1)", "CYK"],
    },
    {
        id: "regex",
        title: "Reguläre Ausdrücke",
        description: "Umwandlungen zwischen regulären Ausdrücken, endlichen Automaten und regulären Grammatiken.",
        features: ["RA → NEA", "DEA → RA", "DEA minimieren"],
    },
    {
        id: "lsystem",
        title: "L-Systeme",
        description: "Lindenmayer-Systeme ableiten und als Turtle-Grafik darstellen.",
        features: ["Turtle-Grafik"],
    },
];
