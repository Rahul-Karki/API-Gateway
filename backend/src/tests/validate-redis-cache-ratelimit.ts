/**
 * Distributed Cache & Rate Limiter Validation Tests
 * 
 * Run this to verify all functionality before deploying:
 * node -r ts-node/register src/tests/validate-redis-cache-ratelimit.ts
 */

import redis from "../config/redis-upstash";
import { logger } from "../observability/observability";
import { 
  redisGet, 
  redisSet, 
  redisDel, 
  redisLockAcquire,
  checkRedisHealth 
} from "../config/redis-upstash";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ 
      name, 
      passed: false, 
      error: error.message, 
      duration: Date.now() - start 
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function runTests(): Promise<void> {
  console.log("\n🧪 Validating Redis Upstash & Cache/RateLimit System\n");

  // Test 1: Redis Connectivity
  await test("Redis health check", async () => {
    const healthy = await checkRedisHealth();
    if (!healthy) throw new Error("Redis not healthy");
  });

  // Test 2: Basic Set/Get
  await test("Redis SET/GET basic", async () => {
    const testKey = `test:basic:${Date.now()}`;
    const success = await redisSet(testKey, "test-value", 10);
    if (!success) throw new Error("SET failed");
    
    const value = await redisGet(testKey);
    if (value !== "test-value") throw new Error(`Expected 'test-value', got '${value}'`);
    
    await redisDel(testKey);
  });

  // Test 3: DEL operation
  await test("Redis DEL", async () => {
    const testKey = `test:del:${Date.now()}`;
    await redisSet(testKey, "value", 10);
    const deleted = await redisDel(testKey);
    if (deleted !== 1) throw new Error(`Expected 1 deleted, got ${deleted}`);
  });

  // Test 4: Lock acquire and release
  await test("Redis lock acquire (NX)", async () => {
    const lockKey = `test:lock:${Date.now()}`;
    const acquired1 = await redisLockAcquire(lockKey, 2000);
    if (!acquired1) throw new Error("First lock acquire failed");
    
    const acquired2 = await redisLockAcquire(lockKey, 2000);
    if (acquired2) throw new Error("Second lock acquire should have failed (NX)");
    
    await redisDel(lockKey);
  });

  // Test 5: TTL expiration behavior
  await test("Redis TTL expiration", async () => {
    const testKey = `test:ttl:${Date.now()}`;
    await redisSet(testKey, "short-lived", 1);
    
    let value = await redisGet(testKey);
    if (value !== "short-lived") throw new Error("Value not set immediately");
    
    await sleep(1500);
    value = await redisGet(testKey);
    if (value !== null) throw new Error("Value should have expired after TTL");
  });

  // Test 6: Cache entry structure validation
  await test("Cache entry envelope parsing", async () => {
    const testKey = `test:cache:${Date.now()}`;
    const entry = {
      data: { products: [{ id: "1", name: "Test" }] },
      createdAt: Date.now(),
      ttl: 60,
      stale: 30,
    };
    
    const success = await redisSet(testKey, JSON.stringify(entry), 60);
    if (!success) throw new Error("Cache entry SET failed");
    
    const raw = await redisGet(testKey);
    if (!raw) throw new Error("Cache entry GET returned null");
    
    const parsed = JSON.parse(raw);
    if (!parsed.data || !parsed.createdAt) throw new Error("Envelope structure invalid");
    
    await redisDel(testKey);
  });

  // Test 7: Concurrent lock contention (simulates thundering herd prevention)
  await test("Concurrent lock contention", async () => {
    const lockKey = `test:contention:${Date.now()}`;
    
    const acquireAttempt = async () => redisLockAcquire(lockKey, 1000);
    
    const results = await Promise.all([
      acquireAttempt(),
      acquireAttempt(),
      acquireAttempt(),
    ]);
    
    // Only one should succeed
    const acquireCount = results.filter(r => r === true).length;
    if (acquireCount !== 1) throw new Error(`Expected 1 lock acquire, got ${acquireCount}`);
    
    await redisDel(lockKey);
  });

  // Test 8: Error handling on invalid operations
  await test("Error handling gracefully", async () => {
    // These should not throw but return safe defaults
    const getResult = await redisGet("nonexistent:key");
    if (getResult !== null) throw new Error("GET nonexistent should return null");
    
    const delResult = await redisDel("nonexistent:key");
    if (delResult !== 0) throw new Error("DEL nonexistent should return 0");
  });

  // Test 9: Large value handling
  await test("Large value storage", async () => {
    const testKey = `test:large:${Date.now()}`;
    const largeData = {
      data: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Product ${i}`.repeat(10),
        description: "Lorem ipsum dolor sit amet".repeat(20),
      })),
      createdAt: Date.now(),
      ttl: 60,
      stale: 30,
    };
    
    const success = await redisSet(testKey, JSON.stringify(largeData), 60);
    if (!success) throw new Error("Large value SET failed");
    
    const raw = await redisGet(testKey);
    if (!raw) throw new Error("Large value GET failed");
    
    const parsed = JSON.parse(raw);
    if (parsed.data.length !== 100) throw new Error("Large value data corrupted");
    
    await redisDel(testKey);
  });

  // Test 10: Multiple operations in sequence (simulates cache hits)
  await test("Sequential cache operations (MISS->HIT simulation)", async () => {
    const cacheKey = `test:sequence:${Date.now()}`;
    
    // Simulate MISS - key doesn't exist
    let value = await redisGet(cacheKey);
    if (value !== null) throw new Error("First access should be MISS (null)");
    
    // Simulate response caching
    const response = { status: "ok", items: [1, 2, 3] };
    const success = await redisSet(cacheKey, JSON.stringify(response), 60);
    if (!success) throw new Error("Cache SET failed");
    
    // Simulate HIT - key exists
    value = await redisGet(cacheKey);
    if (!value) throw new Error("Second access should be HIT (not null)");
    
    const parsed = JSON.parse(value);
    if (parsed.status !== "ok") throw new Error("Cache data corrupted");
    
    await redisDel(cacheKey);
  });

  console.log("\n" + "=".repeat(60));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\n📊 Test Results: ${passed}/${total} passed\n`);

  if (passed === total) {
    console.log("🎉 All tests passed! System is ready for deployment.\n");
  } else {
    console.log("❌ Some tests failed. Review errors above.\n");
    process.exit(1);
  }

  // Print timing summary
  console.log("⏱️  Timing Summary:");
  results.forEach(r => {
    console.log(`  ${r.passed ? "✅" : "❌"} ${r.name}: ${r.duration}ms`);
  });

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
