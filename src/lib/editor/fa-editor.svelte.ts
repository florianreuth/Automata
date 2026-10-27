// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { createId, nextStateName } from "../automata/machine.ts";
import { compareSymbols, createFiniteAutomaton, type FaTransition, type FiniteAutomaton, formatSymbols, parseSymbols, transitionLabel } from "../automata/fa/model.ts";
import type { EdgeGroup } from "../graph/edges.ts";
import { applyLayout } from "../graph/layout.ts";
import type { GraphEditor, Selection, Tool } from "./graph-editor.ts";

const HISTORY_LIMIT = 200;

/** Reactive editing state of one finite automaton, including undo/redo. */
export class FaEditor implements GraphEditor<FaTransition> {
    machine = $state<FiniteAutomaton>(createFiniteAutomaton());
    tool = $state<Tool>("select");
    selection = $state<Selection>(null);
    readonly edgeHint = "z. B. 0, 1 – leer für ε";

    #undo = $state<FiniteAutomaton[]>([]);
    #redo = $state<FiniteAutomaton[]>([]);

    readonly canUndo = $derived(this.#undo.length > 0);
    readonly canRedo = $derived(this.#redo.length > 0);

    constructor(initial?: FiniteAutomaton) {
        if (initial) {
            this.machine = initial;
        }
    }

    snapshot(): FiniteAutomaton {
        return $state.snapshot(this.machine);
    }

    commit(before: FiniteAutomaton): void {
        this.#undo = [...this.#undo.slice(-HISTORY_LIMIT + 1), before];
        this.#redo = [];
    }

    undo(): void {
        const previous = this.#undo.at(-1);
        if (previous) {
            this.#redo = [...this.#redo, this.snapshot()];
            this.#undo = this.#undo.slice(0, -1);
            this.machine = previous;
            this.selection = null;
        }
    }

    redo(): void {
        const next = this.#redo.at(-1);
        if (next) {
            this.#undo = [...this.#undo, this.snapshot()];
            this.#redo = this.#redo.slice(0, -1);
            this.machine = next;
            this.selection = null;
        }
    }

    /** Replaces the whole automaton as one undoable step. */
    replace(fa: FiniteAutomaton): void {
        this.#change(() => {
            this.machine = fa;
        });
        this.selection = null;
    }

    setTitle(title: string): void {
        this.machine.title = title;
    }

    addState(x: number, y: number): string {
        const id = createId();
        this.#change(() => {
            this.machine.states.push({ id, name: nextStateName(this.machine.states), x, y, initial: this.machine.states.length === 0, final: false });
        });
        this.selection = { kind: "state", id };
        return id;
    }

    moveState(id: string, x: number, y: number): void {
        const state = this.#state(id);
        if (state) {
            state.x = x;
            state.y = y;
        }
    }

    renameState(id: string, name: string): string | null {
        const trimmed = name.trim();
        if (!trimmed) {
            return "Der Name darf nicht leer sein.";
        }
        if (/[\s,{}]/.test(trimmed)) {
            return "Der Name darf keine Leerzeichen, Kommas oder Klammern enthalten.";
        }
        if (this.machine.states.some((state) => state.id !== id && state.name === trimmed)) {
            return `Der Name „${trimmed}“ ist bereits vergeben.`;
        }
        const state = this.#state(id);
        if (state && state.name !== trimmed) {
            this.#change(() => {
                state.name = trimmed;
            });
        }
        return null;
    }

    toggleInitial(id: string): void {
        this.#change(() => {
            for (const state of this.machine.states) {
                state.initial = state.id === id ? !state.initial : false;
            }
        });
    }

    toggleFinal(id: string): void {
        const state = this.#state(id);
        if (state) {
            this.#change(() => {
                state.final = !state.final;
            });
        }
    }

    clearLabel(id: string): void {
        const state = this.#state(id);
        if (state?.label) {
            this.#change(() => {
                delete state.label;
            });
        }
    }

    deleteState(id: string): void {
        this.#change(() => {
            this.machine.states = this.machine.states.filter((state) => state.id !== id);
            this.machine.transitions = this.machine.transitions.filter((t) => t.from !== id && t.to !== id);
        });
        this.selection = null;
    }

    deleteEdge(from: string, to: string): void {
        this.#change(() => {
            this.machine.transitions = this.machine.transitions.filter((t) => t.from !== from || t.to !== to);
        });
        this.selection = null;
    }

    arrange(): void {
        this.#change(() => applyLayout(this.machine.states, this.machine.transitions));
    }

    deleteSelection(): void {
        const selection = this.selection;
        if (selection?.kind === "state") {
            this.deleteState(selection.id);
        } else if (selection?.kind === "edge") {
            this.deleteEdge(selection.from, selection.to);
        }
    }

    edgeLabel(group: EdgeGroup<FaTransition>): string {
        return transitionLabel(group.transitions);
    }

    edgeText(from: string, to: string): string {
        const symbols = this.machine.transitions.filter((t) => t.from === from && t.to === to).map((t) => t.symbol);
        return formatSymbols(symbols);
    }

    applyEdgeText(from: string, to: string, text: string): string | null {
        const parsed = parseSymbols(text);
        if ("error" in parsed) {
            return parsed.error;
        }
        const existing = this.machine.transitions.filter((t) => t.from === from && t.to === to);
        const unchanged = existing.length === parsed.symbols.length && existing.every((t) => parsed.symbols.includes(t.symbol));
        if (!unchanged) {
            this.#change(() => {
                const others = this.machine.transitions.filter((t) => t.from !== from || t.to !== to);
                const created = [...parsed.symbols].sort(compareSymbols).map((symbol) => ({ id: createId(), from, to, symbol }));
                this.machine.transitions = [...others, ...created];
            });
        }
        this.selection = { kind: "edge", from, to };
        return null;
    }

    #state(id: string) {
        return this.machine.states.find((state) => state.id === id);
    }

    #change(mutation: () => void): void {
        const before = this.snapshot();
        mutation();
        this.commit(before);
    }
}
