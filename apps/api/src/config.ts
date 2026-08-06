import { z } from 'zod';

const booleanFromEnv = z
  .enum(['true', 'false'])
  .default('true')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_ORIGIN: z.string().url().default('http://localhost:3001'),
  DEMO_MODE: booleanFromEnv,
  DATABASE_URL: z
    .string()
    .default('postgresql://wardfy:wardfy@localhost:5432/wardfy?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  OAUTH_STATE_SECRET: z.string().min(32).default('development-only-state-secret-change-me'),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().url().default('http://localhost:3001/v1/auth/spotify/callback'),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().url().default('http://localhost:3001/v1/auth/discord/callback'),
  BOT_API_TOKEN: z.string().min(16).optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  const config = parsed.data;
  if (config.NODE_ENV === 'production') {
    if (!config.TOKEN_ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY is required in production.');
    }
    if (config.OAUTH_STATE_SECRET.includes('development-only')) {
      throw new Error('OAUTH_STATE_SECRET must be replaced in production.');
    }
  }

  return config;
}
