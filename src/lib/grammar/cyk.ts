// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { naturalCompare } from "../automata/machine.ts";
import type { Grammar } from "./grammar.ts";

export interface CykResult {
    word: string[];
    /** cells[length - 1][start]: nonterminals deriving the subword of that length at that position, sorted. */
    cells: string[][][];
    accepted: boolean;
}

/** Runs the Cocke-Younger-Kasami algorithm; the grammar must be in Chomsky normal form, see toCnf. */
export function cyk(cnf: Grammar, word: readonly string[]): CykResult {
    const n = word.length;
    if (n === 0) {
        return { word: [], cells: [], accepted: cnf.productions.some((p) => p.left[0] === cnf.start && p.right.length === 0) };
    }
    const binary = cnf.productions.filter((p) => p.right.length === 2);
    const sets: Set<string>[][] = [word.map((symbol) => new Set(cnf.productions.filter((p) => p.right.length === 1 && p.right[0] === symbol).map((p) => p.left[0])))];
    for (let length = 2; length <= n; length++) {
        const row: Set<string>[] = [];
        for (let start = 0; start + length <= n; start++) {
            const cell = new Set<string>();
            for (let split = 1; split < length; split++) {
                const lefts = sets[split - 1][start];
                const rights = sets[length - split - 1][start + split];
                for (const p of binary) {
                    if (lefts.has(p.right[0]) && rights.has(p.right[1])) {
                        cell.add(p.left[0]);
                    }
                }
            }
            row.push(cell);
        }
        sets.push(row);
    }
    return {
        word: [...word],
        cells: sets.map((row) => row.map((cell) => [...cell].sort(naturalCompare))),
        accepted: sets[n - 1][0].has(cnf.start),
    };
}
