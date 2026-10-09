/**
 * In-memory rate limiting and request boundary validation utilities.
 * 
 * Note (F-16): This in-memory limiter operates per application instance. In serverless or
 * multi-region clustered deployments, persistent external stores (such as Redis or Upstash)
 * should be used for cross-instance coordination.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  identifier: string,
  prefix: string,
  options: RateLimitOptions = { limit: 60, windowMs: 60000 }
): RateLimitResult {
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetTime <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetMs: options.windowMs,
    };
  }

  if (existing.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetMs: Math.max(0, existing.resetTime - now),
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - existing.count,
    resetMs: Math.max(0, existing.resetTime - now),
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Strips potential API keys or credential substrings from upstream error messages
 */
export function sanitizeErrorMessage(err: unknown, fallback: string = 'An unexpected error occurred'): string {
  if (!err) return fallback;
  const msg = err instanceof Error ? err.message : String(err);
  // Redact potential keys or auth tokens
  return msg
    .replace(/(?:key|token|auth|access_token|api_key)=([a-zA-Z0-9_\-\.]{8,})/gi, '$1=REDACTED')
    .replace(/Bearer\s+([a-zA-Z0-9_\-\.]{8,})/gi, 'Bearer REDACTED')
    .slice(0, 300);
}
