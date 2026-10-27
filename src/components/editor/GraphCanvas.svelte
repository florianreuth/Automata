<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts" generics="T extends Edge">
    import { tick } from "svelte";
    import type { Edge, Machine } from "../../lib/automata/machine.ts";
    import type { GraphEditor } from "../../lib/editor/graph-editor.ts";
    import { Viewport } from "../../lib/editor/viewport.svelte.ts";
    import { EdgeRouter, graphBounds, initialArrowPath, type Point, STATE_RADIUS } from "../../lib/graph/geometry.ts";

    interface Props {
        editor: GraphEditor<T>;
        /** State ids highlighted by a running simulation. */
        activeStates?: ReadonlySet<string>;
        /** Edge keys (see edgeKey) highlighted by a running simulation. */
        activeEdges?: ReadonlySet<string>;
    }

    let { editor, activeStates = new Set(), activeEdges = new Set() }: Props = $props();

    type Interaction =
        | { kind: "pan"; startX: number; startY: number; viewX: number; viewY: number }
        | { kind: "drag"; id: string; dx: number; dy: number; before: Machine<T>; moved: boolean }
        | { kind: "connect"; from: string; pointer: Point; target: string | null };

    type Inline =
        | { kind: "edge"; from: string; to: string; text: string; error: string | null }
        | { kind: "rename"; id: string; text: string; error: string | null };

    type MenuTarget = { kind: "state"; id: string } | { kind: "edge"; from: string; to: string } | { kind: "canvas"; point: Point };

    let svg: SVGSVGElement | undefined = $state();
    let input: HTMLInputElement | undefined = $state();
    let width = $state(0);
    let height = $state(0);
    const view = new Viewport();
    let interaction = $state<Interaction | null>(null);
    let inline = $state<Inline | null>(null);
    let menu = $state<{ x: number; y: number; target: MenuTarget } | null>(null);
    let fitted = false;

    const states = $derived(editor.machine.states);
    const byId = $derived(new Map(states.map((state) => [state.id, state])));
    const router = $derived(new EdgeRouter(states, editor.machine.transitions));

    const preview = $derived.by(() => {
        if (interaction?.kind === "connect") {
            if (interaction.target) {
                return router.shape(interaction.from, interaction.target)?.path ?? null;
            }
            const from = byId.get(interaction.from)!;
            return `M ${from.x} ${from.y} L ${interaction.pointer.x} ${interaction.pointer.y}`;
        }
        if (inline?.kind === "edge" && !router.hasEdge(inline.from, inline.to)) {
            return router.shape(inline.from, inline.to)?.path ?? null;
        }
        return null;
    });

    const inlinePosition = $derived.by(() => {
        if (inline?.kind === "edge") {
            const shape = router.shape(inline.from, inline.to);
            return shape ? view.toScreen({ x: shape.labelX, y: shape.labelY - 5 }) : null;
        }
        if (inline?.kind === "rename") {
            const state = byId.get(inline.id);
            return state ? view.toScreen(state) : null;
        }
        return null;
    });

    $effect(() => {
        if (!fitted && width > 0 && height > 0) {
            fitted = true;
            fit();
        }
    });

    function toLocal(event: { clientX: number; clientY: number }): Point {
        const rect = svg!.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function toWorld(event: { clientX: number; clientY: number }): Point {
        return view.toWorld(toLocal(event));
    }

    function hitState(point: Point): string | null {
        for (let i = states.length - 1; i >= 0; i--) {
            if (Math.hypot(states[i].x - point.x, states[i].y - point.y) <= STATE_RADIUS + 2) {
                return states[i].id;
            }
        }
        return null;
    }

    function hitEdge(event: Event): { from: string; to: string } | null {
        const element = (event.target as Element).closest("[data-from]");
        return element ? { from: element.getAttribute("data-from")!, to: element.getAttribute("data-to")! } : null;
    }

    /** Centers and scales the view so that the whole graph is visible. */
    export function fit(): void {
        view.fit(graphBounds(states, router.loops, 32), width, height);
    }

    /** Zooms by a factor (> 1 zooms in) around a canvas point, the center by default. */
    export function zoom(factor: number, anchor: Point = { x: width / 2, y: height / 2 }): void {
        view.zoom(factor, anchor);
    }

    /** Arranges all states automatically and fits the view to the result. */
    export function arrange(): void {
        editor.arrange();
        fit();
    }

    /** Opens the inline rename field for the selected state. */
    export function renameSelected(): void {
        if (editor.selection?.kind === "state") {
            openRename(editor.selection.id);
        }
    }

    async function openRename(id: string) {
        const state = byId.get(id);
        if (state) {
            inline = { kind: "rename", id, text: state.name, error: null };
            await tick();
            input?.select();
        }
    }

    async function openEdge(from: string, to: string) {
        inline = { kind: "edge", from, to, text: editor.edgeText(from, to), error: null };
        await tick();
        input?.select();
    }

    function applyInline(): boolean {
        if (!inline) {
            return true;
        }
        const error = inline.kind === "edge" ? editor.applyEdgeText(inline.from, inline.to, inline.text) : editor.renameState(inline.id, inline.text);
        if (error) {
            inline.error = error;
            return false;
        }
        inline = null;
        return true;
    }

    function onInlineKey(event: KeyboardEvent) {
        event.stopPropagation();
        if (event.key === "Enter") {
            applyInline();
        } else if (event.key === "Escape") {
            inline = null;
        }
    }

    function onInlineBlur() {
        // An invalid value must not trap the focus; discarding it matches the Escape behaviour.
        if (!applyInline()) {
            inline = null;
        }
    }

    function onPointerDown(event: PointerEvent) {
        menu = null;
        if (inline) {
            onInlineBlur();
        }
        if (event.button === 1) {
            startPan(event);
            return;
        }
        if (event.button !== 0) {
            return;
        }
        const point = toWorld(event);
        const state = hitState(point);
        const edge = state ? null : hitEdge(event);

        switch (editor.tool) {
            case "delete":
                if (state) {
                    editor.deleteState(state);
                } else if (edge) {
                    editor.deleteEdge(edge.from, edge.to);
                } else {
                    startPan(event);
                }
                return;
            case "transition":
                if (state) {
                    startConnect(event, state, point);
                } else if (edge) {
                    editor.selection = { kind: "edge", ...edge };
                    openEdge(edge.from, edge.to);
                } else {
                    startPan(event);
                }
                return;
            case "state":
                if (state) {
                    startDrag(event, state, point);
                } else if (edge) {
                    editor.selection = { kind: "edge", ...edge };
                } else {
                    editor.addState(Math.round(point.x), Math.round(point.y));
                }
                return;
            case "select":
                if (state && event.shiftKey) {
                    startConnect(event, state, point);
                } else if (state) {
                    startDrag(event, state, point);
                } else if (edge) {
                    editor.selection = { kind: "edge", ...edge };
                } else {
                    editor.selection = null;
                    startPan(event);
                }
        }
    }

    function startPan(event: PointerEvent) {
        interaction = { kind: "pan", startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y };
        svg!.setPointerCapture(event.pointerId);
    }

    function startDrag(event: PointerEvent, id: string, point: Point) {
        const state = byId.get(id)!;
        editor.selection = { kind: "state", id };
        interaction = { kind: "drag", id, dx: point.x - state.x, dy: point.y - state.y, before: editor.snapshot(), moved: false };
        svg!.setPointerCapture(event.pointerId);
    }

    function startConnect(event: PointerEvent, from: string, point: Point) {
        editor.selection = { kind: "state", id: from };
        interaction = { kind: "connect", from, pointer: point, target: from };
        svg!.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
        if (!interaction) {
            return;
        }
        if (interaction.kind === "pan") {
            view.x = interaction.viewX + event.clientX - interaction.startX;
            view.y = interaction.viewY + event.clientY - interaction.startY;
            return;
        }
        const point = toWorld(event);
        if (interaction.kind === "drag") {
            interaction.moved = true;
            // Holding Alt disables snapping for fine positioning.
            const snap = event.altKey ? 1 : 10;
            editor.moveState(interaction.id, Math.round((point.x - interaction.dx) / snap) * snap, Math.round((point.y - interaction.dy) / snap) * snap);
        } else {
            interaction.pointer = point;
            interaction.target = hitState(point);
        }
    }

    function onPointerUp() {
        const finished = interaction;
        interaction = null;
        if (finished?.kind === "drag" && finished.moved) {
            editor.commit(finished.before);
        } else if (finished?.kind === "connect" && finished.target) {
            const isLoop = finished.target === finished.from;
            // Shift-dragging back onto the same state is usually a mis-click; the transition tool creates loops deliberately.
            if (!isLoop || editor.tool === "transition") {
                openEdge(finished.from, finished.target);
            }
        }
    }

    function onDoubleClick(event: MouseEvent) {
        const point = toWorld(event);
        const state = hitState(point);
        const edge = state ? null : hitEdge(event);
        if (state) {
            openRename(state);
        } else if (edge) {
            openEdge(edge.from, edge.to);
        } else if (editor.tool === "select") {
            editor.addState(Math.round(point.x), Math.round(point.y));
        }
    }

    function onContextMenu(event: MouseEvent) {
        event.preventDefault();
        const point = toWorld(event);
        const state = hitState(point);
        const edge = state ? null : hitEdge(event);
        const local = toLocal(event);
        const target: MenuTarget = state ? { kind: "state", id: state } : edge ? { kind: "edge", ...edge } : { kind: "canvas", point };
        if (target.kind === "state") {
            editor.selection = { kind: "state", id: target.id };
        } else if (target.kind === "edge") {
            editor.selection = target;
        }
        menu = { x: Math.min(local.x, width - 210), y: Math.min(local.y, height - 200), target };
    }

    function onWheel(event: WheelEvent) {
        event.preventDefault();
        zoom(Math.exp(-event.deltaY * 0.0015), toLocal(event));
    }

    function run(action: () => void) {
        // The menu target is read by the action, so the menu may only be closed afterwards.
        action();
        menu = null;
    }

    function isSelectedEdge(from: string, to: string) {
        return editor.selection?.kind === "edge" && editor.selection.from === from && editor.selection.to === to;
    }
</script>

<div
    class="canvas tool-{editor.tool}"
    bind:clientWidth={width}
    bind:clientHeight={height}
    style:background-position="{view.x}px {view.y}px"
    style:background-size="{24 * view.scale}px {24 * view.scale}px"
>
    <svg
        bind:this={svg}
        role="application"
        aria-label="Zustandsdiagramm"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onpointercancel={onPointerUp}
        ondblclick={onDoubleClick}
        oncontextmenu={onContextMenu}
        onwheel={onWheel}
    >
        <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path class="arrowhead" d="M 0 0 L 10 5 L 0 10 z"/>
            </marker>
            <marker id="arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path class="arrowhead accent" d="M 0 0 L 10 5 L 0 10 z"/>
            </marker>
        </defs>

        <g transform="translate({view.x} {view.y}) scale({view.scale})">
            {#each router.groups as group (group.key)}
                {@const shape = router.shape(group.from, group.to)}
                {#if shape}
                    {@const highlighted = isSelectedEdge(group.from, group.to) || activeEdges.has(group.key)}
                    <g class="edge" class:selected={isSelectedEdge(group.from, group.to)} class:active={activeEdges.has(group.key)} data-from={group.from} data-to={group.to}>
                        <path class="hit" d={shape.path}/>
                        <path class="line" d={shape.path} marker-end={highlighted ? "url(#arrow-accent)" : "url(#arrow)"}/>
                        {#if !(inline?.kind === "edge" && inline.from === group.from && inline.to === group.to)}
                            <text x={shape.labelX} y={shape.labelY} text-anchor={shape.labelAnchor}>{editor.edgeLabel(group)}</text>
                        {/if}
                    </g>
                {/if}
            {/each}

            {#if preview}
                <path class="preview" d={preview} marker-end="url(#arrow-accent)"/>
            {/if}

            {#each states as state (state.id)}
                <g
                    class="state"
                    class:selected={editor.selection?.kind === "state" && editor.selection.id === state.id}
                    class:active={activeStates.has(state.id)}
                    class:target={interaction?.kind === "connect" && interaction.target === state.id}
                >
                    {#if state.initial}
                        <path class="initial" d={initialArrowPath(state)} marker-end="url(#arrow)"/>
                    {/if}
                    <circle class="body" cx={state.x} cy={state.y} r={STATE_RADIUS}/>
                    {#if state.final}
                        <circle class="ring" cx={state.x} cy={state.y} r={STATE_RADIUS - 5}/>
                    {/if}
                    {#if !(inline?.kind === "rename" && inline.id === state.id)}
                        <text class="name" x={state.x} y={state.y + 5}>{state.name}</text>
                    {/if}
                    {#if state.label}
                        <text class="label" x={state.x} y={state.y + STATE_RADIUS + 18}>{state.label}</text>
                    {/if}
                </g>
            {/each}
        </g>
    </svg>

    {#if states.length === 0}
        <div class="empty">
            <strong>Leere Arbeitsfläche</strong>
            <span>Doppelklicken oder das Zustandswerkzeug (Z) nutzen, um einen Zustand anzulegen.</span>
        </div>
    {/if}

    {#if inline && inlinePosition}
        <div class="inline" style:left="{inlinePosition.x}px" style:top="{inlinePosition.y}px">
            <input
                bind:this={input}
                bind:value={inline.text}
                class:invalid={inline.error}
                placeholder={inline.kind === "edge" ? editor.edgeHint : "Name"}
                aria-label={inline.kind === "edge" ? "Übergangssymbole" : "Zustandsname"}
                spellcheck="false"
                autocomplete="off"
                onkeydown={onInlineKey}
                onblur={onInlineBlur}
                oninput={() => inline && (inline.error = null)}
            />
            {#if inline.error}
                <span class="error" role="alert">{inline.error}</span>
            {/if}
        </div>
    {/if}

    {#if menu}
        {@const target = menu.target}
        <div class="menu" role="menu" style:left="{menu.x}px" style:top="{menu.y}px">
            {#if target.kind === "state"}
                {@const state = byId.get(target.id)}
                {#if state}
                    <button role="menuitemcheckbox" aria-checked={state.initial} onclick={() => run(() => editor.toggleInitial(target.id))}>
                        <span class="check">{state.initial ? "✓" : ""}</span>Startzustand
                    </button>
                    <button role="menuitemcheckbox" aria-checked={state.final} onclick={() => run(() => editor.toggleFinal(target.id))}>
                        <span class="check">{state.final ? "✓" : ""}</span>Endzustand
                    </button>
                    <hr>
                    <button role="menuitem" onclick={() => run(() => openRename(target.id))}><span class="check"></span>Umbenennen</button>
                    <button role="menuitem" onclick={() => run(() => openEdge(target.id, target.id))}><span class="check"></span>Schleife bearbeiten</button>
                    {#if state.label}
                        <button role="menuitem" onclick={() => run(() => editor.clearLabel(target.id))}><span class="check"></span>Beschriftung entfernen</button>
                    {/if}
                    <hr>
                    <button role="menuitem" class="danger" onclick={() => run(() => editor.deleteState(target.id))}><span class="check"></span>Löschen</button>
                {/if}
            {:else if target.kind === "edge"}
                <button role="menuitem" onclick={() => run(() => openEdge(target.from, target.to))}><span class="check"></span>Symbole bearbeiten</button>
                <button role="menuitem" class="danger" onclick={() => run(() => editor.deleteEdge(target.from, target.to))}><span class="check"></span>Löschen</button>
            {:else}
                <button role="menuitem" onclick={() => run(() => editor.addState(Math.round(target.point.x), Math.round(target.point.y)))}>
                    <span class="check"></span>Zustand hinzufügen
                </button>
                <button role="menuitem" onclick={() => run(arrange)} disabled={states.length === 0}><span class="check"></span>Automatisch anordnen</button>
                <button role="menuitem" onclick={() => run(fit)}><span class="check"></span>Ansicht anpassen</button>
            {/if}
        </div>
    {/if}
</div>

<svelte:window onkeydown={(event) => event.key === "Escape" && (menu = null)}/>

<style>
    .canvas {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--canvas);
        background-image: radial-gradient(circle, var(--grid) 1.2px, transparent 1.4px);
    }

    svg {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
        user-select: none;
        cursor: grab;
    }

    .tool-state svg {
        cursor: crosshair;
    }

    .tool-delete svg {
        cursor: not-allowed;
    }

    svg:active {
        cursor: grabbing;
    }

    .arrowhead {
        fill: var(--ink);
    }

    .arrowhead.accent {
        fill: var(--accent);
    }

    .edge .hit {
        fill: none;
        stroke: transparent;
        stroke-width: 16;
        cursor: pointer;
    }

    .edge .line {
        fill: none;
        stroke: var(--ink);
        stroke-width: 1.6;
        pointer-events: none;
    }

    .edge text {
        font-size: 15px;
        fill: var(--ink);
        stroke: var(--canvas);
        stroke-width: 5px;
        paint-order: stroke;
        cursor: pointer;
    }

    .edge.selected .line,
    .edge.active .line {
        stroke: var(--accent);
        stroke-width: 2.4;
    }

    .edge.selected text,
    .edge.active text {
        fill: var(--accent);
        font-weight: 600;
    }

    .preview {
        fill: none;
        stroke: var(--accent);
        stroke-width: 2;
        stroke-dasharray: 6 5;
        pointer-events: none;
    }

    .state {
        cursor: pointer;
    }

    .state .body {
        fill: var(--surface);
        stroke: var(--ink);
        stroke-width: 1.6;
        transition: fill 0.2s, stroke 0.2s;
    }

    .state .ring {
        fill: none;
        stroke: var(--ink);
        stroke-width: 1.4;
    }

    .state .initial {
        stroke: var(--ink);
        stroke-width: 1.6;
    }

    .state .name {
        font-size: 15px;
        font-weight: 550;
        text-anchor: middle;
        fill: var(--ink);
        pointer-events: none;
    }

    .state .label {
        font-size: 12px;
        text-anchor: middle;
        fill: var(--muted);
        pointer-events: none;
    }

    .state.selected .body,
    .state.target .body {
        stroke: var(--accent);
        stroke-width: 2.6;
    }

    .state.active .body {
        fill: var(--active);
        stroke: var(--accent);
        stroke-width: 2.6;
    }

    .state.active .ring {
        stroke: var(--accent);
    }

    .empty {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        gap: 6px;
        padding: 24px;
        text-align: center;
        color: var(--muted);
        pointer-events: none;
    }

    .empty strong {
        color: var(--ink);
        font-size: 1.125rem;
        font-weight: 600;
    }

    .inline {
        position: absolute;
        transform: translate(-50%, -50%);
        display: grid;
        justify-items: center;
        gap: 6px;
        z-index: 2;
    }

    .inline input {
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

    .inline input.invalid {
        border-color: var(--danger);
    }

    .inline .error {
        max-width: 18rem;
        padding: 6px 10px;
        border-radius: 8px;
        background: var(--danger);
        color: #fff;
        font-size: 0.8125rem;
        text-align: center;
    }

    .menu {
        position: absolute;
        z-index: 3;
        min-width: 200px;
        padding: 6px;
        border: 1px solid var(--rule);
        border-radius: 10px;
        background: var(--surface);
        box-shadow: var(--shadow);
    }

    .menu button {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 7px 10px;
        border: 0;
        border-radius: 6px;
        background: none;
        color: var(--ink);
        font: inherit;
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
    }

    .menu button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .menu button:hover:not(:disabled),
    .menu button:focus-visible {
        background: var(--hover);
        outline: none;
    }

    .menu .check {
        width: 20px;
        color: var(--accent);
    }

    .menu .danger {
        color: var(--danger);
    }

    .menu hr {
        margin: 4px 6px;
        border: 0;
        border-top: 1px solid var(--rule);
    }
</style>
