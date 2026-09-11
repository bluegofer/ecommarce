FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter @ecommarce/storefront...
RUN pnpm --filter @ecommarce/storefront build
EXPOSE 3000
CMD ["pnpm", "--filter", "@ecommarce/storefront", "start"]