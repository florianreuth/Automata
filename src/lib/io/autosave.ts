// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

/** Restores an autosaved value; null if there is none, parse throws or storage is unavailable. */
export function loadAutosave<T>(key: string, parse: (json: string) => T): T | null {
    try {
        const json = localStorage.getItem(key);
        return json === null ? null : parse(json);
    } catch {
        return null;
    }
}

export function storeAutosave(key: string, json: string): void {
    try {
        localStorage.setItem(key, json);
    } catch {
        // Storage can be unavailable (private mode, quota); the editor keeps working without autosave.
    }
}
