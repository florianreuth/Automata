<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts" module>
    /** Upper bounds of the menu size, so the canvas can open it inwards near its right and bottom edge. */
    export const MENU_SIZE = { width: 210, height: 200 };
</script>

<script lang="ts" generics="T extends Edge">
    import type { Edge } from "../../lib/automata/machine.ts";
    import type { GraphEditor } from "../../lib/editor/graph-editor.ts";
    import type { Hit } from "../../lib/editor/pointer.ts";
    import type { Point } from "../../lib/graph/geometry.ts";

    interface Props {
        editor: GraphEditor<T>;
        target: Hit;
        /** Position in canvas-relative pixels. */
        x: number;
        y: number;
        onrename: (id: string) => void;
        onedit: (from: string, to: string) => void;
        onadd: (point: Point) => void;
        onarrange: () => void;
        onfit: () => void;
        onclose: () => void;
    }

    let { editor, target, x, y, onrename, onedit, onadd, onarrange, onfit, onclose }: Props = $props();

    const state = $derived(target.kind === "state" ? editor.machine.states.find((s) => s.id === target.id) : undefined);

    function run(action: () => void) {
        // The action reads the menu target, so the menu may only be closed afterwards.
        action();
        onclose();
    }
</script>

<svelte:window onkeydown={(event) => event.key === "Escape" && onclose()}/>

<div class="menu" role="menu" style:left="{x}px" style:top="{y}px">
    {#if target.kind === "state" && state}
        <button role="menuitemcheckbox" aria-checked={state.initial} onclick={() => run(() => editor.toggleInitial(target.id))}>
            <span class="check">{state.initial ? "✓" : ""}</span>Startzustand
        </button>
        <button role="menuitemcheckbox" aria-checked={state.final} onclick={() => run(() => editor.toggleFinal(target.id))}>
            <span class="check">{state.final ? "✓" : ""}</span>Endzustand
        </button>
        <hr>
        <button role="menuitem" onclick={() => run(() => onrename(target.id))}><span class="check"></span>Umbenennen</button>
        <button role="menuitem" onclick={() => run(() => onedit(target.id, target.id))}><span class="check"></span>Schleife bearbeiten</button>
        {#if state.label}
            <button role="menuitem" onclick={() => run(() => editor.clearLabel(target.id))}><span class="check"></span>Beschriftung entfernen</button>
        {/if}
        <hr>
        <button role="menuitem" class="danger" onclick={() => run(() => editor.deleteState(target.id))}><span class="check"></span>Löschen</button>
    {:else if target.kind === "edge"}
        <button role="menuitem" onclick={() => run(() => onedit(target.from, target.to))}><span class="check"></span>Symbole bearbeiten</button>
        <button role="menuitem" class="danger" onclick={() => run(() => editor.deleteEdge(target.from, target.to))}><span class="check"></span>Löschen</button>
    {:else if target.kind === "canvas"}
        <button role="menuitem" onclick={() => run(() => onadd(target.point))}><span class="check"></span>Zustand hinzufügen</button>
        <button role="menuitem" onclick={() => run(onarrange)} disabled={editor.machine.states.length === 0}><span class="check"></span>Automatisch anordnen</button>
        <button role="menuitem" onclick={() => run(onfit)}><span class="check"></span>Ansicht anpassen</button>
    {/if}
</div>

<style>
    .menu {
        position: absolute;
        z-index: 3;
        min-width: 200px;
        padding: 6px;
        border: 1px solid var(--rule);
        border-radius: 10px;
        background: var(--surface);
        box-shadow: var(--shadow);
    }

    button {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 7px 10px;
        border: 0;
        border-radius: 6px;
        background: none;
        color: var(--ink);
        font: inherit;
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
    }

    button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    button:hover:not(:disabled),
    button:focus-visible {
        background: var(--hover);
        outline: none;
    }

    .check {
        width: 20px;
        color: var(--accent);
    }

    .danger {
        color: var(--danger);
    }

    hr {
        margin: 4px 6px;
        border: 0;
        border-top: 1px solid var(--rule);
    }
</style>
