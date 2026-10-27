<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { layoutTree, type ParseTree } from "../../lib/grammar/tree.ts";

    interface Props {
        tree: ParseTree;
    }

    let { tree }: Props = $props();

    const layout = $derived(layoutTree(tree));
</script>

<figure class="tree">
    <svg viewBox="0 0 {layout.width} {layout.height}" width={layout.width} height={layout.height} role="img" aria-label="Ableitungsbaum">
        {#each layout.edges as edge, i (i)}
            <line x1={edge.x1} y1={edge.y1 + 8} x2={edge.x2} y2={edge.y2 - 12}/>
        {/each}
        {#each layout.nodes as node, i (i)}
            <text x={node.x} y={node.y + 5} class:leaf={node.leaf}>{node.label}</text>
        {/each}
    </svg>
</figure>

<style>
    .tree {
        overflow: auto;
        padding: 8px;
        border: 1px solid var(--rule);
        border-radius: 8px;
        background: var(--canvas);
    }

    svg {
        display: block;
    }

    line {
        stroke: var(--muted);
        stroke-width: 1.2;
    }

    text {
        fill: var(--ink);
        font-size: 15px;
        font-weight: 600;
        text-anchor: middle;
    }

    text.leaf {
        fill: var(--accent);
        font-family: var(--mono);
        font-weight: 500;
    }
</style>
