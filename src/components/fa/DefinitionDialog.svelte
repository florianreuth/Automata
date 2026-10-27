<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import {
        definitionToLatex,
        definitionToMarkdown,
        definitionToText,
        formalDefinition,
        formatCell,
        transitionSignature,
    } from "../../lib/automata/fa/definition.ts";
    import { displaySymbol } from "../../lib/automata/fa/model.ts";
    import { formatSet } from "../../lib/automata/machine.ts";
    import type { FaEditor } from "../../lib/editor/fa-editor.svelte.ts";
    import { renderMachineSvg } from "../../lib/graph/svg.ts";
    import { downloadDocument, printHtml, svgToPng } from "../../lib/io/files.ts";
    import { tooltip } from "../../lib/ui/tooltip.ts";

    interface Props {
        editor: FaEditor;
        onnotify: (message: string) => void;
    }

    let { editor, onnotify }: Props = $props();

    let dialog: HTMLDialogElement | undefined = $state();
    let sheet: HTMLElement | undefined = $state();
    let name = $state("A");
    let representation = $state<"table" | "graph" | "both">("table");

    const definition = $derived(formalDefinition(editor.machine, name.trim() || "A"));
    const svg = $derived(renderMachineSvg(editor.machine, (group) => editor.edgeLabel(group)));
    const showTable = $derived(representation !== "graph");
    const showGraph = $derived(representation !== "table");

    export function open(): void {
        dialog?.showModal();
    }

    async function copy(text: string, format: string) {
        try {
            await navigator.clipboard.writeText(text);
            onnotify(`${format} in die Zwischenablage kopiert.`);
        } catch {
            onnotify("Kopieren nicht möglich – bitte Zugriff auf die Zwischenablage erlauben.");
        }
    }

    async function downloadPng() {
        try {
            downloadDocument(editor.machine.title, "png", await svgToPng(svg));
        } catch {
            onnotify("Der PNG-Export ist fehlgeschlagen.");
        }
    }

    const PRINT_CSS = `
        body { font: 12pt/1.5 Georgia, "Times New Roman", serif; color: #000; margin: 2cm; }
        p { margin: 0 0 0.8em; }
        .doc-title { font-weight: bold; }
        .sets { display: flex; flex-wrap: wrap; gap: 0.4em 2.5em; }
        table { border-collapse: collapse; margin: 0.6em 0 1em; }
        th, td { padding: 0.25em 0.9em; text-align: center; }
        thead th { border-bottom: 1px solid #000; }
        tbody th { border-right: 1px solid #000; text-align: left; }
        .signature, .legend { font-size: 10pt; color: #444; }
        figure { margin: 0.5em 0; }
        figure svg { max-width: 100%; height: auto; }
    `;
</script>

{#snippet stateName(value: string)}
    {@const match = /^([A-Za-z]+)(\d+)$/.exec(value)}
    {#if match}{match[1]}<sub>{match[2]}</sub>{:else}{value}{/if}
{/snippet}

{#snippet stateSet(values: readonly string[])}
    {#if values.length === 0}∅{:else}{"{"}{#each values as value, i (value)}{i > 0 ? ", " : ""}{@render stateName(value)}{/each}{"}"}{/if}
{/snippet}

<dialog bind:this={dialog} class="dialog" aria-labelledby="definition-heading" onclick={(event) => event.target === dialog && dialog?.close()}>
    <header>
        <h2 id="definition-heading">Formale Definition</h2>
        <button class="icon-button" onclick={() => dialog?.close()} aria-label="Schließen" {@attach tooltip("Schließen")}>✕</button>
    </header>

    <div class="options">
        <label class="field grow">
            <span>Überschrift</span>
            <input value={editor.machine.title} oninput={(event) => editor.setTitle(event.currentTarget.value)}/>
        </label>
        <label class="field narrow">
            <span>Bezeichner</span>
            <input bind:value={name} maxlength="8"/>
        </label>
        <fieldset class="segmented">
            <legend>δ darstellen als</legend>
            <label><input type="radio" bind:group={representation} value="table"/>Tabelle</label>
            <label><input type="radio" bind:group={representation} value="graph"/>Graph</label>
            <label><input type="radio" bind:group={representation} value="both"/>Beides</label>
        </fieldset>
    </div>

    <article class="document" bind:this={sheet}>
        {#if definition.title.trim()}
            <p class="doc-title">{definition.title}</p>
        {/if}
        <p>{definition.name} = (Q, Σ, δ, {#if definition.initial}{@render stateName(definition.initial)}{:else}q<sub>0</sub>{/if}, F)</p>
        <p class="sets">
            <span>Q = {@render stateSet(definition.states)}</span>
            <span>Σ = {formatSet(definition.alphabet)}</span>
            <span>F = {@render stateSet(definition.finals)}</span>
            <span>δ ist dargestellt durch{showTable && showGraph ? " Tabelle und Graph" : ""}</span>
        </p>

        {#if showTable}
            {#if definition.rows.length > 0}
                <table>
                    <thead>
                        <tr>
                            <th scope="col">δ</th>
                            {#each definition.columns as symbol (symbol)}
                                <th scope="col">{displaySymbol(symbol)}</th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each definition.rows as row (row.state)}
                            <tr>
                                <th scope="row">{row.initial ? "→ " : ""}{row.final ? "*" : ""}{@render stateName(row.state)}</th>
                                {#each row.cells as cell, i (i)}
                                    <td>
                                        {#if definition.deterministic}
                                            {#if cell.length > 0}{@render stateName(cell[0])}{:else}{formatCell(definition, cell)}{/if}
                                        {:else}
                                            {@render stateSet(cell)}
                                        {/if}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
                <p class="legend">→ Startzustand, * Endzustand</p>
            {/if}
        {/if}

        {#if showGraph}
            <figure>{@html svg}</figure>
        {/if}

        <p class="signature">{transitionSignature(definition)}</p>
    </article>

    <footer>
        <button class="button" onclick={() => copy(definitionToText(definition), "Text")}>Text kopieren</button>
        <button class="button" onclick={() => copy(definitionToMarkdown(definition), "Markdown")}>Markdown kopieren</button>
        <button class="button" onclick={() => copy(definitionToLatex(definition), "LaTeX")}>LaTeX kopieren</button>
        <span class="spacer"></span>
        <button class="button" onclick={() => downloadDocument(editor.machine.title, "svg", svg)}>SVG</button>
        <button class="button" onclick={downloadPng}>PNG</button>
        <button class="button primary" onclick={() => printHtml(editor.machine.title, sheet?.innerHTML ?? "", PRINT_CSS)}>Drucken / PDF</button>
    </footer>
</dialog>

<style>
    .options {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 12px;
    }

    .grow {
        flex: 1 1 16rem;
    }

    .narrow {
        flex: 0 0 6rem;
    }

    .document {
        margin-top: 16px;
        padding: 28px 32px;
        border: 1px solid var(--rule);
        border-radius: 12px;
        background: #fff;
        color: #1a1b2e;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 1.0625rem;
        line-height: 1.5;
        overflow-x: auto;
    }

    .document p + p {
        margin-top: 0.8em;
    }

    .doc-title {
        font-weight: 700;
    }

    .sets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4em 2.5em;
    }

    table {
        margin: 0.8em 0 0.4em;
        border-collapse: collapse;
    }

    th,
    td {
        padding: 0.25em 0.9em;
        font-weight: normal;
        text-align: center;
        white-space: nowrap;
    }

    thead th {
        border-bottom: 1px solid currentColor;
    }

    tbody th {
        border-right: 1px solid currentColor;
        text-align: left;
    }

    .legend,
    .signature {
        color: #5f6178;
        font-size: 0.875rem;
    }

    figure {
        margin-top: 0.8em;
    }

    figure :global(svg) {
        max-width: 100%;
        height: auto;
    }

    footer {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
    }

    .spacer {
        flex: 1;
    }

    @media (max-width: 600px) {
        .document {
            padding: 20px 16px;
        }

        .spacer {
            display: none;
        }
    }
</style>
