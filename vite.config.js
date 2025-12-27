import { defineConfig } from "vite";
import path from "path";

const libEntry = path.resolve(__dirname, "src/index.js");

export default defineConfig(({ mode }) => {
  const isDebug = mode === "debug";

  return {
    server: {
      port: 9195,
      strictPort: true, // Don't try other ports if 9195 is in use
    },
    build: {
      lib: {
        entry: libEntry,
        name: "GCanvas",
        formats: isDebug ? ["umd"] : ["umd", "es"],
        fileName: (format) => {
          if (isDebug) return "gcanvas.debug.js";
          return `gcanvas.${format}.js`;
        },
      },
      minify: isDebug ? false : "terser",
      terserOptions: {
        compress: true,
        mangle: true,
        format: {
          comments: false,
        },
      },
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: [
          {
            format: "umd",
            entryFileNames: "gcanvas.umd.js",
            name: "GCanvas",
            globals: {},
          },
          {
            format: "es",
            entryFileNames: "gcanvas.es.js",
          },
        ],
      },
    },
  };
});
