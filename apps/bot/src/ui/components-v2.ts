import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';

import { WARDIFY_BRAND, type CompatibilityReport, type LeaderboardEntry } from '@wardfy/shared';

const SPOTIFY_MARK = 'https://cdn-icons-png.flaticon.com/512/2111/2111624.png';

export type ComponentsV2Reply = {
  components: [ContainerBuilder];
  flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral | number;
};

/**
 * Wardfy uses Discord Components V2 containers rather than legacy embeds.
 * Every reply built here is self-contained: no `content` or `embeds` is mixed
 * with the V2 layout, and the IsComponentsV2 flag is always present.
 */
export function profileCard(input: {
  name: string;
  title: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  minutes: number;
  artists: number;
  streak: number;
  avatarUrl?: string;
}): ComponentsV2Reply {
  const progress = Math.min(100, Math.round((input.xp / input.nextLevelXp) * 100));
  const container = new ContainerBuilder()
    .setAccentColor(WARDIFY_BRAND.spotify)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🎧 ${safe(input.name)}\n*${safe(input.title)}* · Nível **${input.level}**`,
      ),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${formatNumber(input.minutes)} min** ouvidos esta semana\n` +
              `**${input.artists} artistas** · 🔥 sequência de **${input.streak} dias**`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder()
            .setURL(input.avatarUrl ?? SPOTIFY_MARK)
            .setDescription(`Avatar de ${safe(input.name)}`),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**XP para o próximo nível**\n${xpBar(progress)} ${formatNumber(input.xp)} / ${formatNumber(input.nextLevelXp)} XP`,
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('wardfy:profile:details')
          .setLabel('Ver perfil')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('wardfy:profile:dna')
          .setLabel('DNA musical')
          .setStyle(ButtonStyle.Secondary),
      ),
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function rankingCard(metricLabel: string, entries: LeaderboardEntry[]): ComponentsV2Reply {
  const medals = ['🥇', '🥈', '🥉'];
  const rows = entries
    .slice(0, 7)
    .map((entry, index) => {
      const marker = medals[index] ?? `**${entry.rank}.**`;
      const current = entry.isCurrentUser ? ' ← você' : '';
      const delta = entry.delta
        ? ` \`${entry.delta > 0 ? '↑' : '↓'}${Math.abs(entry.delta)}\``
        : '';
      return `${marker} ${safe(entry.displayName)} — **${formatMetric(entry.value, metricLabel)}**${delta}${current}`;
    })
    .join('\n');

  const container = new ContainerBuilder()
    .setAccentColor(WARDIFY_BRAND.accent)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🏆 Ranking da semana\n### ${safe(metricLabel)}`),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(rows))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('wardfy:ranking:minutes')
          .setLabel('Minutos')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('wardfy:ranking:tracks')
          .setLabel('Faixas')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('wardfy:ranking:artists')
          .setLabel('Artistas')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function compatibilityCard(
  left: string,
  right: string,
  report: CompatibilityReport,
): ComponentsV2Reply {
  const sharedArtists = report.sharedArtists.slice(0, 4).map(safe).join(' · ');
  const sharedGenres = report.sharedGenres.slice(0, 4).map(safe).join(' · ');
  const container = new ContainerBuilder()
    .setAccentColor(WARDIFY_BRAND.discord)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ✨ ${safe(left)} + ${safe(right)}\n# **${report.score}%** de compatibilidade musical`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Artistas em comum**\n${sharedArtists || 'Ainda não há dados suficientes.'}\n\n` +
          `**Gêneros que conectam vocês**\n${sharedGenres || 'Ainda não há dados suficientes.'}\n\n` +
          `*${safe(report.explanation)}*`,
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('wardfy:recommend:open')
          .setLabel('Recomendar uma faixa')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('wardfy:compatibility:details')
          .setLabel('Detalhes')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function challengeCard(challenge: {
  id: string;
  name: string;
  icon: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  daysLeft: number;
  rewardXp: number;
}): ComponentsV2Reply {
  const percent = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
  const container = new ContainerBuilder()
    .setAccentColor(0xf4b942)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${challenge.icon} ${safe(challenge.name)}\n${safe(challenge.description)}`,
      ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${xpBar(percent)} **${challenge.progress}/${challenge.target} ${safe(challenge.unit)}**\n` +
          `⏳ ${challenge.daysLeft} dias restantes · recompensa: **${challenge.rewardXp} XP**`,
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`wardfy:challenge:join:${challenge.id}`)
          .setLabel('Participar')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`wardfy:challenge:share:${challenge.id}`)
          .setLabel('Compartilhar')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function noticeCard(
  title: string,
  message: string,
  accent: number = WARDIFY_BRAND.accent,
): ComponentsV2Reply {
  const container = new ContainerBuilder()
    .setAccentColor(accent)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${safe(title)}\n${safe(message)}`),
    );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function nowPlayingCard(input: {
  name: string;
  track: string;
  artist: string;
  album: string;
  progressMs: number;
  durationMs: number;
  device?: string;
  spotifyUrl: string;
  albumArtUrl?: string;
}): ComponentsV2Reply {
  const percentage = Math.max(
    0,
    Math.min(100, Math.round((input.progressMs / input.durationMs) * 100)),
  );
  const container = new ContainerBuilder()
    .setAccentColor(WARDIFY_BRAND.spotify)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🎵 ${safe(input.name)} está ouvindo agora`),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${safe(input.track)}\n${safe(input.artist)}\n*${safe(input.album)}*\n\n` +
              `${xpBar(percentage)} \`${formatTime(input.progressMs)} / ${formatTime(input.durationMs)}\``,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder()
            .setURL(input.albumArtUrl ?? SPOTIFY_MARK)
            .setDescription(`Capa de ${safe(input.album)}`),
        ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`📱 ${safe(input.device ?? 'Dispositivo indisponível')}`),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Abrir no Spotify')
          .setStyle(ButtonStyle.Link)
          .setURL(input.spotifyUrl),
        new ButtonBuilder()
          .setCustomId('wardfy:now:refresh')
          .setLabel('Atualizar')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function xpBar(percentage: number): string {
  const units = 12;
  const filled = Math.round((percentage / 100) * units);
  return `\`${'▰'.repeat(filled)}${'▱'.repeat(units - filled)}\` ${percentage}%`;
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatMetric(value: number, label: string): string {
  if (label.toLocaleLowerCase('pt-BR').includes('minuto')) return `${formatNumber(value)} min`;
  return formatNumber(value);
}

function safe(value: string): string {
  return value
    .replace(/@/g, '@\u200b')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}
