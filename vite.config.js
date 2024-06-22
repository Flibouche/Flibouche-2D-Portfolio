import { defineConfig } from "vite";

export default defineConfig({
    base: "<REPO>",
    build: {
        minify: "terser",
    },
})