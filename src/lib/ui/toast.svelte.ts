// This project is licensed under the MIT License.
// See the LICENSE file in the project root for details.
//
// Copyright (c) 2026 Florian Reuth <git@florianreuth.de>

const DURATION_MS = 3200;

/** A short status message that hides itself; a newer message replaces the current one. */
export class Toast {
    message = $state<string | null>(null);
    #timer: ReturnType<typeof setTimeout> | undefined;

    show(message: string): void {
        this.message = message;
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => (this.message = null), DURATION_MS);
    }
}
