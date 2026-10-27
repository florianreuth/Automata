// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** Escapes characters that are significant in XML, HTML and SVG text and attribute values. */
export function escapeMarkup(text: string): string {
    return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
