# ==========================================
# Stage 1: Build TypeScript source code
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors and install all dependencies (including dev)
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and sources
COPY tsconfig.json knexfile.ts ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# ==========================================
# Stage 2: Production runtime image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set default production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Use unprivileged user for security
USER node

# Expose application port
EXPOSE 5000

# Run the compiled server
CMD ["node", "dist/src/server.js"]
