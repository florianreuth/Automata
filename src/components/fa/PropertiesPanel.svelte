<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { naturalCompare } from "../../lib/automata/machine.ts";
    import { alphabetOf, type FiniteAutomaton, isComplete, isDeterministic } from "../../lib/automata/fa/model.ts";

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

    const unreachable = $derived.by(() => {
        if (!initial) {
            return [];
        }
        const reached = new Set([initial.id]);
        const stack = [initial.id];
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const t of fa.transitions) {
                if (t.from === current && !reached.has(t.to)) {
                    reached.add(t.to);
                    stack.push(t.to);
                }
            }
        }
        return fa.states.filter((state) => !reached.has(state.id)).map((state) => state.name).sort(naturalCompare);
    });

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
        <dd class="mono">{alphabet.length > 0 ? `{${alphabet.join(", ")}}` : "∅"}</dd>
        <dt>Startzustand</dt>
        <dd class="mono">{initial?.name ?? "–"}</dd>
        <dt>Endzustände F</dt>
        <dd class="mono">{finals.length > 0 ? `{${finals.join(", ")}}` : "∅"}</dd>
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
</section>

<style>
    h3 {
        margin-top: 8px;
        font-size: 0.8125rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--muted);
    }

    .wide {
        width: 100%;
    }

    .hint {
        color: var(--muted);
        font-size: 0.8125rem;
    }
</style>
