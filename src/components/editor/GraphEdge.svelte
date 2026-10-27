<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<svelte:options namespace="svg"/>

<script lang="ts">
    import type { EdgeShape } from "../../lib/graph/edges.ts";
    import { ARROW, ARROW_ACCENT } from "./ArrowMarkers.svelte";

    interface Props {
        from: string;
        to: string;
        shape: EdgeShape;
        label: string;
        selected: boolean;
        /** Highlighted by a running simulation. */
        active: boolean;
        /** Hides the label while it is edited inline. */
        editing: boolean;
    }

    let { from, to, shape, label, selected, active, editing }: Props = $props();
</script>

<!-- The canvas finds the clicked edge through data-from and data-to. -->
<g class="edge" class:selected class:active data-from={from} data-to={to}>
    <path class="hit" d={shape.path}/>
    <path class="line" d={shape.path} marker-end={selected || active ? ARROW_ACCENT : ARROW}/>
    {#if !editing}
        <text x={shape.labelX} y={shape.labelY} text-anchor={shape.labelAnchor}>{label}</text>
    {/if}
</g>

<style>
    .hit {
        fill: none;
        stroke: transparent;
        stroke-width: 16;
        cursor: pointer;
    }

    .line {
        fill: none;
        stroke: var(--ink);
        stroke-width: 1.6;
        pointer-events: none;
    }

    text {
        font-size: 15px;
        fill: var(--ink);
        stroke: var(--canvas);
        stroke-width: 5px;
        paint-order: stroke;
        cursor: pointer;
    }

    .selected .line,
    .active .line {
        stroke: var(--accent);
        stroke-width: 2.4;
    }

    .selected text,
    .active text {
        fill: var(--accent);
        font-weight: 600;
    }
</style>
