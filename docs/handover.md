# BlueGofer — Handover Pack

**Version:** 1.0 (Skeleton)
**Date:** 2026-09-22
**Status:** 🟡 Skeleton — production sections pending (return trigger)
**Owner:** Client (MD ANIMUL HOQ)
**Developer handover:** complete upon production launch

---

## ১. What this document is

এই file-টা BlueGofer platform-এর **complete handover reference**। এখানে সবকিছু আছে যা client-এর ownership-এ যেতে হবে:

- Architecture + tech stack summary
- Repo + source code map
- Credentials inventory (all in client's accounts)
- Operational runbooks
- Training links
- Support + maintenance cadence
- Outstanding items (production launch deferred)

---

## ২. Project at a glance

| Aspect | Value |
|---|---|
| **Project name** | BlueGofer (placeholder brand) |
| **Domain** | `nolimitshopping.com` |
| **Owner** | MD ANIMUL HOQ (client) |
| **Repo** | `github.com/bluegofer/ecommarce` (private) |
| **Primary branch** | `staging` (active) → `main` (production, future) |
| **Stack** | NestJS API + Next.js 14 Storefront + Next.js Admin + PostgreSQL 16 + Redis |
| **Hosting** | AWS ap-south-1 (Mumbai), EC2 + RDS + Redis in-EC2 |
| **Budget tier** | ~$47/month (TDD Appendix B) |
| **Languages** | Bangla (default) + English |
| **Session start** | 2026-09-11 |
| **Current status** | Step 16, Custom Phase 4 complete; production launch deferred |

---

## ৩. URLs

### 3.1 Staging (live now)

| Surface | URL |
|---|---|
| Storefront | `https://nolimitshopping.com` |
| Admin | `https://admin.nolimitshopping.com` |
| API | `https://api.nolimitshopping.com/api/v1` |
| Health check | `https://api.nolimitshopping.com/api/v1/health` |
| Swagger (dev-only) | `/api/docs` (may be disabled in prod) |

### 3.2 Production (future)

Same URLs, but production environment — cutover after return trigger met.

---

## ৪. Architecture summary

──────────────────┐
│ CloudFront │ (deferred; nginx serving directly)
│ (deferred) │
└────────┬─────────┘
│
┌────────▼─────────┐
│ nginx (EC2) │ reverse proxy
│ │ SSL (Let's Encrypt wildcard)
└────────┬─────────┘
│
┌──────────────┼──────────────┐
│ │ │
┌────▼────┐ ┌────▼────┐ ┌────▼────┐
│Storefront│ │ Admin │ │ API │
│Next.js │ │ Next.js │ │ NestJS │
│:3000 │ │ :3001 │ │ :4000 │
└──────────┘ └─────────┘ └────┬────┘
│
┌──────────┼──────────┐
│ │ │
┌────▼────┐ ┌───▼───┐ ┌───▼────┐
│PostgreSQL│ │ Redis │ │ S3 │
│(RDS) │ │(EC2) │ │(media) │
└──────────┘ └───────┘ └────────┘


**Single EC2 (t3.medium)** host করে:
- NestJS API (port 4000)
- Next.js storefront (port 3000)
- Next.js admin (port 3001)
- Redis (port 6379, in-EC2)

**External services:**
- RDS PostgreSQL 16 (managed, single-AZ, db.t3.micro)
- S3 (media + logs buckets)
- Route 53 (DNS)
- Let's Encrypt (SSL)
- CloudWatch (logs + alarms)
- SNS (alerts)
- Sentry (error tracking — free tier)
- GitHub Actions (CI/CD)

---

## ৫. Repository map
bluegofer/ecommarce/
├── apps/
│ ├── api/ # NestJS backend
│ │ ├── prisma/
│ │ │ ├── schema.prisma # database schema (all models)
│ │ │ ├── migrations/ # versioned migrations
│ │ │ ├── seed.ts # main seed
│ │ │ └── seed-.ts # auxiliary seeds
│ │ ├── src/
│ │ │ ├── modules/ # 23 feature modules
│ │ │ ├── common/ # guards, filters, interceptors
│ │ │ └── config/ # configuration.ts
│ │ └── Dockerfile
│ ├── storefront/ # Next.js 14 storefront
│ │ └── src/
│ │ ├── app/[locale] # routes (22 pages)
│ │ ├── components/ # B1-B10 UI + page components
│ │ ├── lib/ # API client, cart, auth, i18n
│ │ └── styles/ # tokens.css
│ └── admin/ # Next.js admin console
│ └── src/
│ ├── app/(dashboard) # 52 admin pages
│ ├── components/ # admin UI components
│ └── lib/ # API client, hooks, auth
├── packages/
│ ├── types/ # shared TypeScript types (API contracts)
│ ├── config/ # shared config (Sentry, ESLint)
│ └── mock-reference/ # design mocks (read-only)
├── infra/
│ └── terraform/
│ ├── environments/staging/ # staging terraform
│ └── modules/ # reusable modules
├── docs/ # ← all documentation
└── .github/workflows/ # CI/CD

---

## ৬. Documentation index

### 6.1 Client-facing (this handover + training)

| File | Purpose |
|---|---|
| `docs/handover.md` (this file) | Umbrella handover doc |
| `docs/training/README.md` | Training index |
| `docs/training/01-08*.md` | Role-specific guides |
| `docs/acceptance-checklist.md` | Feature acceptance |
| `docs/phase-4-audit.md` | Feature audit |

### 6.2 Operations (for client's ops staff)

| File | Purpose |
|---|---|
| `docs/aws-runbook.md` | AWS infra operations |
| `docs/dr-runbook.md` | Disaster recovery procedures |
| `docs/load-test-report.md` | Load test evidence |
| `docs/security-check-report.md` | Security findings + fixes |

### 6.3 Technical reference (client's dev, if any)

| File | Purpose |
|---|---|
| `docs/DECISIONS.md` | All product + tech decisions |
| `docs/data-model.md` | Database model |
| `docs/openapi.yaml` | API spec |
| `docs/seo-verification.md` | SEO audit |
| `docs/step-13-mock-inventory.md` | Integration swap guide |
| TDD v2.1 (client copy) | System design |
| Workflow v2.0 (client copy) | Build plan |

---

## ৭. Credentials inventory

**সব credentials ক্লায়েন্টের নিজের accounts-এ থাকবে। Developer-এর access শুধু deployment-এর জন্য (least privilege)।**

### 7.1 AWS (client-owned)

| Item | Value | Notes |
|---|---|---|
| AWS Account ID | `390630836942` | client's own |
| Region | `ap-south-1` (Mumbai) | |
| IAM User (dev) | `bluegofer-admin` | limited permissions |
| EC2 Instance | `i-02e21d2aba38958db` | |
| EC2 Elastic IP | `35.154.78.4` | |
| RDS Identifier | `bluegofer-staging-pg` | |
| S3 Media | `bluegofer-staging-media-390630836942` | |
| S3 Logs | `bluegofer-staging-logs-390630836942` | |
| Route 53 Zone | `Z0049251104IT8N0VWHA6` | |

**Root credentials:** client-only, MFA enabled, never used for daily ops।

### 7.2 Third-party services (client-owned)

| Service | Owner | Status |
|---|---|---|
| Domain registrar (GoDaddy) | client | ✅ registered |
| bKash merchant | client | ⏳ pending |
| Nagad merchant | client | ⏳ pending |
| SSLCommerz merchant | client | ⏳ pending |
| Pathao courier | client | ⏳ pending |
| SMS aggregator (D-09) | client | ⏳ TBD |
| Amazon SES | client AWS | ❌ denied |
| Brevo (SES alternative) | client | ⏳ deferred |
| Sentry (error tracking) | dev (free tier) | ✅ active |
| GA4 | client | ✅ (or pending) |
| Meta Pixel | client | ✅ (or pending) |

**Credential storage:**
- AWS Secrets Manager / SSM Parameter Store (encrypted)
- `.env` files on EC2 (not in git)
- Repo `.env.example` files show structure only

### 7.3 GitHub

| Item | Value |
|---|---|
| Repo | `github.com/bluegofer/ecommarce` |
| Main branch | `main` (future production) |
| Active branch | `staging` |
| CI/CD | GitHub Actions (OIDC to AWS, no long-lived keys) |
| Deploy role | `bluegofer-staging-github-deploy` |

---

## ৮. Operations runbooks

### 8.1 Deployment (staging)

```bash
# On local machine
git push origin staging
# → GitHub Actions triggers automatically
# → Build → ECR push → SSM deploy → smoke test
# → ~10 min total