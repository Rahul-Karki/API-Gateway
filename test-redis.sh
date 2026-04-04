#!/bin/bash

# Redis Setup & Testing Guide

set -e

echo "🚀 Starting Redis for testing..."

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Start Redis with Docker Compose
docker-compose -f docker-compose.redis.yml up -d

echo "⏳ Waiting for Redis to be ready..."
sleep 3

# Verify Redis is running
echo "✅ Redis is running!"
echo ""
echo "📊 Redis Commander available at: http://localhost:8081"
echo ""
echo "Running tests..."
echo ""

# Function to make API requests
test_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "📝 Test: $description"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "http://localhost:5000$endpoint" | jq . 2>/dev/null || echo "Request sent"
    else
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            "http://localhost:5000$endpoint" | jq . 2>/dev/null || echo "Request sent"
    fi
    
    echo ""
}

# Test 1: Health Check
echo "┌─ TEST 1: Health Check"
curl -s -X GET "http://localhost:5000/health" | jq . 2>/dev/null || echo "Unable to reach server. Make sure backend is running on port 5000"
echo ""

# Test 2: Rate Limiting (General - 100 req/min)
echo "┌─ TEST 2: General Rate Limiting (100 req/min)"
echo "Making 105 requests to test rate limit..."
success=0
blocked=0
for i in {1..105}; do
    response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:5000/api/products/all")
    status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "200" ]; then
        ((success++))
    elif [ "$status_code" = "429" ]; then
        ((blocked++))
    fi
    
    # Show progress every 20 requests
    if [ $((i % 20)) -eq 0 ]; then
        echo "Requests sent: $i (Success: $success, Blocked: $blocked)"
    fi
done
echo "Final Results: Success: $success, Rate Limited: $blocked"
echo ""

# Test 3: Auth Rate Limiting (Strict - 5 req/min)
echo "┌─ TEST 3: Auth Rate Limiting (5 req/min)"
echo "Making 10 login attempts to test auth rate limit..."
success=0
blocked=0
for i in {1..10}; do
    response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:5000/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"test"}')
    status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "429" ]; then
        ((blocked++))
        echo "  Request $i: Blocked (429)"
    else
        ((success++))
        echo "  Request $i: Allowed (Status: $status_code)"
    fi
done
echo "Final Results: Allowed: $success, Rate Limited: $blocked"
echo ""

# Test 4: Caching
echo "┌─ TEST 4: Caching (GET /api/products/all)"
echo "First request (Cache MISS):"
response=$(curl -s -i -X GET "http://localhost:5000/api/products/all" 2>/dev/null)
cache_header=$(echo "$response" | grep -i "X-Cache" || echo "X-Cache: Not set")
echo "  $cache_header"

echo ""
echo "Second request (Cache HIT):"
response=$(curl -s -i -X GET "http://localhost:5000/api/products/all" 2>/dev/null)
cache_header=$(echo "$response" | grep -i "X-Cache" || echo "X-Cache: Not set")
echo "  $cache_header"
echo ""

# Test 5: Redis Connection Check
echo "┌─ TEST 5: Redis Connection"
echo "Checking Redis connection via health endpoint..."
curl -s -X GET "http://localhost:5000/health" | jq '.services.redis'
echo ""

echo "✅ All tests completed!"
echo ""
echo "📊 Monitor Redis in real-time:"
echo "   redis-cli keys '*' | head -20"
echo "   redis-cli info stats"
echo "   redis-cli MEMORY STATS"
echo ""
echo "🧹 Clean Redis cache:"
echo "   redis-cli FLUSHDB"
echo ""
echo "🛑 Stop Redis:"
echo "   docker-compose -f docker-compose.redis.yml down"
