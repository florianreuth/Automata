<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import type { Snippet } from "svelte";
    import AppHeader from "./AppHeader.svelte";

    interface Props {
        module: string;
        sidebarLabel: string;
        /** Controls on the right side of the header. */
        actions?: Snippet;
        sidebar: Snippet;
        children: Snippet;
    }

    let { module, sidebarLabel, actions, sidebar, children }: Props = $props();
</script>

<div class="workbench">
    <AppHeader {module}>
        <nav class="actions" aria-label="Aktionen">{@render actions?.()}</nav>
    </AppHeader>
    <div class="stage">
        <main class="content">{@render children()}</main>
        <aside class="sidebar" aria-label={sidebarLabel}>{@render sidebar()}</aside>
    </div>
</div>

<style>
    .workbench {
        display: grid;
        grid-template-rows: auto 1fr;
        height: 100dvh;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
    }

    .stage {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        min-height: 0;
    }

    .content {
        display: grid;
        align-content: start;
        gap: 18px;
        padding: 24px;
        overflow: auto;
    }

    .sidebar {
        min-height: 0;
        overflow-y: auto;
        border-left: 1px solid var(--rule);
        background: var(--surface);
    }

    @media (max-width: 960px) {
        .workbench {
            height: auto;
            min-height: 100dvh;
        }

        .stage {
            grid-template-columns: 1fr;
        }

        .sidebar {
            border-left: 0;
            border-top: 1px solid var(--rule);
        }
    }
</style>
