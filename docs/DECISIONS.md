# DECISIONS

Every open question + its answer. Workflow section 3.4: never invent credentials, brand assets, or real marketplace content.

Status: LOCKED at Step 1 (2026-09-11). Any change after Step 1 requires a new entry with date + reason.

---

## Locked Decisions

| # | Decision | Answer | Owner | Date | Status |
|---|---|---|---|---|---|
| D-01 | Repo name | bluegofer/ecommarce | client | 2026-09-11 | LOCKED |
| D-02 | Brand name | Bluegofer (placeholder; may change later) | client | 2026-09-11 | LOCKED |
| D-03 | Domain name | TBD - owner: client, due: before Step 12 | client | 2026-09-11 | OPEN |
| D-04 | Launch category | Category-agnostic (Amazon-style) - all categories via EAV | client | 2026-09-11 | LOCKED |
| D-05 | Demo attribute sets | Electronics (RAM/Storage/Warranty); Fashion (Size/Color/Material); Grocery (Weight/Expiry) | client | 2026-09-11 | LOCKED |
| D-06 | Courier provider | Pathao (Steadfast, RedX adapters pre-planned) | client | 2026-09-11 | LOCKED |
| D-07 | Multi-courier support | Yes - adapter pattern, per-zone or per-order selection | client | 2026-09-11 | LOCKED |
| D-08 | Payment gateways | bKash + Nagad + SSLCommerz + Cash on Delivery | client | 2026-09-11 | LOCKED |
| D-09 | SMS aggregator | TBD - owner: client, due: before Step 10 | client | 2026-09-11 | OPEN |
| D-10 | Delivery charge | TBD - owner: client, due: before Step 10 | client | 2026-09-11 | OPEN |
| D-11 | Delivery zones | Inside Dhaka / Outside Dhaka | client | 2026-09-11 | LOCKED |
| D-12 | Free-shipping threshold | 1500 BDT (temporary; may change) | client | 2026-09-11 | LOCKED |
| D-13 | COD fee rules | TBD - owner: client, due: before Step 10 | client | 2026-09-11 | OPEN |
| D-14 | Return window | 7 days from delivery | client | 2026-09-11 | LOCKED |
| D-15 | Low-stock threshold | 5 per variant | client | 2026-09-11 | LOCKED |
| D-16 | Locales | bn (default) + en | client | 2026-09-11 | LOCKED |
| D-17 | Currency | BDT (integer poisha) | client | 2026-09-11 | LOCKED |
| D-18 | AWS account | TBD - owner: client, due: before Step 12 | client | 2026-09-11 | OPEN |
| D-19 | AWS region | ap-south-1 (Mumbai) | client | 2026-09-11 | LOCKED |
| D-20 | Domain registrar / DNS | TBD - owner: client, due: before Step 12 | client | 2026-09-11 | OPEN |
| D-21 | Payment merchant onboarding | TBD - owner: client, due: before Step 10 | client | 2026-09-11 | OPEN |
| D-22 | Courier account opening | TBD - owner: client, due: before Step 10 | client | 2026-09-11 | OPEN |

---

## Notes

- D-02: Bluegofer is a placeholder wordmark. All UI strings read from one brand config.
- D-04: Catalog uses EAV + variant (SKU) schema. New category = data entry, not code.
- D-05: Demo sets only for Step 14 seed fixtures.
- D-12: Config update, not code.
- OPEN items: Each has explicit owner + due-point. No blocker for Step 1.

## Step 8 Update — Cart Storage Strategy (Temporary)

**Date:** 2026-09-12 (during Step 8 build)
**Status:** TEMPORARY — will change in Step 8.7

### Decision
For Step 8 (C4 Cart page), the guest cart will be persisted **only in localStorage** (via the existing `CartProvider` in `apps/storefront/src/lib/cart/context.tsx`). No server-side cart API calls will be made from the storefront during Step 8.

### Why this is acceptable per TDD
- TDD §7.2: *"a guest-cart that persists in local storage and merges on login"* — localStorage is the TDD-sanctioned storage for guest carts.
- UI Spec C4 AC-1: *"guest: localStorage; user: API"* — both storages are required; guest uses localStorage.
- TDD §11.5: PostgreSQL is the single consistency boundary for **orders/payments/stock/coupons** — not for guest cart items.

### What is deferred and to when
- **Step 8.7 (C6-C7 Auth):** after login succeeds, call `POST /api/v1/carts/guest` (or equivalent) to materialize a server cart, then `POST /carts/{id}/items` for each local item → **merge**. Local cart is then cleared.
- **Step 8.7+:** signed-in users read/write via `GET /carts/{id}`, `POST /carts/{id}/items`, `PATCH /carts/{id}/items/{itemId}`, `DELETE /carts/{id}/items/{itemId}`, `POST /carts/{id}/coupon`.
- **Step 14 (UAT):** verify guest→user merge on login works end-to-end with a real auth session.

### Enforcement
- A `useMergeGuestCart()` hook will be stubbed in Step 8.5 (returns no-op) and activated in Step 8.7.
- Server cart endpoints (Step 5) remain unchanged; only the storefront wiring is deferred.

## Step 8 Update — Checkout Payment Methods & Address Book (Temporary)

**Date:** 2026-09-12 (during Step 8.6 build)
**Status:** TEMPORARY — will change in Step 10 and Step 8.8

### Decision 1 — Payment methods on Checkout (C5)
- The UI will render **all four payment options** per UI Spec C5: bKash, Nagad,
  SSLCommerz (Card/Net Banking), Cash on Delivery.
- **Only Cash on Delivery (COD)** will actually place an order end-to-end in Step 8.6.
- Selecting bKash / Nagad / SSLCommerz and clicking "Place Order" will show a
  toast: *"Payment integration arrives in Step 10"* and **not** submit the order.
- Rationale: TDD §6.8 specifies gateway-hosted flows with signed webhooks — Step 5
  left these as stubs; Step 10 wires the real adapters (bKash tokenized checkout,
  Nagad, SSLCommerz, plus signature verification and idempotent webhooks).

### Decision 2 — Address book on Checkout
- Step 8.6 will use a **single inline address form** on the Address step
  (name, phone, area, full address, validated).
- The **saved-addresses picker** (UI Spec C5 step 1: "saved address cards +
  Add New Address") will be wired in **Step 8.8** (Account area) after auth
  is available, because it requires:
  - `POST /api/v1/auth/login` (Step 8.7) to obtain a customer session
  - A storefront-facing endpoint exposing the CRM `addresses` table for the
    authenticated customer (to be added/exposed in Step 8.8 or Step 9)
- For guests, single-form entry remains the only path — acceptable per UI Spec
  C5 which explicitly supports guest checkout.

### Enforcement
- A code comment will be added in `CheckoutClient.tsx` where non-COD methods
  short-circuit, referencing this decision.
- A code comment will be added in the Address step where the "saved addresses"
  UI is intentionally omitted, referencing this decision.
- Step 10 owner: replace stub with real payment adapters and idempotent webhook
  handling.
- Step 8.8 owner: add saved-address picker + Add New Address modal on top of
  the existing single-form component (no rewrite needed).

## Step 8 Update — Search/PLP/PDP Dynamic Rendering Strategy (Temporary)

**Date:** 2026-09-12 (during Step 8.6 build)
**Status:** TEMPORARY — will be revisited in Step 8.12 (PWA) and Step 11 (SEO)

### Decision
Storefront pages that depend on runtime `searchParams` (filters, search query,
pagination) use `export const dynamic = 'force-dynamic'` instead of ISR:

- `app/[locale]/s/page.tsx` (search results)
- `app/[locale]/c/[slug]/page.tsx` (category PLP with filters)
- `app/[locale]/p/[slug]/page.tsx` (PDP — fetches product + variants + reviews per request)
- `app/[locale]/order-confirmation/page.tsx` (reads order number + phone from searchParams)

### Why this is acceptable per TDD
- TDD §8.1 requires SSR/SSG/ISR for **crawlable** pages. Dynamic SSR (force-dynamic)
  still delivers fully server-rendered HTML on every request — it satisfies SSR.
- ISR (`revalidate = 60`) was attempted first but caused **stale empty results**:
  the first request with no search params was cached, then subsequent queries
  returned the cached empty state for 60s (Next.js App Router caches the
  entire page output when `revalidate` is set, ignoring new searchParams).
- This is a known Next.js App Router pattern: `searchParams`-dependent pages
  must either use `force-dynamic` or wrap `useSearchParams()` in Suspense.

### What is deferred and to when
- **Step 8.12 (PWA):** verify production `next start` respects `force-dynamic`
  at runtime (build output marker ●/ƒ may be misleading; runtime behavior is
  what matters). Confirm via production server + curl with different query strings.
- **Step 11 (SEO):** if needed, switch high-value pages (PDP, top categories)
  to ISR with `generateStaticParams` for popular slugs + on-demand revalidation
  hooked to admin publish events (per TDD §8.1). Filter/search result pages
  remain dynamic — the UI Spec A9 table marks them `noindex`, so ISR adds no
  SEO value.

### Enforcement
- Code comments in each affected page file reference this decision.
- CI continues to pass: dynamic pages don't break the build, they just skip
  static generation for those routes.
- Future dev: if build output shows ● SSG but the page uses searchParams,
  check runtime behavior first — the marker is not always accurate.

## Step 8 Update — Storefront Auth Token Storage (Temporary)

**Date:** 2026-09-12 (during Step 8.7 build)
**Status:** TEMPORARY — will be revisited in Step 8.12 (PWA) and Step 13 (Security)

### Decision
The storefront's authentication uses:

- **Access token (short-lived JWT):** in-memory React state only (via `AuthProvider`).
  Never written to `localStorage` or `sessionStorage`.
- **Refresh token (rotating):** HttpOnly SameSite cookie set by the API (Step 2).
  Browser manages it; JS cannot read it.
- **Session restore:** on app mount, `AuthProvider` calls `POST /api/v1/auth/refresh`
  once. If the cookie is valid, the API returns a new access token (rotation).
  If not, user is anonymous.

### Why this is TDD-compliant
- TDD §10.1: *"short-lived JWT access tokens with rotating refresh tokens;
  cookies use SameSite and HttpOnly flags"* — this decision follows that
  guidance exactly.
- TDD §10.1: XSS prevention relies on tokens not being accessible to JS.
  In-memory access token + HttpOnly refresh cookie is the standard
  browser-side pattern for that.
- TDD §4.2: one versioned REST API; the API already returns tokens and
  handles cookie rotation, no changes needed.

### Known trade-off
- On hard page reload, the access token is lost briefly. `AuthProvider`
  triggers a silent refresh on mount; user sees a ~100ms anonymous flash
  before session is restored. This is acceptable for Step 8 and typical of
  this pattern.

### What is deferred and to when
- **Step 8.12 (PWA):** confirm service worker does not intercept or cache
  `/auth/refresh` responses (must pass through). Add explicit bypass rule.
- **Step 13 (Security hardening):** verify cookie flags in production (Secure,
  SameSite=Strict, HttpOnly); verify CSP allows no inline script that could
  exfiltrate tokens; add sentry-style alert on repeated refresh failures.
- **Guest cart merge (Step 8.7):** when refresh succeeds on mount, if a guest
  cart exists in localStorage, trigger the merge hook from `useMergeGuestCart()`
  (currently stubbed in `lib/cart/merge-hook.ts`).

### Enforcement
- `AuthProvider` is the only place that stores the access token.
- `lib/auth/storage.ts` is a NO-OP for access tokens; it only manages
  non-sensitive session hints (e.g., "was I signed in before?" flag).
- CI continues to pass; no package changes required.

---

## Step 8.11 Update — Order Confirmation Lookup Strategy

**Date:** 2026-09-12
**Decision:** Order confirmation page uses `GET /api/v1/orders/lookup?orderNumber=X&phone=Y`

**Context:**
- Guest checkout flow redirects to `/order-confirmation?order=BG-XXX&phone=01XXX`
- Need full order summary (items, totals, payment, shipping) without requiring login
- UI Spec C14 requires confirmation page reachable only with valid session/token

**Chosen approach:**
- Public endpoint (`@Public()` in `apps/api/src/modules/orders/orders.controller.ts`) — already exists from Step 5
- Security: `orderNumber` + `phone` must BOTH match; otherwise `{ ok: false }` returned
- Phone acts as the "password" — order number alone is not enough (prevents enumeration)
- Same endpoint reused by:
  - Guest checkout success page (Step 8.6)
  - Any future "track my order without login" flow
  - Customer support lookup (already used by `/crm/customers/lookup`)

**Rejected alternatives:**
- Signed JWT token per order in URL — heavier, requires extra signing infrastructure, and URL-lifetime concerns (link sharing, browser history)
- Login required for confirmation — breaks guest checkout (major UX loss for BD e-commerce where guest checkout is the norm)
- Server-side session cookie per order — extra state to manage, no benefit over phone-as-password

**Enforcement:**
- Confirmation page uses `ConfirmationClient` (client component) that calls the lookup endpoint
- Server wrapper (`app/[locale]/order-confirmation/page.tsx`) only validates `order` + `phone` search params are present; actual ownership check happens at API
- Page is `dynamic = 'force-dynamic'`, `robots: { index: false, follow: false }`


## Step 8.11 Update — Invoice Download on Confirmation Page

**Date:** 2026-09-12
**Decision:** Confirmation page shows "Download Invoice" as a sign-in CTA (ghost link), not a direct PDF link.

**Context:**
- `GET /orders/:id/invoice.pdf` endpoint exists but is admin-scoped (`@Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')`)
- Guest users on confirmation page cannot access this endpoint
- UI Spec C14 lists "Download invoice" as a button (PDF, [PLACEHOLDER] template)

**Chosen approach:**
- On confirmation page, "Download Invoice" button links to `/{locale}/signin?next=/{locale}/account/orders`
- Logged-in users access invoice from `/account/orders/[id]` (admin-scoped endpoint behind their own auth)
- Guest users are prompted to create an account to access invoice

**Deferred:**
- **Step 10 (Integrations):** guest invoice PDF delivery via email attachment using notification template (outbox → SES with PDF generated server-side)
- **Step 9 (Admin):** invoice template polish + download from order console

**Enforcement:**
- Confirmation page never links directly to `/orders/:id/invoice.pdf`
- Invoice access always goes through authenticated context (account area) or email delivery

## Step 10 Update — HR / Attendance / Payroll conventions (Temporary)

**Date:** 2026-09-12 (during Step 10 build)
**Status:** TEMPORARY — pending client confirmation before Step 16 UAT

### Decisions
- **Salary cycle:** calendar month (1st → last day, UTC).
- **Proration:** perDay = floor(baseSalary / daysInMonth); deductions
  use this perDay.
- **Overtime pay:** overtimePay = round(overtimeMinutes / 60 * overtimeRate);
  overtimeRate is poisha per hour, per-employee (SalaryStructure).
- **Leave deduction:** ALL leave types currently deduct (leaveDeduction =
  perDay * leaveDays). A paid-leave policy (e.g., N annual leave days paid,
  others unpaid) will be a Step 12 setting.
- **Late deduction:** 0 (no late policy configured). Placeholder.
- **Tax deduction:** flat per-employee value from SalaryStructure. No
  progressive slab logic (Bangladesh NBR slabs) yet.
- **PF (provident fund):** flat per-employee value, deducted at payslip.
- **Payment method for payroll:** CASH / BANK / MFS — chosen at
  markPaid(runId, method). Default MFS. Journal posting:
  Salaries Expense Dr / (Cash|Bank|MFS) Cr.
- **Device attendance:** POST /hr/attendance/device-events accepts
  normalized punch events; the vendor adapter (fingerprint/face/RFID)
  is a separately-quoted future phase (workflow ground rule #18).

### Client confirmations needed before Step 16 UAT
- Paid-leave policy details (which leave types deduct, which do not)
- Overtime eligibility rules (which employees/roles get OT pay)
- Late-arrival penalty policy (if any)
- Tax slab logic vs flat deduction per employee
- PF contribution split (employer vs employee) if any

### Enforcement
- `payroll.service.ts` has explanatory comments for each rule + this
  DECISIONS.md reference.
- A future setting (Step 12 admin > Settings > Payroll) will make these
  configurable without code changes.

---

## Step 12 Complete — Admin / Operations Dashboard (2026-09-13)

**Status:** COMPLETE — CI green, staging deploy successful.

### Delivered
- 50 admin routes covering every module (commerce + ERP + Appendix A enhancements)
- Tailwind v3 + design tokens from `packages/mock-reference-admin/assets/css/style.css`
- Brand fix: SkyMart → BlueGofer (D-02)
- API client (fetch wrapper + Bearer + silent 401 refresh)
- AuthProvider (in-memory token, HttpOnly refresh cookie)
- Playwright E2E infrastructure (smoke + RBAC tests, opt-in)

### Deferred to next steps (see UPCOMING-CHANGES.md)
- Real login flow with production auth (currently stub, wired in Step 12 follow-up)
- ESLint Next plugin rules (deferred to Step 15, blocked by ESLint 9 incompatibility)
- 32 lint warnings (unused imports) — cleaned in Step 15

### Known constraints
- `AUTH_ENABLED=false` in middleware — real auth wiring is a Step 12 follow-up
- E2E Playwright tests not yet run in CI (added to CI in Step 15)
- No production database seed yet (Step 16)

---

## Step 13 — Scope Note (2026-09-13)

Before starting Step 13, client requested several operational improvements that
are NOT in TDD v2.1 or Workflow v2.0. These are logged in `docs/UPCOMING-CHANGES.md`
as ENH-01..06.

**Decision:** Step 13 will follow TDD v2.1 exactly (single-provider per category,
env-var config). The client-requested enhancements (admin-config UI, multi-provider,
multi-dimensional delivery rules, rule-based fees) are DEFERRED to Step 14 / Step 15
/ Phase 2, tracked in UPCOMING-CHANGES.md.

**Rationale:** Preserves TDD contract; delivers Step 13 on schedule; improvements
land as a clean, documented follow-up rather than mixing into the current scope.

**Owner:** client (may upshift items anytime with a dated note in UPCOMING-CHANGES.md).
---

## Step 13.1 — Integration Decisions Locked as TEMPORARY MOCK (2026-09-13)

**Status:** TEMPORARY — real credentials will replace mocks without code changes.

### Context
Client has not yet decided the real providers for Step 13 (D-09, D-10, D-13,
D-21, D-22). To keep Step 13 on schedule, every integration is wired behind an
interface with a deterministic mock implementation. Real credentials are wired
via `.env.local` only — no code changes are required when the client decides.

### Decisions locked as TEMP

| # | Decision | TEMP Answer | Real owner | Real due |
|---|---|---|---|---|
| D-09 | SMS aggregator | MOCK | client | before Step 16 launch |
| D-10 | Delivery charge | Inside Dhaka BDT 60 / Outside Dhaka BDT 120 | client | before Step 14 |
| D-13 | COD fee | No fee | client | before Step 14 |
| D-21 | Payment gateways | bKash / Nagad / SSLCommerz all MOCK | client | before Step 16 launch |
| D-22 | Courier account | Pathao MOCK | client | before Step 16 launch |

### Rationale for the D-10 default
BDT 60 / 120 is within the TDD §15.2 startup range (BDT 60-150 by zone). It is a
config value and can change any time without code changes.

### Mock adapter contracts (locked for this phase)
- `PaymentAdapter` (BKASH / NAGAD / SSLCOMMERZ / COD): deterministic redirect
  URLs, idempotent webhooks keyed by `eventId`, refunds return success with
  mock IDs.
- `CourierAdapter` (PATHAO): deterministic consignment IDs, one
  PENDING -> IN_TRANSIT event per tracking sync, 1% mock settlement fee.
- `SmsAdapter` (MOCK): real provider adapter will be selected by `SMS_PROVIDER`.
- `AnalyticsAdapter` (GA4 / META_CAPI): env flag on/off; real integration in 13.6.

### Files created in 13.1
- `packages/types/src/payments.ts`, `courier.ts`, `messaging.ts`, `analytics.ts`
- `packages/types/src/index.ts` (exports appended)
- `apps/api/src/modules/payments/payment-adapter.interface.ts`
- `apps/api/src/modules/payments/adapters/mock-payment.adapter.ts`
- `apps/api/src/modules/courier/courier-adapter.interface.ts`
- `apps/api/src/modules/courier/adapters/mock-pathao.adapter.ts`

### Enforcement
- All adapters register via injection tokens (`PAYMENT_ADAPTERS`,
  `COURIER_ADAPTERS`). Real adapters in 13.2 / 13.4 swap in without touching
  call sites.
- Mock behaviour is asserted in integration tests (Step 13.7).
- Every field a real provider will return is already present in the interface —
  no shape change when swapping.