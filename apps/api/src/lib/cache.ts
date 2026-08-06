import { Redis } from 'ioredis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/** In-memory cache used in the demo and local fallback path. */
export class MemoryCache implements Cache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }
}

/** Redis cache adapter for clustered API and worker processes. */
export class RedisCache implements Cache {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const serialized = await this.redis.get(key);
    return serialized ? (JSON.parse(serialized) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

export function createCache(redisUrl: string, enabled: boolean): Cache {
  if (!enabled) return new MemoryCache();

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  // A temporary Redis outage must not take down request handling; callers can fall back to recompute.
  redis.on('error', () => undefined);
  void redis.connect().catch(() => undefined);
  return new RedisCache(redis);
}
