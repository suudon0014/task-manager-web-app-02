import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src', // Compilation root
  build: {
    outDir: '../dist', // Build destination relative to src root
    emptyOutDir: true,
  },
  base: './', // Relative asset paths
});
