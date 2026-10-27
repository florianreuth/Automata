<!--
  This project is licensed under the MIT License.
  See the LICENSE file in the project root for details.

  Copyright (c) 2026 Florian Reuth <git@florianreuth.de>
-->

<script lang="ts" generics="T extends Edge">
    import type { Edge, Machine } from "../../lib/automata/machine.ts";
    import type { GraphEditor } from "../../lib/editor/graph-editor.ts";
    import { type Hit, pointerAction } from "../../lib/editor/pointer.ts";
    import { Viewport } from "../../lib/editor/viewport.svelte.ts";
    import { EdgeRouter } from "../../lib/graph/edges.ts";
    import { graphBounds, NAME_BASELINE, type Point, snapToGrid, stateAt } from "../../lib/graph/geometry.ts";
    import ArrowMarkers, { ARROW_ACCENT } from "./ArrowMarkers.svelte";
    import CanvasMenu, { MENU_SIZE } from "./CanvasMenu.svelte";
    import GraphEdge from "./GraphEdge.svelte";
    import GraphState from "./GraphState.svelte";
    import InlineEditor from "./InlineEditor.svelte";

    const GRID_SIZE = 24;
    const SNAP = 10;
    const FIT_MARGIN = 32;
    const WHEEL_ZOOM_SPEED = 0.0015;

    interface Props {
        editor: GraphEditor<T>;
        /** State ids highlighted by a running simulation. */
        activeStates?: ReadonlySet<string>;
        /** Edge keys (see edgeKey) highlighted by a running simulation. */
        activeEdges?: ReadonlySet<string>;
    }

    let { editor, activeStates = new Set(), activeEdges = new Set() }: Props = $props();

    type Gesture =
        | { kind: "pan"; startX: number; startY: number; viewX: number; viewY: number }
        | { kind: "drag"; id: string; dx: number; dy: number; before: Machine<T>; moved: boolean }
        | { kind: "connect"; from: string; pointer: Point; target: string | null };

    type Inline =
        | { kind: "edge"; from: string; to: string; text: string; error: string | null }
        | { kind: "rename"; id: string; text: string; error: string | null };

    let svg: SVGSVGElement | undefined = $state();
    let width = $state(0);
    let height = $state(0);
    const view = new Viewport();
    let gesture = $state<Gesture | null>(null);
    let inline = $state<Inline | null>(null);
    let menu = $state<{ x: number; y: number; target: Hit } | null>(null);
    let fitted = false;

    const states = $derived(editor.machine.states);
    const byId = $derived(new Map(states.map((state) => [state.id, state])));
    const router = $derived(new EdgeRouter(states, editor.machine.transitions));

    const preview = $derived.by(() => {
        if (gesture?.kind === "connect") {
            if (gesture.target) {
                return router.shape(gesture.from, gesture.target)?.path ?? null;
            }
            const from = byId.get(gesture.from)!;
            return `M ${from.x} ${from.y} L ${gesture.pointer.x} ${gesture.pointer.y}`;
        }
        if (inline?.kind === "edge" && !router.hasEdge(inline.from, inline.to)) {
            return router.shape(inline.from, inline.to)?.path ?? null;
        }
        return null;
    });

    const inlinePosition = $derived.by(() => {
        if (inline?.kind === "edge") {
            const shape = router.shape(inline.from, inline.to);
            return shape ? view.toScreen({ x: shape.labelX, y: shape.labelY - NAME_BASELINE }) : null;
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

    /** Centers and scales the view so that the whole graph is visible. */
    export function fit(): void {
        view.fit(graphBounds(states, router.loops, FIT_MARGIN), width, height);
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

    function toLocal(event: MouseEvent): Point {
        const rect = svg!.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function hitAt(event: MouseEvent, point: Point): Hit {
        const state = stateAt(states, point);
        if (state) {
            return { kind: "state", id: state.id };
        }
        const edge = (event.target as Element).closest("[data-from]");
        return edge ? { kind: "edge", from: edge.getAttribute("data-from")!, to: edge.getAttribute("data-to")! } : { kind: "canvas", point };
    }

    function addStateAt(point: Point) {
        editor.addState(Math.round(point.x), Math.round(point.y));
    }

    function openRename(id: string) {
        const state = byId.get(id);
        if (state) {
            inline = { kind: "rename", id, text: state.name, error: null };
        }
    }

    function openEdge(from: string, to: string) {
        inline = { kind: "edge", from, to, text: editor.edgeText(from, to), error: null };
    }

    function applyInline() {
        if (!inline) {
            return;
        }
        const error = inline.kind === "edge" ? editor.applyEdgeText(inline.from, inline.to, inline.text) : editor.renameState(inline.id, inline.text);
        if (error) {
            inline.error = error;
        } else {
            inline = null;
        }
    }

    function closeInline() {
        applyInline();
        // An invalid value must not trap the focus; discarding it matches the Escape behaviour.
        inline = null;
    }

    function capture(event: PointerEvent, next: Gesture) {
        gesture = next;
        svg!.setPointerCapture(event.pointerId);
    }

    function startPan(event: PointerEvent) {
        capture(event, { kind: "pan", startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y });
    }

    function onPointerDown(event: PointerEvent) {
        menu = null;
        if (inline) {
            closeInline();
        }
        if (event.button === 1) {
            startPan(event);
        }
        if (event.button !== 0) {
            return;
        }
        const point = view.toWorld(toLocal(event));
        const hit = hitAt(event, point);
        const action = pointerAction(editor.tool, hit.kind, event.shiftKey);
        if (hit.kind === "state") {
            const state = byId.get(hit.id)!;
            if (action === "delete") {
                editor.deleteState(hit.id);
                return;
            }
            editor.selection = hit;
            capture(
                event,
                action === "connect"
                    ? { kind: "connect", from: hit.id, pointer: point, target: hit.id }
                    : { kind: "drag", id: hit.id, dx: point.x - state.x, dy: point.y - state.y, before: editor.snapshot(), moved: false },
            );
        } else if (hit.kind === "edge") {
            if (action === "delete") {
                editor.deleteEdge(hit.from, hit.to);
                return;
            }
            editor.selection = hit;
            if (action === "edit-edge") {
                openEdge(hit.from, hit.to);
            }
        } else if (action === "add-state") {
            addStateAt(point);
        } else {
            if (action === "deselect-and-pan") {
                editor.selection = null;
            }
            startPan(event);
        }
    }

    function onPointerMove(event: PointerEvent) {
        if (!gesture) {
            return;
        }
        if (gesture.kind === "pan") {
            view.x = gesture.viewX + event.clientX - gesture.startX;
            view.y = gesture.viewY + event.clientY - gesture.startY;
            return;
        }
        const point = view.toWorld(toLocal(event));
        if (gesture.kind === "drag") {
            gesture.moved = true;
            // Holding Alt disables snapping for fine positioning.
            const position = snapToGrid({ x: point.x - gesture.dx, y: point.y - gesture.dy }, event.altKey ? 1 : SNAP);
            editor.moveState(gesture.id, position.x, position.y);
        } else {
            gesture.pointer = point;
            gesture.target = stateAt(states, point)?.id ?? null;
        }
    }

    function onPointerUp() {
        const finished = gesture;
        gesture = null;
        if (finished?.kind === "drag" && finished.moved) {
            editor.commit(finished.before);
        } else if (finished?.kind === "connect" && finished.target) {
            // Shift-dragging back onto the same state is usually a mis-click; the transition tool creates loops deliberately.
            if (finished.target !== finished.from || editor.tool === "transition") {
                openEdge(finished.from, finished.target);
            }
        }
    }

    function onDoubleClick(event: MouseEvent) {
        const point = view.toWorld(toLocal(event));
        const hit = hitAt(event, point);
        if (hit.kind === "state") {
            openRename(hit.id);
        } else if (hit.kind === "edge") {
            openEdge(hit.from, hit.to);
        } else if (editor.tool === "select") {
            addStateAt(point);
        }
    }

    function onContextMenu(event: MouseEvent) {
        event.preventDefault();
        const local = toLocal(event);
        const hit = hitAt(event, view.toWorld(local));
        if (hit.kind !== "canvas") {
            editor.selection = hit;
        }
        menu = { x: Math.min(local.x, width - MENU_SIZE.width), y: Math.min(local.y, height - MENU_SIZE.height), target: hit };
    }

    function onWheel(event: WheelEvent) {
        event.preventDefault();
        zoom(Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), toLocal(event));
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
    style:background-size="{GRID_SIZE * view.scale}px {GRID_SIZE * view.scale}px"
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
        <ArrowMarkers/>

        <g transform="translate({view.x} {view.y}) scale({view.scale})">
            {#each router.groups as group (group.key)}
                {@const shape = router.shape(group.from, group.to)}
                {#if shape}
                    <GraphEdge
                        from={group.from}
                        to={group.to}
                        {shape}
                        label={editor.edgeLabel(group)}
                        selected={isSelectedEdge(group.from, group.to)}
                        active={activeEdges.has(group.key)}
                        editing={inline?.kind === "edge" && inline.from === group.from && inline.to === group.to}
                    />
                {/if}
            {/each}

            {#if preview}
                <path class="preview" d={preview} marker-end={ARROW_ACCENT}/>
            {/if}

            {#each states as state (state.id)}
                <GraphState
                    {state}
                    selected={editor.selection?.kind === "state" && editor.selection.id === state.id}
                    active={activeStates.has(state.id)}
                    target={gesture?.kind === "connect" && gesture.target === state.id}
                    editing={inline?.kind === "rename" && inline.id === state.id}
                />
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
        {#key inline}
            <InlineEditor
                x={inlinePosition.x}
                y={inlinePosition.y}
                bind:text={inline.text}
                error={inline.error}
                placeholder={inline.kind === "edge" ? editor.edgeHint : "Name"}
                label={inline.kind === "edge" ? "Übergangssymbole" : "Zustandsname"}
                onconfirm={applyInline}
                oncancel={() => (inline = null)}
                onblur={closeInline}
                oninput={() => inline && (inline.error = null)}
            />
        {/key}
    {/if}

    {#if menu}
        <CanvasMenu
            {editor}
            target={menu.target}
            x={menu.x}
            y={menu.y}
            onrename={openRename}
            onedit={openEdge}
            onadd={addStateAt}
            onarrange={arrange}
            onfit={fit}
            onclose={() => (menu = null)}
        />
    {/if}
</div>

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

    .preview {
        fill: none;
        stroke: var(--accent);
        stroke-width: 2;
        stroke-dasharray: 6 5;
        pointer-events: none;
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
</style>
