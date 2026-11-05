# Ecommarce Platform

A **category-agnostic, cloud-native, production-grade e-commerce platform** —
public storefront, full admin/operations dashboard, and a single versioned REST API
serving both — deployed on AWS.

> **Placeholder brand:** **SkyMart** (sky-blue `#87CEEB`).
> Final brand name is decided in `docs/DECISIONS.md` (Step 1).
> No real marketplace name, logo, imagery, or trademarked material is used anywhere.

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [Monorepo Layout](#monorepo-layout)
3. [Tech Stack](#tech-stack)
4. [Core Modules](#core-modules)
5. [Storefront](#storefront)
6. [Admin Dashboard](#admin-dashboard)
7. [API-First Contract](#api-first-contract)
8. [Data Integrity & Concurrency](#data-integrity--concurrency)
9. [Security Baseline](#security-baseline)
10. [SEO Strategy](#seo-strategy)
11. [AWS Infrastructure](#aws-infrastructure)
12. [Local Development](#local-development)
13. [Build, Test, Lint](#build-test-lint)
14. [Environment Variables](#environment-variables)
15. [Repository Conventions](#repository-conventions)
16. [Step-by-Step Build Plan](#step-by-step-build-plan)
17. [Documentation Index](#documentation-index)
18. [Non-Negotiable Rules](#non-negotiable-rules)

---

## What This Is

An end-to-end e-commerce ecosystem made of three cooperating apps plus shared packages:

| Surface | Path | URL (local) | Role |
|---|---|---|---|
| **API** | `apps/api` | `http://localhost:4000/api/v1` | NestJS backend — the only component that touches DB, cache, queue, storage |
| **Storefront** | `apps/storefront` | `http://localhost:3000` | Next.js public site — SSR/SSG/ISR, SEO-optimized |
| **Admin** | `apps/admin` | `http://localhost:3001` | Next.js protected dashboard — catalog, orders, CMS, reports, RBAC |

The platform is **category-agnostic** by design: products use a dynamic attribute system (EAV) and pricing/stock live at the SKU (variant) level, so switching from electronics to fashion is data, not code.

The build follows a strict 16-step workflow (Step 0 → Step 15). See [`docs/`](#documentation-index).

---

## Monorepo Layout

```
ecommarce/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint + typecheck + test + build on every PR
│       ├── deploy-staging.yml        # auto-deploy on staging branch
│       └── deploy-production.yml     # manual approval, main branch
├── .husky/                           # pre-commit + commit-msg hooks
├── apps/
│   ├── api/                          # NestJS backend (TDD §5, §6)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # single source of DB truth
│   │   │   ├── migrations/
│   │   │   └── seed.ts               # demo/placeholder catalog seed (Step 14)
│   │   ├── src/
│   │   │   ├── main.ts               # global prefix, helmet, swagger /api/docs
│   │   │   ├── app.module.ts
│   │   │   ├── config/               # env validation (zod), configuration
│   │   │   ├── database/             # prisma.service.ts, redis.service.ts
│   │   │   ├── common/
│   │   │   │   ├── guards/           # jwt-auth, roles, csrf
│   │   │   │   ├── interceptors/     # audit, idempotency
│   │   │   │   ├── filters/          # http-exception
│   │   │   │   └── utils/            # money.ts (integer poisha), slugify.ts
│   │   │   └── modules/              # 13 backend modules (see Core Modules)
│   │   └── test/                     # unit + integration (testcontainers)
│   ├── storefront/                   # Next.js public site (TDD §7)
│   │   ├── src/
│   │   │   ├── app/[locale]/         # all C1–C14 routes, bn (default) + en
│   │   │   ├── components/
│   │   │   │   ├── layout/           # header (B1), footer (B3), breadcrumbs (B4)
│   │   │   │   ├── ui/               # toast, modal (B5–B6), pagination (B7), skeletons (B8)
│   │   │   │   └── product/          # product-card (C2 anatomy)
│   │   │   ├── lib/i18n/             # bn.json + en.json (A10 dictionary)
│   │   │   └── styles/tokens.css     # --sk-* design tokens (Appendix A)
│   │   └── e2e/                      # Playwright money-path tests
│   └── admin/                        # Next.js dashboard (TDD §6.13)
│       └── src/app/(dashboard)/      # catalog, inventory, orders, CMS, reports, settings
├── packages/
│   ├── types/                        # shared TS contracts (single FE↔BE contract)
│   ├── config/                       # tsconfig / eslint / jest base presets
│   └── mock-reference/               # READ-ONLY 14 HTML + style.css design reference
├── docs/
│   ├── DECISIONS.md                  # every open question + answer
│   ├── openapi.yaml                  # API contract (13 modules)
│   ├── data-model.md                 # Mermaid ER diagram (~24 tables)
│   ├── acceptance-checklist.md       # client UAT checklist (Step 14)
│   ├── aws-runbook.md                # environment operations (Step 12)
│   ├── dr-runbook.md                 # backup/restore procedure (Step 12)
│   └── training/                     # admin training guides (Step 14)
├── infra/                            # Terraform / CDK (optional, Step 12)
├── docker-compose.yml                # postgres + redis + mailhog (local dev)
├── .env.example                      # every env var the platform needs
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Language** | TypeScript everywhere | One language across FE + BE; shared types are the contract |
| **Monorepo** | pnpm workspaces + Turborepo | Fast, cacheable, dependency-aware task orchestration |
| **Storefront** | Next.js 14 (App Router, React 18) | SSR/SSG/ISR for crawlable, fast, SEO-friendly pages |
| **Admin** | Next.js 14 (separate app, protected subdomain) | Same stack, locked-down area, reused component language |
| **API** | NestJS 10 | Modular, DI, guards/interceptors, enterprise-grade structure |
| **DB** | PostgreSQL (RDS in prod) | ACID transactions — non-negotiable for orders, payments, stock |
| **Cache / sessions** | Redis (ElastiCache) | Sessions, carts, hot catalog, time-boxed stock reservations |
| **Search** | PostgreSQL full-text + trigram (Meilisearch-ready) | Works day one; module boundary allows engine swap later |
| **Jobs** | AWS SQS + BullMQ workers | Reliable async — SMS, courier, webhooks, reports — with DLQ |
| **Storage** | AWS S3 + CloudFront | Media + static assets served via CDN with OAC |
| **CDN / Edge** | CloudFront + WAF + Shield | Speed (SEO) + DDoS/abuse filtering at the edge |
| **CI/CD** | GitHub Actions | lint + typecheck + test + build on every PR; staged deploys |
| **Money** | integer minor units (poisha) — never float | Correct totals; server always recalculates |

---

## Core Modules

The backend is organized into **13 modules** (TDD §6). Each module is self-contained and evolves independently.

| # | Module | Responsibility |
|---|---|---|
| 6.1 | **Product Catalog** | EAV schema, categories, attributes, variants (SKU), media, bulk import/export, SEO fields, slug redirects |
| 6.2 | **Inventory & Stock** | Per-variant stock, conditional decrement, Redis reservations, low-stock alerts, adjustments with reason codes, valuation CSV |
| 6.3 | **Pricing, Promotions & Coupons** | Coupon rules engine (server-side), automatic discounts, flash sales, compare-at pricing, coupon performance report |
| 6.4 | **CMS** | Homepage section builder, static pages with revisions, menus, announcement bar, popup, media library, contact inbox |
| 6.5 | **CRM** | Unified customer profile, segments, timeline, quick lookup, CSV export |
| 6.6 | **OMS (Orders)** | Strict state machine, guest checkout, cart merge, idempotent place-order, admin console, invoice/packing-slip PDF |
| 6.7 | **Courier & Delivery** | Adapter per provider (Steadfast/Pathao/RedX), one-click consignment, tracking sync, COD reconciliation, RTO |
| 6.8 | **Payments** | bKash + Nagad + SSLCommerz + COD adapters, signed webhook verification, refunds (full/partial), settlement reconciliation |
| 6.9 | **Returns, Refunds & Support (RMA)** | Return request state machine, admin workflow, support tickets with SLA aging, return-rate reports |
| 6.10 | **Reviews & Ratings** | Verified-purchase enforcement, moderation workflow, aggregate rating (incremental), admin replies, profanity filter |
| 6.11 | **Customer Engagement & Notifications** | Template-driven SMS/email/push, quiet hours, abandoned-cart, back-in-stock, per-customer prefs |
| 6.12 | **Analytics & Reporting** | First-party business reports (sales, funnel, AOV, repeat rate), GA4 + Meta server-side events, CSV export, morning digest |
| 6.13 | **Admin Dashboard, RBAC & Audit** | 5 seeded roles, TOTP 2FA, full audit trail, admin activity/security log, dashboard home |

---

## Storefront

Next.js public site, bilingual **bn (default) + en**, mobile-first, SSR/ISR, accessible.

### Page routes (UI Spec C1–C14)

| Route | Page | Notes |
|---|---|---|
| `/` | Home (C1) | CMS-driven sections, hero carousel, deal strip, carousels, SEO block |
| `/c/[slug]` · `/s?k=` | Category / Search PLP (C2) | Faceted filtering, active chips, URL state, skeleton loading |
| `/p/[slug]` | Product Detail PDP (C3) | 3-column desktop, sticky buy column, variant picker, reviews, JSON-LD |
| `/cart` | Cart (C4) | Guest + user cart, coupon, free-shipping progress, undo remove |
| `/checkout` | Checkout (C5) | 3-step wizard, bKash/Nagad/SSLCommerz/COD, idempotent place-order |
| `/signin` · `/register` | Auth (C6–C7) | Always-visible labels, OTP 6-box, password strength |
| `/account` | Account (C8–C10) | Overview, orders, tracking timeline, wishlist, settings |
| `/deals` | Today's Deals (C11) | Claim timers, % claimed bars, sold-out/expired states |
| `/pages/[slug]` | Content (C12) | About, Contact, FAQ, Policies — CMS-driven, SSR |
| `/404` | Error (C13) | Correct HTTP status, noindex |
| `/order-confirmation` | Confirmation (C14) | Check hero, summary, guest create-account panel |

### Global components (UI Spec B1–B10)

Header (3-row sticky) · Mega-menu drawer · Footer · Breadcrumbs · Toast + mini-cart · Modal/drawer · Pagination/sort · Skeleton + empty states · Rating stars · Badges + price block.

---

## Admin Dashboard

Protected separate Next.js app (`admin.domain`) reusing the same API with admin-scoped endpoints.

- **Role-aware nav** — 5 seeded roles: `SUPER_ADMIN`, `CATALOG_MANAGER`, `ORDER_SUPPORT`, `MARKETING_MANAGER`, `FINANCE_READONLY`. UI hides what a role can't do; server **enforces** with guards.
- **Dashboard home** — today's sales/orders, pending actions (returns awaiting, low stock, DLQ depth, payment mismatches).
- **Every module operable without a developer** — catalog + variant matrix, inventory grid, promotions builder, CMS page editor with revisions, orders console, courier dispatch, payments + refunds, RMA + tickets, customers + segments, reviews moderation, notifications templates, reports with CSV export, RBAC + settings.
- **Full audit trail** — who/what/when/before/after for every mutating admin action, searchable.

---

## API-First Contract

One versioned REST API (`/api/v1`) serves both storefront and admin.

- **OpenAPI/Swagger** docs at `/api/docs`
- **Shared types** live in `packages/types` and are the single contract between FE and BE
- **Idempotency keys** on order/payment endpoints — retries never double-charge
- **Webhooks are idempotent** — duplicate event IDs tracked in PostgreSQL
- **Outbox pattern** — external side effects (SMS/email/courier/analytics) written in the same DB transaction, published async with retry + DLQ

---

## Data Integrity & Concurrency

These guarantees are verified by tests, not assumed (TDD §11):

| Risk | Guarantee |
|---|---|
| **Overselling** | `UPDATE variants SET stock = stock - n WHERE stock >= n` inside the order transaction — row affected-count is the truth |
| **Abandoned checkout** | Redis time-boxed reservations (10 min TTL) auto-release stock to sale |
| **Double order (double-click / network retry)** | Idempotency key returns the original result — never a second order |
| **Duplicate webhook** | Unique event ID → reprocessing changes nothing |
| **Coupon race** | Usage-limit decrement happens in the same transaction as the order |
| **Lost notification (crash)** | Outbox table written in same transaction as business change; worker publishes with retry |
| **Money errors** | All money is integer poisha; every order stores an itemized breakdown; client-submitted totals are never trusted |
| **Refund > captured** | Rejected by validation; partial refunds itemized against gateway settlement |

---

## Security Baseline

Mid-level, startup-appropriate security — applied to **every** module as part of its done-criteria, never as a later add-on (TDD §10):

- **Input validation** — strict schemas (Zod/class-validator) on every endpoint
- **SQL injection** — eliminated by design; all access through Prisma, parameterized
- **XSS** — React-escaped output, sanitized rich text, strict CSP headers
- **CSRF** — tokens on state-changing browser calls; cookies `SameSite` + `HttpOnly`
- **Auth** — short-lived JWT access + rotating refresh, bcrypt passwords, rate limits + lockout
- **Admin hardening** — TOTP 2FA enforced, optional IP allow-list, session revocation on password change
- **DB** — private subnet, KMS encryption at rest, TLS in transit, least-privilege DB user
- **Edge** — AWS WAF managed rules + rate-based rules on `/auth/*`, `/checkout`, `/coupon`
- **Secrets** — AWS Secrets Manager / SSM Parameter Store only; never in code or git
- **Payment** — gateways handle raw card/wallet data; webhooks signature-verified server-to-server
- **Auditability** — full audit trail; anomaly flags for fraud review

---

## SEO Strategy

**Code level** (TDD §8.1):

- SSR / SSG / ISR on every crawlable page — Google gets full HTML on first response
- Slug-based URLs (`/electronics/samsung-galaxy-a55`), with automatic 301s on rename
- Dynamic per-page meta: title, description, canonical, OG/Twitter cards
- JSON-LD: Product + Offer (price-valid-until) + AggregateRating + Review + BreadcrumbList + FAQ + Organization
- Auto-generated sitemap + robots, submitted to Search Console with ping
- WebP, explicit width/height, alt-text formula from UI Spec E2, LCP preload
- Core Web Vitals targets: **LCP ≤ 2.5s, CLS ≤ 0.1** on 4G

**Cloud level:**

- CloudFront CDN caches pages + media at the edge
- HTTPS everywhere (ACM certs), HSTS
- www → root canonical redirect in Route 53
- Redirect manager in admin for campaign URLs

---

## AWS Infrastructure

Architecture per TDD §9 (built out in Step 12). All resources live in the **client-owned** AWS account.

| Component | AWS Service |
|---|---|
| Compute (API + storefront SSR) | Elastic Beanstalk / EC2 Auto Scaling behind ALB |
| Async / jobs | SQS queues + Lambda (scheduled) or worker tasks |
| Database | RDS PostgreSQL (Multi-AZ, KMS, automated backups + PITR) |
| Cache / sessions | ElastiCache for Redis (private, TLS, auth token) |
| Object storage | S3 (versioned, public-access blocked, CloudFront OAC) |
| CDN | CloudFront (static long TTL, HTML short TTL + stale-while-revalidate) |
| DNS | Route 53 |
| Edge security | WAF (managed + rate-based) + Shield Standard |
| Secrets | Secrets Manager / SSM Parameter Store |
| Email | Amazon SES (SPF + DKIM verified) |

**Networking:** public subnets hold only ALB + NAT; app + DB + cache sit in private subnets (no internet route).

**Environments:** Dev → Staging → Production through CI/CD; staging is a scaled-down production mirror. Production deploys require manual approval.

**Backup & DR:** RDS daily snapshot + PITR (RPO ≤ 5 min); cross-region snapshot copy (RTO ≤ 4 h); restore drill executed before launch; documented in `docs/dr-runbook.md`.

---

## Local Development

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 20.11.0 | `node -v` |
| pnpm | 9.12.0 | `pnpm -v` (or `corepack enable`) |
| Git | ≥ 2.40 | `git --version` |
| Docker Desktop | recent | `docker -v` |

> **Docker on Windows 10 (WSL2):** if WSL kernel is older than 5.15, `wsl --update` may require Windows Update
> to be set to *Receive updates for other Microsoft products*. If Docker is unavailable, `pnpm install / lint /
> typecheck / test / build` still all work — only `docker compose up -d` (Postgres + Redis) is deferred to Step 2.

### First-time setup

```bash
corepack enable
pnpm install
cp .env.example .env          # then edit values as needed
docker compose up -d          # postgres + redis + mailhog
pnpm build
pnpm dev
```

That starts:

- API on `http://localhost:4000/api/v1` (Swagger at `/api/docs`)
- Storefront on `http://localhost:3000`
- Admin on `http://localhost:3001`
- Mailhog UI at `http://localhost:8025`

### Working on a single app

```bash
pnpm --filter @ecommarce/api dev
pnpm --filter @ecommarce/storefront dev
pnpm --filter @ecommarce/admin dev
```

---

## Build, Test, Lint

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Run all apps in watch mode (Turbo) |
| `pnpm build` | Production build for every app |
| `pnpm lint` | Lint every workspace package |
| `pnpm typecheck` | TypeScript strict typecheck everywhere |
| `pnpm test` | Run unit + integration tests |
| `pnpm format` | Prettier write across the repo |

**CI gate** (`.github/workflows/ci.yml`) runs on every PR to `main` / `staging`:
`install → lint → typecheck → test → build`. All must pass before merge.

Planned test layers (TDD §13):

- **Unit (Jest)** — pricing/promotion math, coupon rules, stock deduction, order state machine, tax
- **Integration (testcontainers)** — every endpoint success + failure + role matrix
- **E2E (Playwright)** — browse → PLP → PDP → cart → coupon → checkout (mock) → confirmation → tracking
- **Webhook replay harness** — recorded gateway/courier payloads incl. duplicates + out-of-order
- **Load (k6/Locust)** — flash-sale burst scenario on staging (Step 13)

---

## Environment Variables

Every variable is listed in `.env.example` — copy to `.env` and fill values as modules need them.
**Never commit `.env`.** In production all secrets live in AWS Secrets Manager / SSM.

High-level groups:

| Group | Examples |
|---|---|
| Core | `NODE_ENV`, `API_PORT`, `APP_BASE_URL`, `ADMIN_BASE_URL`, `DEFAULT_LOCALE` |
| Datastore | `DATABASE_URL`, `REDIS_URL` |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_COST`, `TOTP_ISSUER` |
| Storage | `S3_REGION`, `S3_MEDIA_BUCKET`, `CDN_MEDIA_BASE_URL` |
| Payments | `BKASH_*`, `NAGAD_*`, `SSLCOMMERZ_*`, `COD_*` |
| Courier | `STEADFAST_*`, `PATHAO_*`, `REDX_*` |
| Messaging | `SMS_*`, `SES_*`, `VAPID_*` |
| Analytics | `GA4_*`, `META_*` |
| Jobs | `SQS_*` |

---

## Repository Conventions

- **Branch strategy:** `main` (production) ← `staging` ← `feature/step-XX-name`
- **Every step = at least one PR.** Commit messages use conventional commits prefixed with the step:
  - `step-00: chore: monorepo bootstrap (turbo repo, ci, tooling)`
  - `step-02: feat(api): auth, rbac, audit, outbox, idempotency foundation`
  - `step-08: feat(storefront): pages c1-c14 full shopper journey`
- **Branch protection:** PR + CI green required on `main` and `staging`
- **Pre-commit hooks:** lint-staged runs ESLint + Prettier on staged files; commitlint enforces conventional messages
- **Never commit:** secrets, `.env`, real marketplace names/logos, real product content — everything is `[PLACEHOLDER]` until the client supplies it

---

## Step-by-Step Build Plan

The project follows a **strict sequential workflow** (Step 0 → Step 15). Nothing starts before the previous step's Acceptance Criteria pass.

| Step | Name | Primary output |
|---|---|---|
| **0** | Repository & Tooling Bootstrap | Monorepo on GitHub, CI green |
| **1** | Discovery Lock & Decisions | `DECISIONS.md`, `openapi.yaml` skeleton, data model |
| **2** | Backend Foundation: auth, RBAC, audit, outbox | API skeleton, auth flows |
| **3** | Catalog + Inventory + Search | EAV schema, search API |
| **4** | Promotions Engine + CMS | Coupons/flash sales, CMS APIs |
| **5** | CRM + OMS + Notifications | Order state machine, templates |
| **6** | Reviews + RMA + Analytics | Reviews, returns, reports APIs |
| **7** | Storefront Foundation | Design system in code, i18n, components B1–B10 |
| **8** | Storefront Pages C1–C14 | Full shopper journey |
| **9** | Admin / Operations | Back office, RBAC views |
| **10** | Integrations | Payments, courier, messaging, analytics |
| **11** | SEO Implementation & Verification | Structured data, sitemaps, CWV |
| **12** | AWS Infrastructure Build-Out | Staging + Production on AWS |
| **13** | Security Hardening + Full QA + Load Test | Test evidence pack |
| **14** | Staging UAT, Seeding, Admin Training | Signed UAT checklist |
| **15** | Production Launch & Handover | Live store + handover pack |

**Project is Done when** (TDD §16): storefront live on the client's domain, admin operational with RBAC + 2FA + audit, payments + courier live with verified webhooks, AWS per §9, SEO verified, security baseline documented, full test suite green, UAT signed, handover pack delivered, and **all third-party accounts owned by the client**.

---

## Documentation Index

| Doc | Purpose |
|---|---|
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Every open question + its written answer (or owner + date) |
| [`docs/openapi.yaml`](docs/openapi.yaml) | API contract — all 13 modules' endpoints |
| [`docs/data-model.md`](docs/data-model.md) | Mermaid ER diagram (~24 tables) |
| [`docs/acceptance-checklist.md`](docs/acceptance-checklist.md) | Client UAT checklist (signed in Step 14) |
| [`docs/aws-runbook.md`](docs/aws-runbook.md) | Environment operations, resource inventory |
| [`docs/dr-runbook.md`](docs/dr-runbook.md) | Backup / restore procedure (RPO ≤ 5 min, RTO ≤ 4 h) |
| [`docs/training/`](docs/training/) | Admin training guides (Step 14) |
| `packages/mock-reference/README.md` | Read-only design reference (14 HTML + style.css) |

---

## Non-Negotiable Rules

These apply to **every** step of the build (Workflow §3):

1. **One language** — TypeScript in all three apps; shared types in `packages/types` are the single FE↔BE contract.
2. **API-first** — one versioned REST API (`/api/v1`) with OpenAPI docs serves both storefront and admin.
3. **Money is integer poisha** — totals always recalculated server-side; client totals are never trusted.
4. **No overselling** — conditional `UPDATE ... WHERE stock >= n` inside the order transaction; Redis holds only time-boxed reservations.
5. **Idempotency** — order/payment endpoints accept keys; all webhooks are idempotent via unique event IDs; coupon redemption is atomic.
6. **Outbox pattern** — external side effects written in the same DB transaction, published async with retries + DLQ.
7. **SSR/SSG/ISR for every crawlable page** — account, cart, checkout are client-rendered + `noindex`.
8. **Bilingual from day one** — every UI string exists in `bn` (default) + `en`; Bangla line-height +20%; never uppercase/letter-space Bangla.
9. **Brand-neutral** — no real marketplace name, logo, imagery, or copy anywhere. Placeholder brand: **SkyMart**.
10. **Security is part of each module's done-criteria** — validation, parameterized queries, CSP, CSRF, bcrypt, rate limits.
11. **Testing accompanies the module it covers** — Jest unit, testcontainers integration, Playwright E2E, webhook replay harness.
12. **Every step ends green** — lint + typecheck + tests pass in CI before the step is considered done.

---

## License & Ownership

All third-party accounts (AWS, payment gateways, courier, SMS aggregator, domain) are registered under the **client's ownership**. The development team is granted least-privilege access.

Product content, brand assets, and marketing copy remain **`[PLACEHOLDER]`** until the client supplies them (UI Spec Part E contract).

---

**Built against:** Advanced E-Commerce Platform Technical Design Document v2.0 · SkyMart UI/UX Design Specification v1.0 · SkyMart Master Implementation Workflow v1.0
