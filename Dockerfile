FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app

# Dependencies

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

# Builder

FROM base AS builder

COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma/
COPY tsconfig.json tsoa.json prisma.config.ts ./
COPY src ./src/

RUN pnpm build

# Runner

FROM base AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 app \
 && adduser --system --uid 1001 app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder --chown=app:app /app/build ./build
COPY --from=builder --chown=app:app /app/generated ./generated
COPY --chown=app:app prisma ./prisma

RUN chown -R app:app /app

USER app

EXPOSE 3000
CMD ["node", "build/src/server.js"]
