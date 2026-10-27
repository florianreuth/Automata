<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<svelte:options namespace="svg"/>

<script lang="ts">
    import type { StateNode } from "../../lib/automata/machine.ts";
    import { initialArrowPath, LABEL_BASELINE, NAME_BASELINE, STATE_RADIUS } from "../../lib/graph/geometry.ts";
    import { ARROW } from "./ArrowMarkers.svelte";

    const FINAL_RING_INSET = 5;

    interface Props {
        state: StateNode;
        selected: boolean;
        /** Highlighted by a running simulation. */
        active: boolean;
        /** Current drop target while drawing a transition. */
        target: boolean;
        /** Hides the name while it is edited inline. */
        editing: boolean;
    }

    let { state, selected, active, target, editing }: Props = $props();
</script>

<g class="state" class:selected class:active class:target>
    {#if state.initial}
        <path class="initial" d={initialArrowPath(state)} marker-end={ARROW}/>
    {/if}
    <circle class="body" cx={state.x} cy={state.y} r={STATE_RADIUS}/>
    {#if state.final}
        <circle class="ring" cx={state.x} cy={state.y} r={STATE_RADIUS - FINAL_RING_INSET}/>
    {/if}
    {#if !editing}
        <text class="name" x={state.x} y={state.y + NAME_BASELINE}>{state.name}</text>
    {/if}
    {#if state.label}
        <text class="label" x={state.x} y={state.y + LABEL_BASELINE}>{state.label}</text>
    {/if}
</g>

<style>
    .state {
        cursor: pointer;
    }

    .body {
        fill: var(--surface);
        stroke: var(--ink);
        stroke-width: 1.6;
        transition: fill 0.2s, stroke 0.2s;
    }

    .ring {
        fill: none;
        stroke: var(--ink);
        stroke-width: 1.4;
    }

    .initial {
        stroke: var(--ink);
        stroke-width: 1.6;
    }

    .name {
        font-size: 15px;
        font-weight: 550;
        text-anchor: middle;
        fill: var(--ink);
        pointer-events: none;
    }

    .label {
        font-size: 12px;
        text-anchor: middle;
        fill: var(--muted);
        pointer-events: none;
    }

    .selected .body,
    .target .body {
        stroke: var(--accent);
        stroke-width: 2.6;
    }

    .active .body {
        fill: var(--active);
        stroke: var(--accent);
        stroke-width: 2.6;
    }

    .active .ring {
        stroke: var(--accent);
    }
</style>
