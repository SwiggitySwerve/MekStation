# BattleTech Editor - Production Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm rebuild better-sqlite3

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy data files (units, equipment)
COPY --from=builder /app/public/data ./public/data
COPY --from=builder /app/public/record-sheets ./public/record-sheets

# Create data directory for SQLite and set permissions
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
