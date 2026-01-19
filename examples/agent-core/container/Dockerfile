# =============================================================================
# AWS Bedrock AgentCore Runtime Container
# 
# Platform: ARM64 (required by AgentCore)
# Port: 8080 (AgentCore HTTP protocol)
# 
# Build: docker build --platform linux/arm64 -t agentcore-runtime .
# Run:   docker run -p 8080:8080 -e AWS_REGION=us-east-1 agentcore-runtime
# =============================================================================

# Use Node.js 20 slim on ARM64
FROM --platform=linux/arm64 node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY *.ts ./

# Build TypeScript
RUN npm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM --platform=linux/arm64 node:20-slim AS production

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Environment variables for AgentCore
ENV NODE_ENV=production
ENV PORT=8080
ENV DOCKER_CONTAINER=1

# Expose AgentCore HTTP port
EXPOSE 8080

# Health check for /ping endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/ping', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the AgentCore server with OpenTelemetry instrumentation
# This enables automatic tracing and metrics collection for AgentCore observability
CMD ["node", "--require", "./dist/tracing.js", "dist/server.js"]
