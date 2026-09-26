# Data Model

Status: Locked at Step 1 (2026-09-11). Table list is final; column detail fills by step.
Consistency boundary: PostgreSQL ACID for business state. Redis holds only recoverable, time-boxed data.

---

## Entity groups (41 tables)

| # | Table | Purpose | Step |
|---|---|---|---|
| 1 | users | Staff + customer accounts | 2 |
| 2 | roles | 5 seeded roles | 2 |
| 3 | permissions | Fine-grained permissions | 2 |
| 4 | role_permissions | Role to permission map | 2 |
| 5 | user_roles | Many-to-many | 2 |
| 6 | refresh_tokens | Rotating refresh records | 2 |
| 7 | totp_secrets | Staff 2FA enrolment | 2 |
| 8 | audit_log | who/what/when/before/after | 2 |
| 9 | outbox | External side effects in same tx | 2 |
| 10 | idempotency_keys | Request hash + response replay | 2 |
| 11 | categories | Tree, sort order | 3 |
| 12 | attributes | Per-category dynamic attributes | 3 |
| 13 | category_attributes | Which attributes apply where | 3 |
| 14 | products | Product record (category-agnostic) | 3 |
| 15 | product_attribute_values | EAV values | 3 |
| 16 | variants | SKU-level price / stock / barcode | 3 |
| 17 | product_media | Images + video | 3 |
| 18 | slug_redirects | 301 map on rename | 3 |
| 19 | inventory_adjustments | Reason-coded stock changes | 3 |
| 20 | coupons | Rules, usage limits, window | 4 |
| 21 | coupon_redemptions | Atomic redemption | 4 |
| 22 | promotions | Automatic discounts | 4 |
| 23 | flash_sales | Time-boxed sale with caps | 4 |
| 24 | cms_pages | Static / policy pages | 4 |
| 25 | cms_page_revisions | Version history | 4 |
| 26 | cms_sections | Homepage builder slots | 4 |
| 27 | cms_menus | Header / footer nav | 4 |
| 28 | cms_media | Central media library | 4 |
| 29 | customers | CRM profile | 5 |
| 30 | addresses | Address book | 5 |
| 31 | carts | Guest + user carts | 5 |
| 32 | cart_items | Line items | 5 |
| 33 | orders | Order header | 5 |
| 34 | order_items | Itemized money breakdown | 5 |
| 35 | order_status_history | State-machine audit | 5 |
| 36 | payments | Gateway records | 10 |
| 37 | shipments | Courier consignments | 10 |
| 38 | returns | RMA records | 6 |
| 39 | tickets | Support tickets | 6 |
| 40 | reviews | Verified reviews | 6 |
| 41 | notifications | Templates + delivery log | 5 |

---

## Concurrency guarantees (enforced Step 3+)

- Stock: UPDATE variants SET stock = stock - n WHERE id = ? AND stock >= n inside order tx.
- Reservations: Redis, TTL 10 min, auto-release.
- Idempotency: unique key on idempotency_keys.key, response replay.
- Webhooks: unique event IDs on payments.gateway_event_id, shipments.courier_event_id.
- Coupon: redemption decrement in same tx as order creation.
- Money: integer poisha, itemized order breakdown, server-side recalc.