FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
COPY . .

# Build-time env vars — Next.js inlines NEXT_PUBLIC_* into the client-side JS bundle.
# These MUST be present at build time; runtime env alone is not enough for
# client components (browser-side fetch reads the baked-in value).
ARG NEXT_PUBLIC_API_URL=https://api.nolimitshopping.com/api/v1
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.nolimitshopping.com

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL

RUN pnpm install --frozen-lockfile --filter @ecommarce/admin...
RUN pnpm --filter @ecommarce/admin build
EXPOSE 3001
CMD ["pnpm", "--filter", "@ecommarce/admin", "start"]