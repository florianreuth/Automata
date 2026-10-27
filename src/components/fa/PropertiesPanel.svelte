<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { formatSet, naturalCompare } from "../../lib/automata/machine.ts";
    import { alphabetOf, type FiniteAutomaton, isComplete, isDeterministic, unreachableStates } from "../../lib/automata/fa/model.ts";
    import { faToRegex } from "../../lib/automata/regex/convert.ts";
    import { formatRegex } from "../../lib/automata/regex/regex.ts";
    import { withBase } from "../../lib/paths.ts";

    interface Props {
        fa: FiniteAutomaton;
        onconvert: () => void;
    }

    let { fa, onconvert }: Props = $props();

    const deterministic = $derived(isDeterministic(fa));
    const complete = $derived(isComplete(fa));
    const hasEpsilon = $derived(fa.transitions.some((t) => t.symbol === ""));
    const alphabet = $derived(alphabetOf(fa));
    const initial = $derived(fa.states.find((state) => state.initial));
    const finals = $derived(fa.states.filter((state) => state.final).map((state) => state.name).sort(naturalCompare));

    const unreachable = $derived(unreachableStates(fa).map((state) => state.name).sort(naturalCompare));

    // Elimination can grow exponentially, so it only runs (and then follows edits) once requested.
    let showRegex = $state(false);
    const regex = $derived(showRegex && initial ? formatRegex(faToRegex(fa)) : null);

    const typeLabel = $derived(
        deterministic
            ? complete
                ? "Deterministisch (DEA), vollständig"
                : "Deterministisch (DEA), partiell"
            : hasEpsilon
              ? "Nichtdeterministisch mit ε-Übergängen (ε-NEA)"
              : "Nichtdeterministisch (NEA)",
    );
</script>

<section class="panel">
    <dl class="facts">
        <dt>Typ</dt>
        <dd>{typeLabel}</dd>
        <dt>Zustände</dt>
        <dd>{fa.states.length}</dd>
        <dt>Übergänge</dt>
        <dd>{fa.transitions.length}</dd>
        <dt>Alphabet Σ</dt>
        <dd class="mono">{formatSet(alphabet)}</dd>
        <dt>Startzustand</dt>
        <dd class="mono">{initial?.name ?? "–"}</dd>
        <dt>Endzustände F</dt>
        <dd class="mono">{formatSet(finals)}</dd>
    </dl>

    {#if fa.states.length > 0 && !initial}
        <p class="note warn">Es ist kein Startzustand festgelegt.</p>
    {/if}
    {#if fa.states.length > 0 && finals.length === 0}
        <p class="note warn">Ohne Endzustand akzeptiert der Automat kein Wort.</p>
    {/if}
    {#if unreachable.length > 0}
        <p class="note">Nicht erreichbar: <span class="mono">{unreachable.join(", ")}</span></p>
    {/if}

    <h3>Umwandlungen</h3>
    <button class="button primary wide" onclick={onconvert} disabled={!initial}>NEA → DEA (Potenzmengenkonstruktion)</button>
    <p class="hint">Das Ergebnis ersetzt den aktuellen Automaten und lässt sich mit Strg+Z rückgängig machen.</p>
    <button class="button wide" onclick={() => (showRegex = !showRegex)} disabled={!initial} aria-expanded={showRegex}>EA → RA (Zustandselimination)</button>
    {#if regex !== null}
        <p class="mono regex">{regex}</p>
        <a class="button wide" href={withBase(`/regulaerer-ausdruck?ra=${encodeURIComponent(regex)}`)}>Im Modul „Reguläre Ausdrücke“ öffnen</a>
    {/if}
</section>

<style>
    h3 {
        margin-top: 8px;
    }

    .regex {
        padding: 8px 12px;
        border-radius: 8px;
        background: var(--hover);
        overflow-wrap: anywhere;
    }
</style>
