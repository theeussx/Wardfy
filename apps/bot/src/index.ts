import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';

import { assertBotCredentials, loadBotConfig } from './config.js';
import {
  handleButton,
  handleCommand,
  handleRecommendationModal,
  respondWithError,
} from './interactions.js';
import { ActivityChannelPublisher } from './services/activity-channel-publisher.js';
import { WardfyApi } from './services/wardfy-api.js';
import { noticeCard } from './ui/components-v2.js';

const config = loadBotConfig();
assertBotCredentials(config);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const api = new WardfyApi(config);
const publisher = new ActivityChannelPublisher();

client.once(Events.ClientReady, (readyClient) => {
  console.info(`Wardfy bot is online as ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, api, publisher);
      return;
    }
    if (interaction.isButton()) {
      await handleButton(interaction, api);
      return;
    }
    if (interaction.isModalSubmit()) {
      await handleRecommendationModal(interaction);
    }
  } catch (error) {
    console.error('Discord interaction failed', error);
    if (interaction.isChatInputCommand() || interaction.isButton()) {
      await respondWithError(interaction, error).catch(() => undefined);
    } else if (interaction.isModalSubmit()) {
      await interaction
        .reply({
          ...noticeCard(
            'Algo saiu do ritmo',
            'Não foi possível registrar sua indicação. Tente novamente.',
            0xe05d5d,
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        })
        .catch(() => undefined);
    }
  }
});

process.once('SIGINT', () => client.destroy());
process.once('SIGTERM', () => client.destroy());

await client.login(config.DISCORD_BOT_TOKEN);
