<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import { insertText } from "../../lib/ui/text-input.ts";
    import { tooltip } from "../../lib/ui/tooltip.ts";

    interface Props {
        /** Field the symbols are inserted into at the caret. */
        target: HTMLInputElement | HTMLTextAreaElement | undefined;
        symbols: { text: string; hint: string }[];
    }

    let { target, symbols }: Props = $props();
</script>

<div class="symbols" role="group" aria-label="Sonderzeichen einfügen">
    {#each symbols as symbol (symbol.text)}
        <button
            class="button"
            onclick={() => target && insertText(target, symbol.text)}
            aria-label="{symbol.text} einfügen: {symbol.hint}"
            {@attach tooltip(symbol.hint)}
        >{symbol.text}</button>
    {/each}
</div>

<style>
    .symbols {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .button {
        min-width: 2.5rem;
        font-family: var(--mono);
    }
</style>
