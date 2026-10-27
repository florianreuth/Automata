<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import type { Snippet } from "svelte";
    import { withBase } from "../../lib/paths.ts";

    interface Props {
        /** Name of the current module, shown next to the brand. */
        module: string;
        children?: Snippet;
    }

    let { module, children }: Props = $props();
</script>

<header class="topbar">
    <a class="brand" href={withBase("/")} aria-label="Zur Startseite">
        <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="16" r="6"/><circle cx="23" cy="16" r="6"/><circle cx="23" cy="16" r="3.5"/><path d="M15 16h2"/></svg>
        <span>Automata</span>
    </a>
    <span class="module">{module}</span>
    {@render children?.()}
</header>

<style>
    .topbar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--rule);
        background: var(--surface);
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--ink);
        font-weight: 650;
        letter-spacing: -0.01em;
        text-decoration: none;
    }

    .brand svg {
        width: 28px;
        height: 28px;
        fill: none;
        stroke: var(--accent);
        stroke-width: 2;
    }

    .module {
        padding: 2px 10px;
        border-radius: 999px;
        background: var(--hover);
        color: var(--muted);
        font-size: 0.8125rem;
        white-space: nowrap;
    }

    @media (max-width: 960px) {
        .topbar {
            flex-wrap: wrap;
        }

        .module {
            display: none;
        }
    }
</style>
