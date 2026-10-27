<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<svelte:options namespace="svg"/>

<script lang="ts" module>
    /** Marker references for marker-end; the markers must be rendered once in the same SVG. */
    export const ARROW = "url(#arrow)";
    export const ARROW_ACCENT = "url(#arrow-accent)";
</script>

<defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path class="arrowhead" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
    <marker id="arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path class="arrowhead accent" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
</defs>

<style>
    .arrowhead {
        fill: var(--ink);
    }

    .arrowhead.accent {
        fill: var(--accent);
    }
</style>
