/**
 * Build script for MockSmith Chrome Extension.
 *
 * 1. Vite builds the React UI pages (popup + dashboard)
 * 2. esbuild bundles standalone scripts (service-worker, bridge, interceptor)
 * 3. manifest.json is copied by Vite from public/
 */

import { build } from 'esbuild';
import { execSync } from 'child_process';

console.log('[MockSmith] Building UI pages with Vite...');
execSync('npx vite build', { stdio: 'inherit', cwd: import.meta.dirname });

console.log('[MockSmith] Bundling extension scripts with esbuild...');
await build({
  entryPoints: [
    'src/background/service-worker.ts',
    'src/content/bridge.ts',
    'src/content/interceptor.ts',
  ],
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'chrome120',
  minify: false,
  sourcemap: false,
  // Flatten output names (no src/ prefix)
  outbase: 'src',
  entryNames: '[name]',
});

console.log('[MockSmith] Build complete. Load dist/ as unpacked extension in Chrome.');
