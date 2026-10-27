// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** Prefixes an app-internal path such as "/endlicher-automat" with the configured base, so subfolder hosting works. */
export function withBase(path: string): string {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}/${path.replace(/^\//, "")}`;
}
