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
// Mirrors the API's Codespaces detection so the public dashboard origin is the
// same no matter which side resolves it (CORS allowlist and OAuth cookies must
// agree on the canonical origin).
function detectAppOrigin(): string {
  const codespaceName = process.env.CODESPACE_NAME;
  if (codespaceName) return `https://${codespaceName}-5173.app.github.dev`;
  return 'http://127.0.0.1:5173';
}

const REMOTE_WORKSPACE = Boolean(
  process.env.CODESPACES || process.env.CODESPACE_NAME || process.env.GITPOD_WORKSPACE_URL,
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, '');
  const appOrigin = env.APP_ORIGIN || detectAppOrigin();

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          // Forward the browser's real Host (public URL) and scheme so the API
          // can reconstruct the public origin for the post-login redirect even
          // when APP_ORIGIN is misconfigured. We also pass the canonical origin
          // explicitly so API CORS sees the same dashboard origin it allows.
          headers: { origin: appOrigin },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const host = req.headers.host;
              if (host) proxyReq.setHeader('X-Forwarded-Host', host);
              const incomingProto = req.headers['x-forwarded-proto'];
              const proto = (Array.isArray(incomingProto) ? incomingProto[0] : incomingProto)
                ?.split(',')[0]
                ?.trim();
              proxyReq.setHeader(
                'X-Forwarded-Proto',
                proto || (REMOTE_WORKSPACE ? 'https' : 'http'),
              );
            });
          },
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