import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";

export default defineConfig({
    site: "https://florianreuth.de",
    // Production is served from florianreuth.de/automata/, the dev server stays at the root.
    base: process.env.NODE_ENV === "production" ? "/automata" : "/",
    integrations: [svelte()],
});
