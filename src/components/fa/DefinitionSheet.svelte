<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts" module>
    /** Styles for printing the sheet's markup on its own, see printHtml. */
    export const PRINT_CSS = `
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

<script lang="ts">
    import { formatCell, type FormalDefinition, transitionSignature } from "../../lib/automata/fa/definition.ts";
    import { displaySymbol } from "../../lib/automata/fa/model.ts";
    import { formatSet } from "../../lib/automata/machine.ts";

    interface Props {
        definition: FormalDefinition;
        showTable: boolean;
        /** Standalone SVG of the diagram, shown if set. */
        svg: string | null;
    }

    let { definition, showTable, svg }: Props = $props();

    let sheet: HTMLElement | undefined = $state();

    /** Markup of the rendered sheet, for printing it outside the app. */
    export function html(): string {
        return sheet?.innerHTML ?? "";
    }
</script>

{#snippet stateName(value: string)}
    {@const match = /^([A-Za-z]+)(\d+)$/.exec(value)}
    {#if match}{match[1]}<sub>{match[2]}</sub>{:else}{value}{/if}
{/snippet}

{#snippet stateSet(values: readonly string[])}
    {#if values.length === 0}∅{:else}{"{"}{#each values as value, i (value)}{i > 0 ? ", " : ""}{@render stateName(value)}{/each}{"}"}{/if}
{/snippet}

<article class="document" bind:this={sheet}>
    {#if definition.title.trim()}
        <p class="doc-title">{definition.title}</p>
    {/if}
    <p>{definition.name} = (Q, Σ, δ, {#if definition.initial}{@render stateName(definition.initial)}{:else}q<sub>0</sub>{/if}, F)</p>
    <p class="sets">
        <span>Q = {@render stateSet(definition.states)}</span>
        <span>Σ = {formatSet(definition.alphabet)}</span>
        <span>F = {@render stateSet(definition.finals)}</span>
        <span>δ ist dargestellt durch{showTable && svg ? " Tabelle und Graph" : ""}</span>
    </p>

    {#if showTable && definition.rows.length > 0}
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

    {#if svg}
        <figure>{@html svg}</figure>
    {/if}

    <p class="signature">{transitionSignature(definition)}</p>
</article>

<style>
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

    @media (max-width: 600px) {
        .document {
            padding: 20px 16px;
        }
    }
</style>
