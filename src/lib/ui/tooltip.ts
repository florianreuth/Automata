// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Attachment } from "svelte/attachments";

export type Placement = "top" | "bottom" | "left" | "right";

const GAP = 8;
const VIEWPORT_MARGIN = 4;
const OPPOSITE: Record<Placement, Placement> = { top: "bottom", bottom: "top", left: "right", right: "left" };

/** One shared tooltip element in the top layer, so neither scroll containers nor modal dialogs can hide it. */
class Tooltip {
    readonly #element: HTMLDivElement;
    #owner: Element | null = null;

    constructor() {
        this.#element = document.createElement("div");
        this.#element.className = "tooltip";
        this.#element.popover = "manual";
        // Purely visual: the owning controls carry their own accessible name.
        this.#element.setAttribute("aria-hidden", "true");
        document.body.append(this.#element);
    }

    show(owner: Element, text: string, placement: Placement): void {
        this.#owner = owner;
        this.#element.textContent = text;
        if (!this.#element.matches(":popover-open")) {
            this.#element.showPopover();
        }
        this.#place(owner.getBoundingClientRect(), placement);
    }

    hide(owner: Element): void {
        if (this.#owner === owner) {
            this.#owner = null;
            this.#element.hidePopover();
        }
    }

    #place(anchor: DOMRect, placement: Placement): void {
        const size = this.#element.getBoundingClientRect();
        let position = positionFor(anchor, size, placement);
        if (!fitsViewport(position, size)) {
            position = positionFor(anchor, size, OPPOSITE[placement]);
        }
        const x = Math.min(Math.max(position.x, VIEWPORT_MARGIN), window.innerWidth - size.width - VIEWPORT_MARGIN);
        const y = Math.min(Math.max(position.y, VIEWPORT_MARGIN), window.innerHeight - size.height - VIEWPORT_MARGIN);
        this.#element.style.left = `${x}px`;
        this.#element.style.top = `${y}px`;
    }
}

let shared: Tooltip | undefined;

/** Shows a styled tooltip immediately on hover and keyboard focus, flipping to the opposite side if there is no room. */
export function tooltip(text: string, placement: Placement = "bottom"): Attachment<HTMLElement> {
    return (element) => {
        const instance = (shared ??= new Tooltip());
        const show = () => instance.show(element, text, placement);
        const hide = () => instance.hide(element);
        const listeners = new AbortController();
        const options = { signal: listeners.signal };
        element.addEventListener("pointerenter", show, options);
        element.addEventListener("focusin", show, options);
        element.addEventListener("pointerleave", hide, options);
        element.addEventListener("focusout", hide, options);
        element.addEventListener("pointerdown", hide, options);
        element.addEventListener("keydown", (event) => event.key === "Escape" && hide(), options);
        return () => {
            hide();
            listeners.abort();
        };
    };
}

function positionFor(anchor: DOMRect, size: DOMRect, placement: Placement): { x: number; y: number } {
    const centerX = anchor.left + anchor.width / 2 - size.width / 2;
    const centerY = anchor.top + anchor.height / 2 - size.height / 2;
    switch (placement) {
        case "top":
            return { x: centerX, y: anchor.top - size.height - GAP };
        case "bottom":
            return { x: centerX, y: anchor.bottom + GAP };
        case "left":
            return { x: anchor.left - size.width - GAP, y: centerY };
        case "right":
            return { x: anchor.right + GAP, y: centerY };
    }
}

function fitsViewport(position: { x: number; y: number }, size: DOMRect): boolean {
    return position.x >= 0 && position.y >= 0 && position.x + size.width <= window.innerWidth && position.y + size.height <= window.innerHeight;
}
