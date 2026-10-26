<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { EPSILON } from "../../lib/automata/machine.ts";
    import type { FiniteAutomaton } from "../../lib/automata/fa/model.ts";
    import { simulate } from "../../lib/automata/fa/simulate.ts";

    interface Props {
        fa: FiniteAutomaton;
    }

    let { fa }: Props = $props();

    let words = $state("ε\n0\n1\n-101\n-0\n01");

    const results = $derived(
        words
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
                const word = line === EPSILON ? "" : line;
                return { line, accepted: simulate(fa, word).accepted };
            }),
    );
    const acceptedCount = $derived(results.filter((result) => result.accepted).length);
</script>

<section class="panel">
    <label class="field">
        <span>Ein Wort pro Zeile, ε für das leere Wort</span>
        <textarea bind:value={words} rows="7" spellcheck="false"></textarea>
    </label>

    {#if results.length > 0}
        <p class="summary">{acceptedCount} von {results.length} Wörtern akzeptiert</p>
        <ul class="results">
            {#each results as result, i (i)}
                <li class:accepted={result.accepted}>
                    <span class="mono word">{result.line}</span>
                    <span class="badge">{result.accepted ? "✓ akzeptiert" : "✗ abgelehnt"}</span>
                </li>
            {/each}
        </ul>
    {/if}
</section>

<style>
    textarea {
        resize: vertical;
        font-family: var(--mono);
    }

    .summary {
        color: var(--muted);
        font-size: 0.875rem;
    }

    .results {
        list-style: none;
        border-top: 1px solid var(--rule);
    }

    .results li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 2px;
        border-bottom: 1px solid var(--rule);
    }

    .word {
        overflow-wrap: anywhere;
    }

    .badge {
        flex-shrink: 0;
        color: var(--danger);
        font-size: 0.875rem;
        font-weight: 550;
    }

    .accepted .badge {
        color: var(--success);
    }
</style>
