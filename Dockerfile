# MekStation - Production Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files and install ALL dependencies (including dev for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application and hydrate .next/standalone/server.js with the
# multiplayer-aware custom server used by npm run start.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# =============================================================================
# Stage 2: Production Runner
# =============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3600
ENV HOSTNAME="0.0.0.0"
# Exact container-only opt-in for the all-interfaces bind (server.js). Without
# it the packaged server accepts only the 127.0.0.1 loopback listener.
# Publish the port on the host's loopback only (-p 127.0.0.1:3600:3600, as
# docker-compose.yml and npm run docker:run do). Remote or LAN access is not
# supported: the same-host guard trusts a loopback Host header and the local
# API has no network authentication. Inside the container the server listens
# on 0.0.0.0, so containers sharing its Docker network can also reach it.
ENV MEKSTATION_CONTAINER_LISTEN=all-interfaces

# Copy necessary files from builder. public/ already includes data/ (units,
# equipment) and record-sheets/, so they are not copied a second time.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create data directory for SQLite and set permissions
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3600

# Health check. 127.0.0.1, not localhost: localhost resolves to ::1 in this
# image while the listener binds IPv4 0.0.0.0, and 127.0.0.1 is a loopback
# Host the same-host guard admits.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3600/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
