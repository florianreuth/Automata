<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { formalDefinition } from "../../lib/automata/fa/definition.ts";
    import { definitionToLatex, definitionToMarkdown, definitionToText } from "../../lib/automata/fa/definition-export.ts";
    import type { FaEditor } from "../../lib/editor/fa-editor.svelte.ts";
    import { renderMachineSvg } from "../../lib/graph/svg.ts";
    import { downloadDocument, printHtml, svgToPng } from "../../lib/io/files.ts";
    import { tooltip } from "../../lib/ui/tooltip.ts";
    import DefinitionSheet, { PRINT_CSS } from "./DefinitionSheet.svelte";

    interface Props {
        editor: FaEditor;
        onnotify: (message: string) => void;
    }

    let { editor, onnotify }: Props = $props();

    let dialog: HTMLDialogElement | undefined = $state();
    let sheet: ReturnType<typeof DefinitionSheet> | undefined = $state();
    let name = $state("A");
    let representation = $state<"table" | "graph" | "both">("table");

    const definition = $derived(formalDefinition(editor.machine, name.trim() || "A"));
    const svg = $derived(renderMachineSvg(editor.machine, (group) => editor.edgeLabel(group)));

    export function open(): void {
        dialog?.showModal();
    }

    async function copy(text: string, format: string) {
        try {
            await navigator.clipboard.writeText(text);
            onnotify(`${format} in die Zwischenablage kopiert.`);
        } catch {
            onnotify("Kopieren nicht möglich – bitte Zugriff auf die Zwischenablage erlauben.");
        }
    }

    async function downloadPng() {
        try {
            downloadDocument(editor.machine.title, "png", await svgToPng(svg));
        } catch {
            onnotify("Der PNG-Export ist fehlgeschlagen.");
        }
    }
</script>

<dialog bind:this={dialog} class="dialog" aria-labelledby="definition-heading" onclick={(event) => event.target === dialog && dialog?.close()}>
    <header>
        <h2 id="definition-heading">Formale Definition</h2>
        <button class="icon-button" onclick={() => dialog?.close()} aria-label="Schließen" {@attach tooltip("Schließen")}>✕</button>
    </header>

    <div class="options">
        <label class="field grow">
            <span>Überschrift</span>
            <input value={editor.machine.title} oninput={(event) => editor.setTitle(event.currentTarget.value)}/>
        </label>
        <label class="field narrow">
            <span>Bezeichner</span>
            <input bind:value={name} maxlength="8"/>
        </label>
        <fieldset class="segmented">
            <legend>δ darstellen als</legend>
            <label><input type="radio" bind:group={representation} value="table"/>Tabelle</label>
            <label><input type="radio" bind:group={representation} value="graph"/>Graph</label>
            <label><input type="radio" bind:group={representation} value="both"/>Beides</label>
        </fieldset>
    </div>

    <DefinitionSheet bind:this={sheet} {definition} showTable={representation !== "graph"} svg={representation === "table" ? null : svg}/>

    <footer>
        <button class="button" onclick={() => copy(definitionToText(definition), "Text")}>Text kopieren</button>
        <button class="button" onclick={() => copy(definitionToMarkdown(definition), "Markdown")}>Markdown kopieren</button>
        <button class="button" onclick={() => copy(definitionToLatex(definition), "LaTeX")}>LaTeX kopieren</button>
        <span class="spacer"></span>
        <button class="button" onclick={() => downloadDocument(editor.machine.title, "svg", svg)}>SVG</button>
        <button class="button" onclick={downloadPng}>PNG</button>
        <button class="button primary" onclick={() => printHtml(editor.machine.title, sheet?.html() ?? "", PRINT_CSS)}>Drucken / PDF</button>
    </footer>
</dialog>

<style>
    .options {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 12px;
    }

    .grow {
        flex: 1 1 16rem;
    }

    .narrow {
        flex: 0 0 6rem;
    }

    footer {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
    }

    .spacer {
        flex: 1;
    }

    @media (max-width: 600px) {
        .spacer {
            display: none;
        }
    }
</style>
