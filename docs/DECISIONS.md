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