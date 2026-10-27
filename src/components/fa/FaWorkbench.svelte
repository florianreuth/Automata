<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { onMount, tick } from "svelte";
    import { toDfa } from "../../lib/automata/fa/convert.ts";
    import { faExamples } from "../../lib/automata/fa/examples.ts";
    import { createFiniteAutomaton, type FaTransition, type FiniteAutomaton } from "../../lib/automata/fa/model.ts";
    import { FaEditor } from "../../lib/editor/fa-editor.svelte.ts";
    import type { Tool } from "../../lib/editor/graph-editor.ts";
    import { renderMachineSvg } from "../../lib/graph/svg.ts";
    import { loadAutosave, storeAutosave } from "../../lib/io/autosave.ts";
    import { faFromJson, faToJson } from "../../lib/io/document.ts";
    import { downloadDocument, pickTextFile, svgToPng } from "../../lib/io/files.ts";
    import { takeHandedOffAutomaton } from "../../lib/io/handoff.ts";
    import { faFromJff, faToJff } from "../../lib/io/jff.ts";
    import { tooltip } from "../../lib/ui/tooltip.ts";
    import GraphCanvas from "../editor/GraphCanvas.svelte";
    import AppHeader from "../ui/AppHeader.svelte";
    import Dropdown, { type DropdownItem } from "../ui/Dropdown.svelte";
    import Tabs from "../ui/Tabs.svelte";
    import BatchPanel from "./BatchPanel.svelte";
    import DefinitionDialog from "./DefinitionDialog.svelte";
    import PropertiesPanel from "./PropertiesPanel.svelte";
    import SimulationPanel from "./SimulationPanel.svelte";

    const AUTOSAVE_KEY = "automata:fa:autosave";

    const editor = new FaEditor(loadAutosave(AUTOSAVE_KEY, faFromJson) ?? faExamples[0].create());

    let canvas: ReturnType<typeof GraphCanvas<FaTransition>> | undefined = $state();
    let definitionDialog: ReturnType<typeof DefinitionDialog> | undefined = $state();
    let tab = $state<"simulation" | "batch" | "properties">("simulation");
    let highlight = $state<{ states: ReadonlySet<string>; edges: ReadonlySet<string> } | null>(null);
    let toast = $state<{ message: string; id: number } | null>(null);

    const tools: { id: Tool; label: string; key: string; icon: string }[] = [
        { id: "select", label: "Auswählen und verschieben", key: "V", icon: "M5 3l14 8-6 1.5L10 19z" },
        { id: "state", label: "Zustand hinzufügen", key: "Z", icon: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4v8m-4-4h8" },
        { id: "transition", label: "Übergang ziehen", key: "U", icon: "M4 18C8 6 16 6 20 10m0 0-1-5m1 5-5 1" },
        { id: "delete", label: "Löschen", key: "L", icon: "M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13" },
    ];

    const hints: Record<Tool, string> = {
        select: "Ziehen verschiebt · Umschalt+Ziehen erzeugt Übergänge · Doppelklick legt Zustände an · Rechtsklick öffnet Optionen",
        state: "Klicken legt einen Zustand an · der erste Zustand wird Startzustand",
        transition: "Von Zustand zu Zustand ziehen · Klick auf einen Zustand erzeugt eine Schleife",
        delete: "Zustände oder Übergänge anklicken, um sie zu löschen",
    };

    const fileItems: DropdownItem[] = [
        { label: "Neu", description: "Leere Arbeitsfläche", action: () => load(createFiniteAutomaton()) },
        { label: "Öffnen …", description: "Automata-JSON oder JFLAP (.jff)", shortcut: "Strg+O", action: open },
        "separator",
        { label: "Speichern", description: "Als Automata-JSON herunterladen", shortcut: "Strg+S", action: saveJson },
        { label: "Als JFLAP-Datei exportieren", description: "Kompatibel mit JFLAP 7 (.jff)", action: exportJff },
        "separator",
        { label: "Diagramm als SVG", action: () => downloadDocument(editor.machine.title, "svg", diagramSvg()) },
        { label: "Diagramm als PNG", action: exportPng },
    ];

    const exampleItems: DropdownItem[] = faExamples.map((example) => ({
        label: example.title,
        description: example.description,
        action: () => load(example.create()),
    }));

    $effect(() => storeAutosave(AUTOSAVE_KEY, faToJson(editor.snapshot())));

    $effect(() => {
        if (tab !== "simulation") {
            highlight = null;
        }
    });

    onMount(() => {
        // Loading as a regular change keeps the previous automaton reachable via undo.
        const handedOff = takeHandedOffAutomaton();
        if (handedOff) {
            load(handedOff);
            notify(`„${handedOff.title}“ übernommen.`);
        }
    });


    function notify(message: string) {
        const id = Date.now();
        toast = { message, id };
        setTimeout(() => toast?.id === id && (toast = null), 3200);
    }

    async function load(fa: FiniteAutomaton) {
        editor.replace(fa);
        await tick();
        canvas?.fit();
    }

    async function open() {
        const file = await pickTextFile(".json,.jff,application/json");
        if (!file) {
            return;
        }
        try {
            const title = file.name.replace(/\.[^.]+$/, "");
            await load(file.name.toLowerCase().endsWith(".jff") ? faFromJff(file.text, title) : faFromJson(file.text));
            notify(`„${file.name}“ geöffnet.`);
        } catch (error) {
            notify(error instanceof Error ? error.message : "Die Datei konnte nicht geöffnet werden.");
        }
    }

    function saveJson() {
        downloadDocument(editor.machine.title, "json", faToJson(editor.snapshot()));
    }

    function exportJff() {
        downloadDocument(editor.machine.title, "jff", faToJff(editor.snapshot()));
    }

    function diagramSvg() {
        return renderMachineSvg(editor.machine, (group) => editor.edgeLabel(group));
    }

    async function exportPng() {
        try {
            downloadDocument(editor.machine.title, "png", await svgToPng(diagramSvg()));
        } catch {
            notify("Der PNG-Export ist fehlgeschlagen.");
        }
    }

    async function convertToDfa() {
        try {
            const dfa = toDfa(editor.snapshot());
            await load(dfa);
            notify(`In einen DEA mit ${dfa.states.length} Zuständen umgewandelt.`);
        } catch (error) {
            notify(error instanceof Error ? error.message : "Die Umwandlung ist fehlgeschlagen.");
        }
    }

    function onKeyDown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, select, [contenteditable], dialog[open]")) {
            return;
        }
        const mod = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        if (mod && key === "z" && !event.shiftKey) {
            editor.undo();
        } else if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
            editor.redo();
        } else if (mod && key === "s") {
            saveJson();
        } else if (mod && key === "o") {
            open();
        } else if (mod) {
            return;
        } else if (event.key === "Delete" || event.key === "Backspace") {
            editor.deleteSelection();
        } else if (event.key === "F2") {
            canvas?.renameSelected();
        } else if (event.key === "Escape") {
            editor.selection = null;
            editor.tool = "select";
        } else if (key === "f") {
            canvas?.fit();
        } else if (key === "a") {
            canvas?.arrange();
        } else {
            const tool = tools.find((candidate) => candidate.key.toLowerCase() === key);
            if (!tool) {
                return;
            }
            editor.tool = tool.id;
        }
        event.preventDefault();
    }
</script>

<svelte:window onkeydown={onKeyDown}/>

<div class="workbench">
    <AppHeader module="Endlicher Automat">
        <input
            class="title"
            value={editor.machine.title}
            oninput={(event) => editor.setTitle(event.currentTarget.value)}
            aria-label="Titel des Automaten"
            spellcheck="false"
        />
        <nav class="actions" aria-label="Aktionen">
            <Dropdown label="Datei" items={fileItems}/>
            <Dropdown label="Beispiele" items={exampleItems}/>
            <span class="divider"></span>
            <button class="icon-button" onclick={() => editor.undo()} disabled={!editor.canUndo} aria-label="Rückgängig" {@attach tooltip("Rückgängig (Strg+Z)")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></svg>
            </button>
            <button class="icon-button" onclick={() => editor.redo()} disabled={!editor.canRedo} aria-label="Wiederholen" {@attach tooltip("Wiederholen (Strg+Y)")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h3"/></svg>
            </button>
            <button class="button primary" onclick={() => definitionDialog?.open()}>Formale Definition</button>
        </nav>
    </AppHeader>

    <main class="stage">
        <div class="rail" role="toolbar" aria-label="Werkzeuge">
            {#each tools as tool (tool.id)}
                <button
                    class="icon-button"
                    class:active={editor.tool === tool.id}
                    aria-pressed={editor.tool === tool.id}
                    {@attach tooltip(`${tool.label} (${tool.key})`, "right")}
                    aria-label={tool.label}
                    onclick={() => (editor.tool = tool.id)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tool.icon}/></svg>
                </button>
            {/each}
            <span class="divider"></span>
            <button class="icon-button" onclick={() => canvas?.zoom(1.2)} aria-label="Vergrößern" {@attach tooltip("Vergrößern", "right")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9 15-4.7-4.7M11 8v6m-3-3h6"/></svg>
            </button>
            <button class="icon-button" onclick={() => canvas?.zoom(1 / 1.2)} aria-label="Verkleinern" {@attach tooltip("Verkleinern", "right")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9 15-4.7-4.7M8 11h6"/></svg>
            </button>
            <button class="icon-button" onclick={() => canvas?.fit()} aria-label="Ansicht anpassen" {@attach tooltip("Ansicht anpassen (F)", "right")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/></svg>
            </button>
            <button
                class="icon-button"
                onclick={() => canvas?.arrange()}
                disabled={editor.machine.states.length === 0}
                {@attach tooltip("Automatisch anordnen (A)", "right")}
                aria-label="Automatisch anordnen"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h5v5H4zm11-6h5v5h-5zm0 12h5v5h-5zM9 12h3m0-6.5v13M12 6h3m-3 12h3"/></svg>
            </button>
        </div>

        <div class="canvas-area">
            <GraphCanvas bind:this={canvas} {editor} activeStates={highlight?.states} activeEdges={highlight?.edges}/>
            <p class="hint">{hints[editor.tool]}</p>
        </div>

        <aside class="sidebar">
            <Tabs
                label="Werkzeuge für den Automaten"
                tabs={[
                    { id: "simulation", label: "Simulation" },
                    { id: "batch", label: "Mehrfachtest" },
                    { id: "properties", label: "Eigenschaften" },
                ]}
                bind:value={tab}
            />
            <div class="tab-body" role="tabpanel">
                {#if tab === "simulation"}
                    <SimulationPanel fa={editor.machine} onhighlight={(value) => (highlight = value)}/>
                {:else if tab === "batch"}
                    <BatchPanel fa={editor.machine}/>
                {:else}
                    <PropertiesPanel fa={editor.machine} onconvert={convertToDfa}/>
                {/if}
            </div>
        </aside>
    </main>

    <DefinitionDialog bind:this={definitionDialog} {editor} onnotify={notify}/>

    {#if toast}
        <div class="toast" role="status">{toast.message}</div>
    {/if}
</div>

<style>
    .workbench {
        display: grid;
        grid-template-rows: auto 1fr;
        height: 100dvh;
    }

    .title {
        flex: 1;
        min-width: 8rem;
        padding: 6px 8px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: none;
        color: var(--ink);
        font: inherit;
        font-weight: 550;
        text-overflow: ellipsis;
    }

    .title:hover {
        border-color: var(--rule);
    }

    .title:focus {
        border-color: var(--accent);
        outline: none;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .divider {
        width: 1px;
        height: 24px;
        margin: 0 4px;
        background: var(--rule);
    }

    .stage {
        display: grid;
        grid-template-columns: auto 1fr 360px;
        min-height: 0;
    }

    .rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px 8px;
        border-right: 1px solid var(--rule);
        background: var(--surface);
    }

    .rail .divider {
        width: 24px;
        height: 1px;
        margin: 4px 0;
    }

    .canvas-area {
        position: relative;
        min-width: 0;
        min-height: 0;
    }

    .hint {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 12px;
        color: var(--muted);
        font-size: 0.8125rem;
        text-align: center;
        pointer-events: none;
    }

    .sidebar {
        display: flex;
        flex-direction: column;
        min-height: 0;
        border-left: 1px solid var(--rule);
        background: var(--surface);
    }

    .tab-body {
        flex: 1;
        overflow-y: auto;
    }

    .toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        z-index: 50;
        max-width: calc(100vw - 32px);
        padding: 10px 16px;
        border-radius: 10px;
        background: var(--ink);
        color: var(--bg);
        font-size: 0.875rem;
        box-shadow: var(--shadow);
        transform: translateX(-50%);
        animation: rise 0.3s var(--ease);
    }

    @keyframes rise {
        from {
            opacity: 0;
            transform: translate(-50%, 8px);
        }
    }

    @media (max-width: 960px) {
        .workbench {
            height: auto;
            min-height: 100dvh;
        }

        .title {
            order: 3;
            flex-basis: 100%;
        }

        .actions {
            margin-left: auto;
        }

        .stage {
            grid-template-columns: 1fr;
        }

        .rail {
            flex-direction: row;
            justify-content: center;
            border-right: 0;
            border-bottom: 1px solid var(--rule);
        }

        .rail .divider {
            width: 1px;
            height: 24px;
            margin: 0 4px;
        }

        .canvas-area {
            height: 62dvh;
        }

        .hint {
            display: none;
        }

        .sidebar {
            border-left: 0;
            border-top: 1px solid var(--rule);
        }
    }

    @media (max-width: 520px) {
        .actions .divider,
        .actions .icon-button {
            display: none;
        }
    }
</style>
