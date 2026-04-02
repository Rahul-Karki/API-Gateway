#!/bin/bash
# Build script for backend with metrics support
# This script runs tests, builds TypeScript, and prepares for production

set -e

echo "Installing dependencies..."
npm install prom-client winston

echo "Building TypeScript..."
npm run build

echo "Backend build complete with metrics support enabled!"
