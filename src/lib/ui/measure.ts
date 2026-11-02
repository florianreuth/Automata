// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

let context: CanvasRenderingContext2D | null = null;

export function measureText(text: string, font: string): number {
    context ??= document.createElement("canvas").getContext("2d");
    if (!context) {
        return 0;
    }
    context.font = font;
    return context.measureText(text).width;
}
