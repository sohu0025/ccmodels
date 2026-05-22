# Stage 1: Install dependencies + build
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/server/tsconfig.json ./apps/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/server/src ./apps/server/src
COPY apps/server/prisma ./apps/server/prisma

RUN pnpm --filter @ccmodels/shared build
RUN cd apps/server && npx prisma generate
RUN pnpm --filter @ccmodels/server build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/shared ./packages/shared

# Install production deps only (workspace protocol resolves from lockfile)
RUN pnpm install --frozen-lockfile --prod 2>/dev/null || pnpm install --frozen-lockfile

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma

RUN cd apps/server && npx prisma generate

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/system-providers || exit 1

CMD ["node", "apps/server/dist/main"]
