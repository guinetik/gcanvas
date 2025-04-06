import { defineConfig } from 'vite';
import path from 'path';

const libEntry = path.resolve(__dirname, 'src/index.js');

export default defineConfig(({ mode }) => {
  const isDebug = mode === 'debug';

  return {
    build: {
      lib: {
        entry: libEntry,
        name: 'GCanvas',
        formats: isDebug ? ['umd'] : ['umd', 'es'],
        fileName: (format) => {
          if (isDebug) return 'gcanvas.debug.js';
          return `gcanvas.${format}.js`;
        },
      },
      minify: isDebug ? false : true,
      emptyOutDir: true,
      outDir: 'dist',
      rollupOptions: {
        output: {
          globals: {}
        }
      }
    }
  };
});
