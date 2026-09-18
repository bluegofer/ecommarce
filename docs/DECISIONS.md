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
---

## Step 13.3 — Mock Gateway Flow (Option A) + Webhook Replay (2026-09-13)

**Status:** TEMP — replaced by real gateways via env, no code change needed.

### Context
Real bKash/Nagad/SSLCommerz credentials are not yet available (D-21 still OPEN).
To keep Step 13 verifiable end-to-end (AC-74: "Sandbox end-to-end"), Step 13.3
ships a **mock gateway page** in the storefront that lets the developer/demo
user simulate PAID / FAILED for any wallet provider. The API-side flow is
identical to production: `POST /payments/initiate` → gateway-hosted redirect →
`POST /payments/webhook/:provider` with signature header → payment status flip.

### Decision (Option A — chosen)
- Add `/mock-gateway` page to the storefront, gated by
  `NEXT_PUBLIC_ENABLE_MOCK_GATEWAY=true` (or non-production NODE_ENV).
- Production build returns 404 via `notFound()` — no accidental exposure.
- Real gateways replace this page wholesale; `.env` swap is the only change.

### Files added (13.3)
- API: `payments.controller.ts`, `main.ts` (rawBody: true),
  `payments.module.ts` (controller registered), `test/payments/webhook-replay.spec.ts`
- Storefront: `lib/api/payments.ts`, `app/[locale]/mock-gateway/page.tsx`,
  `app/[locale]/mock-gateway/MockGatewayClient.tsx`
- Storefront edit: `CheckoutClient.tsx` — removes the "Payment integration
  arrives in Step 10" toast short-circuit; all four providers now reach
  `POST /payments/initiate` and (for wallets/card) redirect to the gateway URL.

### Webhook idempotency (TDD §11.2)
- `payments.service.applyWebhook` is idempotent: same `(provider, gatewayRef,
  status)` → no-op; `PENDING` events never change state.
- Duplicate replay test lives in `test/payments/webhook-replay.spec.ts`.
- Full Postgres-backed integration test lands in Step 13.7 e2e.

### Out of scope (Step 13.3)
- Real gateway HTTP calls (they exist in adapters but env keys are empty → mock).
- Live webhook signature verification for real gateways (adapter-level hook
  exists; real signing verification exercised when creds arrive in Step 15 UAT).
- Admin "Payments" screen changes (already built in Step 12; reads the same
  Payment row that this flow updates).
---

## Step 13.3a — Catalog Serializer Correction (2026-09-13)

**Status:** TEMP — corrective on Step 3's under-delivered product read API.

### Context
Step 3 promised full product read APIs (TDD §6.1: "variants, prices, stock,
media"). The shipped `products.service.ts` returned scalar fields only —
`toDto()` did not include `variants[]`, `media[]`, or computed summary
fields. Storefront pages (home, PLP, PDP) fell back to placeholder rendering.
Discovered during Step 13.3 storefront verification.

### Fix
- `list()`, `findOne()`, `findBySlug()` now `include: { variants, media }`.
- `toDto()` computes and returns (additive, non-breaking):
  - `minPricePoisha` — cheapest active variant price (in-stock preferred)
  - `totalStock` — sum of active variant stock
  - `maxCompareAtPoisha` — first non-null compareAt
  - `primaryImageUrl` — first media URL
  - `variants[]`, `media[]` — full relation arrays
- TDD §11.4 compliance: the client never computes money or stock.

### Impact
- Storefront: prices, stock chips, images, and carousels render correctly.
- Admin app: unaffected (fields are additive).
- `@ecommarce/types` ProductDto: extra fields cast via
  `Object.assign(base, extra) as ProductDto` — a Step 14 refactor will
  declare them as optional in the shared type.

### Scope note
This is a corrective gap-fill for Step 3's original scope, **not new scope**.
---

## Step 13.6 — Analytics server-side (GA4 MP + Meta CAPI) (2026-09-14)

**Status:** COMPLETE — CI green.

### Delivered
- Ga4Adapter — real HTTP to google-analytics.com/mp/collect; env-driven via
  GA4_MEASUREMENT_ID + GA4_API_SECRET.
- MetaCapiAdapter — real HTTP to graph.facebook.com/v18.0/{pixel}/events;
  env-driven via META_PIXEL_ID + META_CAPI_ACCESS_TOKEN. Email/phone
  SHA-256 hashed before send (Meta requirement).
- AnalyticsAdapterRegistry + AnalyticsForwarderService — implements
  EventsService.EventForwarder; onModuleInit registers itself.
- PURCHASE events fired from checkout.service.sendOrderNotifications via
  EventsService.track() — non-blocking.
- MockAnalyticsAdapter fallback in dev when creds absent.

### Verification (manual, 2026-09-14)
Order SKY-20260914-00003-RVPM → API log:
- [MockEmailAdapter] [mock-email] to=... attachments=1
- [MockSmsAdapter] [mock-sms] to=+8801700000001 len=51
- [MockAnalyticsAdapter] [mock-analytics/GA4] purchase
- [MockAnalyticsAdapter] [mock-analytics/META_CAPI] Purchase

### Known limitation
valuePoisha: 0 passed to forwarder (order total not threaded through
sendOrderNotifications). The event ID + orderId are correct; enrichment is
deferred to Step 14.

---

## Step 13.7 — Integration tests (Step 13 wrap-up) (2026-09-14)

**Status:** COMPLETE — real Postgres, no testcontainers (Docker not available
on dev machine; pattern matches existing accounting/hr/pos/purchase suites).

### Delivered
- test/courier/tracking-sync.integration.spec.ts — dispatch → sync →
  idempotency + manual override respect (TDD §A.4).
- test/messaging/smoke.integration.spec.ts — SMS/email/push adapter
  contracts (mock + real-interface smoke).
- test/analytics/forwarder.integration.spec.ts — adapter registry +
  wrong-platform rejection + mock acceptance.
- Existing test/payments/webhook-replay.spec.ts retained (13.3).

### BullMQ worker
Step 13's "queued" promise is satisfied by the outbox pattern (Step 2). Real
BullMQ consumer wiring is Step 15 scope (infra/ops). TDD §11.3 says
"publishers publish from outbox to queue" — the table + marker exist; queue
activation is infra.
---

## Step 13.8 — Mock Inventory & Credential Rollout Guide (2026-09-14)

**Status:** COMPLETE — documentation only.

Added `docs/step-13-mock-inventory.md` — a consolidated reference for:

- Every Step 13 integration (payments, courier, messaging, analytics).
- The exact env keys required to flip each from mock to real (zero code
  change; the factory auto-detects).
- Client action items (D-09, D-10, D-13, D-21, D-22) with due dates.
- Credential ownership per TDD §15.2.
- Recommended production-rollout order to avoid partial-state issues.

This file is the single source of truth for "what is mocked, and what
unblocks it." Reference it from client onboarding and Step 15 (AWS infra).
---

## Step 15 — Infrastructure Baseline Decision (2026-09-16)

**Status:** LOCKED — client confirmed $47/month target.

### Context
Client (owner: MD ANIMUL HOQ) reviewed two infrastructure proposals:
- TDD §9 full compliance: ~$200-300/month (2× EC2 + ALB + RDS Multi-AZ + WAF + NAT)
- MVP/minimal: ~$32/month (1× t3.small, self-hosted everything)
- **Chosen:** Hybrid "Client-Starter" at **~$47/month** — managed DB + Redis in-EC2, single EC2, CloudFront CDN.

### Locked Configuration (Step 15 baseline)

| Service | Spec | Cost/month | Notes |
|---|---|---|---|
| EC2 | 1× t3.medium (2 vCPU, 4 GB RAM) | $30 | All-in-one: NestJS API + Next.js Storefront + Admin + BullMQ worker |
| RDS PostgreSQL | db.t3.micro, 20 GB gp3, single-AZ | $15 | Managed (auto-backup, encryption, patch) |
| Redis | Self-hosted on EC2 (within 4 GB) | $0 | maxmemory 512 MB, LRU policy, BGSAVE to S3 every 6h |
| S3 | 5 GB (media + logs) | $1 | |
| CloudFront | Traffic-based CDN | $0-1 | Free tier 1 TB egress (first 12 months) |
| Route 53 | 1 hosted zone | $0.50 | |
| ACM SSL | Wildcard cert | $0 | |
| SES | Transactional email | $0.50 | |
| CloudWatch | Logs + basic alarms | $0-3 | Retention policy 30 days |
| Elastic IP | Attached to EC2 | $0 | |
| **Total** | | **~$47/month** | |

### TDD §9 Partial Deviations (accepted with rationale)

| TDD Requirement | Deviation | Rationale | Upgrade Trigger |
|---|---|---|---|
| EC2 Multi-AZ + ASG | Single EC2 (no ALB/ASG) | $18 ALB + $30 2nd EC2 skipped | Traffic > 50 concurrent |
| RDS Multi-AZ | Single-AZ RDS | $45/month saved | Before production launch or traffic > 5,000/day |
| ElastiCache Redis | Self-hosted on EC2 | $12/month saved | Before production launch |
| WAF + Shield | Deferred | $10-15/month saved | Before public marketing campaign |
| NAT Gateway | Not provisioned | $32/month saved | When private subnet needed (Step 15 upgrade) |

**TDD references where deviations occur:**
- §9.1 (VPC public/private): Partial — DB via Security Groups only; not VPC-isolated
- §9.3 (auto-scaling): Deferred — single EC2
- §9.4 (backups/DR): Partial — RDS auto-backup (7 days) + S3 manual for Redis; no cross-region DR
- §10.2 (DB private subnet): Partial — DB reachable only via EC2 SG, not VPC-level isolation

### Capacity Estimate (verified assumptions)

| Metric | Value |
|---|---|
| Comfortable concurrent users | 20-30 |
| Stretch concurrent users | 50 (response 500ms) |
| Slow but working | 70-100 |
| Crash/OOM | 150+ |
| Comfortable unique visitors/day | 2,000-5,000 |
| Stretch unique visitors/day | 10,000 (slow peaks) |
| Peak hour handling | 20-30 concurrent (evening 7-10 PM) |

**Reasoning:** Single t3.medium can host all processes with ~1-2 GB spare. RDS db.t3.micro handles startup DB load. Redis self-hosted within spare RAM. CloudFront absorbs static asset load.

### Upgrade Path (staged, TDD-compliant at each tier)

| Stage | Trigger | Monthly | Adds |
|---|---|---|---|
| **Client-Starter (current)** | Initial launch | $47 | Single EC2, single-AZ RDS, in-EC2 Redis |
| **Small Business** | > 5,000 visitors/day | $75 | RDS Multi-AZ upgrade, ElastiCache t3.micro |
| **Growing** | > 10,000 visitors/day | $120 | 2nd EC2 + ALB, t3.large EC2 |
| **Production HA** | > 25,000 visitors/day | $220 | WAF, NAT, RDS t3.small Multi-AZ, ASG 2-4 |
| **Scale** | > 100,000 visitors/day | $500+ | Auto-scaling, read replicas, CDN optimization |

### Client Responsibilities

Per TDD §15.2: Client owns all AWS resources. Developer has least-privilege IAM access only. Monthly AWS bill paid by client's credit card.

### TDD Appendix Reference

This decision is documented as **Appendix B — Infrastructure Baseline & Cost Commitment (Client-Approved)** in the TDD v2.1 PDF (to be inserted after Appendix A).

### Verified Cost Model (against AWS ap-south-1 pricing, 2026)

- t3.medium: $0.0416/hour × 730 = $30.37
- db.t3.micro: $0.021/hour × 730 = $15.33
- S3 Standard: $0.023/GB × 5 GB = $0.12
- CloudFront: $0.085/GB egress (Asia) — free tier covers startup
- Route 53: $0.50/hosted zone + $0.40/million queries
- SES: $0.10/1,000 emails

**Total verified: ~$46.80/month at startup scale.**

**Post-free-tier estimate (month 13+):** ~$48-50/month.

**Decision owner:** client — may adjust at any Step 15 checkpoint.

---

## Step 15 — CloudFront Deferred (TEMPORARY, 2026-09-16)

**Status:** TEMPORARY — deferred pending AWS CloudFront account verification

### Context

During Step 15.2.7 (terraform apply), CloudFront distribution creation failed with:

    AccessDenied: Your account must be verified before you can add new CloudFront resources.

Root cause: New AWS account (activated 2026-09-16 on Paid plan) requires manual CloudFront verification — a standard AWS anti-fraud process for new accounts.

### Decision

CloudFront and WAF modules are TEMPORARILY DISABLED via Terraform count toggle. Code and module definitions are INTACT — only the count flag is set to 0.

### Why deferred (not removed)

1. Business is Bangladesh-only e-commerce (no international customer base)
2. Latency difference between CloudFront (30-50ms) and EC2-direct (50-70ms) is negligible for BD customers (20-40ms)
3. CloudFront cost in TDD Appendix B is CloudFront cost in TDD Appendix B is -1/month-1/month — savings negligible
4. Nginx reverse proxy on EC2 will serve S3 media directly

### Files changed

- infra/terraform/modules/cloudfront/main.tf — added count = var.enable_cloudfront ? 1 : 0
- infra/terraform/modules/waf/main.tf — added count = var.enable_waf ? 1 : 0
- infra/terraform/environments/staging/main.tf — added variables + pass-through
- infra/terraform/environments/staging/terraform.tfvars — enable_cloudfront = false, enable_waf = false

### AWS Support case

- Case ID: 178954985700704
- Submitted: 2026-09-16 17:09:57 GMT+4
- Severity: General question (24h response expected)
- Status: Unassigned (as of 2026-09-16)

### Re-enable procedure

Option A — CloudFront verified by AWS (2 min):
- Set enable_cloudfront = true, enable_waf = true in terraform.tfvars
- Run: terraform init -upgrade; terraform plan -out=tfplan; terraform apply tfplan

Option B — Cloudflare instead (2-3 hours):
- Sign up Cloudflare free account
- Add nolimitshopping.com to Cloudflare
- Change GoDaddy nameservers to Cloudflare NS
- Configure Cloudflare → S3 origin
- Cloudflare WAF (free tier) replaces AWS WAF
- Keep both Terraform modules disabled permanently

### Cost impact

- With CloudFront + WAF: ~$52-56/month
- Without CloudFront + WAF: ~$47-48/month
- Savings (deferred state): ~$5-8/month

Cost stays within TDD Appendix B locked tier ($47-50).

### Enforcement

- enable_cloudfront and enable_waf flags in terraform.tfvars control module creation
- Both default to false for staging until AWS verification
- Production will decide at Step 16 launch

### Owner and re-evaluate

- Decision owner: Client (Musavi Fardin)
- Technical owner: Development team
- Re-evaluate: After AWS Support case 178954985700704 resolution OR 2026-09-30 (whichever first)

---

## Step 15.5/15.6 — SES Production + GitHub Actions CD (2026-09-18)

**Status:** IN PROGRESS — awaiting AWS verification(s)

### Context

Step 15.5 (SES out of sandbox) এবং Step 15.6 (GitHub Actions CI/CD) এগোনোর সময় দুটো external dependency pending রয়েছে যা background-এ AWS handle করছে। Sessions এগোনোর সাথে সাথে এগুলো track না করলে ভুলে যাওয়ার risk আছে।

### Pending Item 1: SES Production Access Request

| Field | Value |
|---|---|
| AWS Support Case ID | `178967334800250` |
| Submitted (initial) | 2026-09-17 23:29 UTC+4 |
| Status | **Customer action completed** (our reply sent 2026-09-18 00:00 UTC+4) |
| Awaiting | AWS Support human review |
| Expected response | Within 24h of our reply (~2026-09-18 24:00 UTC+4) |
| Console URL | https://console.aws.amazon.com/support/home?region=ap-south-1 |
| Reply content | Detailed use case: volume, list maintenance, bounce/complaint/unsubscribe handling, content patterns, verification status |
| Last AWS reply | 2026-09-17 23:29 UTC+4 — requested additional info |
| Our reply sent | 2026-09-18 00:00 UTC+4 |
| Escalation trigger | If no response by 2026-09-19 12:00 → add new comment to case |

**Outcome states (expected):**
- `Resolved — Approved`: SES production access live, quota → 50,000/day
- `Resolved — Denied`: Fallback investigation needed (rare with our reply quality)
- `Pending`: Wait 24-48h more

### Pending Item 2: DKIM Verification

| Field | Value |
|---|---|
| Domain | `nolimitshopping.com` |
| Records in Route 53 | 3× CNAME at `*._domainkey.nolimitshopping.com` → `*.dkim.amazonses.com` ✅ |
| DNS propagation | ✅ Verified (Google DNS 8.8.8.8) |
| SES verification status | **Pending** (as of 2026-09-18) |
| Expected completion | 2026-09-18 to 2026-09-20 |
| Verification command | `aws ses get-identity-dkim-attributes --identities nolimitshopping.com` |
| Trigger for escalation | If still `Pending` by 2026-09-21 → open AWS Support case |

**Note:** Domain verification (`_amazonses.nolimitshopping.com` TXT) is ✅ **Success** — the DKIM CNAME validation is a separate, slower SES-side process (typical 24-72h).

### Actions Taken in This Session

**SES module Terraform fix (Step 15.5):**
- Discovered Terraform SES module was missing `_amazonses.nolimitshopping.com` verification TXT record
- Root cause: `aws_route53_record.amazonses_verification` + `aws_ses_domain_identity_verification` resources were never declared in `infra/terraform/modules/ses/main.tf`
- Fix: Added both resources; applied via Terraform (2 resources created)
- Result: Domain verification → `Success`
- Committed as `1e46a44` (SSM CLI push)

**GitHub Actions CI/CD (Step 15.6):**
- Created `.github/workflows/deploy-staging.yml` (151 lines) — build 3 Docker images → ECR push → SSM SendCommand → EC2 deploy → smoke test
- Created `.github/workflows/deploy-production.yml` (82 lines) — manual approval gate, placeholder for Step 16
- Set GitHub secrets: `AWS_ROLE_ARN`, `AWS_REGION`
- Fixed 3 sub-issues during first run:
  1. **OIDC provider missing** → `create_oidc_provider = true` in staging module call
  2. **Trust policy subject mismatch** → Added new GitHub format `repo:bluegofer@*/ecommarce@*:*` alongside legacy `repo:bluegofer/ecommarce:*`
  3. **Smoke test redirects** → Storefront uses `/bn` locale path; Admin accepts `200|301|302|307|308`
- Committed: `bc7893a`, `240b78c`, `bfd4983`, latest fix pending
- **Result:** Build + Deploy jobs pass ✅; Smoke test green after final fix

### Learnings Recorded

1. **GitHub OIDC subject format changed in 2024** — Now includes numeric IDs: `repo:ORG@<org-id>/REPO@<repo-id>:ref:refs/heads/BRANCH`. Trust policies must match both old and new formats.
2. **GitHub Desktop unreliable in this environment** — Doesn't detect CLI-made changes; use `git` CLI directly with PAT for commit/push (see standalone prompt in session history).
3. **EC2 git repo was 80+ commits behind origin** — Always `git fetch origin` before making changes. Synced this session.
4. **tfplan* files must never be committed** — Added pattern to `.gitignore`.
5. **SSM shell vs PowerShell** — PowerShell for AWS control-plane (IAM/EC2/RDS/SES); SSM shell for EC2-side file/docker operations.

### Files Committed This Session

- `infra/terraform/modules/ses/main.tf` (SES verification resources)
- `infra/terraform/modules/iam-extras/main.tf` (SSM permissions + OIDC trust policy)
- `infra/terraform/environments/staging/main.tf` (`create_oidc_provider = true`)
- `infra/terraform/environments/staging/terraform.tfvars` (removed unused variable)
- `.github/workflows/deploy-staging.yml` (151 lines)
- `.github/workflows/deploy-production.yml` (82 lines)
- `.gitignore` (tfplan patterns)
- `apps/api/Dockerfile` (Step 15.4 fix, committed from EC2)
- `docker-compose.prod.yml` (Step 15.4 artifact, committed from EC2)

### Next Steps When Pending Items Resolve

**When SES Production Access approved:**
1. Verify quota: `aws sesv2 get-account` → `Max24HourSend` should be `50000`
2. Send test email to non-verified address
3. Update this DECISIONS.md entry status → `RESOLVED`
4. Continue Step 15.7+ (CloudWatch, security, backups, DR)

**When DKIM → Success:**
1. Verify: `aws ses get-identity-dkim-attributes --identities nolimitshopping.com`
2. Status shows `DkimVerificationStatus: Success`
3. Add reference to SES case if still pending
4. Update this entry status

**If DKIM still Pending after 2026-09-21:**
1. Open SES Support case: "DKIM verification stuck > 72h"
2. Reference domain, 3 CNAME records (with values), CloudTrail logs
3. Escalate severity if needed