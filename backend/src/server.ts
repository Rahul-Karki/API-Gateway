import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import authRouter from './auth/routers/auth.route';
import productRouter from './products/router/product.route';
import { connectDB } from './config/db';
import refreshRouter from './auth/routers/refresh.route';
import cookieParser from 'cookie-parser';

import { httpInstrumentation } from './observability/middleware/httpMiddleware';
import { errorHandler } from './observability/middleware/errorMiddlware';
import { logger } from './observability/observability';
import { createRateLimiter } from './middleware/distributed-rate-limit';
import { checkRedisHealth, closeRedis } from './config/redis-upstash';

const app = express();

// Trust proxy for accurate IP detection (important for rate limiting)
// Adjust based on your deployment: 1 for direct, 'cloudflare' for Cloudflare, etc.
app.set('trust proxy', process.env.TRUST_PROXY || 1);

app.use(httpInstrumentation);

app.use(express.json());
app.use(cookieParser());

// Category B (semi-dynamic): high-throughput rate limit
const semiDynamicLimiter = createRateLimiter({
  points: Number(process.env.RATE_LIMIT_SEMI_DYNAMIC_POINTS || 1000),
  duration: Number(process.env.RATE_LIMIT_SEMI_DYNAMIC_DURATION || 60),
  prefix: 'rl:semi-dynamic',
});

// Category C (dynamic): stricter rate limit
const dynamicLimiter = createRateLimiter({
  points: Number(process.env.RATE_LIMIT_DYNAMIC_POINTS || 100),
  duration: Number(process.env.RATE_LIMIT_DYNAMIC_DURATION || 60),
  prefix: 'rl:dynamic',
});

// Apply category-aware API rate limiting
app.use((req, res, next) => {
  if (req.path.startsWith('/health') || req.path === '/') {
    return next();
  }

  // Category B: product catalog routes
  if (req.path.startsWith('/api/products')) {
    return semiDynamicLimiter(req, res, next);
  }

  // Category C: everything else
  return dynamicLimiter(req, res, next);
});

const PORT = process.env.PORT || 5000;

/**
 * Health check endpoint - for load balancers and monitoring
 * Returns Redis and DB connection status
 */
app.get('/health', async (req, res) => {
  try {
    const redisHealth = await checkRedisHealth();
    const status = redisHealth ? 'healthy' : 'degraded';
    
    res.status(redisHealth ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth ? 'connected' : 'disconnected',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/', (req, res) => {
  res.send("Welcome to the Authentication API");
});

connectDB();

// Auth routes (dynamic, no-store + strict limiter in auth router)
app.use('/api/auth', authRouter);

// Product routes (semi-dynamic edge/browser strategy, no Redis response cache)
app.use('/api/products', productRouter);

// Other routes
app.use('/api', refreshRouter);

app.use(errorHandler);

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await closeRedis();
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, starting graceful shutdown...');
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await closeRedis();
      process.exit(0);
    });
  }
});

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});


