@echo off
setlocal

cd /d "C:\ecommerce\ecommarce"

echo ============================================
echo   Populate ROOT files (part 1 of 3)
echo ============================================
echo.

REM ========== package.json ==========
echo Writing package.json...
(
echo {
echo   "name": "ecommarce-platform",
echo   "private": true,
echo   "packageManager": "pnpm@9.12.0",
echo   "engines": { "node": ">=20.11.0" },
echo   "scripts": {
echo     "build": "turbo run build",
echo     "dev": "turbo run dev",
echo     "lint": "turbo run lint",
echo     "typecheck": "turbo run typecheck",
echo     "test": "turbo run test",
echo     "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
echo     "prepare": "husky"
echo   },
echo   "devDependencies": {
echo     "@commitlint/cli": "^19.5.0",
echo     "@commitlint/config-conventional": "^19.5.0",
echo     "husky": "^9.1.6",
echo     "lint-staged": "^15.2.10",
echo     "prettier": "^3.3.3",
echo     "turbo": "^2.1.3",
echo     "typescript": "^5.6.3"
echo   },
echo   "lint-staged": {
echo     "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
echo     "*.{md,json,yml,yaml}": ["prettier --write"]
echo   }
echo }
) > package.json

REM ========== pnpm-workspace.yaml ==========
echo Writing pnpm-workspace.yaml...
(
echo packages:
echo   - "apps/*"
echo   - "packages/*"
) > pnpm-workspace.yaml

REM ========== turbo.json ==========
echo Writing turbo.json...
(
echo {
echo   "$schema": "https://turbo.build/schema.json",
echo   "globalDependencies": [".env"],
echo   "tasks": {
echo     "build": {
echo       "dependsOn": ["^build"],
echo       "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
echo     },
echo     "dev": { "cache": false, "persistent": true },
echo     "lint": { "dependsOn": ["^build"] },
echo     "typecheck": { "dependsOn": ["^build"] },
echo     "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] }
echo   }
echo }
) > turbo.json

REM ========== tsconfig.base.json ==========
echo Writing tsconfig.base.json...
(
echo {
echo   "compilerOptions": {
echo     "target": "ES2022",
echo     "lib": ["ES2022"],
echo     "module": "NodeNext",
echo     "moduleResolution": "NodeNext",
echo     "strict": true,
echo     "noUncheckedIndexedAccess": true,
echo     "noImplicitOverride": true,
echo     "exactOptionalPropertyTypes": true,
echo     "esModuleInterop": true,
echo     "skipLibCheck": true,
echo     "forceConsistentCasingInFileNames": true,
echo     "resolveJsonModule": true,
echo     "declaration": true,
echo     "declarationMap": true,
echo     "sourceMap": true,
echo     "incremental": true
echo   }
echo }
) > tsconfig.base.json

REM ========== commitlint.config.cjs ==========
echo Writing commitlint.config.cjs...
(
echo module.exports = {
echo   extends: ['@commitlint/config-conventional'],
echo   rules: {
echo     'header-max-length': [2, 'always', 100],
echo     'scope-empty': [0],
echo   },
echo };
) > commitlint.config.cjs

REM ========== .npmrc ==========
echo Writing .npmrc...
(
echo auto-install-peers=true
echo strict-peer-dependencies=false
) > .npmrc

REM ========== .gitignore ==========
echo Writing .gitignore...
(
echo node_modules/
echo dist/
echo .next/
echo coverage/
echo .turbo/
echo *.tsbuildinfo
echo .env
echo .env.local
echo .env.*.local
echo .DS_Store
echo *.log
) > .gitignore

REM ========== .husky\pre-commit ==========
echo Writing .husky\pre-commit...
(
echo pnpm lint-staged
) > .husky\pre-commit

REM ========== .husky\commit-msg ==========
echo Writing .husky\commit-msg...
(
echo pnpm commitlint --edit "$1"
) > .husky\commit-msg

REM ========== docker-compose.yml ==========
echo Writing docker-compose.yml...
(
echo services:
echo   postgres:
echo     image: postgres:16-alpine
echo     environment:
echo       POSTGRES_USER: ecommarce
echo       POSTGRES_PASSWORD: ecommarce
echo       POSTGRES_DB: ecommarce
echo     ports: ["5432:5432"]
echo     volumes: ["pgdata:/var/lib/postgresql/data"]
echo   redis:
echo     image: redis:7-alpine
echo     ports: ["6379:6379"]
echo     volumes: ["redisdata:/data"]
echo   mailhog:
echo     image: mailhog/mailhog:latest
echo     ports: ["1025:1025", "8025:8025"]
echo volumes:
echo   pgdata:
echo   redisdata:
) > docker-compose.yml

echo.
echo ============================================
echo   ROOT core files DONE
echo ============================================
echo.
echo Files created in root:
dir /b package.json pnpm-workspace.yaml turbo.json tsconfig.base.json commitlint.config.cjs .npmrc .gitignore docker-compose.yml
echo.
echo Files in .husky:
dir /b .husky
echo.
pause