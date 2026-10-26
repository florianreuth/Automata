<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts" module>
    export type DropdownItem = { label: string; description?: string; shortcut?: string; action: () => void } | "separator";
</script>

<script lang="ts">
    interface Props {
        label: string;
        items: DropdownItem[];
    }

    let { label, items }: Props = $props();

    let open = $state(false);
    let root: HTMLDivElement | undefined = $state();

    function select(action: () => void) {
        open = false;
        action();
    }

    function onWindowPointerDown(event: PointerEvent) {
        if (open && root && !root.contains(event.target as Node)) {
            open = false;
        }
    }
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={(event) => event.key === "Escape" && (open = false)}/>

<div class="dropdown" bind:this={root}>
    <button class="button ghost" aria-haspopup="menu" aria-expanded={open} onclick={() => (open = !open)}>
        {label}
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg>
    </button>
    {#if open}
        <div class="list" role="menu">
            {#each items as item, i (i)}
                {#if item === "separator"}
                    <hr>
                {:else}
                    <button role="menuitem" onclick={() => select(item.action)}>
                        <span class="text">
                            <span>{item.label}</span>
                            {#if item.description}<small>{item.description}</small>{/if}
                        </span>
                        {#if item.shortcut}<kbd>{item.shortcut}</kbd>{/if}
                    </button>
                {/if}
            {/each}
        </div>
    {/if}
</div>

<style>
    .dropdown {
        position: relative;
    }

    .dropdown > .button svg {
        width: 12px;
        height: 12px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
    }

    .list {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        z-index: 20;
        min-width: 260px;
        max-width: min(340px, calc(100vw - 32px));
        padding: 6px;
        border: 1px solid var(--rule);
        border-radius: 10px;
        background: var(--surface);
        box-shadow: var(--shadow);
    }

    .list button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        width: 100%;
        padding: 8px 10px;
        border: 0;
        border-radius: 6px;
        background: none;
        color: var(--ink);
        font: inherit;
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
    }

    .list button:hover,
    .list button:focus-visible {
        background: var(--hover);
        outline: none;
    }

    .text {
        display: grid;
        gap: 1px;
    }

    small {
        color: var(--muted);
        font-size: 0.8125rem;
    }

    kbd {
        color: var(--muted);
        font-family: var(--mono);
        font-size: 0.75rem;
    }

    hr {
        margin: 4px 6px;
        border: 0;
        border-top: 1px solid var(--rule);
    }
</style>
