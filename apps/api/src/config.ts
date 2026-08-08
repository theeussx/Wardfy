import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Workspace scripts run from apps/api; load the repository root .env as well.
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(moduleDirectory, '../../../.env') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

/**
 * GitHub Codespaces exposes every forwarded port as
 * `https://<codespace>-<port>.app.github.dev`. Detecting this lets a fresh
 * remote workspace get correct public URLs (and therefore working OAuth
 * redirects) without manually wiring `APP_ORIGIN`/`API_ORIGIN`.
 */
function detectCodespaceOrigin(port: number): string | null {
  const name = process.env.CODESPACE_NAME;
  if (name) return `https://${name}-${port}.app.github.dev`;
  return null;
}

function defaultAppOrigin(): string {
  return detectCodespaceOrigin(5173) ?? 'http://127.0.0.1:5173';
}

function defaultApiOrigin(): string {
  return detectCodespaceOrigin(3001) ?? 'http://127.0.0.1:3001';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  APP_ORIGIN: z.string().url().default(defaultAppOrigin),
  API_ORIGIN: z.string().url().default(defaultApiOrigin),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  TOKEN_ENCRYPTION_KEY: z.string().min(40),
  OAUTH_STATE_SECRET: z.string().min(32),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  // 16 characters is the minimum accepted for backwards compatibility; use a 32-byte random value in production.
  BOT_API_TOKEN: z.string().min(16),
  PLAYBACK_POLL_INTERVAL_SECONDS: z.coerce.number().int().min(15).max(300).default(30),
  SPOTIFY_SYNC_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(4),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid production environment configuration: ${details}`);
  }
  return parsed.data;
}