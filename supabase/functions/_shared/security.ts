// Shared security utilities for Supabase Edge Functions

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyGenerator: (req: Request) => string;  // Function to generate rate limit key
}

// In-memory rate limiting (simple implementation for edge functions)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(config: RateLimitConfig) {
  return (req: Request): { allowed: boolean; remaining: number; resetTime: number } => {
    const key = config.keyGenerator(req);
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
    
    const existing = rateLimitStore.get(key);
    
    if (!existing || now > existing.resetTime) {
      // New window
      const resetTime = now + config.windowMs;
      rateLimitStore.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: config.maxRequests - 1, resetTime };
    }
    
    if (existing.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: existing.resetTime };
    }
    
    existing.count++;
    rateLimitStore.set(key, existing);
    return { allowed: true, remaining: config.maxRequests - existing.count, resetTime: existing.resetTime };
  };
}

// Enhanced security headers
export const securityHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'none'; object-src 'none';",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// Input sanitization utilities
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).replace(/[<>\"'&]/g, '');
}

export function sanitizeNumber(input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const num = Number(input);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

// Security event logging
export async function logSecurityEvent(
  supabase: any,
  event: {
    type: 'ADMIN_LOGIN' | 'ADMIN_ACCESS' | 'RATE_LIMIT_HIT' | 'INVALID_AUTH' | 'DATA_EXPORT';
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    details?: Record<string, any>;
  }
) {
  try {
    await supabase.from("audit_logs").insert({
      table_name: "security_events",
      operation: event.type,
      user_id: event.user_id,
      metadata: {
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        timestamp: new Date().toISOString(),
        ...event.details
      }
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

// Admin rate limiter - 30 requests per 15 minutes per user
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 30,
  keyGenerator: (req: Request) => {
    const authHeader = req.headers.get("authorization");
    const userAgent = req.headers.get("user-agent") || "unknown";
    const forwardedFor = req.headers.get("x-forwarded-for") || "unknown";
    return `admin:${authHeader}:${userAgent}:${forwardedFor}`;
  }
});

// Chat-AI rate limiter - 20 requests per 5 minutes per IP
export const chatAIRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20,
  keyGenerator: (req: Request) => {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    return `chat:${ip}`;
  }
});

// Log rate limiter - 100 requests per 10 minutes per IP
export const logRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 100,
  keyGenerator: (req: Request) => {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    return `log:${ip}`;
  }
});

// Session rate limiter - 10 requests per 5 minutes per IP
export const sessionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
  keyGenerator: (req: Request) => {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    return `session:${ip}`;
  }
});

// Extract client info for security logging
export function getClientInfo(req: Request) {
  return {
    ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
    user_agent: req.headers.get("user-agent") || "unknown"
  };
}