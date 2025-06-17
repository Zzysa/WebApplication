#!/bin/bash

echo "Setting up development environment..."

echo "Stopping and removing existing containers..."
cd deployments/docker-compose
docker compose -f docker-compose.dev.yml down -v

echo "Starting databases first..."
docker compose -f docker-compose.dev.yml up -d db mongo

echo "Waiting for databases to be ready..."
sleep 15

echo "Building and starting all services..."
docker compose -f docker-compose.dev.yml up -d --build

echo "Waiting for services to be ready..."
sleep 20

echo "Seeding PostgreSQL database..."
docker compose -f docker-compose.dev.yml exec account-service npm run seed

echo "Seeding MongoDB database..."
docker compose -f docker-compose.dev.yml exec product-service npm run seed

echo "All services are now running in the background!"
echo ""
echo "=== DEVELOPMENT ENVIRONMENT READY ==="
echo "Admin user: test@test.com / 123456"
echo "Client user: client@test.com / 123456"
echo "App URL: http://localhost:3000"
echo "Mongo Express: http://localhost:8081 (admin/pass)"
echo ""
echo "To view logs: docker compose -f docker-compose.dev.yml logs -f"
echo "To stop: docker compose -f docker-compose.dev.yml down"