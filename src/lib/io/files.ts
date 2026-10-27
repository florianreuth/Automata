// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

import { escapeMarkup } from "../markup.ts";

const MIME_TYPES = {
    json: "application/json",
    jff: "application/xml",
    svg: "image/svg+xml",
    png: "image/png",
} as const;
const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
const MAX_NAME_LENGTH = 60;
// Removing an object URL or frame right away would cancel the download or print the browser just started.
const CLEANUP_DELAY_MS = 1000;

/** Offers content for download, named after the document title with the given extension. */
export function downloadDocument(title: string, extension: keyof typeof MIME_TYPES, content: BlobPart): void {
    downloadFile(`${fileBaseName(title)}.${extension}`, content, MIME_TYPES[extension]);
}

function downloadFile(name: string, content: BlobPart, type: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), CLEANUP_DELAY_MS);
}

/** Prints a standalone HTML document from a hidden frame, so the styles of the app do not interfere. */
export function printHtml(title: string, body: string, css: string): void {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position: fixed; width: 0; height: 0; border: 0";
    frame.srcdoc = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeMarkup(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
    frame.addEventListener("load", () => {
        frame.contentWindow?.print();
        setTimeout(() => frame.remove(), CLEANUP_DELAY_MS);
    });
    document.body.append(frame);
}

/** Lets the user pick a local file and reads it as text; resolves to null if the dialog was cancelled. */
export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            resolve(file ? { name: file.name, text: await file.text() } : null);
        });
        input.addEventListener("cancel", () => resolve(null));
        input.click();
    });
}

/** Rasterizes standalone SVG markup with width and height attributes into a PNG; scale is the pixel density. */
export async function svgToPng(svg: string, scale = 2): Promise<Blob> {
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(image.width * scale);
    canvas.height = Math.ceil(image.height * scale);
    const context = canvas.getContext("2d")!;
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG-Export fehlgeschlagen."))), "image/png"));
}

// Lowercase ASCII only, so the name is safe on every file system; "automat" if nothing remains.
function fileBaseName(title: string): string {
    const base = title
        .toLowerCase()
        .replace(/[äöüß]/g, (char) => UMLAUTS[char])
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return base.slice(0, MAX_NAME_LENGTH) || "automat";
}
