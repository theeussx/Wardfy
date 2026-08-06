import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import type { RankingMetric } from '@wardfy/shared';

import { ActivityChannelPublisher } from './services/activity-channel-publisher.js';
import { WardfyApi } from './services/wardfy-api.js';
import {
  challengeCard,
  compatibilityCard,
  noticeCard,
  nowPlayingCard,
  profileCard,
  rankingCard,
  type ComponentsV2Reply,
} from './ui/components-v2.js';

const metricLabels: Record<RankingMetric, string> = {
  listeningMinutes: 'Minutos ouvidos',
  artists: 'Artistas diferentes',
  tracks: 'Músicas diferentes',
  discoveries: 'Descobertas',
  genres: 'Gêneros explorados',
  sessions: 'Sessões',
};

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
  api: WardfyApi,
  publisher: ActivityChannelPublisher,
): Promise<void> {
  switch (interaction.commandName) {
    case 'perfil': {
      const target = interaction.options.getUser('usuario') ?? interaction.user;
      await interaction.reply(
        profileCard({
          name: target.globalName ?? target.username,
          title:
            target.id === interaction.user.id ? 'Explorador Musical' : 'Curador de Frequências',
          level: target.id === interaction.user.id ? 18 : 13,
          xp: target.id === interaction.user.id ? 3240 : 1960,
          nextLevelXp: target.id === interaction.user.id ? 4000 : 2800,
          minutes: target.id === interaction.user.id ? 1284 : 972,
          artists: target.id === interaction.user.id ? 102 : 76,
          streak: target.id === interaction.user.id ? 12 : 7,
          avatarUrl: target.displayAvatarURL({ size: 256 }),
        }),
      );
      return;
    }
    case 'ranking': {
      const metric = (interaction.options.getString('metrica') ??
        'listeningMinutes') as RankingMetric;
      await interaction.deferReply();
      const entries = await api.leaderboard(metric);
      await interaction.editReply(rankingCard(metricLabels[metric] ?? 'Minutos ouvidos', entries));
      return;
    }
    case 'compatibilidade': {
      const target = interaction.options.getUser('usuario', true);
      await interaction.deferReply();
      const report = await api.compatibility(interaction.user.id, target.id);
      await interaction.editReply(
        compatibilityCard(
          interaction.user.globalName ?? interaction.user.username,
          target.globalName ?? target.username,
          report,
        ),
      );
      return;
    }
    case 'desafio': {
      await interaction.deferReply();
      const [challenge] = await api.challenges();
      if (!challenge) {
        await interaction.editReply(
          noticeCard('Sem desafios por aqui', 'Volte em breve para uma nova missão.'),
        );
        return;
      }
      await interaction.editReply(challengeCard(challenge));
      return;
    }
    case 'agora': {
      const name = interaction.user.globalName ?? interaction.user.username;
      const snapshot = {
        guildId: interaction.guildId ?? 'direct-message',
        displayName: name,
        userId: interaction.user.id,
        isPlaying: true,
        progressMs: 109_000,
        deviceName: 'Spotify · dispositivo conectado',
        deviceType: 'Computer',
        updatedAt: new Date().toISOString(),
        track: {
          id: 'spotify:track:demo-deftones',
          title: 'Be Quiet and Drive (Far Away)',
          artists: ['Deftones'],
          album: 'Around the Fur',
          durationMs: 301_000,
          spotifyUrl: 'https://open.spotify.com/',
        },
      };
      await api.publishPlayback(snapshot);
      if (interaction.guild) {
        const settings = await api.guildSettings(interaction.guild.id);
        if (settings.activityChannelId) {
          await publisher.renderPlaying({
            guild: interaction.guild,
            channelId: settings.activityChannelId,
            userId: interaction.user.id,
            name,
            track: snapshot.track.title,
            artist: snapshot.track.artists.join(', '),
            album: snapshot.track.album,
            progressMs: snapshot.progressMs,
            durationMs: snapshot.track.durationMs,
            device: snapshot.deviceName,
            spotifyUrl: snapshot.track.spotifyUrl,
          });
        }
      }
      await interaction.reply(
        nowPlayingCard({
          name,
          track: snapshot.track.title,
          artist: snapshot.track.artists.join(', '),
          album: snapshot.track.album,
          progressMs: snapshot.progressMs,
          durationMs: snapshot.track.durationMs,
          device: snapshot.deviceName,
          spotifyUrl: snapshot.track.spotifyUrl,
        }),
      );
      return;
    }
    case 'configurar': {
      if (!interaction.guildId) {
        await interaction.reply(
          asEphemeral(
            noticeCard(
              'Ação disponível em servidores',
              'Abra este comando em um servidor do Discord.',
            ),
          ),
        );
        return;
      }
      const channel = interaction.options.getChannel('canal_atividade');
      const interval = interaction.options.getInteger('intervalo');
      await api.updateGuildSettings(interaction.guildId, {
        ...(channel ? { activityChannelId: channel.id } : {}),
        ...(interval ? { activityUpdateSeconds: interval } : {}),
      });
      const channelText = channel ? `<#${channel.id}>` : 'canal atual';
      await interaction.reply(
        asEphemeral(
          noticeCard(
            'Configuração atualizada',
            `As atividades serão publicadas em ${channelText}${interval ? ` a cada ${interval}s` : ''}.`,
            0x5865f2,
          ),
        ),
      );
      return;
    }
    default:
      await interaction.reply(
        asEphemeral(noticeCard('Comando desconhecido', 'Tente novamente usando /perfil.')),
      );
  }
}

export async function handleButton(interaction: ButtonInteraction, api: WardfyApi): Promise<void> {
  const [namespace, feature, action, id] = interaction.customId.split(':');
  if (namespace !== 'wardfy') return;

  if (feature === 'ranking') {
    const metric = (action === 'minutes' ? 'listeningMinutes' : action) as RankingMetric;
    if (!metricLabels[metric]) return;
    await interaction.deferUpdate();
    const entries = await api.leaderboard(metric);
    await interaction.editReply(rankingCard(metricLabels[metric], entries));
    return;
  }

  if (feature === 'recommend' && action === 'open') {
    const modal = new ModalBuilder()
      .setCustomId('wardfy:recommend:submit')
      .setTitle('Indicar uma música');
    const trackInput = new TextInputBuilder()
      .setCustomId('track')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Link do Spotify ou nome da faixa')
      .setRequired(true)
      .setMaxLength(240);
    const noteInput = new TextInputBuilder()
      .setCustomId('note')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Por que esta faixa combina com essa pessoa?')
      .setRequired(false)
      .setMaxLength(600);

    // LabelBuilder and TextDisplayBuilder are Components V2 modal primitives.
    modal
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '### Uma indicação pessoal\nCompartilhe uma música para continuar a conversa.',
        ),
      )
      .addLabelComponents(
        new LabelBuilder()
          .setLabel('Música ou link Spotify')
          .setDescription('Cole um link ou escreva o nome da faixa.')
          .setTextInputComponent(trackInput),
        new LabelBuilder()
          .setLabel('Uma mensagem (opcional)')
          .setDescription('Ela acompanha a indicação no Discord.')
          .setTextInputComponent(noteInput),
      );
    await interaction.showModal(modal);
    return;
  }

  if (feature === 'challenge' && action === 'join') {
    await interaction.reply(
      asEphemeral(
        noticeCard(
          'Você entrou no desafio!',
          `Seu progresso será contado automaticamente. Boa sorte! ${id ? '✦' : ''}`,
          0xf4b942,
        ),
      ),
    );
    return;
  }

  if (feature === 'challenge' && action === 'share') {
    await interaction.reply(
      asEphemeral(
        noticeCard(
          'Desafio pronto para compartilhar',
          'Convide os amigos e disputem o topo juntos.',
        ),
      ),
    );
    return;
  }

  if (feature === 'profile' && action === 'dna') {
    await interaction.reply(
      asEphemeral(
        noticeCard(
          'Seu DNA musical',
          'Alternative 96% · Rock 82% · Shoegaze 78% · Indie 65%\nSeu som tende ao intenso, atmosférico e explorador.',
        ),
      ),
    );
    return;
  }

  await interaction.reply(
    asEphemeral(noticeCard('Em breve', 'Essa área está sendo preparada para o seu servidor.')),
  );
}

export async function handleRecommendationModal(
  interaction: import('discord.js').ModalSubmitInteraction,
): Promise<void> {
  if (interaction.customId !== 'wardfy:recommend:submit') return;
  const track = interaction.fields.getTextInputValue('track');
  const note = interaction.fields.getTextInputValue('note');
  await interaction.reply(
    asEphemeral(
      noticeCard(
        'Indicação enviada ✦',
        `**${track}** foi adicionada à conversa musical${note ? ` — “${note}”` : ''}.`,
        0x1ed760,
      ),
    ),
  );
}

export async function respondWithError(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : 'Não foi possível concluir esta ação.';
  const payload = asEphemeral(noticeCard('Algo saiu do ritmo', message, 0xe05d5d));
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}

function asEphemeral(card: ComponentsV2Reply): ComponentsV2Reply {
  return { ...card, flags: card.flags | MessageFlags.Ephemeral };
}
