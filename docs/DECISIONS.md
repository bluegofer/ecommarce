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