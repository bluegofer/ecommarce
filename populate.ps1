# ============================================================
#  populate.ps1 - Step 0 remaining files
#  Run: powershell -ExecutionPolicy Bypass -File populate.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
$root = 'C:\ecommerce\ecommarce'
Set-Location $root

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Populating remaining Step 0 files" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Write-File($path, $content) {
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $content | Set-Content -Path $path -Encoding UTF8 -NoNewline
    Write-Host "  [OK] $path" -ForegroundColor Green
}

# ============================================================
# 1. packages/types/src/index.ts  (overwrite)
# ============================================================
Write-File "$root\packages\types\src\index.ts" @'
export type Poisha = number;

export interface Money {
  amount: Poisha;
  currency: 'BDT';
}

export type Locale = 'bn' | 'en';

export * from './auth';
'@

# ============================================================
# 2. packages/mock-reference/README.md
# ============================================================
Write-File "$root\packages\mock-reference\README.md" @'
# Mock Reference - READ ONLY

Extracted from DOC-20260911-WA0004.zip. 14 HTML pages + style.css.

**NEVER imported by the build.** Visual design reference only.

Mock titles use the placeholder wordmark "Bluegofer.com" - the final brand name
comes from docs/DECISIONS.md (default: **SkyMart**).
'@

# ============================================================
# 3. apps/api/package.json
# ============================================================
Write-File "$root\apps\api\package.json" @'
{
  "name": "@ecommarce/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@ecommarce/types": "workspace:*",
    "@nestjs/common": "^10.4.4",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.4",
    "@nestjs/platform-express": "^10.4.4",
    "@nestjs/swagger": "^7.4.2",
    "@prisma/client": "^5.20.0",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "helmet": "^8.0.0",
    "ioredis": "^5.4.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@ecommarce/config": "workspace:*",
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.4",
    "@types/bcrypt": "^5.0.2",
    "@types/jest": "^29.5.13",
    "@types/node": "^22.7.4",
    "jest": "^29.7.0",
    "prisma": "^5.20.0",
    "ts-jest": "^29.2.5",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3"
  }
}
'@

# ============================================================
# 4. apps/api/tsconfig.json
# ============================================================
Write-File "$root\apps\api\tsconfig.json" @'
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
'@

# ============================================================
# 5. apps/api/nest-cli.json
# ============================================================
Write-File "$root\apps\api\nest-cli.json" @'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
'@

# ============================================================
# 6. apps/api/.eslintrc.cjs
# ============================================================
Write-File "$root\apps\api\.eslintrc.cjs" @'
module.exports = {
  ...require('@ecommarce/config/eslint'),
  ignorePatterns: ['dist', 'node_modules'],
};
'@

# ============================================================
# 7. apps/api/jest.config.cjs
# ============================================================
Write-File "$root\apps\api\jest.config.cjs" @'
module.exports = {
  ...require('@ecommarce/config/jest'),
  roots: ['<rootDir>/src'],
};
'@

# ============================================================
# 8. apps/api/Dockerfile
# ============================================================
Write-File "$root\apps\api\Dockerfile" @'
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --filter @ecommarce/api...

FROM deps AS build
COPY . .
RUN pnpm --filter @ecommarce/api prisma:generate && pnpm --filter @ecommarce/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
'@

# ============================================================
# 9. apps/api/prisma/schema.prisma
# ============================================================
Write-File "$root\apps\api\prisma\schema.prisma" @'
// Schema grows step by step. Step 2 = auth/RBAC/audit/outbox.
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
'@

# ============================================================
# 10. apps/api/src/main.ts
# ============================================================
Write-File "$root\apps\api\src\main.ts" @'
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const prefix = process.env.API_GLOBAL_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(prefix);
  app.use(helmet());
  app.enableCors({
    origin: [process.env.APP_BASE_URL, process.env.ADMIN_BASE_URL].filter(Boolean) as string[],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ecommarce API')
    .setDescription('Versioned REST API for storefront + admin')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(Number(process.env.API_PORT ?? 4000));
}
void bootstrap();
'@

# ============================================================
# 11. apps/api/src/app.module.ts
# ============================================================
Write-File "$root\apps\api\src\app.module.ts" @'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './common/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] })],
  controllers: [HealthController],
})
export class AppModule {}
'@

# ============================================================
# 12. apps/api/src/common/health.controller.ts
# ============================================================
Write-File "$root\apps\api\src\common\health.controller.ts" @'
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
'@

# ============================================================
# STOREFRONT
# ============================================================
Write-File "$root\apps\storefront\package.json" @'
{
  "name": "@ecommarce/storefront",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "echo no-tests-yet"
  },
  "dependencies": {
    "@ecommarce/types": "workspace:*",
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@ecommarce/config": "workspace:*",
    "@types/node": "^22.7.4",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.6.3"
  }
}
'@

Write-File "$root\apps\storefront\next.config.mjs" @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ecommarce/types'],
  images: {
    formats: ['image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};
export default nextConfig;
'@

Write-File "$root\apps\storefront\tsconfig.json" @'
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "noEmit": true,
    "allowJs": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'@

Write-File "$root\apps\storefront\next-env.d.ts" @'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
'@

Write-File "$root\apps\storefront\Dockerfile" @'
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter @ecommarce/storefront...
RUN pnpm --filter @ecommarce/storefront build
EXPOSE 3000
CMD ["pnpm", "--filter", "@ecommarce/storefront", "start"]
'@

Write-File "$root\apps\storefront\src\app\layout.tsx" @'
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkyMart - Online Shopping in Bangladesh',
  description: 'SkyMart placeholder storefront. Step 7 builds the real design system.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
'@

Write-File "$root\apps\storefront\src\app\page.tsx" @'
export default function HomePage() {
  return (
    <main>
      <h1>SkyMart</h1>
      <p>Storefront bootstrap - Step 0. Real pages arrive in Step 8.</p>
    </main>
  );
}
'@

# ============================================================
# ADMIN
# ============================================================
Write-File "$root\apps\admin\package.json" @'
{
  "name": "@ecommarce/admin",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "echo no-tests-yet"
  },
  "dependencies": {
    "@ecommarce/types": "workspace:*",
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@ecommarce/config": "workspace:*",
    "@types/node": "^22.7.4",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.6.3"
  }
}
'@

Write-File "$root\apps\admin\next.config.mjs" @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ecommarce/types'],
};
export default nextConfig;
'@

Write-File "$root\apps\admin\tsconfig.json" @'
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "noEmit": true,
    "allowJs": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'@

Write-File "$root\apps\admin\next-env.d.ts" @'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
'@

Write-File "$root\apps\admin\Dockerfile" @'
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter @ecommarce/admin...
RUN pnpm --filter @ecommarce/admin build
EXPOSE 3001
CMD ["pnpm", "--filter", "@ecommarce/admin", "start"]
'@

Write-File "$root\apps\admin\src\app\layout.tsx" @'
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin - SkyMart',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
'@

Write-File "$root\apps\admin\src\app\page.tsx" @'
export default function AdminHomePage() {
  return (
    <main>
      <h1>SkyMart Admin</h1>
      <p>Admin console bootstrap - Step 0. Real dashboard arrives in Step 9.</p>
    </main>
  );
}
'@

# ============================================================
# docs
# ============================================================
Write-File "$root\docs\DECISIONS.md" @'
# DECISIONS

Every open question + its answer. Workflow section 3.4: never invent credentials, brand assets, or real marketplace content.

| #    | Decision                                                                        | Answer | Owner  | Date | Status |
|------|---------------------------------------------------------------------------------|--------|--------|------|--------|
| D-01 | Repo name (skymart-platform vs existing bluegofer/ecommarce)                    | bluegofer/ecommarce | client | 2026-09-11 | DECIDED |
| D-02 | Final brand / domain name (default placeholder: SkyMart)                        | TBD    | client |      | OPEN   |
| D-03 | Courier provider (default: Steadfast; Pathao/RedX adapters pre-planned)         | TBD    | client |      | OPEN   |
| D-04 | Payment gateways (bKash + Nagad + SSLCommerz + COD)                             | TBD    | client |      | OPEN   |
| D-05 | SMS aggregator                                                                  | TBD    | client |      | OPEN   |
| D-06 | Launch category + 2-3 demo attribute sets                                       | TBD    | client |      | OPEN   |
| D-07 | Delivery zones + charges                                                        | TBD    | client |      | OPEN   |
| D-08 | AWS account owner / region                                                      | TBD    | client |      | OPEN   |
| D-09 | Domain registrar / DNS ownership                                                | TBD    | client |      | OPEN   |
| D-10 | COD max order value + handling fee                                              | TBD    | client |      | OPEN   |
'@

Write-File "$root\docs\openapi.yaml" @'
openapi: 3.1.0
info:
  title: Ecommarce API
  version: 1.0.0
  description: Skeleton - filled in Step 1 across all 13 TDD section 6 modules.
servers:
  - url: /api/v1
paths: {}
'@

Write-File "$root\docs\data-model.md" @'
# Data Model

Filled in Step 1 (Mermaid ER diagram, ~24 tables).
'@

Write-File "$root\docs\acceptance-checklist.md" @'
# Acceptance Checklist

Skeleton - completed in Step 14.
'@

Write-File "$root\docs\aws-runbook.md" @'
# AWS Runbook

Filled in Step 12.
'@

Write-File "$root\docs\dr-runbook.md" @'
# DR Runbook

Filled in Step 12.
'@

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  populate.ps1 COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: run 'pnpm install' from repo root" -ForegroundColor Yellow
