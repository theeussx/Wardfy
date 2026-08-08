import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

/**
 * npm workspace scripts run with apps/bot as the current directory, while the
 * project keeps its .env at the repository root. Resolve relative to this
 * module so `npm run dev:bot`, `npm run bot:register`, Docker and compiled
 * production code all find the same file reliably.
 *
 * Values explicitly supplied by the runtime always win over .env values.
 */
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(moduleDirectory, '../../../.env') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

const schema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(20).optional(),
  DISCORD_APPLICATION_ID: z.string().min(1).optional(),
  DISCORD_DEV_GUILD_ID: z.string().min(1).optional(),
  API_ORIGIN: z.string().url(),
  // Must match the API token. Existing 16+ character tokens remain supported.
  BOT_API_TOKEN: z.string().min(16).optional(),
  ACTIVITY_SYNC_INTERVAL_SECONDS: z.coerce.number().int().min(1).max(300).default(30),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type BotConfig = z.infer<typeof schema>;

export function loadBotConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  // Discord calls this value both “Application ID” and “Client ID” in different
  // surfaces. They are the same identifier, so accepting either avoids a
  // surprising startup failure when OAuth was configured with CLIENT_ID only.
  const parsed = schema.safeParse({
    ...env,
    DISCORD_APPLICATION_ID: env.DISCORD_APPLICATION_ID ?? env.DISCORD_CLIENT_ID,
  });
  if (!parsed.success) throw new Error(`Invalid bot configuration: ${parsed.error.message}`);
  return parsed.data;
}

export function assertBotCredentials(config: BotConfig): asserts config is BotConfig & {
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
  BOT_API_TOKEN: string;
} {
  const missing = [
    !config.DISCORD_BOT_TOKEN && 'DISCORD_BOT_TOKEN',
    !config.DISCORD_APPLICATION_ID && 'DISCORD_APPLICATION_ID',
    !config.BOT_API_TOKEN && 'BOT_API_TOKEN',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(' and ')}. Add it to the repository-root .env file or export it before running the bot.`,
    );
  }
}
