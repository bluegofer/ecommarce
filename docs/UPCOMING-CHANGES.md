# UPCOMING CHANGES

Features wanted by the client that are **NOT in TDD v2.1 / Workflow v2.0**.
These are DEFERRED — will be implemented after TDD-compliant Steps 13–16, or
upshifted into a step if scope allows and client prioritises them.

Status: OPEN — items reviewed at the end of every step.

Rules:
1. Every item must be classified DEFERRED or IN-SCOPE-FOR-STEP-X.
2. Review at the end of every Step; re-prioritise as needed.
3. Never implement a deferred item without a dedicated DECISIONS.md entry.
4. Client owns priority — items can be upshifted anytime with a dated note.

---

## ENH-01 — Admin-config-driven integrations (Settings module)

**Requested by:** client
**Date:** 2026-09-13
**Priority:** HIGH
**Effort:** Medium-Large
**Target:** Step 14 (SEO) or Step 15 (AWS) — after TDD Steps 13–16 complete
**Status:** DEFERRED

### What
Replace env-var-based integration config with a first-class Settings module
backed by DB + admin UI:
- SMS providers (multiple, add / remove / edit + credentials)
- Payment gateway credentials (per-gateway enable/disable + sandbox vs prod)
- Courier credentials (per-courier enable/disable)
- Webhook URLs (per gateway, editable by client)
- Delivery zones + charges (add / remove / edit)
- COD fee rules (rule types: flat / percent / free-above-threshold)
- Currency / VAT rate / other operational constants

### Why
Client wants operational independence — no developer needed to change provider,
rotate credentials, add a new gateway, or adjust fees. TDD §6.13 says every
day-to-day operational task must be doable from the admin panel without
developer involvement; this ENH extends that to integrations.

### Current TDD approach (Step 13)
- Single SMS provider (env var, per D-09)
- Single primary courier (env var, per D-06 / D-22)
- Payment gateway credentials in `.env` (per D-21)
- 2 delivery zones fixed (per D-11)
- Free-shipping threshold fixed (per D-12)
- COD fee via env config (per D-13)

### Risk if deferred
Client needs developer help to rotate credentials or change provider.
Acceptable for Phase 1 launch (single provider per category); fix in Phase 1.5.

### Migration path (when implemented)
1. Move credentials from `.env` to `integration_config` table (encrypted).
2. Admin UI at `/settings/integrations` with one panel per category.
3. Adapter factory reads config from DB (fallback to env for dev).
4. Existing adapters unchanged — only the config source changes.

---

## ENH-02 — Multi-dimensional delivery charge rules

**Requested by:** client
**Date:** 2026-09-13
**Priority:** MEDIUM
**Effort:** Medium
**Target:** Step 14 or later
**Status:** DEFERRED

### What
Beyond the 2-zone fixed charges:
- Zone × product type (size / weight / declared value)
- Per-product override
- Time-based (holiday surcharge, weekend rate)
- Free-shipping threshold per zone

### Why
Real business evolves — may need differentiated pricing per category or
weight tier. TDD §6.7 mentions "by order value, by weight (future)" —
this ENH makes that future real.

### Current TDD approach (Step 13)
- 2 zones (Inside Dhaka / Outside Dhaka) — D-11 LOCKED
- Flat rate per zone
- Free-shipping threshold ৳1500 — D-12 LOCKED

---

## ENH-03 — Fee rule types (COD + others)

**Requested by:** client
**Date:** 2026-09-13
**Priority:** MEDIUM
**Effort:** Small-Medium
**Target:** Step 14 or later
**Status:** DEFERRED

### What
Rule builder for fees:
- Flat fee
- Percentage of order
- Free above threshold
- Conditional on zone / payment method
- Multiple COD rules per zone

### Current TDD approach (Step 13)
- Simple COD fee per D-13
- Env-configured

---

## ENH-04 — Guest invoice PDF via email (SES)

**Priority:** HIGH
**Target:** Step 13 (already deferred from Step 8.11)
**Status:** IN-SCOPE-FOR-STEP-13

### What
Order confirmation email carries invoice PDF attachment (server-generated,
sent via outbox → SES).

### Current TDD approach
Already planned — DECISIONS.md Step-8.11 deferral + Workflow §13 Task 71.

**Note:** NOT deferred. Will be delivered in Step 13.

---

## ENH-05 — Multi-provider SMS / email with fallback chain

**Priority:** LOW
**Effort:** Small-Medium
**Target:** Phase 2
**Status:** DEFERRED

### What
If primary SMS provider fails → fallback to secondary provider automatically.
Same for email.

### Current TDD approach
Single provider. Failure → log + manual retry (via DLQ + admin retry button).

---

## ENH-06 — Per-zone courier routing (auto-select)

**Priority:** MEDIUM
**Effort:** Small
**Target:** Step 13 (already in TDD §6.7)
**Status:** IN-SCOPE-FOR-STEP-13

### What
Route an order to Pathao/Steadfast/RedX based on destination zone
(e.g. Pathao for Dhaka, Steadfast for national).

### Current TDD approach
TDD §6.7: "Multiple couriers usable in parallel (e.g., Steadfast for Dhaka,
RedX for nationwide) selectable per order or per zone rule."
Already in scope.

**Note:** NOT deferred — will be delivered in Step 13.

---

## Change log

| Date | Item | Change |
|---|---|---|
| 2026-09-13 | ENH-01..06 | Register created — first client-requested enhancements logged |