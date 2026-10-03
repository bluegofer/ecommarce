FROM node:20-alpine AS base
RUN apk add --no-cache openssl && corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --filter @ecommarce/api...

FROM deps AS build
COPY . .
RUN pnpm --filter @ecommarce/api prisma:generate && pnpm --filter @ecommarce/api build

FROM base AS runtime
RUN apk add --no-cache openssl curl
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
EXPOSE 4000
CMD ["node", "apps/api/dist/apps/api/src/main.js"]