#!/bin/bash

# Microservices Database Migration Script
# Run all service migrations in sequence

set -e  # Exit on error

echo "🚀 Starting database migrations for all services..."
echo ""

services=("gateway" "analytics" "assignment" "commission" "leadIngest" "notification" "payment" "scheduler" "worker")

for service in "${services[@]}"; do
  echo "📦 Migrating $service service..."
  npm run prisma:migrate:$service
  echo "✅ $service migration complete"
  echo ""
done

echo "🎉 All migrations completed successfully!"

