import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const workspaceDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(workspaceDirectory, '../..');

/**
 * Vite only exposes VITE_* values to browser code and evaluates its config
 * before normal app modules. Load the repository-root env explicitly so this
 * works exactly like the API and the bot when started through npm workspaces.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, '');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          // Codespaces forwards the browser's public Origin. Forward the
          // configured APP_ORIGIN explicitly so API CORS and OAuth cookies see
          // the same canonical dashboard origin.
          headers: { origin: env.APP_ORIGIN || 'http://localhost:5173' },
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'framer-motion'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});