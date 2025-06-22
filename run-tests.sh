#!/bin/bash

echo "🚀 Starting microservices test suite..."

# Start test databases
echo "📦 Starting test databases..."
cd deployments/docker-compose
docker compose -f docker-compose.dev.yml up -d db mongo
sleep 10

# Test Account Service
echo "🔐 Testing Account Service..."
cd ../../services/account-service
npm test

# Test Product Service  
echo "📦 Testing Product Service..."
cd ../product-service
npm test

echo "✅ All tests completed!"