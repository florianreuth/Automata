<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts">
    import type { Toast } from "../../lib/ui/toast.svelte.ts";

    interface Props {
        toast: Toast;
    }

    let { toast }: Props = $props();
</script>

{#if toast.message}
    {#key toast.message}
        <div class="toast" role="status">{toast.message}</div>
    {/key}
{/if}

<style>
    .toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        z-index: 50;
        max-width: calc(100vw - 32px);
        padding: 10px 16px;
        border-radius: 10px;
        background: var(--ink);
        color: var(--bg);
        font-size: 0.875rem;
        box-shadow: var(--shadow);
        transform: translateX(-50%);
        animation: rise 0.3s var(--ease);
    }

    @keyframes rise {
        from {
            opacity: 0;
            transform: translate(-50%, 8px);
        }
    }
</style>
