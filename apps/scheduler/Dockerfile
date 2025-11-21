# ===========================
# Builder stage
# ===========================
FROM node:22-alpine AS builder

WORKDIR /workspace

# Copy root package + lock + Nx config
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
# If you have project.json / workspace.json keep them too
# COPY workspace.json ./
# or if you use project.json per app in root, they’ll be copied later with the rest

# Install deps (with devDeps for build)
RUN npm ci

# Copy the rest of the monorepo
COPY . .

# Build this app with Nx (production)
RUN npx nx build scheduler --configuration=production

# ===========================
# Runtime stage
# ===========================
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install only prod deps (from root)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app from builder
COPY --from=builder /workspace/apps/scheduler/dist ./dist/apps/scheduler

# Scheduler HTTP port
EXPOSE 3007

# NestJS entrypoint (Nx default output)
CMD ["node", "dist/apps/scheduler/main.js"]