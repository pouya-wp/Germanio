import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/gm.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  // Workspace packages ship TypeScript source, so they must be bundled in.
  noExternal: [/^@germanio\//],
});
