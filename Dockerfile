# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Install dependencies needed for Prisma and update npm
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest

# Copy package files
COPY package.json ./
RUN npm install

# Stage 2: Builder
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies needed for Prisma and update npm
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies needed for Prisma and update npm
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy Prisma binary and its dependencies
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
# Copy esbuild platform-specific dependencies
COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild
# Copy bcryptjs and its dependencies (needed for create-admin.ts)
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/@types/bcryptjs ./node_modules/@types/bcryptjs
# Copy react-draggable and react-resizable (needed for map towers)
COPY --from=builder /app/node_modules/react-draggable ./node_modules/react-draggable
COPY --from=builder /app/node_modules/react-resizable ./node_modules/react-resizable
COPY --from=builder /app/node_modules/@types/react-resizable ./node_modules/@types/react-resizable

# Copy public folder if it exists
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create uploads directories with proper permissions (before switching user)
RUN mkdir -p /app/public/uploads/profiles /app/public/uploads/monsters /app/public/uploads/json && \
    touch /app/public/uploads/favicon.png && \
    chown -R nextjs:nodejs /app/public/uploads && \
    chmod -R 755 /app/public/uploads && \
    chmod 644 /app/public/uploads/favicon.png

# Install Prisma CLI globally for migrations (before switching user)
RUN npm install -g prisma@5.7.1

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

