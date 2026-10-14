import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { popup: resolve(import.meta.dirname, 'popup.html'), card: resolve(import.meta.dirname, 'card.html') },
    },
  },
});
