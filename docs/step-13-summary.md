# Step 13 — Integrations (COMPLETE)

**TDD ref:** §6.7–6.8, §6.11–6.12, §A.4 | **Workflow:** §7 Step 13
**Status:** COMPLETE — all batches pushed, CI green.

## Batches
| # | Deliverable |
|---|---|
| 13.1 | Adapter contracts + mock adapters |
| 13.2 | Payment adapters (bKash/Nagad/SSLCommerz/COD) + env factory |
| 13.3 | Payment webhook + mock gateway + checkout activation |
| 13.3a | Catalog serializer fix + dev seed CMS shapes |
| 13.4 | Courier Pathao + dispatch + tracking sync + settlement |
| 13.5 | Messaging (SMS + SES + VAPID) + invoice email |
| 13.6 | Analytics (GA4 MP + Meta CAPI) + purchase forwarder |
| 13.7 | Integration tests (courier, messaging, analytics) |

## Live integrations (env-driven, mock in dev)
- bKash / Nagad / SSLCommerz / COD — payment adapters
- Pathao courier — dispatch + tracking + settlement
- SMS (mock; D-09 pending) / SES email / VAPID push
- GA4 Measurement Protocol / Meta Conversions API

## Verified end-to-end
Order SKY-20260914-00003-RVPM fired:
- Invoice PDF email (attachment=1)
- Order confirmation SMS
- GA4 purchase event
- Meta CAPI Purchase event

Admin dispatch flow: dispatch → shipment → sync → IN_TRANSIT →
settlements aggregate (mock 1% fee).

## Deferred (owner + due)
| Item | Deferred to |
|---|---|
| BullMQ real queue consumer | Step 15 |
| Real SMS (D-09) | Client |
| Real Pathao creds (D-22) | Client |
| Real gateway creds (D-21) | Client |
| Purchase valuePoisha enrichment | Step 14 |

## Next: Step 14 — SEO Implementation