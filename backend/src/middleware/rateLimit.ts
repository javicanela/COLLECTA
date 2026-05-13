import type { Request, Response, NextFunction } from 'express';

/**
 * In-memory rate limiter keyed by IP + path (or a custom key function).
 *
 * Designed for narrow surfaces (login, verify) where brute force is the
 * actual risk. The global limiter in index.ts uses express-rate-limit and
 * runs in front; this layer is more aggressive on auth-sensitive routes.
 *
 * Limitations:
 * - Single process only. Multi-replica deployments need a shared store
 *   (Redis INCR + EXPIRE, etc.). Not implemented in this round.
 * - Buckets are kept in a Map without LRU eviction; abusive IPs leave
 *   entries until the window resets.
 */

type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  message?: string;
}

function defaultKey(req: Request): string {
  return `${req.ip || 'unknown'}:${req.path}`;
}

export function createRateLimiter(opts: RateLimitOptions) {
  const buildKey = opts.key ?? defaultKey;
  const message = opts.message ?? 'Demasiados intentos. Reintenta luego.';

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const key = buildKey(req);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { hits: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    current.hits += 1;

    if (current.hits > opts.max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}

export function rateLimitBucketCount(): number {
  return buckets.size;
}
