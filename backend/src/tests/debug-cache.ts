/**
 * Debug script to diagnose cache MISS issue
 * Tests Redis connection, cache key generation, and middleware flow
 */

import { redisGet, redisSet, checkRedisHealth, redisLockAcquire, redisDel } from '../config/redis-upstash';
import { createHash } from 'crypto';

// Test 1: Check Redis connectivity
async function testRedisConnection() {
  console.log('\n=== Test 1: Redis Connection ===');
  try {
    const isHealthy = await checkRedisHealth();
    console.log(`✅ Redis Health: ${isHealthy ? 'CONNECTED' : 'DISCONNECTED'}`);
    return isHealthy;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
}

// Test 2: Redis SET and GET operations
async function testRedisOperations() {
  console.log('\n=== Test 2: Redis SET/GET Operations ===');
  try {
    const testKey = 'test:cache:debug:' + Date.now();
    const testData = { products: [{ id: 1, name: 'Test Product' }] };
    
    // SET
    console.log(`Setting key: ${testKey}`);
    const setResult = await redisSet(testKey, JSON.stringify(testData), 60);
    console.log(`✅ SET result: ${setResult}`);
    
    // GET
    console.log(`Getting key: ${testKey}`);
    const getData = await redisGet(testKey);
    console.log(`✅ GET result:`, getData ? 'Found' : 'Not found');
    
    if (getData) {
      const parsed = JSON.parse(getData);
      console.log(`✅ Data matches:`, JSON.stringify(parsed) === JSON.stringify(testData));
    }
    
    // DELETE
    const delResult = await redisDel(testKey);
    console.log(`✅ DEL result: ${delResult} keys deleted`);
    
    return true;
  } catch (error) {
    console.error('❌ Redis operations failed:', error);
    return false;
  }
}

// Test 3: Cache key generation
function testCacheKeyGeneration() {
  console.log('\n=== Test 3: Cache Key Generation ===');
  
  // Simulate request
  const method = 'GET';
  const path = '/all';
  const queryString = '';
  
  const queryHash = queryString
    ? createHash('sha256').update(queryString).digest('hex').slice(0, 12)
    : 'noquery';
  
  const cacheKey = `cache:v2:${method}:${path}:${queryHash}`;
  console.log(`Cache key generated: ${cacheKey}`);
  console.log(`✅ Key format valid: ${cacheKey.startsWith('cache:v2:')}`);
  
  return cacheKey;
}

// Test 4: Full cache flow simulation
async function testFullCacheFlow() {
  console.log('\n=== Test 4: Full Cache Flow Simulation ===');
  
  try {
    // Generate proper cache key for /api/products/all
    const method = 'GET';
    const path = '/api/products/all';
    const queryHash = 'noquery';
    const cacheKey = `cache:v2:${method}:${path}:${queryHash}`;
    const lockKey = `${cacheKey}:lock`;
    
    console.log(`\nStep 1: Clean up from previous tests`);
    await redisDel(cacheKey, lockKey);
    console.log(`✅ Cleanup done`);
    
    console.log(`\nStep 2: Try to get from cache (should miss)`);
    const firstGet = await redisGet(cacheKey);
    console.log(`GET result: ${firstGet ? 'Found (unexpected)' : 'Not found (expected) ✅'}`);
    
    console.log(`\nStep 3: Try to acquire lock`);
    const lockAcquired = await redisLockAcquire(lockKey, 3000);
    console.log(`Lock acquired: ${lockAcquired ? 'YES ✅' : 'NO ❌'}`);
    
    if (lockAcquired) {
      console.log(`\nStep 4: Simulate cache response`);
      const cacheEntry = {
        data: { message: 'Products retrieved successfully', products: [] },
        createdAt: Date.now(),
        ttl: 60,
        stale: 30,
      };
      
      const setSuc = await redisSet(cacheKey, JSON.stringify(cacheEntry), 100);
      console.log(`SET result: ${setSuc ? '✅' : '❌'}`);
      
      console.log(`\nStep 5: Release lock`);
      const lockDeleted = await redisDel(lockKey);
      console.log(`Lock released: ${lockDeleted > 0 ? '✅' : '❌'}`);
      
      console.log(`\nStep 6: Verify cache was set`);
      const verify = await redisGet(cacheKey);
      console.log(`Cache verification: ${verify ? '✅ Cache exists' : '❌ Cache missing'}`);
      
      console.log(`\nStep 7: Clean up`);
      await redisDel(cacheKey);
      console.log(`✅ Cleanup done`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Full cache flow failed:', error);
    return false;
  }
}

// Test 5: Environment variables check
function testEnvironmentVariables() {
  console.log('\n=== Test 5: Environment Variables ===');
  
  const required = [
    'REDIS_URL',
    'UPSTASH_REDIS_REST_URL',
    'REDIS_REST_TOKEN',
  ];
  
  let allSet = true;
  for (const env of required) {
    const value = process.env[env];
    if (value) {
      console.log(`✅ ${env}: SET (first 30 chars: ${value.substring(0, 30)}...)`);
    } else {
      console.log(`❌ ${env}: NOT SET`);
      allSet = false;
    }
  }
  
  // Check optional
  console.log(`\nOptional settings:`);
  console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL || 'not set (defaults to info)'}`);
  console.log(`CACHE_TTL_SECONDS: ${process.env.CACHE_TTL_SECONDS || 'not set (defaults to 60)'}`);
  
  return allSet;
}

// Main run
async function main() {
  console.log('🔍 Cache System Diagnostic Test');
  console.log('================================\n');
  
  // Run all tests
  const envValid = testEnvironmentVariables();
  
  if (!envValid) {
    console.error('\n❌ Environment variables not properly set. Fix these first.');
    process.exit(1);
  }
  
  const connected = await testRedisConnection();
  
  if (!connected) {
    console.error('\n❌ Redis not connected. Check credentials and network.');
    process.exit(1);
  }
  
  await testRedisOperations();
  testCacheKeyGeneration();
  await testFullCacheFlow();
  
  console.log('\n================================');
  console.log('🎯 Diagnostics Complete\n');
}

// Run with error handling
main().catch(console.error);
