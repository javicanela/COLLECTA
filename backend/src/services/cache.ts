interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = {
    stats: 30000,
    config: 60000,
  };

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL.stats),
    });
  }

  invalidate(pattern: string): void {
    if (pattern === '*') {
      this.cache.clear();
      return;
    }
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateOperations(): void {
    this.invalidate('operations:');
  }

  invalidateConfig(): void {
    this.invalidate('config:');
  }
}

export const cache = new CacheService();
