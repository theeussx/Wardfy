import type { FastifyRequest } from 'fastify';

import type { AppConfig } from '../config.js';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value.at(0) : value;
}

/**
 * Reconstructs the origin the browser actually used for a request that was
 * proxied to this API (Vite dev server or the production nginx/Cloudflare
 * edge). Returns `null` when no trusted forwarding headers are present.
 *
 * Both proxies in this repo are configured to forward `X-Forwarded-Host` and
 * `X-Forwarded-Proto`, so in GitHub Codespaces / a VPS behind a reverse proxy
 * this yields the public URL (e.g. `https://<codespace>-5173.app.github.dev`)
 * instead of the container-internal `http://localhost:3001`.
 */
export function forwardedOrigin(request: FastifyRequest): string | null {
  const proto = firstHeader(request.headers['x-forwarded-proto']);
  const host = firstHeader(request.headers['x-forwarded-host']);
  if (!proto || !host) return null;

  const scheme = proto.split(',')[0]?.trim() ?? '';
  const authority = host.split(',')[0]?.trim() ?? '';
  if (!scheme || !authority) return null;

  try {
    return new URL(`${scheme}://${authority}`).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function isLoopback(origin: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Single source of truth for "which public origin should the browser end up on
 * after an OAuth round trip".
 *
 * The configured `APP_ORIGIN` is authoritative whenever it already points at a
 * public (non-loopback) URL.
 *
 * When the deployment is misconfigured and still points `APP_ORIGIN` at a
 * loopback host (the classic "auth works but the browser is redirected to
 * `localhost` in Codespaces/Docker" bug), we fall back to the public origin the
 * request actually came from via the proxy, so the browser is never sent to an
 * unreachable internal hostname. Loopback forwarded origins are never trusted,
 * which keeps local development and spoofing-safe.
 */
export function resolveAppOrigin(config: AppConfig, request: FastifyRequest): string {
  const configured = config.APP_ORIGIN;
  if (!isLoopback(configured)) return configured;

  const forwarded = forwardedOrigin(request);
  if (forwarded && !isLoopback(forwarded)) return forwarded;

  return configured;
}