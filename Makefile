.PHONY: help build up down restart logs shell clean test

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_FILE := docker-compose.yml
DOCKER_COMPOSE := docker-compose
APP_NAME := claude-workspace

## help: Display this help message
help:
	@echo "Claude Workspace - Docker Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## build: Build Docker image
build:
	@echo "Building Docker image..."
	$(DOCKER_COMPOSE) build

## up: Start containers in detached mode
up:
	@echo "Starting containers..."
	$(DOCKER_COMPOSE) up -d
	@echo "✅ Application started at http://localhost:8053"

## down: Stop and remove containers
down:
	@echo "Stopping containers..."
	$(DOCKER_COMPOSE) down

## restart: Restart containers
restart:
	@echo "Restarting containers..."
	$(DOCKER_COMPOSE) restart
	@echo "✅ Application restarted"

## logs: Show container logs
logs:
	$(DOCKER_COMPOSE) logs -f --tail=100

## logs-app: Show only application logs
logs-app:
	$(DOCKER_COMPOSE) logs -f --tail=100 $(APP_NAME)

## shell: Open shell in container
shell:
	$(DOCKER_COMPOSE) exec $(APP_NAME) sh

## shell-root: Open root shell in container
shell-root:
	$(DOCKER_COMPOSE) exec -u root $(APP_NAME) sh

## ps: Show running containers
ps:
	$(DOCKER_COMPOSE) ps

## stats: Show container resource usage
stats:
	$(DOCKER_COMPOSE) stats

## clean: Remove containers, volumes, and images
clean:
	@echo "Cleaning up..."
	$(DOCKER_COMPOSE) down -v --rmi all --remove-orphans
	@echo "✅ Cleanup complete"

## rebuild: Rebuild and restart containers
rebuild:
	@echo "Rebuilding containers..."
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d
	@echo "✅ Application rebuilt and started"

## test: Run API tests against running container
test:
	@echo "Running API tests..."
	@cd tests && npx tsx run-api-test.ts

## dev: Start in development mode (hot reload)
dev:
	@echo "Starting development mode..."
	NODE_ENV=development $(DOCKER_COMPOSE) up

## production: Build and start in production mode
production: build up
	@echo "✅ Production environment started"

## install: Install dependencies locally
install:
	@echo "Installing dependencies..."
	pnpm install

## local-dev: Run locally without Docker
local-dev:
	@echo "Starting local development server..."
	pnpm dev

## health: Check application health
health:
	@echo "Checking application health..."
	@if [ -f .env ]; then \
		API_KEY=$$(grep API_ACCESS_KEY .env | cut -d '=' -f2); \
		curl -s -H "x-api-key: $$API_KEY" http://localhost:8053/api/search/files?basePath=/app&limit=1 > /dev/null && echo "✅ Application is healthy" || echo "❌ Health check failed"; \
	else \
		echo "❌ .env file not found. Run 'make setup' first."; \
	fi

## setup-docker: Interactive Docker environment setup
setup-docker:
	@echo "Running Docker setup script..."
	@./docker-setup.sh

## setup: Initial setup (install dependencies and build)
setup:
	@if [ ! -f .env ]; then \
		echo "Creating .env file from .env.docker.example..."; \
		cp .env.docker.example .env; \
		echo "⚠️  Please edit .env and set your API_ACCESS_KEY before starting!"; \
	else \
		echo "✅ .env file already exists"; \
	fi
	@$(MAKE) install
	@$(MAKE) build
	@echo "✅ Setup complete. Edit .env and run 'make up' to start the application."
