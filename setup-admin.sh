#!/bin/bash

# Setup Admin Panel Script
set -e

echo "🚀 Setting up Admin Panel..."

# Create .env file for admin panel
cd packages/admin-panel

if [ ! -f .env ]; then
    echo "📝 Creating .env file..."

    # Generate API key
    API_KEY=$(openssl rand -hex 32)

    cat > .env << EOF
# Admin Panel Environment Variables
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# API Access Key (for Admin API authentication)
API_ACCESS_KEY=$API_KEY

# Database
DATABASE_PATH=./data/admin.db

# Docker Configuration
DOCKER_SOCKET_PATH=/var/run/docker.sock

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Pool Configuration
POOL_SIZE=5
IDLE_TIMEOUT_SECONDS=86400
EOF

    echo "✅ .env file created!"
    echo "🔑 API Access Key: $API_KEY"
else
    echo "ℹ️  .env file already exists, skipping..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create data directory
mkdir -p data

echo "✅ Admin Panel setup complete!"
echo ""
echo "🎯 Available commands:"
echo "  pnpm dev              - Start development server (port 3001)"
echo "  pnpm build            - Build for production"
echo "  pnpm start            - Start production server"
echo ""
echo "🌐 Access Admin Panel: http://localhost:3001"
