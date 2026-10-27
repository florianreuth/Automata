<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts" generics="T extends string">
    interface Props {
        label: string;
        tabs: { id: T; label: string }[];
        value: T;
    }

    let { label, tabs, value = $bindable() }: Props = $props();
</script>

<div class="tabs" role="tablist" aria-label={label}>
    {#each tabs as tab (tab.id)}
        <button role="tab" aria-selected={value === tab.id} onclick={() => (value = tab.id)}>{tab.label}</button>
    {/each}
</div>

<style>
    .tabs {
        display: flex;
        gap: 4px;
        padding: 10px 12px 0;
        border-bottom: 1px solid var(--rule);
    }

    button {
        padding: 8px 10px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: none;
        color: var(--muted);
        font: inherit;
        font-size: 0.875rem;
        font-weight: 550;
        cursor: pointer;
    }

    button:hover {
        color: var(--ink);
    }

    button[aria-selected="true"] {
        border-bottom-color: var(--accent);
        color: var(--ink);
    }
</style>
