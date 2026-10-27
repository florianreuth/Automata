<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    interface Props {
        /** Center of the field in canvas-relative pixels. */
        x: number;
        y: number;
        text: string;
        error: string | null;
        placeholder: string;
        label: string;
        onconfirm: () => void;
        oncancel: () => void;
        onblur: () => void;
        oninput: () => void;
    }

    let { x, y, text = $bindable(), error, placeholder, label, onconfirm, oncancel, onblur, oninput }: Props = $props();

    function onKeyDown(event: KeyboardEvent) {
        // Keys typed here must not reach the editor shortcuts on the window.
        event.stopPropagation();
        if (event.key === "Enter") {
            onconfirm();
        } else if (event.key === "Escape") {
            oncancel();
        }
    }
</script>

<div class="inline" style:left="{x}px" style:top="{y}px">
    <input
        bind:value={text}
        class:invalid={error}
        {placeholder}
        aria-label={label}
        spellcheck="false"
        autocomplete="off"
        onkeydown={onKeyDown}
        {onblur}
        {oninput}
        {@attach (input) => input.select()}
    />
    {#if error}
        <span class="error" role="alert">{error}</span>
    {/if}
</div>

<style>
    .inline {
        position: absolute;
        transform: translate(-50%, -50%);
        display: grid;
        justify-items: center;
        gap: 6px;
        z-index: 2;
    }

    input {
        width: 15rem;
        padding: 6px 10px;
        border: 2px solid var(--accent);
        border-radius: 8px;
        background: var(--surface);
        color: var(--ink);
        font: inherit;
        font-size: 0.9375rem;
        text-align: center;
        box-shadow: var(--shadow);
        outline: none;
    }

    input.invalid {
        border-color: var(--danger);
    }

    .error {
        max-width: 18rem;
        padding: 6px 10px;
        border-radius: 8px;
        background: var(--danger);
        color: #fff;
        font-size: 0.8125rem;
        text-align: center;
    }
</style>
