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