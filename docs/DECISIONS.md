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