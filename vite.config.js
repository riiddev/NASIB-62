import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { applyPatch } from 'diff';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const enginePatch = readFileSync(resolve(process.cwd(), 'src/online/engine.patch'), 'utf8');

function nasibEnginePatch() {
  return {
    name: 'nasib-legacy-engine-patch',
    enforce: 'pre',
    transform(source, id) {
      const normalizedId = id.split(String.fromCharCode(92)).join('/');
      if (!normalizedId.endsWith('/src/legacy/engine.js')) return null;
      const transformed = applyPatch(source, enginePatch);
      if (typeof transformed !== 'string') {
        throw new Error('NASIB +62 engine patch failed to apply. Check src/online/engine.patch against src/legacy/engine.js.');
      }
      return { code: transformed, map: null };
    },
  };
}

function nasibDevEntry() {
  return {
    name: 'nasib-source-entry',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') req.url = '/app.html';
        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), nasibEnginePatch(), nasibDevEntry()],
  server: { host: '0.0.0.0' },
  build: { target: 'es2022', sourcemap: false, rollupOptions: { input: resolve(process.cwd(), 'app.html') } },
});
