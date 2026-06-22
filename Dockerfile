# ─── Stage 1: Build Client ───────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json* ./client/
WORKDIR /app/client
RUN npm ci
COPY client/ .
RUN npm run build

# ─── Stage 2: Build Server ───────────────────────────────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm ci
COPY server/ .
RUN npm run build

# ─── Stage 3: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install only production server deps
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy built assets
WORKDIR /app
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client/dist ./client/dist
COPY server/data ./server/data

# Non-root user
RUN addgroup -g 1001 -S localdrop && \
    adduser -S -u 1001 -G localdrop localdrop
USER localdrop

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server/dist/index.js"]
