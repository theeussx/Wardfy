import { REST, Routes } from 'discord.js';

import { commandDefinitions } from '../commands/definitions.js';
import { assertBotCredentials, loadBotConfig } from '../config.js';

const MINIMUM_WARDFY_PERMISSIONS = 68_608; // ViewChannel + SendMessages + ReadMessageHistory

async function main(): Promise<void> {
  const config = loadBotConfig();
  assertBotCredentials(config);

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
  const route = config.DISCORD_DEV_GUILD_ID
    ? Routes.applicationGuildCommands(config.DISCORD_APPLICATION_ID, config.DISCORD_DEV_GUILD_ID)
    : Routes.applicationCommands(config.DISCORD_APPLICATION_ID);

  console.info(
    `Registering ${commandDefinitions.length} Wardfy slash commands ${config.DISCORD_DEV_GUILD_ID ? 'for the development guild' : 'globally'}...`,
  );

  try {
    await rest.put(route, { body: commandDefinitions });
    console.info('Wardfy slash commands registered.');
  } catch (error) {
    if (isDiscordError(error, 50_001) && config.DISCORD_DEV_GUILD_ID) {
      process.exitCode = 1;
      console.error('\nDiscord returned 50001 (Missing Access).');
      console.error(
        'The bot/application does not have access to the guild in DISCORD_DEV_GUILD_ID, or that value is not the server ID.',
      );
      console.error('\nDo this:');
      console.error(
        '  1. Confirm DISCORD_DEV_GUILD_ID is the ID of the Discord server, not a channel, user or application ID.',
      );
      console.error('  2. Invite this same Wardfy application to that server using this link:');
      console.error(
        `     ${createInstallUrl(config.DISCORD_APPLICATION_ID, config.DISCORD_DEV_GUILD_ID)}`,
      );
      console.error(
        '  3. Select the target server, authorize the bot, then run `npm run bot:register` again.\n',
      );
      return;
    }

    throw error;
  }
}

function createInstallUrl(applicationId: string, guildId: string): string {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', applicationId);
  url.searchParams.set('scope', 'bot applications.commands');
  url.searchParams.set('permissions', String(MINIMUM_WARDFY_PERMISSIONS));
  url.searchParams.set('guild_id', guildId);
  return url.toString();
}

function isDiscordError(error: unknown, code: number): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

await main();
