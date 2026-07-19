import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'docs', // Build directly to './docs' for Github Pages
    emptyOutDir: true,
  },
  base: './', // Use relative path for Github Pages static serving
});
