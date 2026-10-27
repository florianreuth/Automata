<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { EPSILON, formatSet } from "../../lib/automata/machine.ts";
    import { formatProduction, type Grammar } from "../../lib/grammar/grammar.ts";
    import { analyzeLl1, parseLl1 } from "../../lib/grammar/ll1.ts";
    import ParseTreeView from "./ParseTreeView.svelte";

    interface Props {
        /** A context-free grammar. */
        grammar: Grammar;
        word: string[];
    }

    let { grammar, word }: Props = $props();

    const analysis = $derived(analyzeLl1(grammar));
    const run = $derived(analysis.conflicts.length === 0 ? parseLl1(grammar, analysis, word) : null);
</script>

<section class="panel">
    <h3>FIRST- und FOLLOW-Mengen</h3>
    <div class="scroll">
        <table class="data-table mono">
            <thead>
                <tr><th scope="col">Nichtterminal</th><th scope="col">FIRST</th><th scope="col">FOLLOW</th></tr>
            </thead>
            <tbody>
                {#each analysis.nonterminals as nonterminal (nonterminal)}
                    <tr>
                        <th scope="row">{nonterminal}</th>
                        <td>{formatSet([...analysis.first.get(nonterminal)!, ...(analysis.nullable.has(nonterminal) ? [EPSILON] : [])])}</td>
                        <td>{formatSet(analysis.follow.get(nonterminal)!)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <h3>Parse-Tabelle</h3>
    <div class="scroll">
        <table class="data-table mono">
            <thead>
                <tr>
                    <th scope="col">M</th>
                    {#each analysis.columns as terminal (terminal)}
                        <th scope="col">{terminal}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each analysis.nonterminals as nonterminal (nonterminal)}
                    <tr>
                        <th scope="row">{nonterminal}</th>
                        {#each analysis.columns as terminal (terminal)}
                            {@const entries = analysis.table.get(nonterminal)?.get(terminal) ?? []}
                            <td class:conflict={entries.length > 1}>
                                {#each entries as production, i (i)}<div>{formatProduction(production)}</div>{/each}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    {#if run === null}
        <p class="note warn">
            Die Grammatik ist nicht LL(1): mehrere Einträge in
            <span class="mono">{analysis.conflicts.map((c) => `M[${c.nonterminal}, ${c.terminal}]`).join(", ")}</span>.
            Linksrekursion entfernen oder linksfaktorisieren – oder den CYK-Algorithmus verwenden.
        </p>
    {:else}
        <h3>Ableitung</h3>
        <p class="verdict" class:accepted={run.accepted} class:rejected={!run.accepted}>
            {run.accepted ? "Akzeptiert" : "Abgelehnt"}{run.error ? ` – ${run.error}` : ""}
        </p>
        <div class="scroll">
            <table class="data-table mono steps">
                <thead>
                    <tr><th scope="col">Stapel</th><th scope="col">Eingabe</th><th scope="col">Aktion</th></tr>
                </thead>
                <tbody>
                    {#each run.steps as step, i (i)}
                        <tr><td>{step.stack.join(" ")}</td><td>{step.input.join("")}</td><td>{step.action}</td></tr>
                    {/each}
                </tbody>
            </table>
        </div>
        {#if run.accepted}
            <h3>Ableitungsbaum</h3>
            <ParseTreeView tree={run.tree}/>
        {/if}
    {/if}
</section>

<style>
    .conflict {
        background: var(--warn-bg);
        color: var(--danger);
    }

    .steps td:first-child,
    .steps td:nth-child(2) {
        white-space: nowrap;
    }
</style>
