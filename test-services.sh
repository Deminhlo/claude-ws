#!/bin/bash

# Test script for Admin Panel and Main App
set -e

echo "🧪 Testing Services..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name=$1
  local url=$2
  local expected_code=${3:-200}

  echo -n "Testing $name... "

  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$response" = "$expected_code" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC} (HTTP $response, expected $expected_code)"
    return 1
  fi
}

# Check if services are running
check_service() {
  local name=$1
  local port=$2

  echo -n "Checking $name on port $port... "

  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ RUNNING${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠ NOT RUNNING${NC}"
    return 1
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Service Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_service "Admin Panel" 3001 || true
check_service "Main App" 8053 || true
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Admin Panel Health" "http://localhost:3001/api/health"
test_endpoint "Main App Root" "http://localhost:8053/"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 API Endpoints (requires API key)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get API key from .env
if [ -f "packages/admin-panel/.env" ]; then
  API_KEY=$(grep API_ACCESS_KEY packages/admin-panel/.env | cut -d '=' -f2)
  if [ -n "$API_KEY" ]; then
    echo "Using API key from packages/admin-panel/.env"
    test_endpoint "Admin Dashboard API" "http://localhost:3001/api/admin/dashboard"
  else
    echo -e "${YELLOW}⚠ API_ACCESS_KEY not found in .env${NC}"
  fi
else
  echo -e "${YELLOW}⚠ packages/admin-panel/.env not found${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Access URLs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Admin Panel UI:    http://localhost:3001/admin"
echo "Admin Panel API:   http://localhost:3001/api/admin/*"
echo "Main App:          http://localhost:8053"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Test Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
