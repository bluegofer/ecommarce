# BlueGofer — Security Check Report

**Step:** 15.8 Phase B — Security sweep (TDD §10 baseline verification)
**Scope:** Application security audit + penetration checks on staging, before Step 16 launch
**TDD reference:** §10 (Security Design), §11 (Data Integrity & Concurrency)
**Workflow reference:** Step 15 §106 (Application security sweep), §108 (Penetration-style checks)
**Owner:** Development team · **Reviewer:** Client (MD ANIMUL HOQ)
**Status:** 🟡 In progress — findings populated as audit progresses

---

## Summary

| Category | Findings | Fixed | Open | Status |
|---|---|---|---|---|
| Input validation (TDD §10.1) | 1 | 1 | 0 | ✅ |
| SQL injection (TDD §10.1 — ORM-only) | 0 | — | — | ⏳ Pending audit |
| XSS prevention (TDD §10.1) | 0 | — | — | ⏳ Pending audit |
| CSRF (TDD §10.1) | 0 | — | — | ⏳ Pending audit |
| Authentication (TDD §10.1) | 0 | — | — | ⏳ Pending audit |
| Cookie flags (TDD §10.1) | 0 | — | — | ⏳ Pending audit |
| Admin hardening / 2FA (TDD §10.1) | 0 | — | — | ⏳ Pending audit |
| Rate limits (TDD §10.3) | 0 | — | — | ⏳ Pending audit |
| Security headers (TDD §10.1) | 1 | 0 | 0 (auto-pass) | ✅ Verified live |
| Service worker bypass (DECISIONS Step-8.7) | 0 | — | — | ⏳ Pending audit |
| Deferred drift (Step 15.12) | 4 | 0 | 4 | ⏳ Tracked |
| ERP path hardening (Appendix A §A.5) | 0 | — | — | ⏳ Pending Step 15.9 |

---

## Findings Detail

### F-01 — `orders/lookup` missing query params → 500 (was BLUEGOFER-API-1)

**Severity:** 🟠 Medium (information disclosure via stack-trace-adjacent 500 responses; no auth bypass)
**Category:** Input validation (TDD §10.1)
**Discovered:** Step 15.11 — Sentry issue `BLUEGOFER-API-1`
**Endpoint:** `GET /api/v1/orders/lookup`
**Reproduced:** 2026-09-18 (Step 15.8.1 recon)

**Symptom:**
- Missing `orderNumber` and/or `phone` query params → `HTTP 500 Internal Server Error`
- Root cause: `undefined` reached `PrismaService.order.findUnique({where: {orderNumber: undefined}})` → `PrismaClientValidationError` → global filter mapped to 500
- Expected: `HTTP 400 Bad Request` (missing required params)

**Fix (Step 15.8.2, commit `112f049`):**
1. **New DTO** — `apps/api/src/modules/orders/dto/lookup-order.dto.ts`
   - `LookupOrderQueryDto` (class-validator): `orderNumber` required, 3–64 chars; `phone` required, 6–20 chars
2. **Controller** — `orders.controller.ts` uses `@Query() LookupOrderQueryDto`; global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) rejects missing/empty params with 400 before service logic
3. **Service guard (defense-in-depth)** — `orders.service.ts` `findByNumber()` returns `null` for empty/undefined `orderNumber` instead of reaching Prisma (protects internal callers)

**Verification (production, 2026-09-18 20:25 UTC):**
| Test | Expected | Actual | Status |
|---|---|---|---|
| No params | `400` | `400` + 6 validation msgs | ✅ |
| Only `orderNumber` | `400` | `400` + 3 phone msgs | ✅ |
| Only `phone` | `400` | `400` + 3 orderNumber msgs | ✅ |
| Both valid, not found | `200 {"ok":false}` | `200 {"ok":false}` | ✅ No regression |

**Sentry issue `BLUEGOFER-API-1`:** Closed / will auto-resolve after DSN refresh window.

**TDD compliance:** §10.1 — "every API input is validated against strict schemas (class-validator/Zod) before any business logic runs"

---

### F-02 — Security headers (auto-pass verification)

**Severity:** ⚪ Informational
**Category:** HTTP response hardening (TDD §10.1, §10.5)
**Discovered:** Step 15.8.1 recon (curl response headers)

**Verified live in production:**
- `Content-Security-Policy` — strict (default-src 'self', frame-ancestors 'self', object-src 'none', script-src 'self', upgrade-insecure-requests)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `X-DNS-Prefetch-Control: off`
- `X-Download-Options: noopen`

**Source:** NestJS `helmet` (configured in `apps/api/src/main.ts`, Step 2)

**Verdict:** ✅ No action needed — TDD §10.1 compliant

---

## Deferred Drift Tracking (from Step 15.12 full terraform plan)

These items are infrastructure-level, not application-security; tracked here for Step 15.8 / Step 15.10 handling:

| # | Item | Priority | Target step |
|---|---|---|---|
| D-01 | EC2 AMI pin missing — `data.aws_ami` auto-updates → would replace instance | High | Step 15.10 (maintenance window) |
| D-02 | CloudWatch 2 alarms (disk/memory) CLI-created vs Terraform state mismatch | Med | Step 15.8 (this session or 15.8.4) |
| D-03 | SNS email subscription confirm pending | Med | Step 15.8 |
| D-04 | Security group ingress drift (2 rules removed in plan) | Med | Step 15.8 |

**Rationale:** correcting mid-Step 15.12 risked EC2 replacement. All items safe at current runtime; no user-facing impact.

---

## Pending Audit Items (Step 15.8.4)

Populated as audit runs — expected categories:

1. **Input validation** — full DTO coverage across all endpoints (query, body, param); note current `OrderListQueryDto` is a TypeScript `interface`, not class-validator class (global pipe is a no-op for it) — potential refactor target
2. **ORM-only DB access** — grep for raw SQL / `$queryRaw` / `$executeRaw` and verify parameterization
3. **Rich text sanitization** — CMS content rendering path (Step 4 output)
4. **CSRF tokens** — state-changing endpoints (checkout, coupons, admin actions)
5. **Cookie flags** — `Secure`, `SameSite`, `HttpOnly` on refresh token cookie
6. **bcrypt cost** — password hashing rounds
7. **Rate limits** — `/auth/*`, `/checkout`, `/coupon` per TDD §10.3
8. **Admin TOTP enforcement** — verify guard blocks non-enrolled staff
9. **Service worker bypass** — `/auth/refresh` must NOT be cached (DECISIONS Step-8.7 deferral)
10. **PII scrub** — Sentry event scrubbing still working (regression check after 15.11)

---

## Evidence Trail

| Item | Location | Verified at |
|---|---|---|
| Fix commit | `112f049` (staging) | 2026-09-18 |
| CI run | https://github.com/bluegofer/ecommarce/actions/runs/35390065925 | Success, 11m 13s |
| Production curl Test 1 | (Step 7 output, this session) | 2026-09-18 20:25 UTC |
| Production curl Test 2 | (Step 7 output, this session) | 2026-09-18 20:25 UTC |
| Production curl Test 3 | (Step 7 output, this session) | 2026-09-18 20:25 UTC |
| Production curl Test 4 | (Step 7 output, this session) | 2026-09-18 20:25 UTC |
| Sentry issue | BLUEGOFER-API-1 (auto-resolve pending) | 2026-09-18 |

---

## Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| Development | — | 2026-09-18 | 🟡 In progress (15.8.2 done; 15.8.4 audit pending) |
| Client | MD ANIMUL HOQ | — | ⏳ Awaiting final report |

---

*End of report — will be updated through Step 15.8.5 and closed at Step 15 sign-off.*