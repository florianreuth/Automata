// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import type { Box, Point } from "../graph/geometry.ts";

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
// Fitting stays within a narrower range so tiny graphs are not blown up and huge ones stay readable.
const FIT_MIN_SCALE = 0.3;
const FIT_MAX_SCALE = 1.25;

/** Reactive pan and zoom of the canvas, mapping between screen (canvas-relative pixels) and world coordinates. */
export class Viewport {
    x = $state(0);
    y = $state(0);
    scale = $state(1);

    toWorld(screen: Point): Point {
        return { x: (screen.x - this.x) / this.scale, y: (screen.y - this.y) / this.scale };
    }

    toScreen(world: Point): Point {
        return { x: world.x * this.scale + this.x, y: world.y * this.scale + this.y };
    }

    /** Centers and scales the view so that the box is fully visible in a canvas of the given size. */
    fit(box: Box, width: number, height: number): void {
        const scale = clamp(Math.min(width / box.width, height / box.height), FIT_MIN_SCALE, FIT_MAX_SCALE);
        this.scale = scale;
        this.x = width / 2 - (box.x + box.width / 2) * scale;
        this.y = height / 2 - (box.y + box.height / 2) * scale;
    }

    /** Zooms by a factor (> 1 zooms in) while the screen point anchor stays fixed. */
    zoom(factor: number, anchor: Point): void {
        const scale = clamp(this.scale * factor, MIN_SCALE, MAX_SCALE);
        const applied = scale / this.scale;
        this.scale = scale;
        this.x = anchor.x - (anchor.x - this.x) * applied;
        this.y = anchor.y - (anchor.y - this.y) * applied;
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
