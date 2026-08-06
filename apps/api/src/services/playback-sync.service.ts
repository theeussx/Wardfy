import type { PrismaClient } from '@prisma/client';

import { AppError } from '../lib/app-error.js';
import { WardfyDataService } from './wardfy-data.service.js';

/**
 * Polls only connected Spotify accounts and limits concurrent requests. Spotify
 * does not expose playback webhooks, so this is the production source of live
 * presence. A queue worker can run the same tick method in a separate process.
 */
export class PlaybackSyncService {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly data: WardfyDataService,
    private readonly intervalMs: number,
    private readonly concurrency: number,
  ) {}

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const accounts = (await this.prisma.spotifyAccount.findMany({
        select: { userId: true },
        orderBy: { lastPlaybackAt: 'asc' },
      })) as Array<{ userId: string }>;
      await runWithConcurrency(
        accounts.map((account) => account.userId),
        this.concurrency,
        async (userId) => {
          try {
            await this.data.syncPlayback(userId);
          } catch (error) {
            // A single revoked account or a temporary Spotify 429 must not stop the rest of the community.
            if (!(error instanceof AppError))
              console.warn(`Playback sync failed for ${userId}`, error);
          }
        },
      );
    } finally {
      this.running = false;
    }
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) await task(item);
    }
  });
  await Promise.all(workers);
}
