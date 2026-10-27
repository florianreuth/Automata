<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts" module>
    /** Zoom factor of one click on the zoom buttons. */
    export const ZOOM_STEP = 1.2;
</script>

<script lang="ts">
    import type { Tool } from "../../lib/editor/graph-editor.ts";
    import { TOOLS } from "../../lib/editor/tools.ts";
    import { tooltip } from "../../lib/ui/tooltip.ts";

    interface Props {
        tool: Tool;
        canArrange: boolean;
        onzoom: (factor: number) => void;
        onfit: () => void;
        onarrange: () => void;
    }

    let { tool = $bindable(), canArrange, onzoom, onfit, onarrange }: Props = $props();
</script>

{#snippet iconButton(label: string, hint: string, icon: string, onclick: () => void, disabled = false)}
    <button class="icon-button" {onclick} {disabled} aria-label={label} {@attach tooltip(hint, "right")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icon}/></svg>
    </button>
{/snippet}

<div class="rail" role="toolbar" aria-label="Werkzeuge">
    {#each TOOLS as definition (definition.id)}
        <button
            class="icon-button"
            class:active={tool === definition.id}
            aria-pressed={tool === definition.id}
            aria-label={definition.label}
            onclick={() => (tool = definition.id)}
            {@attach tooltip(`${definition.label} (${definition.key})`, "right")}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={definition.icon}/></svg>
        </button>
    {/each}
    <span class="divider"></span>
    {@render iconButton("Vergrößern", "Vergrößern", "M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9 15-4.7-4.7M11 8v6m-3-3h6", () => onzoom(ZOOM_STEP))}
    {@render iconButton("Verkleinern", "Verkleinern", "M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9 15-4.7-4.7M8 11h6", () => onzoom(1 / ZOOM_STEP))}
    {@render iconButton("Ansicht anpassen", "Ansicht anpassen (F)", "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5", onfit)}
    {@render iconButton("Automatisch anordnen", "Automatisch anordnen (A)", "M4 9.5h5v5H4zm11-6h5v5h-5zm0 12h5v5h-5zM9 12h3m0-6.5v13M12 6h3m-3 12h3", onarrange, !canArrange)}
</div>

<style>
    .rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px 8px;
        border-right: 1px solid var(--rule);
        background: var(--surface);
    }

    .divider {
        width: 24px;
        height: 1px;
        margin: 4px 0;
        background: var(--rule);
    }

    @media (max-width: 960px) {
        .rail {
            flex-direction: row;
            justify-content: center;
            border-right: 0;
            border-bottom: 1px solid var(--rule);
        }

        .divider {
            width: 1px;
            height: 24px;
            margin: 0 4px;
        }
    }
</style>
