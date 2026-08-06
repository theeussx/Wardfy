import { REST, Routes } from 'discord.js';

import { commandDefinitions } from '../commands/definitions.js';
import { assertBotCredentials, loadBotConfig } from '../config.js';

const config = loadBotConfig();
assertBotCredentials(config);

const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
const route = config.DISCORD_DEV_GUILD_ID
  ? Routes.applicationGuildCommands(config.DISCORD_APPLICATION_ID, config.DISCORD_DEV_GUILD_ID)
  : Routes.applicationCommands(config.DISCORD_APPLICATION_ID);

console.info(
  `Registering ${commandDefinitions.length} Wardfy slash commands ${config.DISCORD_DEV_GUILD_ID ? 'for the development guild' : 'globally'}...`,
);
await rest.put(route, { body: commandDefinitions });
console.info('Wardfy slash commands registered.');
