# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm install


FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_PWA_ICON
ARG NEXT_PUBLIC_SOCIAL_IMAGE
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_PWA_ICON=$NEXT_PUBLIC_PWA_ICON
ENV NEXT_PUBLIC_SOCIAL_IMAGE=$NEXT_PUBLIC_SOCIAL_IMAGE

RUN --mount=type=secret,id=tmdb_read_access_token \
  TMDB_READ_ACCESS_TOKEN="$(cat /run/secrets/tmdb_read_access_token)" npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
