# Multi-stage build for Claude Workspace
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/app/data
ENV CLAUDE_WS_SKIP_DB_INIT=1

# Generate Prisma client (if needed)
# RUN pnpm prisma generate

# Build Next.js application
RUN pnpm build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat python3 make g++ sqlite git

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Claude Agent SDK shells out to Claude Code CLI (`claude` binary).
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/locales ./locales

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/packages/agentic-sdk ./packages/agentic-sdk
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy server entry point and source code
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/bin ./bin
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8053
ENV DATA_DIR=/app/data
ENV CLAUDE_PATH=/usr/local/bin/claude

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8053

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8053/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["pnpm", "start"]
