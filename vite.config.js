import { defineConfig } from "vite";

export default defineConfig({
    base: "/repo/",
    build: {
        minify: "terser",
    },
})