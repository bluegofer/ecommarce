@echo off
setlocal

cd /d "C:\ecommerce\ecommarce"

echo ============================================
echo   Populate PACKAGES + API skeleton (part 2 of 3)
echo ============================================
echo.

REM ========== packages/config/package.json ==========
echo Writing packages\config\package.json...
(
echo {
echo   "name": "@ecommarce/config",
echo   "version": "0.0.0",
echo   "private": true,
echo   "files": ["tsconfig.base.json", "eslint.base.cjs", "jest.base.cjs"],
echo   "exports": {
echo     "./tsconfig.base.json": "./tsconfig.base.json",
echo     "./eslint": "./eslint.base.cjs",
echo     "./jest": "./jest.base.cjs"
echo   }
echo }
) > packages\config\package.json

REM ========== packages/config/tsconfig.base.json ==========
echo Writing packages\config\tsconfig.base.json...
(
echo {
echo   "extends": "../../tsconfig.base.json",
echo   "compilerOptions": {
echo     "baseUrl": ".",
echo     "paths": { "@ecommarce/types": ["../../packages/types/src/index.ts"] }
echo   }
echo }
) > packages\config\tsconfig.base.json

REM ========== packages/config/eslint.base.cjs ==========
echo Writing packages\config\eslint.base.cjs...
(
echo module.exports = {
echo   root: false,
echo   parser: '@typescript-eslint/parser',
echo   plugins: ['@typescript-eslint', 'import'],
echo   extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
echo   rules: {
echo     '@typescript-eslint/no-explicit-any': 'warn',
echo     '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
echo     'no-console': ['warn', { allow: ['warn', 'error'] }],
echo   },
echo   ignorePatterns: ['dist', '.next', 'node_modules', 'coverage', 'packages/mock-reference'],
echo };
) > packages\config\eslint.base.cjs

REM ========== packages/config/jest.base.cjs ==========
echo Writing packages\config\jest.base.cjs...
(
echo module.exports = {
echo   preset: 'ts-jest',
echo   testEnvironment: 'node',
echo   moduleFileExtensions: ['ts', 'js', 'json'],
echo   testMatch: ['**/*.spec.ts', '**/*.test.ts'],
echo   collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
echo };
) > packages\config\jest.base.cjs

REM ========== packages/types/package.json ==========
echo Writing packages\types\package.json...
(
echo {
echo   "name": "@ecommarce/types",
echo   "version": "0.0.0",
echo   "private": true,
echo   "main": "./src/index.ts",
echo   "types": "./src/index.ts",
echo   "scripts": {
echo     "build": "tsc -p tsconfig.json",
echo     "lint": "eslint src --ext .ts",
echo     "typecheck": "tsc -p tsconfig.json --noEmit",
echo     "test": "echo no-tests-yet"
echo   },
echo   "devDependencies": {
echo     "@ecommarce/config": "workspace:*",
echo     "typescript": "^5.6.3"
echo   }
echo }
) > packages\types\package.json

REM ========== packages/types/tsconfig.json ==========
echo Writing packages\types\tsconfig.json...
(
echo {
echo   "extends": "../config/tsconfig.base.json",
echo   "compilerOptions": { "outDir": "dist", "rootDir": "src" },
echo   "include": ["src/**/*.ts"]
echo }
) > packages\types\tsconfig.json

REM ========== packages/types/src/index.ts ==========
echo Writing packages\types\src\index.ts...
(
echo export type Poisha = number;
echo.
echo export interface Money {
echo   amount: Poisha;
echo   currency: 'BDT';
echo }
echo.
echo export type Locale = 'bn' | 'en';
echo.
echo export * from './auth';
) > packages\types\src\index.ts

REM ========== packages/types/src/auth.ts ==========
echo Writing packages\types\src\auth.ts...
(
echo export type UserRole =
echo   ^| 'SUPER_ADMIN'
echo   ^| 'CATALOG_MANAGER'
echo   ^| 'ORDER_SUPPORT'
echo   ^| 'MARKETING_MANAGER'
echo   ^| 'FINANCE_READONLY';
echo.
echo export interface AuthTokens {
echo   accessToken: string;
echo   expiresIn: number;
echo }
echo.
echo export interface RegisterRequest {
echo   phone: string;
echo   email?: string;
echo   fullName: string;
echo   password: string;
echo }
echo.
echo export interface LoginRequest {
echo   identifier: string;
echo   password: string;
echo }
echo.
echo export interface OtpVerifyRequest {
echo   phone: string;
echo   code: string;
echo }
) > packages\types\src\auth.ts

REM ========== packages/mock-reference/README.md ==========
echo Writing packages\mock-reference\README.md...
(
echo # Mock Reference - READ ONLY
echo.
echo Extracted from DOC-20260911-WA0004.zip. 14 HTML pages + style.css.
echo.
echo NEVER imported by build. Visual design reference only.
echo Mock titles use placeholder wordmark "Bluegofer.com" - replaced by configured brand.
) > packages\mock-reference\README.md

REM ========== apps/api/package.json ==========
echo Writing apps\api\package.json...
(
echo {
echo   "name": "@ecommarce/api",
echo   "version": "0.0.0",
echo   "private": true,
echo   "scripts": {
echo     "dev": "nest start --watch",
echo     "build": "nest build",
echo     "start": "node dist/main.js",
echo     "lint": "eslint src --ext .ts",
echo     "typecheck": "tsc -p tsconfig.json --noEmit",
echo     "test": "jest",
echo     "prisma:generate": "prisma generate",
echo     "prisma:migrate": "prisma migrate dev"
echo   },
echo   "dependencies": {
echo     "@ecommarce/types": "workspace:*",
echo     "@nestjs/common": "^10.4.4",
echo     "@nestjs/config": "^3.2.3",
echo     "@nestjs/core": "^10.4.4",
echo     "@nestjs/platform-express": "^10.4.4",
echo     "@nestjs/swagger": "^7.4.2",
echo     "@prisma/client": "^5.20.0",
echo     "bcrypt": "^5.1.1",
echo     "class-transformer": "^0.5.1",
echo     "class-validator": "^0.14.1",
echo     "helmet": "^8.0.0",
echo     "ioredis": "^5.4.1",
echo     "reflect-metadata": "^0.2.2",
echo     "rxjs": "^7.8.1",
echo     "zod": "^3.23.8"
echo   },
echo   "devDependencies": {
echo     "@ecommarce/config": "workspace:*",
echo     "@nestjs/cli": "^10.4.5",
echo     "@nestjs/testing": "^10.4.4",
echo     "@types/bcrypt": "^5.0.2",
echo     "@types/jest": "^29.5.13",
echo     "@types/node": "^22.7.4",
echo     "jest": "^29.7.0",
echo     "prisma": "^5.20.0",
echo     "ts-jest": "^29.2.5",
echo     "tsx": "^4.19.1",
echo     "typescript": "^5.6.3"
echo   }
echo }
) > apps\api\package.json

REM ========== apps/api/tsconfig.json ==========
echo Writing apps\api\tsconfig.json...
(
echo {
echo   "extends": "../config/tsconfig.base.json",
echo   "compilerOptions": {
echo     "module": "CommonJS",
echo     "moduleResolution": "Node",
echo     "outDir": "./dist",
echo     "rootDir": "./src",
echo     "emitDecoratorMetadata": true,
echo     "experimentalDecorators": true,
echo     "strictPropertyInitialization": false
echo   },
echo   "include": ["src/**/*.ts", "test/**/*.ts"]
echo }
) > apps\api\tsconfig.json

REM ========== apps/api/nest-cli.json ==========
echo Writing apps\api\nest-cli.json...
(
echo { "$schema": "https://json.schemastore.org/nest-cli", "collection": "@nestjs/schematics", "sourceRoot": "src", "compilerOptions": { "deleteOutDir": true } }
) > apps\api\nest-cli.json

REM ========== apps/api/.eslintrc.cjs ==========
echo Writing apps\api\.eslintrc.cjs...
(
echo module.exports = { ...require('@ecommarce/config/eslint'), ignorePatterns: ['dist', 'node_modules'] };
) > apps\api\.eslintrc.cjs

REM ========== apps/api/jest.config.cjs ==========
echo Writing apps\api\jest.config.cjs...
(
echo module.exports = { ...require('@ecommarce/config/jest'), roots: ['^<rootDir^>/src'] };
) > apps\api\jest.config.cjs

REM ========== apps/api/prisma/schema.prisma ==========
echo Writing apps\api\prisma\schema.prisma...
(
echo generator client { provider = "prisma-client-js" }
echo datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
) > apps\api\prisma\schema.prisma

REM ========== apps/api/src/main.ts ==========
echo Writing apps\api\src\main.ts...
(
echo import { ValidationPipe } from '@nestjs/common';
echo import { NestFactory } from '@nestjs/core';
echo import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
echo import helmet from 'helmet';
echo.
echo import { AppModule } from './app.module';
echo.
echo async function bootstrap^(^) {
echo   const app = await NestFactory.create^(AppModule, { bufferLogs: true }^);
echo.
echo   const prefix = process.env.API_GLOBAL_PREFIX ?? 'api/v1';
echo   app.setGlobalPrefix^(prefix^);
echo   app.use^(helmet^(^)^);
echo   app.enableCors^({
echo     origin: [process.env.APP_BASE_URL, process.env.ADMIN_BASE_URL].filter^(Boolean^) as string[],
echo     credentials: true,
echo   }^);
echo   app.useGlobalPipes^(new ValidationPipe^({ whitelist: true, forbidNonWhitelisted: true, transform: true }^)^);
echo.
echo   const swaggerConfig = new DocumentBuilder^(^)
echo     .setTitle^('Ecommarce API'^)
echo     .setDescription^('Versioned REST API for storefront + admin'^)
echo     .setVersion^('1.0'^)
echo     .addBearerAuth^(^)
echo     .build^(^);
echo   SwaggerModule.setup^('api/docs', app, SwaggerModule.createDocument^(app, swaggerConfig^)^);
echo.
echo   await app.listen^(Number^(process.env.API_PORT ?? 4000^)^);
echo }
echo void bootstrap^(^);
) > apps\api\src\main.ts

REM ========== apps/api/src/app.module.ts ==========
echo Writing apps\api\src\app.module.ts...
(
echo import { Module } from '@nestjs/common';
echo import { ConfigModule } from '@nestjs/config';
echo.
echo import { HealthController } from './common/health.controller';
echo.
echo @Module^({
echo   imports: [ConfigModule.forRoot^({ isGlobal: true, envFilePath: ['.env', '../../.env'] }^)],
echo   controllers: [HealthController],
echo }^)
echo export class AppModule {}
) > apps\api\src\app.module.ts

REM ========== apps/api/src/common/health.controller.ts ==========
echo Writing apps\api\src\common\health.controller.ts...
(
echo import { Controller, Get } from '@nestjs/common';
echo import { ApiTags } from '@nestjs/swagger';
echo.
echo @ApiTags^('health'^)
echo @Controller^('health'^)
echo export class HealthController {
echo   @Get^(^)
echo   check^(^) {
echo     return { status: 'ok', timestamp: new Date^(^).toISOString^(^) };
echo   }
echo }
) > apps\api\src\common\health.controller.ts

echo.
echo ============================================
echo   PACKAGES + API skeleton DONE
echo ============================================
echo.
echo Files created:
echo   packages\config\  - 4 files
echo   packages\types\   - 4 files
echo   packages\mock-reference\README.md
echo   apps\api\         - 10 files
echo.
pause