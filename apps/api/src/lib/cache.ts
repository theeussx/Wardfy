import { Redis } from 'ioredis';

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
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

export function createCache(redisUrl: string): Cache {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  // Cache failures are handled at the request boundary; PostgreSQL remains the source of truth.
  redis.on('error', () => undefined);
  void redis.connect().catch(() => undefined);
  return new RedisCache(redis);
}
