import { Client, Events, GatewayIntentBits, MessageFlags, PermissionFlagsBits } from 'discord.js';

import { assertBotCredentials, loadBotConfig } from './config.js';
import {
  handleButton,
  handleCommand,
  handleRecommendationModal,
  respondWithError,
} from './interactions.js';
import { ActivityChannelPublisher } from './services/activity-channel-publisher.js';
import { GuildActivitySync } from './services/guild-activity-sync.js';
import { WardfyApi } from './services/wardfy-api.js';
import { noticeCard } from './ui/components-v2.js';

const config = loadBotConfig();
assertBotCredentials(config);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const api = new WardfyApi(config);
const publisher = new ActivityChannelPublisher(api);
const activitySync = new GuildActivitySync(
  client,
  api,
  publisher,
  config.ACTIVITY_SYNC_INTERVAL_SECONDS * 1_000,
);
let guildMetadataTimer: NodeJS.Timeout | undefined;

client.once(Events.ClientReady, async (readyClient) => {
  console.info(`Wardfy bot is online as ${readyClient.user.tag}.`);
  await syncAllGuildMetadata().catch((error) => console.error('Initial guild sync failed', error));
  activitySync.start();
  // Handles API restarts or a bot that came online before the API process.
  guildMetadataTimer = setInterval(() => void syncAllGuildMetadata(), 5 * 60_000);
});

client.on(Events.GuildCreate, async (guild) => {
  await syncGuild(guild.id).catch((error) =>
    console.error(`Could not sync guild ${guild.id}`, error),
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await syncInteractionContext(interaction);
      await handleCommand(interaction, api, publisher);
      return;
    }
    if (interaction.isButton()) {
      await handleButton(interaction, api);
      return;
    }
    if (interaction.isModalSubmit()) {
      await handleRecommendationModal(interaction, api);
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
            0x1d4ed8,
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        })
        .catch(() => undefined);
    }
  }
});

async function syncAllGuildMetadata(): Promise<void> {
  await Promise.all(
    [...client.guilds.cache.values()].map((guild) =>
      syncGuild(guild.id).catch((error) =>
        console.error(`Could not sync guild ${guild.id}`, error),
      ),
    ),
  );
}

async function syncGuild(guildId: string): Promise<void> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  await api.registerGuild({
    id: guild.id,
    name: guild.name,
    iconUrl: guild.iconURL({ size: 128 }) ?? undefined,
    ownerDiscordId: guild.ownerId,
  });
}

async function syncInteractionContext(
  interaction: import('discord.js').ChatInputCommandInteraction,
) {
  if (!interaction.guild) return;
  await syncGuild(interaction.guild.id);
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
  await api.registerMember(interaction.guild.id, {
    discordId: interaction.user.id,
    displayName: interaction.user.globalName ?? interaction.user.username,
    avatarUrl: interaction.user.displayAvatarURL({ size: 128 }),
    role: isOwner ? 'OWNER' : canManage ? 'ADMIN' : 'MEMBER',
  });
}

function shutdown() {
  activitySync.stop();
  if (guildMetadataTimer) clearInterval(guildMetadataTimer);
  client.destroy();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await client.login(config.DISCORD_BOT_TOKEN);
