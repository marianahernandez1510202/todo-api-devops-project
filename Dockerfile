# Multi-stage build for Todo API
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --include=dev && npm cache clean --force

# Copy source code
COPY . .

# Run linting and tests (optional, comment out if causing issues)
# RUN npm run lint
# RUN npm test

# Remove development dependencies and files
RUN npm prune --production && \
    rm -rf tests/ docs/ .github/ .git/ .gitignore README.md

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./
COPY --from=builder --chown=nodejs:nodejs /app/database ./database

# Copy additional necessary files
COPY --chown=nodejs:nodejs .env.example ./

# Create logs directory
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]

# Alternative optimized single-stage build (uncomment if multi-stage causes issues)
# FROM node:18-alpine
# 
# # Install system dependencies
# RUN apk add --no-cache curl
# 
# # Set working directory
# WORKDIR /app
# 
# # Create non-root user
# RUN addgroup -g 1001 -S nodejs && \
#     adduser -S nodejs -u 1001
# 
# # Copy package files
# COPY package*.json ./
# 
# # Install dependencies
# RUN npm ci --only=production && npm cache clean --force
# 
# # Copy application code
# COPY --chown=nodejs:nodejs . .
# 
# # Remove unnecessary files
# RUN rm -rf tests/ docs/ .github/ .git/ .gitignore README.md node_modules/.cache/
# 
# # Switch to non-root user
# USER nodejs
# 
# # Expose port
# EXPOSE 3000
# 
# # Health check
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#   CMD curl -f http://localhost:3000/health || exit 1
# 
# # Start application
# CMD ["npm", "start"]