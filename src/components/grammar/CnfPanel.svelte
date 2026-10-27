<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { toCnf } from "../../lib/grammar/cnf.ts";
    import { formatGrammar, type Grammar } from "../../lib/grammar/grammar.ts";

    interface Props {
        /** A context-free grammar. */
        grammar: Grammar;
        /** Receives the converted grammar in the input syntax. */
        onapply: (source: string) => void;
    }

    let { grammar, onapply }: Props = $props();

    const cnf = $derived(toCnf(grammar));
    const source = $derived(formatGrammar(cnf));
</script>

<section class="panel">
    {#if cnf.productions.length === 0}
        <p class="note warn">Die Grammatik erzeugt kein einziges Wort; nach dem Entfernen nutzloser Nichtterminale bleibt nichts übrig.</p>
    {:else}
        <pre class="mono">{source}</pre>
        <div>
            <button class="button" onclick={() => onapply(source)}>Als Grammatik übernehmen</button>
        </div>
    {/if}
    <p class="hint">
        Schritte: neues Startsymbol, Terminale in eigene Regeln (T1, T2, …), lange Regeln aufteilen (X1, X2, …),
        ε-Regeln und Kettenregeln entfernen, nutzlose Nichtterminale streichen.
    </p>
</section>

<style>
    pre {
        padding: 12px 14px;
        overflow-x: auto;
        border-radius: 8px;
        background: var(--hover);
        line-height: 1.7;
    }
</style>
