<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { grammarExamples } from "../../lib/grammar/examples.ts";
    import { formatSet } from "../../lib/automata/machine.ts";
    import { classify, isContextFree, nonterminalsOf, parseGrammar, terminalsOf, tokenize } from "../../lib/grammar/grammar.ts";
    import { loadAutosave, storeAutosave } from "../../lib/io/autosave.ts";
    import { autoReplace } from "../../lib/ui/text-input.ts";
    import Dropdown, { type DropdownItem } from "../ui/Dropdown.svelte";
    import SymbolBar from "../ui/SymbolBar.svelte";
    import Tabs from "../ui/Tabs.svelte";
    import Workbench from "../ui/Workbench.svelte";
    import CnfPanel from "./CnfPanel.svelte";
    import CykPanel from "./CykPanel.svelte";
    import Ll1Panel from "./Ll1Panel.svelte";

    const AUTOSAVE_KEY = "automata:grammar:autosave";

    const saved = loadAutosave(AUTOSAVE_KEY, parseSaved);
    let source = $state(saved?.source ?? grammarExamples[0].source);
    let word = $state(saved?.word ?? grammarExamples[0].word);
    let tab = $state<"ll1" | "cyk" | "cnf">("ll1");
    let editor: HTMLTextAreaElement | undefined = $state();

    const parsed = $derived(parseGrammar(source));
    const grammar = $derived("grammar" in parsed ? parsed.grammar : null);
    const symbols = $derived(tokenize(word));

    const exampleItems: DropdownItem[] = grammarExamples.map((example) => ({
        label: example.title,
        description: example.description,
        action: () => {
            source = example.source;
            word = example.word;
        },
    }));

    $effect(() => storeAutosave(AUTOSAVE_KEY, JSON.stringify({ source, word })));

    function parseSaved(json: string): { source: string; word: string } | null {
        const data = JSON.parse(json);
        return typeof data?.source === "string" && typeof data?.word === "string" ? data : null;
    }
</script>

<Workbench module="Grammatiken & Parsing" sidebarLabel="Grammatik">
    {#snippet actions()}
        <Dropdown label="Beispiele" items={exampleItems}/>
    {/snippet}

    <label class="field word">
        <span>Eingabewort (jedes Zeichen ein Terminal)</span>
        <input bind:value={word} class="mono" placeholder="Wort eingeben, z. B. aabb (leer = ε)" spellcheck="false" autocomplete="off"/>
    </label>

    {#if grammar === null}
        <p class="note warn">Bitte zuerst die Fehler in der Grammatik beheben.</p>
    {:else if !isContextFree(grammar)}
        <p class="note warn">CNF, CYK und LL(1) gibt es nur für kontextfreie Grammatiken: Jede linke Seite muss aus genau einem Nichtterminal bestehen.</p>
    {:else}
        <div class="analysis">
            <Tabs
                label="Analysen"
                tabs={[
                    { id: "ll1", label: "LL(1)" },
                    { id: "cyk", label: "CYK" },
                    { id: "cnf", label: "Chomsky-Normalform" },
                ]}
                bind:value={tab}
            />
            <div role="tabpanel">
                {#if tab === "ll1"}
                    <Ll1Panel {grammar} word={symbols}/>
                {:else if tab === "cyk"}
                    <CykPanel {grammar} word={symbols}/>
                {:else}
                    <CnfPanel {grammar} onapply={(value) => (source = value)}/>
                {/if}
            </div>
        </div>
    {/if}

    {#snippet sidebar()}
        <section class="panel">
            <label class="field">
                <span>Produktionen, eine pro Zeile</span>
                <textarea
                    bind:this={editor}
                    bind:value={source}
                    rows="10"
                    spellcheck="false"
                    placeholder={"S -> aSb |\nA -> aA | b"}
                    {@attach autoReplace({ "->": "→" })}
                ></textarea>
            </label>
            <SymbolBar
                target={editor}
                symbols={[
                    { text: "→", hint: "Pfeil – oder einfach -> tippen" },
                    { text: "|", hint: "Trennt Alternativen" },
                    { text: "ε", hint: "Leeres Wort – eine leere Alternative wie S -> a | geht auch" },
                ]}
            />
            <p class="hint">
                Pfeil als <span class="mono">-&gt;</span> tippen · Großbuchstaben (auch <span class="mono">S'</span>, <span class="mono">A1</span>) sind
                Nichtterminale, jedes andere Zeichen ist ein Terminal · eine leere Alternative steht für ε · die erste Zeile legt das Startsymbol fest
            </p>

            {#if "errors" in parsed}
                <ul class="errors" role="alert">
                    {#each parsed.errors as error (error.line)}
                        <li class="note warn">Zeile {error.line}: {error.message}</li>
                    {/each}
                </ul>
            {:else if grammar}
                <dl class="facts">
                    <dt>Typ</dt>
                    <dd>{classify(grammar).label}</dd>
                    <dt>Startsymbol</dt>
                    <dd class="mono">{grammar.start}</dd>
                    <dt>Nichtterminale</dt>
                    <dd class="mono">{formatSet(nonterminalsOf(grammar))}</dd>
                    <dt>Terminale</dt>
                    <dd class="mono">{formatSet(terminalsOf(grammar))}</dd>
                    <dt>Produktionen</dt>
                    <dd>{grammar.productions.length}</dd>
                </dl>
            {/if}
        </section>
    {/snippet}
</Workbench>

<style>
    .word {
        max-width: 32rem;
    }

    .analysis {
        border: 1px solid var(--rule);
        border-radius: 12px;
        background: var(--surface);
    }

    textarea {
        resize: vertical;
        font-family: var(--mono);
        line-height: 1.7;
    }

    .errors {
        display: grid;
        gap: 6px;
        list-style: none;
    }
</style>
