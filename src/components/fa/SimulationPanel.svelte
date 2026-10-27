<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { displaySymbol, type FiniteAutomaton } from "../../lib/automata/fa/model.ts";
    import { missingTransitions, simulate, stepTransitions } from "../../lib/automata/fa/simulate.ts";
    import { naturalCompare } from "../../lib/automata/machine.ts";
    import { edgeKey } from "../../lib/graph/geometry.ts";
    import { tooltip } from "../../lib/ui/tooltip.ts";

    interface Props {
        fa: FiniteAutomaton;
        /** Receives the states and edge keys to highlight, or null when no simulation is running. */
        onhighlight: (highlight: { states: ReadonlySet<string>; edges: ReadonlySet<string> } | null) => void;
    }

    let { fa, onhighlight }: Props = $props();

    let input = $state("");
    let step = $state(0);
    let running = $state(false);

    const result = $derived(simulate(fa, input));
    const current = $derived(result.steps[Math.min(step, result.steps.length - 1)]);
    const names = $derived(new Map(fa.states.map((state) => [state.id, state.name])));
    const finals = $derived(new Set(fa.states.filter((state) => state.final).map((state) => state.id)));
    const finished = $derived(step >= result.input.length);
    const stuck = $derived(current.states.size === 0);
    const hasInitial = $derived(fa.states.some((state) => state.initial));
    const missing = $derived(missingTransitions(fa));
    const blocked = $derived.by(() => {
        // Once the set of active states is empty it stays empty, so the first empty step is where the run got stuck.
        const index = result.steps.findIndex((s, i) => i > 0 && s.states.size === 0 && result.steps[i - 1].states.size > 0);
        if (index < 0) {
            return null;
        }
        const from = sortedStates(result.steps[index - 1].states).map((state) => state.name);
        return { position: index, symbol: result.input[index - 1], from: from.length === 1 ? from[0] : `{${from.join(", ")}}` };
    });

    $effect(() => {
        if (!running) {
            onhighlight(null);
            return;
        }
        const edges = new Set(stepTransitions(fa, result, step).map((t) => edgeKey(t.from, t.to)));
        onhighlight({ states: current.states, edges });
    });

    function start() {
        running = true;
        step = 0;
    }

    function stop() {
        running = false;
        step = 0;
    }

    function sortedStates(states: ReadonlySet<string>) {
        return [...states].map((id) => ({ id, name: names.get(id) ?? "?" })).sort((a, b) => naturalCompare(a.name, b.name));
    }
</script>

<section class="panel">
    <label class="field">
        <span>Eingabewort</span>
        <input
            bind:value={input}
            oninput={() => (running = false)}
            onkeydown={(event) => event.key === "Enter" && start()}
            placeholder="Wort eingeben, z. B. 0101"
            spellcheck="false"
            autocomplete="off"
        />
    </label>

    {#if !hasInitial}
        <p class="note warn">Lege zuerst einen Startzustand fest (Rechtsklick auf einen Zustand).</p>
    {/if}
    {#if result.unknownSymbols.length > 0}
        <p class="note warn">Nicht im Alphabet: {result.unknownSymbols.join(", ")}</p>
    {/if}
    {#if missing.length > 0}
        <p class="note warn">
            <strong>Fehlerzustand fehlt:</strong> Für {missing.length === 1 ? "einen Übergang" : `${missing.length} Übergänge`} gibt es kein Ziel –
            <span class="mono">{missing.slice(0, 6).map((m) => `δ(${m.state.name}, ${displaySymbol(m.symbol)})`).join(", ")}{missing.length > 6 ? ` und ${missing.length - 6} weitere` : ""}</span>.
            Wörter, die einen davon benötigen, werden verworfen.
        </p>
    {/if}

    <div class="controls">
        {#if running}
            <button class="button" onclick={() => (step = 0)} disabled={step === 0} aria-label="Zum Anfang" {@attach tooltip("Zum Anfang")}>⏮</button>
            <button class="button" onclick={() => step--} disabled={step === 0} aria-label="Schritt zurück" {@attach tooltip("Schritt zurück")}>◀</button>
            <button class="button primary" onclick={() => step++} disabled={finished} {@attach tooltip("Nächster Schritt")}>Schritt ▶</button>
            <button class="button" onclick={() => (step = result.input.length)} disabled={finished} aria-label="Bis zum Ende" {@attach tooltip("Bis zum Ende")}>⏭</button>
            <button class="button" onclick={stop} aria-label="Simulation beenden" {@attach tooltip("Simulation beenden")}>✕</button>
        {:else}
            <button class="button primary wide" onclick={start} disabled={!hasInitial}>Simulation starten</button>
        {/if}
    </div>

    {#if running}
        <div class="tape" aria-label="Eingabeband">
            {#each result.input as symbol, i (i)}
                <span class:read={i < step} class:head={i === step} class:stuck={blocked && i === blocked.position - 1 && step >= blocked.position}>{symbol}</span>
            {:else}
                <span class="head">ε</span>
            {/each}
            {#if result.input.length > 0}
                <span class="end" class:head={finished}>&nbsp;</span>
            {/if}
        </div>

        <dl class="facts">
            <dt>Gelesen</dt>
            <dd>{step} von {result.input.length} Zeichen</dd>
            <dt>Aktive Zustände</dt>
            <dd>
                {#if stuck}
                    <span class="mono">∅</span>
                {:else}
                    <span class="chips">
                        {#each sortedStates(current.states) as state (state.id)}
                            <span class="chip" class:final={finals.has(state.id)}>{state.name}</span>
                        {/each}
                    </span>
                {/if}
            </dd>
        </dl>

        {#if stuck && blocked}
            <p class="verdict rejected">Abgelehnt – aus <span class="mono">{blocked.from}</span> gibt es keinen Übergang mit „{blocked.symbol}“ (fehlender Fehlerzustand).</p>
        {:else if stuck}
            <p class="verdict rejected">Abgelehnt – keine aktiven Zustände mehr.</p>
        {:else if finished}
            <p class="verdict" class:accepted={result.accepted} class:rejected={!result.accepted}>
                {result.accepted ? "Akzeptiert – ein Endzustand ist aktiv." : "Abgelehnt – kein Endzustand ist aktiv."}
            </p>
        {/if}
    {:else if input.length > 0 || hasInitial}
        <p class="verdict" class:accepted={result.accepted} class:rejected={!result.accepted}>
            „{input === "" ? "ε" : input}“ wird {result.accepted ? "akzeptiert" : "abgelehnt"}{#if blocked}{" "}– beim {blocked.position}. Zeichen „{blocked.symbol}“ fehlt ein Übergang aus <span class="mono">{blocked.from}</span>{/if}.
        </p>
    {/if}
</section>

<style>
    .controls {
        display: flex;
        gap: 6px;
    }

    .controls .primary {
        flex: 1;
    }

    .tape {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        font-family: var(--mono);
    }

    .tape span {
        display: grid;
        place-items: center;
        min-width: 28px;
        height: 34px;
        padding: 0 6px;
        border: 1px solid var(--rule);
        border-radius: 6px;
        background: var(--surface);
    }

    .tape .read {
        color: var(--muted);
        background: var(--hover);
    }

    .tape .head {
        border-color: var(--accent);
        box-shadow: inset 0 -3px 0 var(--accent);
    }

    .tape .stuck {
        border-color: var(--danger);
        color: var(--danger);
        box-shadow: inset 0 -3px 0 var(--danger);
    }

    .tape .end {
        border-style: dashed;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }

    .chip {
        padding: 1px 8px;
        border: 1px solid var(--accent);
        border-radius: 999px;
        color: var(--accent);
        font-size: 0.875rem;
    }

    .chip.final {
        background: var(--accent);
        color: var(--on-accent);
    }
</style>
