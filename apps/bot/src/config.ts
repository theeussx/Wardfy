import { z } from 'zod';

const schema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(20).optional(),
  DISCORD_APPLICATION_ID: z.string().min(1).optional(),
  DISCORD_DEV_GUILD_ID: z.string().min(1).optional(),
  API_ORIGIN: z.string().url().default('http://localhost:3001'),
  BOT_API_TOKEN: z.string().min(16).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type BotConfig = z.infer<typeof schema>;

export function loadBotConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Invalid bot configuration: ${parsed.error.message}`);
  return parsed.data;
}

export function assertBotCredentials(config: BotConfig): asserts config is BotConfig & {
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
} {
  if (!config.DISCORD_BOT_TOKEN || !config.DISCORD_APPLICATION_ID) {
    throw new Error('DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required to run the bot.');
  }
}
