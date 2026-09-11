FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter @ecommarce/admin...
RUN pnpm --filter @ecommarce/admin build
EXPOSE 3001
CMD ["pnpm", "--filter", "@ecommarce/admin", "start"]