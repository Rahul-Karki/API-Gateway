#!/bin/bash

# QUICK REFERENCE - Production Deployment Commands

# ============================================================================
# 1. LOCAL TESTING
# ============================================================================

echo "1️⃣ START REDIS LOCALLY"
# docker-compose -f docker-compose.redis.yml up -d
# Then access Redis Commander at http://localhost:8081

echo "2️⃣ VERIFY HEALTH"
# curl http://localhost:5000/health
# Expected: {"status":"healthy","services":{"redis":"connected"}}

echo "3️⃣ RUN TESTS"
# bash test-redis.sh

# ============================================================================
# 2. PRE-DEPLOYMENT
# ============================================================================

echo "ENVIRONMENT VARIABLES TO SET:"
cat << 'EOF'
export REDIS_URL="rediss://user:password@host:port"
export TRUST_PROXY=1
export NODE_ENV=production
export LOG_LEVEL=info
EOF

echo "VERIFY REDIS CREDENTIALS:"
# For AWS ElastiCache (auth token):
# export REDIS_URL="rediss://default:AUTH-TOKEN@cluster-endpoint.ng.0001.use1.cache.amazonaws.com:6379"

# For Redis Cloud:
# export REDIS_URL="rediss://user:password@redis-host.upstash.io:6379"

# ============================================================================
# 3. DEPLOYMENT COMMAND
# ============================================================================

echo "DEPLOY:"
cat << 'EOF'
# Option A: Direct
npm start

# Option B: With PM2
pm2 start dist/server.js --name api-gateway

# Option C: Docker
docker build -t api-gateway:latest .
docker run -e REDIS_URL=rediss://... -p 5000:5000 api-gateway:latest

# Option D: Kubernetes
kubectl apply -f deployment.yaml
EOF

# ============================================================================
# 4. POST-DEPLOYMENT VERIFICATION
# ============================================================================

echo "HEALTH CHECK:"
# curl https://your-api.com/health

echo "REDIS CONNECTION STATUS:"
# curl https://your-api.com/health | jq '.services.redis'

echo "RATE LIMIT TEST (should get 429 after 100 requests):"
# for i in {1..105}; do
#   STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-api.com/api/products/all)
#   echo "Request $i: $STATUS"
# done

echo "CACHE TEST (should show HIT on 2nd request):"
# curl -i https://your-api.com/api/products/all 2>/dev/null | grep X-Cache
# curl -i https://your-api.com/api/products/all 2>/dev/null | grep X-Cache

# ============================================================================
# 5. MONITORING COMMANDS
# ============================================================================

echo "REDIS MONITORING:"
cat << 'EOF'
redis-cli INFO stats          # Connection stats
redis-cli KEYS '*' | head -20 # Cache/limit keys
redis-cli MEMORY STATS        # Memory usage
redis-cli DBSIZE              # Total keys
redis-cli SLOWLOG GET 10       # Slow queries
redis-cli MONITOR             # Real-time commands
EOF

echo "CLEAR CACHE IF NEEDED:"
# redis-cli FLUSHDB            # Clear all keys
# redis-cli DEL rl:*           # Clear rate limits only
# redis-cli DEL cache:*        # Clear cache only

# ============================================================================
# 6. TROUBLESHOOTING QUICK FIXES
# ============================================================================

echo "ISSUE: Redis won't connect"
cat << 'EOF'
✅ Test connection:
   redis-cli -h HOST -p PORT ping    # Should return PONG
✅ Check password:
   redis-cli -a PASSWORD ping        # Or include in URL
✅ Test with node:
   node -e "const Redis=require('ioredis'); new Redis('rediss://...').ping(console.log)"
EOF

echo "ISSUE: Rate limiting not working"
cat << 'EOF'
✅ Check Redis running:
   curl /health                       # Should show redis: connected
✅ Check TRUST_PROXY:
   curl -H "X-Forwarded-For: 1.1.1.1" /api/test  # Behind proxy
✅ Clear old limits:
   redis-cli DEL rl:*                 # Start fresh
✅ Verify middleware:
   grep authLimiter backend/src/server.ts
EOF

echo "ISSUE: Cache not working"
cat << 'EOF'
✅ Check headers:
   curl -i /api/endpoint | grep -i cache
✅ Check Redis cache keys:
   redis-cli KEYS cache:*             # Count: KEYS cache:* | wc -l
✅ Monitor in real-time:
   redis-cli MONITOR                  # See operations
EOF

# ============================================================================
# 7. PERFORMANCE TUNING
# ============================================================================

echo "INCREASE RATE LIMITS FOR HIGH TRAFFIC:"
cat << 'EOF'
Edit backend/src/middleware/rateLimiter.ts:

// General API: 100 → 1000 requests/min
const generalRateLimiter = new RateLimiterRedis({
  points: 1000,  // Changed from 100
  duration: 60,
  // ...
});

// Auth endpoints: 5 → 20 requests/min
const authRateLimiter = new RateLimiterRedis({
  points: 20,    // Changed from 5
  duration: 60,
  // ...
});
EOF

echo "ADJUST CACHE TTL:"
cat << 'EOF'
Edit backend/src/server.ts:

// Default is 60 seconds, change to:
app.use('/api/products', cacheMiddleware(120), productRouter);  // 2 min
app.use('/api/users', cacheMiddleware(30), usersRouter);        // 30 sec
EOF

# ============================================================================
# 8. MONITORING DASHBOARD
# ============================================================================

echo "RECOMMENDED METRICS TO TRACK:"
cat << 'EOF'
1. Cache Hit Ratio          (Target: >70%)
2. Rate Limit Blocks/min    (Alert if > threshold)
3. Redis Latency            (Target: <50ms)
4. Redis Memory Usage       (Alert if > 80%)
5. Error Rate               (Alert if > 0.1%)
EOF

# ============================================================================
# 9. ROLLBACK PROCEDURE
# ============================================================================

echo "IF SOMETHING GOES WRONG:"
cat << 'EOF'
1. Stop new deployments
2. Check logs: AWS CloudWatch / Heroku Logs / grep Redis
3. Verify Redis connection: curl /health
4. Clear cache if corrupted: redis-cli FLUSHDB
5. Rollback to previous version: git revert / revert deployment
EOF

# ============================================================================
# 10. DOCUMENTATION LOCATION
# ============================================================================

echo "📚 SEE FULL GUIDES AT:"
echo "  - IMPLEMENTATION_SUMMARY.md    (Overview)"
echo "  - DEPLOYMENT.md                (Step-by-step)"
echo "  - backend/REDIS_CONFIG.md      (Detailed config)"
echo "  - backend/RATE_LIMITER_EXAMPLES.ts (More patterns)"
echo ""
echo "✅ You're ready to deploy!"
