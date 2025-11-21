#!/bin/bash

# Microservices Database Setup Script
# Creates all databases required for the microservices architecture
# Supports both Docker and local PostgreSQL

set -e  # Exit on error

echo "🗄️  Setting up databases for microservices..."
echo ""

# Check if Docker is being used
if docker ps --format "{{.Names}}" | grep -q "^postgres$"; then
  echo "🐳 Detected PostgreSQL running in Docker container 'postgres'"
  USE_DOCKER=true
  DB_USER="${DB_USER:-app}"
  DB_CONTAINER="postgres"
else
  echo "💻 Using local PostgreSQL"
  USE_DOCKER=false
  DB_USER="${DB_USER:-postgres}"
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
fi

databases=(
  "gateway_db"
  "lead_ingest_db"
  "assignment_db"
  "commission_db"
  "payment_db"
  "analytics_db"
  "notification_db"
  "scheduler_db"
  "worker_db"
)

echo ""
echo "Creating ${#databases[@]} databases..."
echo ""

for db in "${databases[@]}"; do
  echo "📦 Creating database: $db"
  
  if [ "$USE_DOCKER" = true ]; then
    # Use Docker exec
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $db;" 2>/dev/null || echo "   ⚠️  Database $db already exists, skipping..."
  else
    # Use local psql
    psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "CREATE DATABASE $db;" 2>/dev/null || echo "   ⚠️  Database $db already exists, skipping..."
  fi
done

echo ""
echo "✅ Database setup complete!"
echo ""

if [ "$USE_DOCKER" = true ]; then
  echo "📝 Database connection info (for .env):"
  echo "   Host: localhost (from host) or postgres (from Docker)"
  echo "   Port: 5432"
  echo "   User: $DB_USER"
  echo "   Example: GATEWAY_DATABASE_URL=\"postgresql://$DB_USER:$DB_USER@localhost:5432/gateway_db?schema=public\""
else
  echo "📝 Database connection info (for .env):"
  echo "   Host: $DB_HOST"
  echo "   Port: $DB_PORT"
  echo "   User: $DB_USER"
  echo "   Example: GATEWAY_DATABASE_URL=\"postgresql://$DB_USER@$DB_HOST:$DB_PORT/gateway_db?schema=public\""
fi

echo ""
echo "Next steps:"
echo "1. Update your .env file with database URLs"
echo "2. Run: npm run prisma:generate"
echo "3. Run: ./scripts/migrate-all.sh"
echo "4. Start your services!"

