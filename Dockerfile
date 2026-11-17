# Gebeta production image (Docker / Railway)
# One Next.js process + durable DATA_DIR volume for data/db.json.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /data \
  && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

# Windows checkouts may use CRLF; Linux needs LF for the shebang.
RUN sed -i 's/\r$//' ./scripts/docker-entrypoint.sh \
  && chmod +x ./scripts/docker-entrypoint.sh

# Entrypoint starts as root so it can chown the mounted volume, then drops to nextjs.
# Do not add Dockerfile VOLUME — Railway bans it; attach a Railway volume at /data instead.
# Healthcheck path is configured in railway.json (/).
EXPOSE 3000

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
