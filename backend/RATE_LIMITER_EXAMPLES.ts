// @ts-nocheck
/**
 * RATE LIMITER CONFIGURATION EXAMPLES
 * 
 * This file shows how to customize rate limiting for different scenarios
 * Copy any configuration that matches your use case and apply it to rateLimiter.ts
 */

// ============================================================================
// SCENARIO 1: Default Production Setup (RECOMMENDED)
// ============================================================================
/*
General endpoints: 100 req/min
Auth endpoints: 5 req/min
*/

const generalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:general',
  points: 100,           // 100 requests
  duration: 60,          // per 60 seconds
  blockDurationMs: 60000, // Block for 1 minute if exceeded
});

const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:auth',
  points: 5,             // 5 requests
  duration: 60,          // per 60 seconds
  blockDurationMs: 300000, // Block for 5 minutes (stronger deterrent)
});

// ============================================================================
// SCENARIO 2: High-Traffic Application
// ============================================================================
/*
General endpoints: 1000 req/min (10k req/sec capacity)
Auth endpoints: 20 req/min
API Key limiter: 5000 req/min (premium tier)
*/

const highTrafficGeneral = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:general',
  points: 1000,
  duration: 60,
  blockDurationMs: 60000,
});

const highTrafficAuth = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:auth',
  points: 20,
  duration: 60,
  blockDurationMs: 300000,
});

const apiKeyLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:apikey',
  points: 5000,
  duration: 60,
  blockDurationMs: 60000,
});

// Usage:
// router.get('/api/premium', apiKeyLimiter, handler);

// ============================================================================
// SCENARIO 3: Micro-Service with Strict Limits
// ============================================================================
/*
For payment processing, sensitive operations, or public APIs
*/

const paymentLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:payment',
  points: 3,            // 3 requests
  duration: 60,         // per 60 seconds
  blockDurationMs: 600000, // Block for 10 minutes
});

const sensitiveOpLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:sensitive',
  points: 10,           // 10 requests
  duration: 60,
  blockDurationMs: 300000,
});

// Usage:
// router.post('/api/payment/process', paymentLimiter, handler);
// router.delete('/api/user/account', sensitiveOpLimiter, handler);

// ============================================================================
// SCENARIO 4: Development / Testing
// ============================================================================
/*
Relaxed limits for development and testing environments
*/

const devLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:dev',
  points: 10000,        // Very high limit
  duration: 60,
  blockDurationMs: 60000,
});

// Usage in server.ts:
// if (process.env.NODE_ENV === 'development') {
//   app.use(devLimiter);
// } else {
//   app.use(apiLimiter);
// }

// ============================================================================
// SCENARIO 5: Tiered Rate Limiting (Free vs Premium Users)
// ============================================================================
/*
Implement different limits based on user tier/subscription
*/

async function tieredLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const tier = req.user?.subscription?.tier || 'free'; // free, pro, enterprise
    
    let limiter;
    switch (tier) {
      case 'enterprise':
        limiter = new RateLimiterRedis({
          storeClient: redis,
          keyPrefix: 'rl:tier:enterprise',
          points: 100000,
          duration: 60,
        });
        break;
      case 'pro':
        limiter = new RateLimiterRedis({
          storeClient: redis,
          keyPrefix: 'rl:tier:pro',
          points: 10000,
          duration: 60,
        });
        break;
      default: // free
        limiter = new RateLimiterRedis({
          storeClient: redis,
          keyPrefix: 'rl:tier:free',
          points: 100,
          duration: 60,
        });
    }
    
    await limiter.consume(userId);
    res.setHeader('X-RateLimit-Tier', tier);
    next();
  } catch (error: any) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
      tier: req.user?.subscription?.tier,
    });
  }
}

// ============================================================================
// SCENARIO 6: IP-Based with Identifier Fallback
// ============================================================================
/*
For endpoints that need to rate limit both authenticated and anonymous users
*/

function smartIdentifier(req: Request): string {
  // Authenticated users: use user ID (won't be rate limited with other users)
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Large orgs sharing IPs: use combination of IP and user agent
  const ip = req.ip || 'unknown';
  const ua = req.get('user-agent') || 'unknown';
  const uaHash = require('crypto')
    .createHash('md5')
    .update(ua)
    .digest('hex')
    .substring(0, 8);
  
  return `ip:${ip}:ua:${uaHash}`;
}

async function smartLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const identifier = smartIdentifier(req);
    await generalLimiter.consume(identifier);
    next();
  } catch (error: any) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
    });
  }
}

// ============================================================================
// SCENARIO 7: Per-Endpoint Custom Limits
// ============================================================================
/*
Different limits for different endpoints based on resource intensity
*/

const searchLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:search',
  points: 30,           // 30 searches per minute (resource intensive)
  duration: 60,
  blockDurationMs: 60000,
});

const fileLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:file',
  points: 10,           // 10 file uploads per minute (bandwidth intensive)
  duration: 60,
  blockDurationMs: 300000,
});

const regularLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:regular',
  points: 100,          // 100 regular requests per minute
  duration: 60,
  blockDurationMs: 60000,
});

// Usage in routes:
// router.get('/api/search', searchLimiter, searchHandler);
// router.post('/api/upload', fileLimiter, uploadHandler);
// router.get('/api/data', regularLimiter, dataHandler);

// ============================================================================
// SCENARIO 8: Distributed Rate Limiting (Multi-Instance)
// ============================================================================
/*
For distributed systems where you need to share limits across instances
Already implemented in our setup (Redis is the shared store)
*/

// All instances connect to same Redis, so limits are automatically global
// Example: If you have 3 backend instances, they all share the same limit pool

const distributedLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:global',
  points: 1000,
  duration: 60,
  // Every instance worldwide shares this single limit
  // If one instance uses 400 points, others only have 600 remaining
  inmemoryBlockOnConsumed: 100, // Cache last 100 blocks in memory for speed
});

// ============================================================================
// SCENARIO 9: Sliding Window Counter (More Accurate)
// ============================================================================
/*
Some rate limiters offer sliding window counters for more accurate limiting
rate-limiter-flexible also provides this
*/

const slidingWindowLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:sliding',
  points: 100,
  duration: 60,
  tableName: 'rate_limit_sliding', // Uses sliding window table
  execEvenly: false, // Don't spread consumption evenly
  execEvenlyMinDelayMs: 0,
});

// ============================================================================
// SCENARIO 10: Custom Logic - Rate Limit by Request Size
// ============================================================================
/*
For APIs where request size matters (e.g., GraphQL queries)
Different points based on query complexity
*/

async function complexityBasedLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getClientIdentifier(req);
    
    // Calculate points based on request size
    const bodySize = JSON.stringify(req.body).length;
    let points = 1;
    
    if (bodySize > 10000) {
      points = 5; // Large request = 5 points
    } else if (bodySize > 5000) {
      points = 3; // Medium request = 3 points
    }
    
    await generalLimiter.consume(userId, points);
    res.setHeader('X-RateLimit-CostPoints', points.toString());
    next();
  } catch (error: any) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
    });
  }
}

// ============================================================================
// IMPLEMENTATION TIPS
// ============================================================================

/*
1. ALWAYS identify by authenticated user first
   - Prevents legitimate users from being blocked by abusers on same IP
   - Use user ID as primary identifier

2. FALL BACK to IP for anonymous requests
   - Use with caution behind proxies (ensure TRUST_PROXY is set correctly)

3. COMBINE multiple signals for better identification
   - IP + User Agent hash
   - Fingerprinting can prevent circumvention

4. USE different limits for different operations
   - Write operations (POST/PUT/DELETE): Stricter
   - Read operations (GET): More lenient
   - CPU-intensive ops: Much stricter

5. LOG rate limit violations
   - Track patterns (DDoS vs legitimate spikes)
   - Adjust limits based on real traffic patterns
   - Set up alerts for sudden increases

6. COMMUNICATE limits to users
   - Include X-RateLimit-* headers
   - Document in API docs
   - Provide Retry-After header

7. TEST thoroughly
   - Load test with expected peak traffic
   - Test distribution across instances
   - Verify IPs work with your proxy setup

8. MONITOR metrics
   - Cache hit ratio
   - Rate limit hit rate
   - Redis memory usage
   - Connection latency
*/
