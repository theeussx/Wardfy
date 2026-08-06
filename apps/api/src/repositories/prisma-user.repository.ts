import type { PrismaClient } from '@prisma/client';

import type { UserRepository, WardfyUser } from './user.repository.js';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertDiscord(input: Omit<WardfyUser, 'id' | 'spotifyId'>): Promise<WardfyUser> {
    if (!input.discordId) throw new Error('A Discord identifier is required for upsertDiscord.');
    const user = await this.prisma.user.upsert({
      where: { discordId: input.discordId },
      create: {
        discordId: input.discordId,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        locale: input.locale ?? 'pt-BR',
      },
      update: {
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        locale: input.locale ?? 'pt-BR',
      },
    });
    return toWardfyUser(user);
  }

  async linkSpotify(
    userId: string,
    spotifyId: string,
    displayName?: string,
    avatarUrl?: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        spotifyId,
        ...(displayName ? { displayName } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });
  }
}

function toWardfyUser(user: {
  id: string;
  displayName: string;
  discordId: string | null;
  spotifyId: string | null;
  avatarUrl: string | null;
  locale: string;
}): WardfyUser {
  return {
    id: user.id,
    displayName: user.displayName,
    discordId: user.discordId ?? undefined,
    spotifyId: user.spotifyId ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    locale: user.locale,
  };
}
