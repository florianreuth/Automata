<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { alphabetOf, transitionLabel } from "../../lib/automata/fa/model.ts";
    import { formatSet } from "../../lib/automata/machine.ts";
    import { regexToNfa } from "../../lib/automata/regex/convert.ts";
    import { regexExamples } from "../../lib/automata/regex/examples.ts";
    import { parseRegex, RegexSyntaxError } from "../../lib/automata/regex/parser.ts";
    import type { Regex } from "../../lib/automata/regex/regex.ts";
    import { renderMachineSvg } from "../../lib/graph/svg.ts";
    import { handOffAutomaton } from "../../lib/io/handoff.ts";
    import { withBase } from "../../lib/paths.ts";
    import BatchPanel from "../fa/BatchPanel.svelte";
    import Dropdown, { type DropdownItem } from "../ui/Dropdown.svelte";
    import SymbolBar from "../ui/SymbolBar.svelte";
    import Workbench from "../ui/Workbench.svelte";

    // The finite automaton module links here with ?ra=… after a state elimination.
    const linked = new URL(window.location.href).searchParams.get("ra");

    let input: HTMLInputElement | undefined = $state();
    let source = $state(linked ?? regexExamples[0].source);
    let words = $state(linked === null ? regexExamples[0].words : "ε\na\nb\nab\nba");
    let handOffFailed = $state(false);

    const parsed = $derived.by((): { regex: Regex } | { error: RegexSyntaxError } => {
        try {
            return { regex: parseRegex(source) };
        } catch (error) {
            if (error instanceof RegexSyntaxError) {
                return { error };
            }
            throw error;
        }
    });
    const nfa = $derived("regex" in parsed ? regexToNfa(parsed.regex, `NEA zu ${source.trim() || "ε"}`) : null);
    const svg = $derived(nfa ? renderMachineSvg(nfa, (group) => transitionLabel(group.transitions)) : "");
    const alphabet = $derived(nfa ? alphabetOf(nfa) : []);

    const exampleItems: DropdownItem[] = regexExamples.map((example) => ({
        label: example.title,
        description: `${example.source} – ${example.description}`,
        action: () => {
            source = example.source;
            words = example.words;
        },
    }));

    function openInEditor() {
        handOffFailed = !(nfa && handOffAutomaton(nfa));
        if (!handOffFailed) {
            window.location.href = withBase("/endlicher-automat");
        }
    }
</script>

<Workbench module="Reguläre Ausdrücke" sidebarLabel="Mehrfachtest">
    {#snippet actions()}
        <Dropdown label="Beispiele" items={exampleItems}/>
    {/snippet}

    <section class="card">
        <label class="field">
            <span>Regulärer Ausdruck</span>
            <input bind:this={input} bind:value={source} class="mono expression" class:invalid={"error" in parsed} spellcheck="false" autocomplete="off"/>
        </label>
        <SymbolBar
            target={input}
            symbols={[
                { text: "ε", hint: "Leeres Wort (oder einfach eine leere Alternative wie a|)" },
                { text: "∅", hint: "Leere Sprache" },
            ]}
        />
        {#if "error" in parsed}
            <p class="note warn" role="alert">Zeichen {parsed.error.position + 1}: {parsed.error.message}</p>
        {/if}
        <p class="hint">
            <span class="mono">|</span> oder · <span class="mono">*</span> beliebig oft · <span class="mono">+</span> mindestens einmal ·
            <span class="mono">?</span> optional · Klammern gruppieren · <span class="mono">\</span> vor einem Operator steht für das Zeichen selbst
        </p>
    </section>

    {#if nfa}
        <section class="card">
            <header class="card-header">
                <h2>Thompson-Konstruktion</h2>
                <button class="button primary" onclick={openInEditor}>Im NEA-Editor öffnen</button>
            </header>
            <dl class="facts">
                <dt>Alphabet Σ</dt>
                <dd class="mono">{formatSet(alphabet)}</dd>
                <dt>Zustände</dt>
                <dd>{nfa.states.length}</dd>
            </dl>
            {#if handOffFailed}
                <p class="note warn">Der Automat konnte nicht übergeben werden. Ist der Speicher des Browsers gesperrt?</p>
            {/if}
            <figure class="diagram">{@html svg}</figure>
        </section>
    {/if}

    {#snippet sidebar()}
        {#if nfa}
            {#key words}
                <BatchPanel fa={nfa} initialWords={words}/>
            {/key}
        {:else}
            <p class="panel hint">Der Mehrfachtest ist verfügbar, sobald der Ausdruck gültig ist.</p>
        {/if}
    {/snippet}
</Workbench>

<style>
    .card {
        display: grid;
        gap: 12px;
        padding: 18px;
        border: 1px solid var(--rule);
        border-radius: 12px;
        background: var(--surface);
    }

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    h2 {
        font-size: 1rem;
        font-weight: 600;
    }

    .expression {
        font-size: 1.125rem;
    }

    .expression.invalid {
        border-color: var(--danger);
    }

    .diagram {
        overflow: auto;
        border: 1px solid var(--rule);
        border-radius: 8px;
    }

    .diagram :global(svg) {
        display: block;
        max-width: 100%;
        height: auto;
    }
</style>
