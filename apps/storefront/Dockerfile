FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
COPY . .

# Build-time env vars for Next.js client-side bundle
# These MUST be set at build time — Next.js inlines NEXT_PUBLIC_* into the JS bundle
ARG NEXT_PUBLIC_API_URL=https://api.nolimitshopping.com/api/v1
ARG NEXT_PUBLIC_SITE_URL=https://nolimitshopping.com
ARG NEXT_PUBLIC_DEFAULT_LOCALE=bn
ARG NEXT_PUBLIC_SUPPORTED_LOCALES=bn,en

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE
ENV NEXT_PUBLIC_SUPPORTED_LOCALES=$NEXT_PUBLIC_SUPPORTED_LOCALES

RUN pnpm install --frozen-lockfile --filter @ecommarce/storefront...
RUN pnpm --filter @ecommarce/storefront build
EXPOSE 3000
CMD ["pnpm", "--filter", "@ecommarce/storefront", "start"]