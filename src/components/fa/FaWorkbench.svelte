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
    import { type Command, commandFor } from "../../lib/editor/shortcuts.ts";
    import { toolDefinition } from "../../lib/editor/tools.ts";
    import { renderMachineSvg } from "../../lib/graph/svg.ts";
    import { loadAutosave, storeAutosave } from "../../lib/io/autosave.ts";
    import { faFromJson, faToJson } from "../../lib/io/document.ts";
    import { downloadDocument, pickTextFile, svgToPng } from "../../lib/io/files.ts";
    import { takeHandedOffAutomaton } from "../../lib/io/handoff.ts";
    import { AUTOMATON_FILE_TYPES, faFromFile } from "../../lib/io/import.ts";
    import { faToJff } from "../../lib/io/jff.ts";
    import { Toast } from "../../lib/ui/toast.svelte.ts";
    import { tooltip } from "../../lib/ui/tooltip.ts";
    import GraphCanvas from "../editor/GraphCanvas.svelte";
    import ToolRail from "../editor/ToolRail.svelte";
    import AppHeader from "../ui/AppHeader.svelte";
    import Dropdown, { type DropdownItem } from "../ui/Dropdown.svelte";
    import Tabs from "../ui/Tabs.svelte";
    import ToastMessage from "../ui/ToastMessage.svelte";
    import BatchPanel from "./BatchPanel.svelte";
    import DefinitionDialog from "./DefinitionDialog.svelte";
    import PropertiesPanel from "./PropertiesPanel.svelte";
    import SimulationPanel from "./SimulationPanel.svelte";

    const AUTOSAVE_KEY = "automata:fa:autosave";

    const editor = new FaEditor(loadAutosave(AUTOSAVE_KEY, faFromJson) ?? faExamples[0].create());
    const toast = new Toast();

    let canvas: ReturnType<typeof GraphCanvas<FaTransition>> | undefined = $state();
    let definitionDialog: ReturnType<typeof DefinitionDialog> | undefined = $state();
    let tab = $state<"simulation" | "batch" | "properties">("simulation");
    let highlight = $state<{ states: ReadonlySet<string>; edges: ReadonlySet<string> } | null>(null);

    const fileItems: DropdownItem[] = [
        { label: "Neu", description: "Leere Arbeitsfläche", action: () => load(createFiniteAutomaton()) },
        { label: "Öffnen …", description: "Automata-JSON oder JFLAP (.jff)", shortcut: "Strg+O", action: openFile },
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

    const commands: Record<Exclude<Command, { tool: Tool }>, () => void> = {
        undo: () => editor.undo(),
        redo: () => editor.redo(),
        save: saveJson,
        open: openFile,
        delete: () => editor.deleteSelection(),
        rename: () => canvas?.renameSelected(),
        cancel: () => {
            editor.selection = null;
            editor.tool = "select";
        },
        fit: () => canvas?.fit(),
        arrange: () => canvas?.arrange(),
    };

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
            toast.show(`„${handedOff.title}“ übernommen.`);
        }
    });

    async function load(fa: FiniteAutomaton) {
        editor.replace(fa);
        await tick();
        canvas?.fit();
    }

    async function openFile() {
        const file = await pickTextFile(AUTOMATON_FILE_TYPES);
        if (!file) {
            return;
        }
        try {
            await load(faFromFile(file.name, file.text));
            toast.show(`„${file.name}“ geöffnet.`);
        } catch (error) {
            toast.show(error instanceof Error ? error.message : "Die Datei konnte nicht geöffnet werden.");
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
            toast.show("Der PNG-Export ist fehlgeschlagen.");
        }
    }

    async function convertToDfa() {
        try {
            const dfa = toDfa(editor.snapshot());
            await load(dfa);
            toast.show(`In einen DEA mit ${dfa.states.length} Zuständen umgewandelt.`);
        } catch (error) {
            toast.show(error instanceof Error ? error.message : "Die Umwandlung ist fehlgeschlagen.");
        }
    }

    function onKeyDown(event: KeyboardEvent) {
        // Typing in fields and dialogs must not trigger editor shortcuts.
        if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable], dialog[open]")) {
            return;
        }
        const command = commandFor(event);
        if (command === null) {
            return;
        }
        if (typeof command === "object") {
            editor.tool = command.tool;
        } else {
            commands[command]();
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
        <ToolRail
            bind:tool={editor.tool}
            canArrange={editor.machine.states.length > 0}
            onzoom={(factor) => canvas?.zoom(factor)}
            onfit={() => canvas?.fit()}
            onarrange={() => canvas?.arrange()}
        />

        <div class="canvas-area">
            <GraphCanvas bind:this={canvas} {editor} activeStates={highlight?.states} activeEdges={highlight?.edges}/>
            <p class="hint">{toolDefinition(editor.tool).hint}</p>
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

    <DefinitionDialog bind:this={definitionDialog} {editor} onnotify={(message) => toast.show(message)}/>
    <ToastMessage {toast}/>
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
