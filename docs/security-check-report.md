# BlueGofer — Security Check Report

**Step:** 15.8 Phase B — Security sweep (TDD §10 baseline verification)
**Scope:** Application security audit + penetration checks on staging, before Step 16 launch
**TDD reference:** §10 (Security Design), §11 (Data Integrity & Concurrency)
**Workflow reference:** Step 15 §106 (Application security sweep), §108 (Penetration-style checks)
**Owner:** Development team · **Reviewer:** Client (MD ANIMUL HOQ)
**Status:** 🟢 Application sweep complete — penetration checks (Step 15.9) pending

---

## Summary

| Category | Findings | Fixed | Open | Status |
|---|---|---|---|---|
| Input validation (TDD §10.1) | 3 | 1 | 2 | 🟡 F-01 fixed; F-03 open (audit noted) |
| SQL injection (TDD §10.1 — ORM-only) | 0 | — | — | ✅ ORM-only (Prisma exclusively) |
| XSS prevention (TDD §10.1) | 0 | — | — | ✅ React escaping + CSP (verified live) |
| CSRF (TDD §10.1) | 1 | 0 | 0 | ✅ Mitigated by design (see F-05) |
| Authentication (TDD §10.1) | 0 | — | — | ✅ JWT + refresh rotation + bcrypt |
| Cookie flags (TDD §10.1) | 1 | 0 | 1 | 🟡 F-06 deferred to 15.9 |
| Admin hardening / 2FA (TDD §10.1) | 0 | — | — | ⏳ Verify in 15.9 (TOTP code path) |
| Rate limits (TDD §10.3) | 1 | 1 | 0 | ✅ F-04 fixed + verified live |
| Security headers (TDD §10.1) | 1 | 0 | 0 | ✅ Auto-pass (helmet live) |
| Service worker bypass (DECISIONS Step-8.7) | 0 | — | — | ⏳ Verify in 15.9 (PWA scope) |
| Deferred drift (Step 15.12) | 4 | 0 | 4 | ⏳ Tracked → Step 15.10 |
| ERP path hardening (Appendix A §A.5) | 0 | — | — | ⏳ Step 15.9 (pen test) |

**Application-level sweep:** 🟢 Complete
**Infrastructure-level verification:** ⏳ Step 15.10 + 15.15
**Penetration checks:** ⏳ Step 15.9

---

## Findings Detail

### F-01 — `orders/lookup` missing query params → 500 (was BLUEGOFER-API-1)

**Severity:** 🟠 Medium (information disclosure via stack-trace-adjacent 500 responses; no auth bypass)
**Category:** Input validation (TDD §10.1)
**Discovered:** Step 15.11 — Sentry issue `BLUEGOFER-API-1`
**Endpoint:** `GET /api/v1/orders/lookup`
**Reproduced:** 2026-09-18 (Step 15.8.1 recon)
**Status:** ✅ **FIXED** (commit `112f049`, Step 15.8.2)

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

**Sentry issue `BLUEGOFER-API-1`:** Resolved.

**TDD compliance:** §10.1 — "every API input is validated against strict schemas (class-validator/Zod) before any business logic runs"

---

### F-02 — Security headers (auto-pass verification)

**Severity:** ⚪ Informational
**Category:** HTTP response hardening (TDD §10.1, §10.5)
**Discovered:** Step 15.8.1 recon (curl response headers)
**Status:** ✅ **VERIFIED LIVE**

**Verified in production (every API response):**
- `Content-Security-Policy` — strict (`default-src 'self'`, `frame-ancestors 'self'`, `object-src 'none'`, `script-src 'self'`, `upgrade-insecure-requests`)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `X-DNS-Prefetch-Control: off`
- `X-Download-Options: noopen`

**Source:** NestJS `helmet()` configured in `apps/api/src/main.ts` (Step 2).

**Verdict:** ✅ No action needed — TDD §10.1 compliant.

---

### F-03 — `OrderListQueryDto` is a TypeScript interface (validation is a no-op)

**Severity:** 🟡 Medium (malformed query params on `GET /api/v1/orders` are silently accepted rather than rejected at the door; no security bypass)
**Category:** Input validation (TDD §10.1)
**Discovered:** Step 15.8.2 (while fixing F-01)
**Location:** `packages/types/src/orders.ts:192`
**Status:** 🟡 **OPEN — deferred to a future step**

**Problem:**
- `OrderListQueryDto` is declared as `export interface OrderListQueryDto { ... }` — a TypeScript interface, not a class.
- The global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`) needs runtime metadata (decorators + class) to validate. Interfaces are compile-time only → validation is a no-op for this DTO.
- Malformed query params (e.g., non-numeric `page`, invalid `status` enum) are silently passed through to the service layer instead of being rejected with HTTP 400.

**Impact:**
- Not a security bypass — Prisma parameterized queries prevent injection; `page`/`pageSize` are numeric-coerced in service via `Math.max/min`.
- TDD §10.1 violation: not every input is "validated against strict schemas before any business logic runs."

**Recommended fix (future step):**
- Convert `OrderListQueryDto` (and other interface-based query DTOs discovered during this sweep) to `class` + class-validator decorators.
- Requires the shared `packages/types` build pipeline to have `experimentalDecorators: true` + `emitDecoratorMetadata: true` in tsconfig — currently it does **not**.
- **Deferred rationale:** cross-package tsconfig change risks Next.js apps and other consumers. Tracked as `F-03` for a dedicated "input validation sweep" refactor step (owner: Dev, target: post-Step 16 backlog or Phase 2).

**Scope note:** similar check should be applied to any other DTO declared as an interface in `packages/types/` that is consumed via `@Query()` / `@Param()` / `@Body()`. Not enumerated in this pass — tracked as a backlog item.

---

### F-04 — No rate limiting on sensitive endpoints

**Severity:** 🔴 **HIGH** (brute-force feasible, OTP/SMS abuse, coupon enumeration, order spam — all with real cost or DoS impact)
**Category:** Rate limiting (TDD §10.3)
**Discovered:** Step 15.8.4 recon (2026-09-19)
**Endpoints at risk:** `/api/v1/auth/*` (login, register, otp), `/api/v1/checkout/place-order`, `/api/v1/promotions/evaluate-cart`
**Status:** ✅ **FIXED + VERIFIED** (commits `abddcbc`, `4e823c1`, `92cc8a5`)

**Problem:**
- `@nestjs/throttler` was not installed anywhere in the codebase (verified by package.json grep + source-wide grep for `Throttle`/`ThrottlerGuard`).
- Sensitive endpoints accepted unlimited requests per IP → brute-force, SMS bombing (real per-SMS cost), coupon enumeration, order-spam all feasible.

**Fix — three iterations (honest timeline):**

**Iteration 1 — commit `abddcbc`:**
- Installed `@nestjs/throttler@6.7.0`.
- `app.module.ts`: `ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }])` + `ThrottlerGuard` as first `APP_GUARD`.
- `auth.controller.ts`: `@Throttle` overrides — register 5/min, otp/request 3/min (SMS bombing), otp/verify 10/min, login 5/min.
- `checkout.controller.ts`: `@Throttle` 10/min on place-order.
- `rules-engine.controller.ts`: `@Throttle` 30/min on evaluate-cart.
- **CI RED** — 27 tests failed across 7 suites: `expected 201 "Created", got 429 "Too Many Requests"` on `/auth/register` (test helper `seedUserWithRole` registers many users per suite).

**Iteration 2 — commit `4e823c1`:**
- Removed `name: 'default'` from `ThrottlerModule.forRoot` (hypothesis: v6 auto-assigns name; explicit `name` may cause `@Throttle({ default: ... })` overrides to silently skip).
- **CI STILL RED** — same 27 tests fail.

**Iteration 3 — commit `92cc8a5`:**
- **Root cause properly identified:** the CI failures were not a throttler-config bug — they were the *intended* behavior colliding with the test suite (test suite issues many same-IP registrations rapidly). Fix = **skip throttler in test env**.
- New `apps/api/src/common/guards/app-throttler.guard.ts`:
  ```typescript
  @Injectable()
  export class AppThrottlerGuard extends ThrottlerGuard {
    protected override async shouldSkip(_context: ExecutionContext): Promise<boolean> {
      if (process.env.NODE_ENV === 'test') return true;
      return super.shouldSkip(_context);
    }
  }