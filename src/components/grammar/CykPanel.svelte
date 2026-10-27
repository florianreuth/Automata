<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { toCnf } from "../../lib/grammar/cnf.ts";
    import { cyk } from "../../lib/grammar/cyk.ts";
    import { formatSet } from "../../lib/automata/machine.ts";
    import type { Grammar } from "../../lib/grammar/grammar.ts";

    interface Props {
        /** A context-free grammar; it is converted to Chomsky normal form first. */
        grammar: Grammar;
        word: string[];
    }

    let { grammar, word }: Props = $props();

    const cnf = $derived(toCnf(grammar));
    const result = $derived(cyk(cnf, word));
    // Longest subwords on top, so the cell deciding membership sits in the top left corner.
    const rows = $derived(result.cells.map((cells, i) => ({ length: i + 1, cells })).reverse());
</script>

<section class="panel">
    <p class="verdict" class:accepted={result.accepted} class:rejected={!result.accepted}>
        {result.accepted ? "Akzeptiert" : "Abgelehnt"}{#if word.length > 0}{" "}– {cnf.start} {result.accepted ? "∈" : "∉"} V<sub>{word.length},1</sub>{/if}
    </p>

    {#if word.length === 0}
        <p class="note">Für das leere Wort entscheidet allein, ob die Chomsky-Normalform die Regel {cnf.start} → ε enthält.</p>
    {:else}
        <div class="scroll">
            <table class="data-table mono cyk">
                <tbody>
                    {#each rows as row (row.length)}
                        <tr>
                            <th scope="row">{row.length}</th>
                            {#each row.cells as cell, i (i)}
                                <td class:decisive={row.length === word.length} class:accepted={result.accepted}>{formatSet(cell)}</td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
                <tfoot>
                    <tr>
                        <th scope="col">Länge</th>
                        {#each word as symbol, i (i)}
                            <th scope="col">{symbol}</th>
                        {/each}
                    </tr>
                </tfoot>
            </table>
        </div>
        <p class="hint">Zeile <i>l</i>, Spalte <i>i</i>: Nichtterminale, aus denen sich das Teilwort der Länge <i>l</i> ab Position <i>i</i> ableiten lässt.</p>
    {/if}
</section>

<style>
    .cyk td {
        min-width: 4.5rem;
        text-align: center;
    }

    .cyk tfoot th {
        background: var(--hover);
        text-align: center;
    }

    .decisive {
        background: var(--warn-bg);
        color: var(--danger);
        font-weight: 600;
    }

    .decisive.accepted {
        background: var(--active);
        color: var(--success);
    }
</style>
