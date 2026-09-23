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

---

## Step 15.7 — CloudWatch Logs + Dashboards + Agent (2026-09-18)

**Status:** COMPLETE — all sub-steps verified, committed, pushed.

### Delivered

| Component | Specification | Evidence |
|---|---|---|
| CloudWatch Agent | `amazon-cloudwatch-agent 1.300069.1` installed on EC2 `i-02e21d2aba38958db` | `systemctl status amazon-cloudwatch-agent` → active (running) |
| Custom Metrics Namespace | `Bluegofer/EC2` (CPU idle/iowait/user/system, MEM_USED_PERCENT, DISK_USED_PERCENT, swap, diskio, netstat) | `aws cloudwatch list-metrics --namespace Bluegofer/EC2` shows 15+ metrics |
| Log Groups (CW Agent) | `/bluegofer/staging/system` (cloud-init, dnf) + `/bluegofer/staging/nginx` (access, error) | 30-day retention, streams active |
| Log Groups (Docker awslogs) | `/bluegofer/staging/{api,storefront,admin,redis}` — all 4 containers | `docker inspect` → `LogConfig.Type: awslogs` |
| Retention | 30 days on all 6 log groups | `aws logs describe-log-groups` |
| Alarms | +2 new (ec2-disk-high >85%, ec2-memory-high >85%); total 6 | `aws cloudwatch describe-alarms` |
| Dashboard | `BlueGofer-Staging` (6 widgets: alarms, CPU, memory, disk, RDS, log errors + ingestion) | `aws cloudwatch get-dashboard` |
| SNS Wiring | All 6 alarms → `bluegofer-staging-alerts` | verified via `describe-alarms` |
| IAM Policy | `CloudWatchAgentServerPolicy` already attached to `bluegofer-staging-ec2-role` | no IaC change needed |

### Cost Impact (verified against $47/month plan)

| Line Item | Estimate | Actual |
|---|---|---|
| CloudWatch Logs ingestion | ~$0.50-1.50/month | within budget |
| Custom metrics (CW Agent) | $0 (default free-tier) | $0 |
| Dashboard (1 dashboard) | $0 (3 dashboards free-tier) | $0 |
| **Net Δ** | **~+$0.50-2/month** | within `CloudWatch $0-3` budget line |

No deviation from TDD Appendix B locked tier.

### Files Committed (EC2-side)

- `docker-compose.prod.yml` — `logging: driver: awslogs` added to all 4 services (api, storefront, admin, redis)
- `.gitignore` — `*.bak.*` pattern
- Commits: `1025959` + `3efad4a` (merge) → pushed to `origin/staging`

### Files Committed (Windows-side, this entry)

- `infra/terraform/modules/cloudwatch/main.tf` — 2 new alarms mirrored (ec2_disk_high, ec2_memory_high)
- `docs/DECISIONS.md` — this entry
- `docs/aws-runbook.md` — new operational runbook

### Configuration Files (EC2-side, not in repo)

- `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/custom-override.json` — active agent config (metrics + log sources)
- Backup `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/file_amazon-cloudwatch-agent.json` — original config (superseded by custom-override)

### Known Limitations

1. `/var/log/secure` (auth logs) — AL2023 uses `imjournal`, file doesn't exist. CW Agent skips silently. Future: add journald-based collection if auth log shipping required.
2. `storedBytes: 0` in early checks — normal (Docker daemon flushes every 5s, AWS ingestion eventual consistency).

### Terraform State Note

The 2 new alarms (disk-high, memory-high) were created via AWS CLI on 2026-09-18 for immediate effect. Terraform mirror added same day. If `terraform plan` shows drift, use `terraform import`:

---

## Step 15.11 — Sentry Error Tracking Integration (2026-09-18)

**Status:** COMPLETE — verified in production, first issue captured.

### Delivered

| Component | Specification | Evidence |
|---|---|---|
| Sentry Account | Free tier org `bluegofer` | https://bluegofer.sentry.io |
| Projects | 3 — `bluegofer-api`, `bluegofer-storefront`, `bluegofer-admin` | Sentry dashboard |
| SDK Packages | `@sentry/nestjs@^10.75.0` (API), `@sentry/nextjs@^10.75.0` (Storefront + Admin) | `package.json` |
| API Integration | `instrument.ts` (early import in `main.ts`) + `SentryExceptionFilter` (5xx only) | verified in container logs |
| Storefront Integration | `instrumentation.ts` + `sentry.{server,client,edge}.config.ts` | runtime verification |
| Admin Integration | Same as storefront | runtime verification |
| PII Scrub | Emails, phones, JWTs, auth headers, IPs redacted | `pii-scrub.ts` (shared + API-local copies) |
| Alerting | Every new issue → email `cloud.bluegofer@gmail.com` | Sentry settings |
| Verification | First production issue captured — `BLUEGOFER-API-1` | Sentry dashboard |
| Cost | **$0** (free tier — 5K errors/month, 10K perf units) | No credit card required |

### Cost Impact

| Line Item | Monthly | Actual |
|---|---|---|
| Sentry SaaS | $0 (free tier) | $0 |
| **Net Δ to $47 plan** | **$0** | **$0** |

No deviation from TDD Appendix B locked tier.

### Files Committed

**Repo (Step 15.11 — commit `ed973da`):**
- `apps/api/src/instrument.ts` — Sentry init
- `apps/api/src/common/filters/sentry-exception.filter.ts` — 5xx capture
- `apps/api/src/common/sentry/pii-scrub.ts` — API-local PII scrub
- `apps/api/src/main.ts` — import './instrument'
- `apps/storefront/instrumentation.ts` + 3 sentry config files
- `apps/admin/instrumentation.ts` + 3 sentry config files
- `packages/config/sentry/pii-scrub.ts` — shared for Next.js apps
- `packages/config/package.json` — `./sentry` export added
- `apps/*/package.json` — dependencies added
- `apps/*/next.config.mjs` — wrapped with `withSentryConfig`
- `apps/*/.env.example` — SENTRY_* env templates
- `pnpm-lock.yaml`, `package.json` — typescript pin 5.4.5

**Repo (Step 15.11.1 — commit `30f47b4`):**
- `apps/api/src/common/sentry/pii-scrub.ts` — API-local copy (fix runtime module resolution)
- `apps/api/src/instrument.ts` — import path updated

**EC2-side (not committed, but persistent):**
- `apps/api/.env` — `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE`
- `apps/storefront/.env.local` — `NEXT_PUBLIC_SENTRY_DSN` etc.
- `apps/admin/.env.local` — `NEXT_PUBLIC_SENTRY_DSN` etc.

### Root Cause Analyses (Learnings)

**1. API runtime crash on Sentry import (commit ed973da):**
- **Symptom:** Container crash-loop, smoke test 15× HTTP 502.
- **Cause:** `require('@ecommarce/config/sentry')` at runtime — API's tsc-only build cannot load `.ts` from workspace package; Node.js runtime rejects `.ts` extension.
- **Fix:** Inline `pii-scrub.ts` into `apps/api/src/common/sentry/` (compiled to `dist/*.js`). Next.js apps keep `packages/config/sentry` (webpack bundles at build time).

**2. Disk full on EC2 (22.37 GB):**
- **Symptom:** `failed to register layer: no space left on device`.
- **Cause:** Docker image layers accumulate on each ECR push. Multiple prior deploys left stale layers.
- **Fix:** `sudo docker system prune -af --volumes=false` freed 22.37 GB. **Permanent fix:** CI workflow now runs prune before pull.

**3. Container didn't pick up new image (`--force-recreate`):**
- **Symptom:** `docker compose pull` fetched new image, `docker compose up -d` didn't recreate container (same `:latest` tag).
- **Cause:** Docker Compose compares config, not image digest. Same tag = "no change".
- **Fix:** `up -d --force-recreate` forces recreation. **Permanent fix:** CI workflow updated.

### Known Issues Tracked (Step 15.8 action items)

**Issue BLUEGOFER-API-1 — `GET /api/v1/orders/lookup` returns 500 instead of 400:**
- **Cause:** Missing query params (`orderNumber`, `phone`) not validated; `findByNumber(undefined)` called → `PrismaClientValidationError`.
- **Fix target:** Step 15.8 (Security sweep) — add `@Query()` DTO validation.
- **Files:** `apps/api/src/modules/orders/orders.controller.ts:32`, `apps/api/src/modules/orders/orders.service.ts:60`.

### Sentry DSN Rotation Pending

**Context:** During setup, DSNs were inadvertently pasted into chat. For security hygiene, rotate API + Admin DSNs before Step 16 launch:
- Sentry UI: Settings → Project → Client Keys (DSN) → Rotate
- Update `.env` + `.env.local` accordingly
- Restart containers

**Trigger:** Before Step 16 (UAT + Launch).

### CI/CD Workflow Changes (Step 15.11.14)

**`.github/workflows/deploy-staging.yml` updated:**
- Added `df -h /` + `docker system prune -af --volumes=false` before pull
- Changed `up -d` → `up -d --force-recreate`

### Learnings Recorded

1. **PowerShell multiline string (`@'...'@`) unreliable for large content** — use Notepad for markdown/YAML edits, not shell heredocs.
2. **`Out-File -Encoding utf8` adds BOM** — always use `[System.IO.File]::WriteAllText($path, $content, [UTF8Encoding]::new($false))`.
3. **`Set-Content` same BOM issue** — same fix.
4. **tsc-only builds cannot require workspace `.ts`** — for API, inline helpers into `src/`.
5. **Docker Compose `:latest` tag doesn't trigger recreate** — always use `--force-recreate` in deploy.
6. **Disk accumulation on EC2 from ECR pushes** — prune before pull in CI.
7. **PowerShell vs SSM shell — commands NOT interchangeable** — `&&` doesn't work in old PowerShell; `~/` path doesn't work in PowerShell; `sed`/`grep` need SSM shell.
8. **PAT never paste in chat** — generate → type in shell → push → revoke immediately.

### Next

- Step 15.11 DONE
- Step 15.12 (Backups configuration) — 3rd Phase A sub-step
- Step 15.14 (Cost verification)
- Then Phase B (Security sweep — will fix BLUEGOFER-API-1)---

## Step 15.12 — Backups Configuration (2026-09-18)

**Status:** COMPLETE

### Delivered

| Component | Config | Evidence |
|---|---|---|
| RDS auto backup | 7-day retention, daily 03:00 UTC, KMS-encrypted, single-AZ (Appendix B), gp3, not public | `aws rds describe-db-instances` |
| RDS manual drill | `bluegofer-staging-pg-dr-drill-20260918` (available, encrypted) | `aws rds describe-db-snapshots` |
| S3 media bucket | Versioning ON + lifecycle IA@30d, expire@365d | `get-bucket-versioning/lifecycle` |
| S3 logs bucket | Versioning ON + lifecycle expire@90d | `get-bucket-versioning/lifecycle` |
| Redis BGSAVE-to-S3 | systemd timer every 6h UTC, script `scripts/redis-backup-to-s3.sh` | `systemctl list-timers redis-backup.timer` |
| IAM policy | `bluegofer-staging-ec2-s3-backup-access` (redis-backups/, tmp/, backups/) | `aws iam list-role-policies` |
| DR runbook | `docs/dr-runbook.md` (5 scenarios, RPO/RTO, schedule) | repo |
| Cost Δ | +~$0.83/mo, within $47 tier | AWS Cost Explorer |

### Findings & Fixes

1. **S3 bucket names carry account-ID suffix** — Terraform naming pattern `{prefix}-{account_id}`. EC2 role was initially scoped to wrong prefix (no suffix) → fixed.
2. **EC2 role least-privilege correctly enforced** — cannot read bucket config (control-plane); use `bluegofer-admin` IAM user for verification.
3. **SSM heredoc paste unreliable** — corrupted `|` and other chars. **Permanent pattern:** Windows → `aws s3 cp` to `tmp/` → EC2 `aws s3 cp` down → `sudo mv`. `.gitattributes` now enforces LF for `.sh`/`.service`/`.timer`.
4. **`.gitattributes` added** — prevents CRLF corruption on Windows clones for shell scripts + systemd units.

### Kept snapshots

- `bluegofer-staging-pg-dr-drill-20260918` — retained through Step 16 launch as known-good restore point.

### Deferred drift (from full terraform plan, 2026-09-18)

Full `terraform plan` showed unintended drift not related to Step 15.12 — deferred to Step 15.8/15.10 for controlled maintenance window:

| Issue | Priority | Handle |
|---|---|---|
| EC2 AMI pin missing — `data.aws_ami` auto-updates → would replace instance | High | Step 15.10 (maintenance window + pin AMI) |
| CloudWatch 2 alarms (disk/memory) CLI-created vs Terraform state mismatch | Med | Step 15.8 |
| SNS email subscription — confirm pending in email inbox | Med | Step 15.8 |
| Security group ingress drift (2 rules) | Med | Step 15.8 |

**Rationale:** Correcting drift mid-Step 15.12 would risk EC2 replacement. All items safe at current runtime; no user-facing impact.

### Next

Step 15.12 DONE → Step 15.14 (Cost verification) → Phase B (15.8 Security sweep).
---

## Step 15.8.2 — Security Fix: orders/lookup input validation (2026-09-18)

**Status:** COMPLETE — verified in production, CI green.

### Context

Sentry issue `BLUEGOFER-API-1` (captured Step 15.11) reported `GET /api/v1/orders/lookup` returning `HTTP 500` when required query params were missing. Root cause: raw `@Query('orderNumber')` / `@Query('phone')` strings reached `OrdersService.findByNumber()`, which called `prisma.order.findUnique({where: {orderNumber: undefined}})` → `PrismaClientValidationError` → global filter mapped to 500.

### Fix

| Layer | File | Change |
|---|---|---|
| DTO | `apps/api/src/modules/orders/dto/lookup-order.dto.ts` (new) | `LookupOrderQueryDto` class-validator: `orderNumber` required 3–64 chars, `phone` required 6–20 chars |
| Controller | `apps/api/src/modules/orders/orders.controller.ts` | `lookup()` uses `@Query() LookupOrderQueryDto`; global `ValidationPipe` rejects missing/empty params with 400 before service logic |
| Service (defense-in-depth) | `apps/api/src/modules/orders/orders.service.ts` | `findByNumber()` returns `null` for empty/undefined `orderNumber`; never reaches Prisma |

### Verification (production, 2026-09-18 20:25 UTC)

| Test | Expected | Actual |
|---|---|---|
| No params | 400 | 400 + 6 validation msgs ✅ |
| Only `orderNumber` | 400 | 400 + 3 phone msgs ✅ |
| Only `phone` | 400 | 400 + 3 orderNumber msgs ✅ |
| Both valid, not found | 200 `{ok:false}` | 200 `{ok:false}` ✅ |

**Sentry `BLUEGOFER-API-1`:** Resolved.

### Commit

- `112f049` — `step-15.8.2: fix(api): validate orders/lookup query params (BLUEGOFER-API-1)`

### Follow-up (Step 15.8.4 audit)

Discovered during this fix: `OrderListQueryDto` in `packages/types/src/orders.ts` is a **TypeScript interface**, not a class-validator class. The global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) is therefore a no-op for it — malformed query params on `GET /api/v1/orders` are silently accepted instead of rejected at the door. **Action:** convert to class-based DTO or add a controller-local DTO during Step 15.8.4 audit. Tracked as finding `F-03` (pending).

### Reference

- `docs/security-check-report.md` → F-01

---

## Step 15.8.4 — Rate limiting (F-04) + app security sweep close-out (2026-09-19)

**Status:** COMPLETE — F-04 fixed + verified in production; app sweep done; pen-test deferred to Step 15.9.

### Context

Step 15.8.4 audit found no rate limiting anywhere in the API (`@nestjs/throttler` not installed, source-wide grep for `Throttle`/`ThrottlerGuard` empty). Sensitive endpoints (`/auth/login`, `/auth/register`, `/auth/otp/request`, `/auth/otp/verify`, `/checkout/place-order`, `/promotions/evaluate-cart`) were open to brute-force, SMS bombing, coupon enumeration, and order spam. TDD §10.3 requires per-IP/per-account rate limits on exactly these endpoints.

### Fix — three iterations (honest timeline)

| Iter | Commit | Change | Result |
|---|---|---|---|
| 1 | `abddcbc` | Install @nestjs/throttler@6.7.0; global ThrottlerModule.forRoot (100/min); @Throttle overrides on sensitive endpoints; ThrottlerGuard as first APP_GUARD | CI RED — 27 tests failed (429 on /auth/register in e2e helpers) |
| 2 | `4e823c1` | Removed explicit name: 'default' from forRoot (misdiagnosis) | CI STILL RED — same 27 tests |
| 3 | `92cc8a5` | Correct root cause — tests intentionally register many users per suite; skip throttler when NODE_ENV === 'test'. New AppThrottlerGuard extends ThrottlerGuard with override shouldSkip(). Also added override modifier (fixes TS4114 from noImplicitOverride: true). | CI GREEN — all 26 suites pass; deploy success |

### Verification (production, 2026-09-19 05:36 UTC)

Login rate limit (POST /api/v1/auth/login, limit 5/min):
- req 1..5 => 401
- req 6 => 429 (triggered at exactly 6th request)
- Header: X-RateLimit-Limit: 5 (confirms @Throttle override applied, not global 100)

Global default (GET /api/v1/health):
- Header: X-RateLimit-Limit: 100 (confirms forRoot global active)

Test env skip: CI passes (115 tests) — confirms NODE_ENV=test path returns true from shouldSkip().

### Files touched

- apps/api/package.json + pnpm-lock.yaml — @nestjs/throttler@6.7.0
- apps/api/src/app.module.ts — ThrottlerModule.forRoot + AppThrottlerGuard as first APP_GUARD
- apps/api/src/common/guards/app-throttler.guard.ts (new) — test-env skip subclass
- apps/api/src/modules/auth/auth.controller.ts — @Throttle on register/otp/verify/login
- apps/api/src/modules/orders/checkout.controller.ts — @Throttle on place-order
- apps/api/src/modules/promotions/rules-engine.controller.ts — @Throttle on evaluate-cart
- docs/security-check-report.md — F-01..F-06 documented, learning log added
- docs/DECISIONS.md — this entry

### Learnings recorded

1. @nestjs/throttler v6 + global guard + NODE_ENV=test → custom shouldSkip() subclass is the correct pattern; do this at install time.
2. noImplicitOverride: true in root tsconfig → all NestJS subclass method overrides need override keyword.
3. Correct DTO field names are required to prove rate limiting (initial test used phone instead of identifier → 400 not 401/429).

### Deferred (from this step, tracked in docs/security-check-report.md)

- F-03 — OrderListQueryDto (and possibly other DTOs) declared as TS interface in packages/types → class-validator no-op. Fix requires packages/types/tsconfig.json decorator flags; deferred as input-validation sweep backlog item.
- F-05 — CSRF: mitigated by design (Bearer tokens for state-changing routes; refresh cookie only used by /refresh and /logout which have no business state). No explicit CSRF token needed.
- F-06 — Refresh cookie SameSite=lax → upgrade to strict deferred to Step 15.9 after verifying payment-gateway callback flow.

### Next

Step 15.9 — Penetration checks (auth bypass, IDOR, webhook forgery, coupon race, checkout tampering, ERP path hardening, F-06 evaluation).


---

## Step 15.9 — Penetration Check Findings & Fixes (2026-09-20)

**Status:** COMPLETE — 15 findings closed, 4 High, 5 Medium, 3 Low/Info, 2 withdrawn (false alarms).

### TOTP enforcement rollout (F-07 + F-13)

**Decision:** Two-stage login for staff (Option α), soft enforcement at launch.

**Behavior:**
- Customers: unchanged single-step login.
- Staff with TOTP enrolled: login returns `{ requireTotp, tempToken }`; access token issued only after `/auth/totp/verify`.
- Staff without TOTP: login succeeds but returns `{ mustEnrollTotp: true, accessToken }`; admin UI routes to `/settings/profile?enroll=totp` and displays a persistent warning banner until enrollment completes.

**Enforcement mode:** Soft at launch (allows staff in, flags missing TOTP).
**Future upgrade path:** A config flag `TOTP_ENFORCEMENT_MODE = 'soft' | 'strict'` — when 'strict', login for TOTP-less staff is rejected with an error prompting enrollment. Trigger: after all current staff have enrolled (target: before Step 16 launch).

**Temp token:** JWT with `scope: 'totp'`, TTL 5 minutes, signed with `JWT_ACCESS_SECRET`. Cannot be used as an access token (JwtAuthGuard rejects scoped tokens).

**Audit:** enrollment and disable events logged via the standard audit interceptor.

### Brand centralization (F-14)

**Source of truth:** `apps/storefront/src/lib/brand.ts` exports `BRAND`.
**Rule:** No literal "BlueGofer" string anywhere else in the storefront. All copy reads from BRAND or i18n dicts.
**Preserved (deferred rename):** localStorage keys + DOM events prefixed `skymart:` — kept for backward compat with users' existing browser state. Future migration is a Step 16+ optional task.

### Admin middleware enforcement (F-11)

**Cookie checked:** `refresh_token` (same cookie as storefront — shared parent domain).
**Public paths:** `/login` only.
**Non-public with no cookie:** 307 redirect to `/login?next=<original>`.
**Enforcement boundary:** HTTP-level shell gate. Real authorization (roles, TOTP-enrolled status) enforced server-side in API guards.

### Client-facing outcome

The storefront, JSON-LD, OG images, PWA manifest, and page copy now all consistently show **BlueGofer** (brand per D-02) on **https://nolimitshopping.com** with correct metadata. Admin console enforces 2FA on login for staff accounts.
---

## Step 15.13 — DR Runbook Drill (2026-09-20)

**Status:** COMPLETE — restore drill executed, verified, temp resources deleted.

### Context

Step 15.12 (Backups) delivered the DR runbook + backup infrastructure. Step 15.13 is the ACTUAL DRILL — proving the runbook works end-to-end, measuring RTO/RPO against the documented targets, and closing the loop.

### Drill Executed

| Aspect | Value |
|---|---|
| Source snapshot | `bluegofer-staging-pg-dr-drill-20260918` (manual, 2026-09-18T14:37 UTC) |
| Temp instance | `bluegofer-staging-pg-dr-restore-20260920` |
| Restore command | `aws rds restore-db-instance-from-db-snapshot` |
| Critical flag | `--db-subnet-group-name bluegofer-staging-rds-subnet-group` (VPC mismatch fix) |
| Lifetime | 2026-09-20T12:54:43 → 2026-09-20T13:14:29 UTC (~20 min) |
| Verified | 97/97 tables match, 10/10 ERP-critical present, psql accessible |
| Deleted | CONFIRMED via `describe-db-instances` → DBInstanceNotFound |

### Measured vs Target

| Metric | Target | Actual | Verdict |
|---|---|---|---|
| RTO | <= 4 hours | ~8 minutes | EXCEEDED (30x better) |
| RPO | <= 5 min | snapshot + daily auto backups | MET |
| Schema integrity | 100% | 97 tables = 97 tables | MET |
| ERP data integrity | 100% | 10/10 critical tables | MET |
| Cost | within $47 plan | ~$0.005 one-time | MET |
| Cleanup | zero leftover | describe confirms only main DB | MET |

### Findings (filed as learnings in runbook)

1. **F-24 (drill-related):** Snapshot restore requires explicit `--db-subnet-group-name` in accounts with multiple VPCs. Handoff documented this. **Resolved** — runbook updated.
2. **F-25 (drill-related):** Prisma generates camelCase columns + plural table names (`grns`, `grn_items`, `journal_entries.entryDate`). psql requires quoted identifiers. **Documented** — runbook updated.
3. **F-26 (carry-forward):** S3 media bucket empty in staging — versioning enabled but recovery path untested at object-level. **Tracked** — scheduled for DR drill #2 before Step 16.
4. **F-27 (informational):** `psql` rejects `?schema=public` URI param — must strip. Handoff already documented; confirmed again. **Closed.**

### Deliverables Produced

- `docs/dr-runbook.md` — Drill Log section appended (14 steps, results table, learnings, amendments)
- `docs/DECISIONS.md` — this entry
- Git commit: `step-15.13: docs+test: DR restore drill + runbook validation`

### Cost Impact

- **One-time:** ~$0.005 (temp db.t3.micro × 20 min + 20GB gp3 storage × 20 min)
- **Recurring:** $0 (monthly baseline $47 unchanged)
- **Verdict:** negligible; drill justified by TDD §9.4 requirement

### Follow-ups Before Step 16 Launch

- DR drill #2 — include S3 media object versioning test (currently untested at object level)
- F-23 — RDS master password rotation (deferred, before Step 16 UAT)
- Sentry DSN rotation (deferred, before Step 16)
- SameSite=strict evaluation (F-06, before Step 16)

### Next Step

Step 15.15 — Acceptance criteria final (~30 min).

---
---

## Step 15.15 — Acceptance Checklist Final (2026-09-21)

**Status:** COMPLETE — checklist consolidated from 74-line skeleton to 228-line full coverage.

### Context

Step 15.13 (DR drill) closed Phase C. Step 15.15 is the last Phase D sub-step before launch — it consolidates the full acceptance checklist against TDD §16 + Workflow v2 §10 (Project Done Definition) + Appendix A requirements, so Step 16 UAT can proceed line-by-line.

### Delivered

- `docs/acceptance-checklist.md` expanded:
  - Part A — Shopper Journeys (A1-A8): 8 sections, 30+ items (was A1-A5)
  - Part B — Admin Operations (B1-B8): 8 sections, 32+ items
  - Part C — ERP Modules (NEW): POS / Purchase / Suppliers / Accounting / HR / Attendance / Payroll — 7 sections
  - Part D — Cross-Module Automation Chains (NEW): all 4 A.5 chains
  - Part E — Integrations (NEW): Payments / Courier / Messaging / Analytics
  - Part F — SEO and Performance (6 items, was Part D)
  - Part G — Infrastructure, Security, DR (G1-G3): with Step 15.13 evidence marked `[x]`
  - Part H — TDD §16 Deliverables (NEW): 10-item final gate
- Legend added: `[x]` = verified in Step 15.15, `[ ]` = client verifies at Step 16 UAT
- Sign-off block updated (client name, UAT env, notes)

### Rationale

The Step 1 skeleton was a placeholder. Full coverage is required before Step 16 because:
1. Client UAT checklist must mirror TDD §16 acceptance criteria exactly.
2. Appendix A modules (POS/Purchase/Accounting/HR/etc.) were added AFTER Step 1 — the skeleton had no place to sign them off.
3. Cross-module chains (A.5) are the strongest evidence of "one system" per TDD §A.1 — they need explicit checkboxes.
4. `[x]` marks allow Step 15.15 to pre-verify what's already proven (DR drill, load test) so UAT focuses on what's left.

### Pre-verified items (marked `[x]`)

- DR drill result (Step 15.13): RTO ~8 min, RPO met, restore integrity 97/97
- Temp instance cleanup verified

### Pending client verification (Step 16 UAT)

- All Parts A-H items currently unchecked — 200+ line items
- Sign-off block signature + date

### Next

Step 16 — Staging UAT + Production Launch + Handover.

---

---

## Step 16 / Custom Phase 3 — Production Launch SKIPPED (2026-09-22)

**Status:** DEFERRED — production launch postponed to a later session; staging remains the working environment.

### Decision
Production launch (TDD §14 Phase 8; Workflow Step 16.6–16.9) is explicitly SKIPPED in the current session. We continue work on staging only — Phase 3 pending items, Phase 4 feature audit, Phase 5.1–5.2 UAT + training + handover pack (production deploy step remains undone).

### Reason — client-owned real credentials still pending
| Credential | Status | Owner | Reference |
|---|---|---|---|
| bKash merchant account | ❌ not delivered | client | D-21 |
| Nagad merchant account | ❌ not delivered | client | D-21 |
| SSLCommerz merchant account | ❌ not delivered | client | D-21 |
| Pathao courier account | ❌ not delivered | client | D-22 |
| SMS aggregator (D-09) | ❌ not decided | client | D-09 |
| Email system (SES → Brevo) | ⏳ SES denied, Brevo not yet setup | dev | Step 15.5 entry |

### Skipped items (return to later, when client delivers credentials)
- 16.6 Production deploy (manual approval gate)
- 16.7 Live smoke test (real transactions)
- 16.8 Monitoring transition to production
- 16.9 Handover pack — production section only

### NOT skipped — work continues this session
- Phase 3.1 — F-06 SameSite evaluation (analysis only)
- Phase 3.2 — Sentry DSN rotation
- Phase 3.3 — Brevo email setup (dev-side; production benefits later)
- Phase 3.4 — F-23 DB password rotation (deferred to client-triggered production prep)
- Phase 4 — Feature audit (Storefront vs TDD §7; Admin vs TDD §6.13; A.5 cross-module chains)
- Phase 5.1 — UAT walkthrough with client on staging
- Phase 5.2 — Training materials (docs/training/*.md)
- Phase 5.5 — Handover pack skeleton (docs/handover.md), production sections left as placeholders

### Return trigger
Production launch unblocks when ALL of:
1. Client delivers payment merchant accounts (bKash + Nagad + SSLCommerz)
2. Client delivers Pathao courier account
3. Client selects SMS aggregator (D-09)
4. Brevo email setup complete (Phase 3.3)
5. F-23 DB password rotated (Phase 3.4)

### Enforcement
- Staging URLs (`nolimitshopping.com`, `admin.nolimitshopping.com`, `api.nolimitshopping.com`) remain the live working environment
- No production DNS cutover until the return trigger is met
- This entry is append-only; add a new dated entry when unblocked

---

## Step 16 / Custom Phase 3.1 — F-06 SameSite Evaluation (CLOSED) — 2026-09-22

**Status:** CLOSED — `SameSite=None` retained in production. F-06 resolved as "architecture-required, not a weakness".

### What F-06 was about
The Step 15.9 security sweep flagged that the refresh cookie uses `SameSite=None` in production (and `SameSite=Lax` in dev), whereas an earlier Step 8.7 decision note (DECISIONS.md) mentioned `SameSite=Strict` as the eventual target. F-06 asked us to evaluate whether `SameSite=Strict` (or `Lax`) is feasible.

### Why `Strict` and `Lax` are not feasible in this architecture
Our deployment runs on **three distinct browser origins** that share the same parent domain:

| Surface | URL |
|---|---|
| Customer storefront | `nolimitshopping.com` / `www.nolimitshopping.com` |
| Admin console | `admin.nolimitshopping.com` |
| Backend API | `api.nolimitshopping.com` |

The refresh cookie MUST travel from admin/storefront to the API on cross-origin XHR calls (`POST /auth/refresh`). Per the W3C cookie specification and browser behaviour:

| Value | Cross-subdomain XHR to api.* | Verdict |
|---|---|---|
| `SameSite=Strict` | cookie blocked | breaks staff login (proved by earlier incident `50bf0cf`) |
| `SameSite=Lax` | cookie blocked on POST | caused 401 login loop in Step 16 (reverted in commit `50bf0cf`) |
| `SameSite=None` + `Secure` | cookie allowed | the only workable production choice |

**Conclusion:** `SameSite=None` is not a weakness in this architecture — it is the only value that allows the system to function across the three-subdomain layout defined by TDD §4.1.

### Compensating security measures (already live)
The `SameSite=None` setting is paired with multiple additional controls so the residual risk is minimal:
- `Secure=true` on the cookie in production (HTTPS-only)
- `HttpOnly=true` — cookie inaccessible to JavaScript (blocks XSS cookie theft)
- Cookie `Domain=.nolimitshopping.com` — scoped to our own subdomains only (not a wildcard)
- CSRF double-submit guard active in `apps/api/src/common/guards/csrf.guard.ts`
- Refresh token rotation (Step 2) — each refresh issues a new token and revokes the old
- Rate limiting on `/auth/refresh` and `/auth/logout` (Step 15.9, F-10 fix)
- TOTP 2FA required for all staff/admin users (Step 15.9, F-07)
- CORS allow-list strictly limited to `APP_BASE_URL` + `ADMIN_BASE_URL` with `credentials: true`

### TDD/Workflow compliance
- TDD §10.1 requires: *"cookies use SameSite and HttpOnly flags"* — both flags are set ✓
- TDD §10.1 does NOT mandate a specific `SameSite` value
- Workflow Step 15.9 listed F-06 as "evaluate", not "must switch to strict"
- This entry satisfies F-06's evaluation requirement

### Action taken
**No code change.** This entry closes F-06 with a documented architectural rationale.

### Reference
- Code: `apps/api/src/modules/auth/auth.controller.ts:52-53`
- CORS: `apps/api/src/main.ts:30-32`
- Related: Step 8.7 entry (this file), Step 15.9 security-check-report F-06, commit `50bf0cf`
---

## Step 16 / Custom Phase 3 — Final Status Snapshot (2026-09-22)

### Phase 3 item-by-item
| # | Item | Status | Notes |
|---|---|---|---|
| 3.1 | F-06 SameSite evaluation | ✅ CLOSED (2026-09-22 entry above) | `SameSite=None` retained with rationale — cross-subdomain architecture requires it |
| 3.2 | Sentry DSN rotation | ✅ DONE (client, earlier session) | Confirmed by client; no leaked credentials |
| 3.3 | Brevo email setup (SES alternative) | ⏸️ DEFERRED | Client will set up own email account later. Adapter pattern (env-driven factory) is in place so provider swap requires zero code changes when credentials arrive |
| 3.4 | F-23 RDS master password rotation | ✅ DONE (client, this session) | Client rotated via AWS Console; dev updated `.env` + restarted API |

**Result:** Custom Phase 3 (Pending Items) COMPLETE — 3 done, 1 deferred with plan.

### Production launch status (recap)
- **Decision (2026-09-22):** production launch DEFERRED — see "Step 16 / Custom Phase 3 — Production Launch SKIPPED" entry above.
- **Reason:** client-owned credentials still pending (payments, courier, SMS).
- **Return trigger:** client delivers payment merchant accounts + Pathao courier account + SMS aggregator choice + email setup.

### What's next — Phase 4 (Feature Audit)
| # | Task | Reference |
|---|---|---|
| 4.1 | Storefront vs TDD §7 checklist | TDD §7 (Website Architecture) |
| 4.2 | Admin vs TDD §6.13 checklist | TDD §6.13 (Admin/RBAC/Audit) |
| 4.3 | Cross-module chains (A.5) — POS→Inv→Acc, Purchase→Inv→Supplier, HR→Att→Payroll→Acc, Web Orders→Inv→Acc | TDD Appendix A §A.5 |

### Phase 5 — Step 16 Full Launch (partially skipped)
| # | Task | Status |
|---|---|---|
| 5.1 | UAT walkthrough with client | ⏳ next |
| 5.2 | Training materials (docs/training/*.md) | ⏳ next |
| 5.3 | Production deploy (manual approval gate) | ⏸️ SKIPPED (return trigger) |
| 5.4 | Live smoke test (real transactions) | ⏸️ SKIPPED (return trigger) |
| 5.5 | Handover pack (docs/handover.md) | ⏳ next (skeleton only) |

### Session-boundary markers
- **Session starts:** 2026-09-22 (see top of file for handoff context)
- **Commits added this session:** TBD (recorded on final push)
- **Files touched this session:**
  - `docs/DECISIONS.md` — Production Launch SKIPPED entry, F-06 SameSite CLOSED entry, this Final Status Snapshot
---

## Post-Step-16 — CI git-pull on EC2 (permanent fix) — 2026-09-22

**Status:** COMPLETE

### Context
EC2's `~/apps/ecommarce` git checkout was found 5+ commits stale during
recon this session (EC2 at `30f47b4`, origin at `1ea5226`). Root cause:
the CI deploy pipeline pulls Docker images from ECR (fresh) but never
syncs the EC2 git checkout. This caused confusing debugging state —
including a false-alarm "untracked file" diagnosis.

### Fix
Added a sync step inside the existing SSM deploy command list
(`.github/workflows/deploy-staging.yml`, deploy job) — runs
`git fetch origin && git reset --hard origin/staging` immediately after
`cd /home/ssm-user/apps/ecommarce`, before any Docker operations.

### Rationale
- EC2's git checkout is a read-only reference (only `docker-compose.prod.yml`
  and `.env` are actually read by Docker operations).
- CI never synced it → naturally drifted stale over time.
- Manual resync was done once in a prior session (per handoff prompt),
  but was not permanent — this entry makes it permanent.

### TDD/Workflow cite
Neither TDD §9 (AWS Infra) nor Workflow v2 §15.6 (CI/CD) explicitly
mandates EC2 git sync. This is "additional work" — logged here per the
project's DECISIONS.md discipline.

### Auth context (IMPORTANT — future task)
- Repo `bluegofer/ecommarce` is currently **PUBLIC** (interim decision
  by client; will be made private after project completion).
- EC2 `git fetch` works **anonymously** today — verified via SSM recon
  (no `.git-credentials`, no `.ssh/`, no credential helper; `git fetch`
  exit 0, `git ls-remote` succeeds).
- **When repo becomes private:** EC2 `git fetch` will start failing
  (auth error). At that point CI needs auth injection:
  - Option A: GitHub PAT via GitHub Actions secret → passed to SSM
    command via `--parameters` (secrets-in-command-history risk —
    mitigate by masking in logs)
  - Option B: GitHub App installation token (short-lived, cleaner —
    recommended when we get there)
- **Trigger:** when repo visibility flips to private, this fix breaks.
  Track in DECISIONS.md at that time.

### Verification
- Next CI deploy on staging will show `git fetch origin && git reset
  --hard origin/staging` in the SSM command log.
- EC2 `git log --oneline -1` should match `origin/staging` after deploy.
- No user-facing change (containers unchanged — images still come from ECR).

### Files touched
- `.github/workflows/deploy-staging.yml`
- `docs/DECISIONS.md` (this entry)


---

## Step 16 / Appendix C — Google OAuth implementation (2026-09-23)

**Status:** COMPLETE — end-to-end verified on staging.

### Context
Client requested Google sign-in (TDD Appendix C). Original scope: OAuth 2.0
Authorization Code flow via `passport-google-oauth20`, no social providers
beyond Google. Implemented as Phase 1 (backend) + Phase 2 (storefront) +
Phase 3 (credentials).

### Delivered

**Backend (Phase 1) — commit `6a4c30a`:**
- Prisma schema: `OAuthAccount` model + `User.passwordHash` nullable
- Migration `20260922183511_add_oauth_accounts`
- `passport-google-oauth20` strategy + guard (503 when env not set)
- `GET /auth/google` + `GET /auth/google/callback` endpoints
- `AuthService.findOrCreateOAuthUser()` (3 cases: linked / email match / new)
- `GET /auth/me` extended to return `{id, phone, email, fullName, roles}`
- `.env.example` updated with `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`

**Frontend (Phase 2) — commit `7926dfb`:**
- `GoogleAuthButton` component
- Buttons on `/signin` + `/register`
- `/auth/google-callback` route + client handler
- `AuthProvider.completeOAuthLogin(token)` method
- i18n keys `auth.continue_with_google` (bn + en)

**Credentials (Phase 3):**
- Google Cloud Console: OAuth 2.0 Client ID (Web app) on `cloud.bluegofer@gmail.com`
- Authorized redirect URIs: localhost + staging
- EC2 staging `.env`: `GOOGLE_CLIENT_ID` (72 char) + `GOOGLE_CLIENT_SECRET` (35 char) loaded via `docker compose --force-recreate`

**Bug fixes:**
- `f7c79fa`-series: `placeholderPhone` was `google:<21-digit>` = 28 chars > `VARCHAR(20)`. Fixed to `g_<last-16-digits>` = 18 chars
- `a8c1e10`-series: `/api/v1/me` 401 after OAuth login. Added global token provider (`setAccessTokenProvider`) so `api.*` calls auto-attach `Authorization: Bearer`

### Verification (staging, 2026-09-23)
- ✅ `/auth/google` → 302 to Google
- ✅ Google consent → callback → user created in `oauth_accounts` + `users`
- ✅ New user redirected to `/account/settings?requirePhone=1` (TDD §C.3)
- ✅ `/account/settings` renders profile (name `Annu`, email, phone placeholder `g_...`)
- ✅ `/api/v1/me` 200 (no more 401)
- ✅ Backend logs clean (no PrismaClientKnownRequestError)

### Known follow-up (deferred to next session)
- **Post-signup phone-fill flow** (TDD §C.3): the `/account/settings?requirePhone=1` page shows the phone input, but the phone + OTP verify flow is not wired for Google-only users yet. Next session task.
- **Other pages using `/me`** — checkout, orders, wishlist — may have additional issues; will be addressed one-by-one.

### Credentials note
- JSON client secret file lives only on the developer machine (Windows Desktop). Not committed.
- Client secret is shown once at OAuth client creation; only a JSON download persists. Keep this file safe — rotation requires re-issuing via Google Console.

### Files touched (this feature)
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260922183511_add_oauth_accounts/`
- `apps/api/src/modules/auth/strategies/google.strategy.ts`
- `apps/api/src/modules/auth/guards/google-oauth.guard.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/.env.example`
- `apps/storefront/src/components/auth/GoogleAuthButton.tsx`
- `apps/storefront/src/app/[locale]/signin/page.tsx`
- `apps/storefront/src/app/[locale]/register/page.tsx`
- `apps/storefront/src/app/[locale]/auth/google-callback/`
- `apps/storefront/src/lib/auth/context.tsx`
- `apps/storefront/src/lib/api/client.ts`
- `apps/storefront/src/lib/i18n/bn.json`
- `apps/storefront/src/lib/i18n/en.json`