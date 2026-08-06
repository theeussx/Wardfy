export interface WardfyUser {
  id: string;
  displayName: string;
  discordId?: string;
  spotifyId?: string;
  avatarUrl?: string;
  locale?: string;
}

export interface UserRepository {
  upsertDiscord(input: Omit<WardfyUser, 'id' | 'spotifyId'>): Promise<WardfyUser>;
  linkSpotify(
    userId: string,
    spotifyId: string,
    displayName?: string,
    avatarUrl?: string,
  ): Promise<void>;
}

export class MemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, WardfyUser>();
  private readonly byDiscordId = new Map<string, string>();

  async upsertDiscord(input: Omit<WardfyUser, 'id' | 'spotifyId'>): Promise<WardfyUser> {
    const existingId = input.discordId ? this.byDiscordId.get(input.discordId) : undefined;
    const id = existingId ?? `user_${input.discordId ?? crypto.randomUUID()}`;
    const user: WardfyUser = { ...this.byId.get(id), ...input, id };
    this.byId.set(id, user);
    if (input.discordId) this.byDiscordId.set(input.discordId, id);
    return user;
  }

  async linkSpotify(
    userId: string,
    spotifyId: string,
    displayName?: string,
    avatarUrl?: string,
  ): Promise<void> {
    const existing = this.byId.get(userId) ?? {
      id: userId,
      displayName: displayName ?? 'Wardfy listener',
    };
    this.byId.set(userId, {
      ...existing,
      spotifyId,
      displayName: displayName ?? existing.displayName,
      avatarUrl: avatarUrl ?? existing.avatarUrl,
    });
  }
}
