# Step 13 — Mock Inventory & Credential Rollout Guide

**Purpose:** Single source of truth for what is mocked in Step 13, what
real credential is needed to flip each integration to production, and how
the swap happens without code changes.

**Status:** All Step 13 integrations run behind adapter interfaces with an
env-driven factory. When the real credential env vars are present, the
factory returns the real adapter; otherwise it returns the mock. **Zero
code change is required to switch.**

**Last updated:** 2026-09-14 (Step 13.7 wrap-up).

---

## 1. Payment Gateways

| Provider | Mock adapter | Real adapter | Env keys required | Client action |
|---|---|---|---|---|
| **bKash** | `MockPaymentAdapter('BKASH')` | `BkashAdapter` | `BKASH_BASE_URL`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD` | Merchant onboarding (D-21) |
| **Nagad** | `MockPaymentAdapter('NAGAD')` | `NagadAdapter` | `NAGAD_BASE_URL`, `NAGAD_MERCHANT_ID`, `NAGAD_MERCHANT_PRIVATE_KEY` (+ `NAGAD_USERNAME`/`PASSWORD` if sandbox requires) | Merchant onboarding (D-21) |
| **SSLCommerz** | `MockPaymentAdapter('SSLCOMMERZ')` | `SslcommerzAdapter` | `SSLCOMMERZ_BASE_URL`, `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | Merchant onboarding (D-21) |
| **COD** | `CodAdapter` (no external call; rules only) | same | `COD_MAX_ORDER_VALUE` (optional), `COD_HANDLING_FEE` (optional) | None |

**Mock behavior:**
- `initiate()` returns `https://mock-gateway.local/<provider>/checkout?intent=MOCK-<PROVIDER>-<idemKey>` as `redirectUrl`.
- Webhook parse accepts any well-formed JSON with `eventId`, `providerIntentId`, `amountPoisha`, `status ∈ {PAID, FAILED, PENDING}`.
- Refund returns success with `MOCK-REFUND-<idemKey>`.

**Swap process:**
1. Client provides credentials.
2. Set env vars in `apps/api/.env` (dev) or AWS Secrets Manager (prod, Step 15).
3. Restart API. Factory auto-detects and instantiates real adapters.
4. Real `initiate()` returns the gateway-hosted URL from bKash/Nagad/SSLCommerz API response.

**Files:**
- `apps/api/src/modules/payments/payments.module.ts` (factory)
- `apps/api/src/modules/payments/adapters/bkash.adapter.ts`
- `apps/api/src/modules/payments/adapters/nagad.adapter.ts`
- `apps/api/src/modules/payments/adapters/sslcommerz.adapter.ts`
- `apps/api/src/modules/payments/adapters/mock-payment.adapter.ts`

---

## 2. Courier (Pathao primary — D-06)

| Provider | Mock adapter | Real adapter | Env keys required | Client action |
|---|---|---|---|---|
| **Pathao** | `MockPathaoAdapter` | `PathaoAdapter` | `PATHAO_BASE_URL`, `PATHAO_CLIENT_ID`, `PATHAO_CLIENT_SECRET`, `PATHAO_USERNAME`, `PATHAO_PASSWORD`, `PATHAO_STORE_ID` (+ `PATHAO_CITY_ID`, `PATHAO_ZONE_ID` per destination) | Account opening (D-22) |
| **Steadfast** | Not built | Not built | — | Deferred (D-07 says "adapters pre-planned") |
| **RedX** | Not built | Not built | — | Deferred (D-07 says "adapters pre-planned") |

**Mock behavior:**
- `createConsignment()` → `MOCK-PATHAO-<idemKey>` + tracking URL `https://mock-pathao.local/track/...`
- `syncTracking()` returns one `IN_TRANSIT` event per call.
- `fetchSettlements()` aggregates all consignments, 1% mock fee, `PENDING` status.
- `verifyWebhook()` accepts any JSON with `consignment_id` and non-empty signature.

**Swap process:** Same as payments — env-driven factory.

**Files:**
- `apps/api/src/modules/courier/courier.module.ts` (factory)
- `apps/api/src/modules/courier/adapters/pathao.adapter.ts`
- `apps/api/src/modules/courier/adapters/mock-pathao.adapter.ts`

---

## 3. Messaging

### 3.1 SMS (D-09 pending)

| Provider | Mock | Real | Env keys | Client action |
|---|---|---|---|---|
| **TBD** (Bulk SMS BD / Alpha SMS / Bangla SMS / SSL Wireless) | `MockSmsAdapter` | Not built — provider selection pending | `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID` | Select provider (D-09) |

**Mock behavior:** logs `[mock-sms] to=... len=...`, returns `MOCK-SMS-<idemKey>`.

**Files:**
- `apps/api/src/modules/messaging/messaging.module.ts` (factory)
- `apps/api/src/modules/messaging/adapters/mock-sms.adapter.ts`

### 3.2 Email (Amazon SES — ready to swap)

| Provider | Mock | Real | Env keys | Client action |
|---|---|---|---|---|
| **Amazon SES** | `MockEmailAdapter` | `SesEmailAdapter` (SigV4-signed v2 API, MIME attachments) | `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_FROM_ADDRESS` + verified domain (SPF/DKIM) | AWS account + SES domain verification (Step 15) |

**Mock behavior:** logs `[mock-email] to=... subject="..." attachments=N`, returns `MOCK-EMAIL-<idemKey>`.

### 3.3 Web Push (VAPID)

| Provider | Mock | Real | Env keys | Client action |
|---|---|---|---|---|
| **VAPID** | `VapidPushAdapter` (with empty keys → returns error) | Same class, real keys → logs intent only (payload encryption deferred) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | None (Step 15 → real RFC 8291 encryption) |

**Note:** VAPID payload encryption is **not implemented** in Step 13. The adapter logs intent. Real RFC 8291 encryption is Step 15 scope when the storefront PWA opt-in is enabled.

**Files:**
- `apps/api/src/modules/messaging/adapters/mock-email.adapter.ts`
- `apps/api/src/modules/messaging/adapters/ses-email.adapter.ts`
- `apps/api/src/modules/messaging/adapters/vapid-push.adapter.ts`

---

## 4. Analytics (server-side)

| Provider | Mock | Real | Env keys | Client action |
|---|---|---|---|---|
| **GA4 Measurement Protocol** | `MockAnalyticsAdapter('GA4')` | `Ga4Adapter` | `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` | GA4 property + Measurement Protocol API secret (Step 15) |
| **Meta Conversions API** | `MockAnalyticsAdapter('META_CAPI')` | `MetaCapiAdapter` | `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` | Meta Business Manager + Pixel + CAPI token (Step 15) |

**Mock behavior:** logs `[mock-analytics/GA4] purchase` / `[mock-analytics/META_CAPI] Purchase`.

**Note:** Server-side analytics **augments** the browser-side GTM tags (Step 8). It survives ad-blockers and iOS restrictions (TDD §6.12). Email/phone are SHA-256 hashed before Meta send.

**Files:**
- `apps/api/src/modules/analytics/analytics.module.ts` (factory)
- `apps/api/src/modules/analytics/adapters/ga4.adapter.ts`
- `apps/api/src/modules/analytics/adapters/meta-capi.adapter.ts`
- `apps/api/src/modules/analytics/adapters/mock-analytics.adapter.ts`

---

## 5. Delivery charges (D-10 temporary)

| Item | TEMP value | Real value owner | Due |
|---|---|---|---|
| Inside Dhaka delivery charge | ৳60 | Client | before Step 14 |
| Outside Dhaka delivery charge | ৳120 | Client | before Step 14 |
| Free-shipping threshold | ৳1,500 (D-12 permanent) | Client | N/A |

**Files:** `apps/storefront/src/components/checkout/CheckoutClient.tsx` (constants `DELIVERY_FLAT_POISHA`, `FREE_SHIPPING_THRESHOLD`).

**Note:** TDD §15.2 range is BDT 60–150 by zone; 60/120 falls inside.

---

## 6. COD fee rules (D-13 temporary)

| Item | TEMP value | Real value owner | Due |
|---|---|---|---|
| COD fee | No fee | Client | before Step 14 |

**Files:** `apps/api/src/modules/payments/adapters/cod.adapter.ts` (uses `COD_HANDLING_FEE` env; 0 = no fee).

---

## 7. Queued workers (TDD §11.3 — outbox)

**Step 13 status:** Outbox **table + marker** exists (Step 2). Publisher marks events as `PUBLISHED`. Real BullMQ consumer wiring is **Step 15 (ops)**.

**Why not in Step 13:** TDD §11.3 says "publishers publish from outbox to queue". The queue itself is AWS SQS/BullMQ infra — provisioned in Step 15 (§9 infra).

**Files:** `apps/api/src/modules/jobs/outbox.service.ts`, `outbox.publisher.ts`.

---

## 8. Verification order for production rollout

When the client provides credentials, follow this order to avoid partial-state issues:

1. **Email (SES)** — no user-visible impact if it fails initially
2. **Analytics (GA4 + Meta)** — silent failure; verify via debug views
3. **SMS** — verify with a test number first
4. **Courier (Pathao)** — verify with one test consignment to a staff address
5. **Payment gateways** — one at a time; start with COD (already live), then SSLCommerz (cards), then wallets
6. **COD rules / delivery charges** — client-final values; config-only change

**Rollback:** All factories fall back to mock when env keys are missing/empty. To roll back, clear the env var and restart.

---

## 9. Credential ownership

Per TDD §15.2: **all third-party accounts must be owned by the client.**
The dev team has least-privilege access only for setup and debugging.

| Account | Owner | Setup responsibility |
|---|---|---|
| AWS (SES, S3, SQS) | Client | Client registers; dev team provisions |
| bKash / Nagad / SSLCommerz | Client | Client completes merchant onboarding |
| Pathao | Client | Client opens merchant account |
| SMS aggregator (TBD) | Client | Client selects and registers |
| GA4 / Meta Business | Client | Client owns properties/pixels |
| Domain / DNS | Client | Client registers (D-03, D-20) |

---

## 10. Files reference

**Payment module:** `apps/api/src/modules/payments/`
**Courier module:** `apps/api/src/modules/courier/`
**Messaging module:** `apps/api/src/modules/messaging/`
**Analytics module:** `apps/api/src/modules/analytics/`
**Shared contracts:** `packages/types/src/{payments,courier,messaging,analytics}.ts`
**Config:** `apps/api/src/config/configuration.ts`
**Env template:** `.env.example` (root)