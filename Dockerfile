FROM node:20-alpine AS base

# Cai thu vien he thong can cho mot so package native khi chay tren Alpine.
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_LOCAL_API_URL=http://localhost:5122/api
ENV NEXT_PUBLIC_LOCAL_API_URL=$NEXT_PUBLIC_LOCAL_API_URL
ARG API_REWRITE_TARGET=http://localhost:5122
ENV API_REWRITE_TARGET=$API_REWRITE_TARGET

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Thu muc cache runtime cho Next.js, can quyen ghi cua user nextjs.
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
