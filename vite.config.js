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
        fileName: () => isDebug ? 'gcanvas.debug.js' : 'gcanvas.umd.js',
        formats: ['umd']
      },
      minify: isDebug ? false : true,
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        output: {
          globals: {}
        }
      }
    }
  };
});
