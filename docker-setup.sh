#!/bin/bash

# Docker Setup Script for Claude Workspace
# This script helps you set up the environment for Docker deployment

set -e

echo "🐳 Claude Workspace - Docker Setup"
echo "===================================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists."
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Existing .env file preserved."
        exit 0
    fi
    rm .env
fi

# Copy from example
echo "📝 Creating .env file from .env.docker.example..."
cp .env.docker.example .env

# Generate random API key
API_KEY=$(openssl rand -hex 32 2>/dev/null || echo "change-this-api-key-$(date +%s)")
echo "🔑 Generated secure API key: $API_KEY"

# Update API key in .env
if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "s/your-secure-api-key-here/$API_KEY/" .env
else
    sed -i '' "s/your-secure-api-key-here/$API_KEY/" .env
fi

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "   - API_ACCESS_KEY: $API_KEY"
echo "   - PORT: 8053"
echo "   - NODE_ENV: production"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Save your API key securely: $API_KEY"
echo "   2. Keep .env file safe and never commit it to git"
echo "   3. You can modify .env to add ANTHROPIC_API_KEY if needed"
echo ""
echo "🚀 Next steps:"
echo "   make build    # Build Docker image"
echo "   make up       # Start containers"
echo "   make logs     # View logs"
echo "   make health   # Check health status"
echo ""
echo "For more information, see DOCKER.md"
