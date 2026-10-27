// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/**
 * Prefixes an app-internal path with the configured base, so the site works when hosted in a subfolder.
 * @param path absolute path inside the app, e.g. "/endlicher-automat"
 * @return the path including the base, e.g. "/automata/endlicher-automat"
 */
export function withBase(path: string): string {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}/${path.replace(/^\//, "")}`;
}
