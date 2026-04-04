# Redis Configuration & Deployment Guide

> Production-ready Redis setup for distributed rate limiting and caching

## ✅ What's Been Implemented

### 1. **Distributed Rate Limiting**
- **General API Limiter**: 100 req/min (configurable per endpoint)
- **Auth Limiter**: 5 req/min (strict, 5-minute block on exceeded)
- **Client Identification**: Supports IP, User ID, and API Key
- **Proper HTTP Headers**: Includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After`

### 2. **Distributed Caching**
- **GET request caching** with configurable TTL (default 60s)
- **Automatic cache invalidation** by key or pattern
- **Respects cache headers** (Cache-Control: no-cache)
- **Binary cache keys** with namespace prefixes for safety

### 3. **Connection Management (Production-Ready)**
```
✓ Proper timeouts (connect: 10s, command: 5s)
✓ Retry logic with exponential backoff (max 2s)
✓ TCP keepalive (30s)
✓ Connection pooling via ioredis internal pool
✓ Graceful shutdown on SIGTERM/SIGINT
✓ Health check endpoint (/health)
✓ Monitoring events (connect, ready, error, reconnect)
✓ TLS support for rediss:// URLs (Amazon ElastiCache, Redis Cloud)
```

### 4. **Error Handling & Resilience**
- Middleware fails gracefully (continues without cache on Redis error)
- Detailed error logging for debugging
- Automatic reconnection on transient failures
- Separate error handling per middleware

---

## 📋 Deployment Configuration

### Required Environment Variables

```bash
# Redis URL (varies by provider)
REDIS_URL=rediss://user:password@host:port

# Trust proxy setting (adjust based on deployment)
TRUST_PROXY=1  # For AWS ALB, Azure LB, etc.
```

### Environment-Specific Settings

#### **Local Development**
```bash
REDIS_URL=redis://localhost:6379
TRUST_PROXY=1
NODE_ENV=development
```

#### **AWS ElastiCache (Redis 7.x)**
```bash
REDIS_URL=rediss://default:your-password@cluster-endpoint:6379
TRUST_PROXY=1
```

#### **Redis Cloud (Managed Service)**
```bash
REDIS_URL=rediss://user:password@redis-domain-xxxx.upstash.io:6379
TRUST_PROXY=1
```

#### **Heroku / Cloud Functions**
```bash
REDIS_URL=rediss://user:password@host:port
TRUST_PROXY=true  # Trust all proxies
```

---

## 🏗️ Architecture

### Single Redis Instance (Current)
Used for both rate limiting and caching. Good for:
- ✅ Simple deployments
- ✅ Non-critical caching (cache misses just refetch)
- ✅ Rate limiting as a soft limit

### Recommended: Dual Redis Instances (Production at Scale)
```
┌─────────────────┐
│   API Gateway   │
├─────────────────┤
│  Rate Limiter   │────► Redis Instance #1 (Rate Limit Store)
│  (Strict)       │
├─────────────────┤
│  Cache Layer    │────► Redis Instance #2 (Cache Store)
│  (Soft-critical)│
└─────────────────┘
```

**Benefits**:
- Rate limiter isolation (prevents cache eviction from affecting rates)
- Different TTLs (rates: seconds, cache: minutes)
- Independent scaling

**Switch to dual instances**:
```typescript
// config/redis-rate-limit.ts
export default new Redis(process.env.REDIS_RATE_LIMIT_URL!);

// config/redis-cache.ts
export default new Redis(process.env.REDIS_CACHE_URL!);
```

---

## 📊 Monitoring & Observability

### Health Check Endpoint
```bash
curl http://localhost:5000/health
```

Response (Healthy):
```json
{
  "status": "healthy",
  "timestamp": "2026-04-04T10:00:00.000Z",
  "services": {
    "redis": "connected"
  }
}
```

### Logs to Monitor
- `✅ Redis connected` - Connection established
- `✅ Redis ready` - Ready for commands
- `⚠️ Redis reconnecting` - Transient failure
- `❌ Redis error` - Persistent error
- `Rate limit exceeded` - Client exceeded limit
- `Cache HIT/MISS` - Cache effectiveness

### Metrics to Track
1. **Rate Limiter Metrics**:
   - Requests per client
   - Blocks per hour
   - Success rate

2. **Cache Metrics**:
   - Hit ratio (ideal: >70%)
   - Evictions per minute
   - Memory usage

3. **Redis Metrics**:
   - Connection count
   - Command latency
   - Memory fragmentation
   - Keyspace size

---

## 🔧 Configuration Tuning

### Rate Limiting

#### Current (Recommended for Startups)
```typescript
General: 100 req/min
Auth:     5 req/min (5-min block)
```

#### For High-Traffic Scenarios
```typescript
General: 1000 req/min
Auth:    10 req/min
```

Edit in [src/middleware/rateLimiter.ts](../../src/middleware/rateLimiter.ts)

### Caching

#### Change Default TTL
```typescript
// In server.ts
app.use('/api/products', cacheMiddleware(120), productRouter); // 120s TTL
```

#### Cache Specific Endpoints Only
```typescript
// Avoid caching mutable endpoints
app.post('/api/products', productRouter);  // No cache
app.get('/api/products', cacheMiddleware(60), productRouter);  // With cache
```

---

## 🚀 Deployment Checklist

- [ ] Set `REDIS_URL` in production environment
- [ ] Set `NODE_ENV=production`
- [ ] Set `TRUST_PROXY` based on load balancer type
- [ ] Verify `/health` endpoint returns 200
- [ ] Enable Redis monitoring in your dashboard
- [ ] Set up alerts for Redis disconnection
- [ ] Test rate limiting with: `for i in {1..200}; do curl -s http://api/endpoint; done`
- [ ] Verify cache headers with: `curl -i http://api/endpoint`
- [ ] Configure log aggregation (CloudWatch, Datadog, etc.)
- [ ] Plan for Redis failover (replication, clustering)

---

## 🐛 Troubleshooting

### "Connection timeout"
```yaml
Issue: Redis unreachable
Solutions:
  1. Check REDIS_URL is correct (rediss:// for SSL)
  2. Verify firewall allows outbound to Redis port
  3. Increase CONNECT_TIMEOUT in redis.ts (currently 10s)
  4. Check Redis server is running
```

### "EACCES: permission denied"
```yaml
Issue: Authentication failure
Solutions:
  1. Verify password in REDIS_URL
  2. Check user has required permissions
  3. For AWS ElastiCache: use "default" username
```

### "High memory usage"
```yaml
Issue: Cache growing unbounded
Solutions:
  1. Reduce cache TTL (default: 60s, try 30s)
  2. Implement cache invalidation patterns
  3. Monitor with MEMORY STATS command
  4. Scale to larger Redis instance
```

### "Rate limits not working"
```yaml
Issue: All requests blocked with 429
Solutions:
  1. Check Redis is connected (/health endpoint)
  2. Verify TRUST_PROXY setting (affects IP detection)
  3. Check authLimiter points config
  4. Clear rate limiter keys: redis DEL rl:*
```

---

## 📚 Additional Resources

- [ioredis Documentation](https://github.com/luin/ioredis)
- [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible)
- [Redis Security Best Practices](https://redis.io/topics/security)
- [Redis Persistence Guide](https://redis.io/docs/management/persistence/)
