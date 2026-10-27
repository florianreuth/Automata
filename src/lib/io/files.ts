// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** Offers a file for download in the browser. */
export function downloadFile(name: string, content: BlobPart, type: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

/** Turns a document title into a safe lowercase file name, "automat" if nothing remains. */
export function fileBaseName(title: string): string {
    const base = title
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return base.slice(0, 60) || "automat";
}
