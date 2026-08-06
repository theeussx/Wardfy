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
      const profile = await api.profile(target.id);
      if (!profile?.spotifyConnected) {
        await interaction.reply(
          asEphemeral(
            noticeCard(
              'Spotify ainda não conectado',
              `${target.globalName ?? target.username} precisa conectar a conta em ${dashboardLink()} antes de ter um perfil musical.`,
            ),
          ),
        );
        return;
      }
      await interaction.reply(
        profileCard({
          name: profile.name,
          title: profile.title,
          level: profile.level,
          xp: profile.xp,
          nextLevelXp: profile.nextLevelXp,
          minutes: profile.minutes,
          artists: profile.artists,
          streak: profile.streak,
          avatarUrl: profile.avatarUrl ?? target.displayAvatarURL({ size: 256 }),
        }),
      );
      return;
    }
    case 'ranking': {
      if (!interaction.guildId) return replyGuildOnly(interaction);
      const metric = (interaction.options.getString('metrica') ??
        'listeningMinutes') as RankingMetric;
      await interaction.deferReply();
      const entries = await api.leaderboard(interaction.guildId, metric);
      if (entries.length === 0) {
        await interaction.editReply(
          noticeCard(
            'Ainda não há escutas neste servidor',
            'Quando membros conectados ouvirem música, o ranking aparecerá aqui automaticamente.',
          ),
        );
        return;
      }
      await interaction.editReply(rankingCard(metricLabels[metric] ?? 'Minutos ouvidos', entries));
      return;
    }
    case 'compatibilidade': {
      const target = interaction.options.getUser('usuario', true);
      if (interaction.guildId) {
        const settings = await api.guildSettings(interaction.guildId);
        if (!settings.allowMemberComparison) {
          await interaction.reply(
            asEphemeral(
              noticeCard(
                'Comparação desativada',
                'Um administrador desativou a comparação musical neste servidor.',
              ),
            ),
          );
          return;
        }
      }
      await interaction.deferReply();
      const report = await api.compatibility(interaction.user.id, target.id);
      await interaction.editReply(
        compatibilityCard(
          interaction.user.globalName ?? interaction.user.username,
          target.globalName ?? target.username,
          report,
          target.id,
        ),
      );
      return;
    }
    case 'desafio': {
      if (!interaction.guildId) return replyGuildOnly(interaction);
      await interaction.deferReply();
      const [challenge] = await api.challenges(interaction.guildId, interaction.user.id);
      if (!challenge) {
        await interaction.editReply(
          noticeCard(
            'Nenhum desafio ativo',
            'Um administrador pode criar a próxima missão pelo painel Wardfy.',
          ),
        );
        return;
      }
      await interaction.editReply(challengeCard(challenge));
      return;
    }
    case 'agora': {
      await interaction.deferReply();
      const playback = await api.syncPlayback(interaction.user.id);
      if (!playback.isPlaying || !playback.track) {
        await interaction.editReply(
          noticeCard(
            'Nada tocando agora',
            `Abra o Spotify em um dispositivo ativo e confirme a conexão em ${dashboardLink()}.`,
          ),
        );
        return;
      }

      if (interaction.guild) {
        const settings = await api.guildSettings(interaction.guild.id);
        if (settings.activityChannelId) {
          await publisher.renderPlaying({
            guild: interaction.guild,
            channelId: settings.activityChannelId,
            discordId: interaction.user.id,
            name: interaction.user.globalName ?? interaction.user.username,
            track: playback.track.title,
            artist: playback.track.artists.join(', '),
            album: playback.track.album,
            progressMs: playback.progressMs,
            durationMs: playback.track.durationMs,
            device: playback.deviceName,
            spotifyUrl: playback.track.spotifyUrl,
            albumArtUrl: playback.track.albumArtUrl,
            spotifyTrackId: playback.track.id,
          });
        }
      }

      await interaction.editReply(
        nowPlayingCard({
          name: interaction.user.globalName ?? interaction.user.username,
          track: playback.track.title,
          artist: playback.track.artists.join(', '),
          album: playback.track.album,
          progressMs: playback.progressMs,
          durationMs: playback.track.durationMs,
          device: playback.deviceName,
          spotifyUrl: playback.track.spotifyUrl,
          albumArtUrl: playback.track.albumArtUrl,
        }),
      );
      return;
    }
    case 'configurar': {
      if (!interaction.guildId) return replyGuildOnly(interaction);
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
            'Configuração salva',
            `Atividade musical: ${channelText}${interval ? ` · atualização a cada ${interval}s` : ''}.`,
            0x1d4ed8,
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
    if (!interaction.guildId) return replyGuildOnly(interaction);
    const metric = (action === 'minutes' ? 'listeningMinutes' : action) as RankingMetric;
    if (!metricLabels[metric]) return;
    await interaction.deferUpdate();
    const entries = await api.leaderboard(interaction.guildId, metric);
    await interaction.editReply(rankingCard(metricLabels[metric], entries));
    return;
  }

  if (feature === 'recommend' && action === 'open' && id) {
    const modal = new ModalBuilder()
      .setCustomId(`wardfy:recommend:submit:${id}`)
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

  if (feature === 'challenge' && action === 'join' && id) {
    await api.joinChallenge(interaction.user.id, id);
    await interaction.reply(
      asEphemeral(
        noticeCard(
          'Você entrou no desafio!',
          'Seu progresso será calculado automaticamente a partir das suas escutas conectadas.',
          0x0ea5e9,
        ),
      ),
    );
    return;
  }

  if (feature === 'challenge' && action === 'share') {
    await interaction.reply(
      asEphemeral(
        noticeCard(
          'Compartilhe o desafio',
          'Use o card acima para convidar membros do servidor para a mesma missão.',
        ),
      ),
    );
    return;
  }

  if (feature === 'profile' && action === 'dna') {
    await interaction.reply(
      asEphemeral(
        noticeCard(
          'DNA musical',
          `Abra ${dashboardLink()} para ver seu DNA calculado a partir das escutas reais.`,
        ),
      ),
    );
    return;
  }

  await interaction.reply(
    asEphemeral(
      noticeCard('Ação indisponível', 'Essa ação ainda não está disponível neste contexto.'),
    ),
  );

  void id;
}

export async function handleRecommendationModal(
  interaction: import('discord.js').ModalSubmitInteraction,
  api: WardfyApi,
): Promise<void> {
  const [, feature, action, targetDiscordId] = interaction.customId.split(':');
  if (feature !== 'recommend' || action !== 'submit' || !targetDiscordId) return;
  const track = interaction.fields.getTextInputValue('track').trim();
  const note = interaction.fields.getTextInputValue('note').trim();
  if (!/^https:\/\/(open\.)?spotify\.com\//i.test(track)) {
    await interaction.reply(
      asEphemeral(
        noticeCard(
          'Use um link do Spotify',
          'Cole o link completo da faixa, álbum ou playlist que deseja recomendar.',
        ),
      ),
    );
    return;
  }
  await api.recommend(interaction.user.id, targetDiscordId, {
    trackLabel: track,
    spotifyTrackUrl: track,
    ...(note ? { note } : {}),
  });
  const target = await interaction.client.users.fetch(targetDiscordId).catch(() => null);
  const delivered = await target
    ?.send(
      noticeCard(
        'Nova indicação musical',
        `${interaction.user.globalName ?? interaction.user.username} recomendou ${track}${note ? ` — ${note}` : ''}`,
        0x0ea5e9,
      ),
    )
    .then(() => true)
    .catch(() => false);
  await interaction.reply(
    asEphemeral(
      noticeCard(
        'Indicação enviada',
        delivered
          ? 'A recomendação foi salva e enviada por mensagem direta.'
          : 'A recomendação foi salva. A outra pessoa poderá vê-la no Wardfy.',
        0x0ea5e9,
      ),
    ),
  );
}

export async function respondWithError(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : 'Não foi possível concluir esta ação.';
  const payload = asEphemeral(noticeCard('Algo saiu do ritmo', message, 0x1e3a8a));
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}

async function replyGuildOnly(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
): Promise<void> {
  const payload = asEphemeral(
    noticeCard(
      'Use este comando em um servidor',
      'Abra este comando em um servidor do Discord onde Wardfy está instalado.',
    ),
  );
  if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
  else await interaction.reply(payload);
}

function dashboardLink(): string {
  return process.env.APP_ORIGIN ?? 'o painel Wardfy';
}

function asEphemeral(card: ComponentsV2Reply): ComponentsV2Reply {
  return { ...card, flags: card.flags | MessageFlags.Ephemeral };
}
