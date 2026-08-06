import { EventEmitter } from 'node:events';

import type { PlaybackSnapshot } from '@wardfy/shared';

export interface ActivityUpdate extends PlaybackSnapshot {
  guildId?: string;
  displayName?: string;
}

/** Process-local fan-out. Deployments with multiple API instances can replace this with Redis Pub/Sub. */
export class ActivityBus {
  private readonly emitter = new EventEmitter();

  publish(update: ActivityUpdate): void {
    this.emitter.emit('playback', update);
  }

  subscribe(listener: (update: ActivityUpdate) => void): () => void {
    this.emitter.on('playback', listener);
    return () => this.emitter.off('playback', listener);
  }
}
