# Production Deployment Guide

## 🎯 What's Changed

Your Redis implementation has been upgraded to **production-ready** standards with proper rate limiting, caching, error handling, and monitoring.

---

## 📋 Complete List of Changes

### 1. **config/redis.ts** ✅
**Before**: Basic Redis setup, no error handling  
**After**: Production-grade configuration with:
- ✅ Proper connection timeouts (10s connect, 5s command)
- ✅ Retry logic with exponential backoff
- ✅ TCP keepalive (30s)
- ✅ Connection event monitoring
- ✅ Health check function
- ✅ Graceful shutdown handler
- ✅ TLS support for `rediss://` URLs
- ✅ Structured logging with Pino

**Use**: Centralized Redis instance for both rate limiting and caching

---

### 2. **middleware/rateLimiter.ts** ✅
**Before**: Single rate limiter (100 req/min), no IP detection, basic error handling  
**After**: Production-ready with:
- ✅ **Dual limiters**: General (100/min) + Auth (5/min)
- ✅ Smart client ID: User ID > API Key > IP
- ✅ Proper IP detection with proxy trust
- ✅ HTTP rate limit headers (X-RateLimit-*, Retry-After)
- ✅ Detailed error logging
- ✅ Configurable block duration
- ✅ Custom limiter factory function

**Usage**:
```typescript
// General endpoints
app.use(apiLimiter);

// Sensitive endpoints
router.post("/login", authLimiter, loginHandler);
```

---

### 3. **middleware/cache.ts** ✅
**Before**: Basic caching, no error handling  
**After**: Robust with:
- ✅ Automatic response filtering (only 2xx)
- ✅ HTTP Cache-Control header respect
- ✅ Cache key generation with user awareness
- ✅ Error resilience (fail-open pattern)
- ✅ Pattern-based invalidation
- ✅ Batch deletion for safety
- ✅ Comprehensive logging
- ✅ Optional cache params (user context)

**Usage**:
```typescript
// Cache with 60s TTL
app.get('/api/products', cacheMiddleware(60), handler);

// Invalidate cache
await invalidateCachePattern('cache:*');
```

---

### 4. **server.ts** ✅
**Before**: No middleware registration, no monitoring  
**After**: Production-ready with:
- ✅ Trust proxy configuration for accurate IPs
- ✅ Rate limiter & cache middleware applied
- ✅ Health check endpoint (`/health`)
- ✅ Graceful shutdown handlers (SIGTERM/SIGINT)
- ✅ Structured logging on startup
- ✅ Redis health status in health check

**New endpoints**:
```
GET /health → Redis connection status
```

---

### 5. **auth/routers/auth.route.ts** ✅
**Before**: No rate limiting on auth endpoints  
**After**:
- ✅ authLimiter applied to signup, login, password reset
- ✅ Protected against brute force attacks

---

## 📦 New Files Created

### **REDIS_CONFIG.md**
Comprehensive guide covering:
- Architecture (single vs dual Redis)
- Environment-specific configs (AWS, Redis Cloud, Heroku)
- Tuning guidelines
- Troubleshooting common issues
- Monitoring metrics

### **docker-compose.redis.yml**
Local Redis setup for development:
- Redis 7 Alpine (lightweight)
- Redis Commander UI (port 8081)
- Automatic health checks
- Data persistence

### **test-redis.sh**
Testing script to validate:
- Health checks
- General rate limiting (100/min)
- Auth rate limiting (5/min)
- Cache HIT/MISS behavior
- Redis connection

---

## 🚀 Deployment Steps

### Step 1: Prerequisites
```bash
# Ensure environment variables are set
export REDIS_URL=rediss://user:password@host:port
export TRUST_PROXY=1
export NODE_ENV=production
```

### Step 2: Verify Redis Connection
```bash
# Test locally first
docker-compose -f docker-compose.redis.yml up -d

# Check health endpoint
curl http://localhost:5000/health
# Expected: {"status":"healthy","services":{"redis":"connected"}}
```

### Step 3: Test Rate Limiting
```bash
# Run test script (requires backend running)
bash test-redis.sh
```

### Step 4: Verify in Production
```bash
# After deployment, verify:
curl https://your-api.com/health

# Check logs for Redis connection
# Should see: "✅ Redis connected" and "✅ Redis ready to accept commands"
```

---

## 🔧 Configuration Quick Reference

| Setting | Local | Production |
|---------|-------|------------|
| `REDIS_URL` | `redis://localhost:6379` | `rediss://user:pass@host:port` |
| `TRUST_PROXY` | `1` | `1` (AWS), `true` (Heroku), `'cloudflare'` (CF) |
| `NODE_ENV` | `development` | `production` |
| General Rate Limit | 100/min | 100/min (adjust if needed) |
| Auth Rate Limit | 5/min | 5/min (strict) |
| Cache TTL | 60s | 60s (tunable per route) |

---

## 📊 Monitoring & Observability

### Health Check
```bash
curl http://api.example.com/health
```

Response indicates:
- Redis connection status
- Timestamp
- Overall system health

### Key Metrics to Track
1. **Cache Hit Ratio** (target: >70%)
2. **Rate Limit Triggers** (track patterns)
3. **Redis Connection Latency** (target: <50ms)
4. **Memory Usage** (monitor growth)

### Logs to Monitor
```
✅ Redis connected          → Connection established
✅ Redis ready              → Ready for commands
⚠️ Redis reconnecting       → Transient failure (expected)
❌ Redis error              → Persistent issue
Rate limit exceeded         → Client blocked
Cache HIT/MISS              → Cache effectiveness
```

---

## ⚠️ Important Considerations

### 1. **IP Detection (TRUST_PROXY)**
Set correctly based on deployment:
- **AWS ALB/NLB**: `TRUST_PROXY=1`
- **Cloudflare**: `TRUST_PROXY='cloudflare'`
- **Heroku/Cloud Functions**: `TRUST_PROXY=true`
- **Direct (no proxy)**: `TRUST_PROXY=''` (or don't set)

**Why**: Incorrect setting causes rate limiting to fail (all requests appear from proxy IP).

### 2. **Redis Persistence**
Configure based on criticality:
```bash
# Development (in-memory, loss is OK)
redis-server

# Production (persist to disk)
redis-server --appendonly yes --appendfsync everysec
```

### 3. **Single vs Dual Redis**
Current: **Single instance** (rate limit + cache)
- ✅ Simple, cost-effective
- ⚠️ Cache eviction affects rate limiting
- ❌ Not ideal for high-traffic (>10k req/s)

For high traffic, use dual instances:
```typescript
const redisRateLimit = new Redis(process.env.REDIS_RATE_LIMIT_URL);
const redisCache = new Redis(process.env.REDIS_CACHE_URL);
```

### 4. **Cache Invalidation**
Current: Manual via function calls
```typescript
// Invalidate exact key
await invalidateCacheKey('cache:/api/products/all');

// Invalidate pattern (use cautiously)
await invalidateCachePattern('cache:*');
```

For large-scale, consider cache tags or event-based invalidation.

---

## 🛠️ Troubleshooting

### Redis Won't Connect
✅ Check REDIS_URL is correct  
✅ Verify firewall allows outbound connection  
✅ Confirm Redis server is running  
✅ Test with: `redis-cli -h host -p port ping`  

### Rate Limiting Not Working
✅ Verify `/health` shows Redis connected  
✅ Check `TRUST_PROXY` setting  
✅ Clear rate limit keys: `redis-cli DEL rl:*`  
✅ Ensure authLimiter is applied to route  

### Cache Not Effective
✅ Verify cache headers: `curl -i /api/endpoint | grep X-Cache`  
✅ Check TTL settings  
✅ Monitor with: `redis-cli KEYS cache:*`  
✅ Clear and re-test: `redis-cli FLUSHDB`  

---

## ✅ Pre-Production Checklist

- [ ] Set `REDIS_URL` environment variable
- [ ] Set `TRUST_PROXY` based on deployment type
- [ ] Set `NODE_ENV=production`
- [ ] Test health endpoint returns 200
- [ ] Verify rate limiting with test script
- [ ] Check cache headers are present
- [ ] Set up log aggregation (CloudWatch, Datadog, etc.)
- [ ] Configure Redis monitoring dashboard
- [ ] Test graceful shutdown (send SIGTERM)
- [ ] Plan Redis backup/recovery strategy
- [ ] Document rate limit policy for API consumers
- [ ] Set alerts for Redis disconnection/memory

---

## 📚 Next Steps

1. **Deploy to staging** and run `test-redis.sh`
2. **Monitor metrics** for 24 hours
3. **Adjust rate limits** based on traffic patterns
4. **Review logs** for errors/warnings
5. **Deploy to production** with confidence ✅

---

## 📞 Support

For issues or questions:
1. Check [REDIS_CONFIG.md](./backend/REDIS_CONFIG.md) for detailed guide
2. Review logs in your log aggregation service
3. Test with `/health` endpoint
4. Run `test-redis.sh` for validation
