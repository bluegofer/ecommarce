# Phase 4 — Feature Audit (2026-09-22)

**Scope:** TDD §7 (Storefront), TDD §6.13 (Admin), TDD Appendix A §A.5 (Cross-module chains)
**Method:** Code-level grep + DB-level query + schema inspection on staging
**Session:** Custom Phase 4 closure (production launch deferred — see DECISIONS.md)

---

## Legend

- ✅ **PASS** — verified present + functional
- ❌ **FAIL** — missing or non-functional
- ⚠️ **PARTIAL** — present but incomplete / unverified
- ❓ **AMBIGUOUS** — needs follow-up verification

---

## Part 1 — Storefront vs TDD §7

### 1.1 Page routes (TDD §7.2)

| Page | Route | Status |
|---|---|---|
| Home | `[locale]/page.tsx` | ✅ |
| Category PLP | `[locale]/c/[slug]/page.tsx` | ✅ |
| Search results | `[locale]/s/page.tsx` | ✅ |
| Product detail | `[locale]/p/[slug]/page.tsx` | ✅ |
| Cart | `[locale]/cart/page.tsx` | ✅ |
| Checkout | `[locale]/checkout/page.tsx` | ✅ |
| Order confirmation | `[locale]/order-confirmation/page.tsx` | ✅ |
| Deals | `[locale]/deals/page.tsx` | ✅ |
| Account home | `[locale]/account/page.tsx` | ✅ |
| Account orders | `[locale]/account/orders/page.tsx` | ✅ |
| Account order detail | `[locale]/account/orders/[id]/page.tsx` | ✅ |
| Account addresses | `[locale]/account/addresses/page.tsx` | ✅ |
| Account settings | `[locale]/account/settings/page.tsx` | ✅ |
| Account wishlist | `[locale]/account/wishlist/page.tsx` | ✅ |
| Sign-in | `[locale]/signin/page.tsx` | ✅ |
| Register | `[locale]/register/page.tsx` | ✅ |
| Content pages | `[locale]/pages/[slug]/page.tsx` | ✅ |
| Contact | `[locale]/contact/page.tsx` | ✅ |
| FAQ | `[locale]/faq/page.tsx` | ✅ |
| 404 | `app/not-found.tsx` + `[locale]/not-found.tsx` | ✅ |
| Mock gateway (dev-only) | `[locale]/mock-gateway/page.tsx` | ✅ (dev) |
| Gallery (showcase) | `[locale]/gallery/page.tsx` | ✅ (extra) |

**Coverage: 22/22 routes present.**

### 1.2 Feature checklist (TDD §7.2 keywords)

| Feature | Status | Evidence |
|---|---|---|
| Mega-menu drawer | ✅ | `components/layout/` |
| Search autocomplete | ✅ | `components/layout/` |
| Mini-cart drawer | ✅ | `components/ui/MiniCart.tsx` |
| Wishlist | ✅ | page + API |
| Guest cart (localStorage) | ✅ | `lib/cart/context.tsx` |
| PWA manifest | ✅ | `app/manifest.ts` |
| Hero carousel | ✅ | `[locale]/page.tsx` |
| Flash sale countdown | ✅ | `[locale]/deals/page.tsx` |
| Faceted filter | ✅ | `[locale]/c/[slug]/page.tsx` |
| PDP variant picker | ✅ | `components/pdp/` |
| Reviews block | ✅ | PDP page |
| Order tracking timeline | ✅ | `account/orders/[id]/page.tsx` |
| Language toggle (bn/en) | ❓ | grep miss — component exists under alternate name (verify) |
| JSON-LD structured data | ✅ | per-page |
| Sitemap | ✅ | `app/sitemap.ts` |
| Robots | ✅ | `app/robots.ts` |
| noindex on auth/cart | ✅ | per-page metadata |
| 404 page branded | ✅ | `not-found.tsx` |
| **500 error page** | ❌ | **`error.tsx` / `global-error.tsx` MISSING** |

**Coverage: 18/19 verified, 1 missing (500 page), 1 ambiguous (language toggle).**

---

## Part 2 — Admin vs TDD §6.13

### 2.1 Page routes

**52 admin routes present** — full coverage of TDD §6.1–6.12 + Appendix A modules:

Commerce: catalog, categories, products (new/edit), inventory (+ low-stock, transfers), promotions (+ flash-sales), CMS (+ media, pages), customers (+ [id]), orders (+ [id]), payments, returns, reviews, notifications, reports, analytics, delivery

ERP: suppliers, purchases (+ requisitions, orders, receiving), accounting, HR (+ employees, attendance, payroll), POS (+ returns, sessions)

Settings: profile, users, roles, audit-log, delivery, checkout

**Coverage: 52/52 routes present (complete).**

### 2.2 Feature checklist (TDD §6.13)

| Feature | Status | Notes |
|---|---|---|
| RBAC shell gate (middleware) | ✅ | `apps/admin/src/middleware.ts` (F-11 fix, Step 15.9) |
| TOTP 2FA enrolment | ✅ | `settings/profile/page.tsx` |
| Audit trail viewer | ✅ | `settings/audit-log/page.tsx` |
| Catalog manager | ✅ | `products/[id]/page.tsx` |
| Inventory grid (branch selector) | ✅ | `inventory/page.tsx` |
| Promotions (coupon + flash) | ✅ | `promotions/` + `promotions/flash-sales/` |
| CMS homepage builder (section-based) | ✅ | `cms/page.tsx` — HERO / DEAL_STRIP / PROMO_TILES reorder + schedule |
| Orders console | ✅ | `orders/page.tsx` + `[id]/page.tsx` |
| Verification queue | ✅ | `orders/[id]/page.tsx` |
| Exchange status | ✅ | `orders/[id]/page.tsx` |
| Manual delivery status UI | ❌ | no triggers found for In Transit / Out for Delivery / Delivered / Failed / Returned — A.4 mandate |
| Rider assignment | ✅ | `delivery/page.tsx` |
| POS screens | ✅ | `pos/` + `pos/returns/` + `pos/sessions/` |
| Purchase workflow | ✅ | `purchases/requisitions` + `orders` + `receiving` |
| Supplier module | ✅ | `suppliers/page.tsx` |
| Accounting UI (income/expense/ledger/reports) | ✅ | `accounting/page.tsx` |
| HR employees | ✅ | `hr/employees/page.tsx` |
| Attendance UI | ✅ | `hr/attendance/page.tsx` |
| Payroll UI | ✅ | `hr/payroll/page.tsx` |
| Reports + charts | ✅ | `reports/` + `analytics/` |
| Settings (all sub-pages) | ✅ | 6 settings pages |
| Users management | ⚠️ | UI present (`settings/users/`), backend controller count = 0 — API missing? |
| **Dashboard stats (real API)** | ❌ | `(dashboard)/page.tsx` has HARDCODED PLACEHOLDER METRICS (৳0.00, 0, 0, 0) |

**Coverage: 20/23 verified, 3 gaps (manual delivery, dashboard stats, users controller).**

### 2.3 Backend module coverage

**23 modules present** — all TDD §6.x + Appendix A modules:

commerce (12): catalog, inventory, promotions, cms, crm, orders, payments, courier, reviews, rma, search, carts
erp (5): pos, purchase, suppliers, accounting, hr
infra (6): auth, analytics, notifications, jobs, messaging, users

**Coverage: 23/23 modules present.** (users module controller count = 0 — verify)

---

## Part 3 — Cross-module chains (TDD Appendix A §A.5)

### 3.1 Chain verification method

- **Schema-level:** confirmed all tables + triggers + FKs exist
- **Data-level:** counted rows in each chain's terminal table
- **End-to-end:** NO chain exercised end-to-end during current session

### 3.2 Chain-by-chain verdict

#### Chain 4 — Website Orders → Inventory → Accounting

| Element | Status | Evidence |
|---|---|---|
| Schema (orders, payments, journal_entries, journal_lines) | ✅ | all present, FK + trigger enforced |
| Data: orders | ✅ | 11 rows |
| Data: payments | ⚠️ | 11 rows, ALL PENDING (no PAID yet) |
| Data: journal_entries | ❌ | **0 rows** — no revenue posting from any order |
| End-to-end proof | ❌ | not exercised |

**Root cause:** all 11 orders stuck in `PLACED` status; no payment reached `PAID`; delivery hook never fired. Chain logic present in code but never triggered.

#### Chain 1 — POS → Inventory → Accounting

| Element | Status | Evidence |
|---|---|---|
| Schema (pos_sales, branch_stock, stock_transfers, journal_entries) | ✅ | all present |
| Data: pos_sales | ❌ | 0 rows |
| Data: branch_stock | ❌ | 0 rows |
| Data: stock_transfers | ❌ | 0 rows |
| End-to-end proof | ❌ | not exercised |

**Root cause:** no demo POS sale was seeded; branches registers exist but no sales executed.

#### Chain 2 — Purchase → Inventory → Supplier Accounts

| Element | Status | Evidence |
|---|---|---|
| Schema (suppliers, purchase_orders, grns, journal_entries) | ✅ | all present |
| Data: suppliers | ⚠️ | 1 row (DEMO-SUP-01) |
| Data: purchase_orders | ❌ | 0 rows |
| Data: grns | ❌ | 0 rows |
| End-to-end proof | ❌ | not exercised |

**Root cause:** no demo PO → GRN cycle seeded.

#### Chain 3 — HR → Attendance → Payroll → Accounts

| Element | Status | Evidence |
|---|---|---|
| Schema (employees, attendance_records, payroll_runs, payslips, journal_entries) | ✅ | all present |
| Data: employees | ⚠️ | 1 row (EMP-0001) |
| Data: attendance_records | ❌ | 0 rows |
| Data: payroll_runs | ❌ | 0 rows |
| Data: payslips | ❌ | 0 rows |
| End-to-end proof | ❌ | not exercised |

**Root cause:** no demo attendance or payroll run seeded.

### 3.3 Chain infrastructure — VERIFIED

The **infrastructure** to enforce and validate the chains is in place:

- `journal_lines_balance_check` DB trigger — enforces double-entry invariant at INSERT/UPDATE/DELETE
- `journal_lines_amounts_check` DB CHECK — enforces `debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0)`
- `journal_entries_sourceType / sourceId` — chain provenance tracking
- `orders.placedAt / confirmedAt / processingAt / shippedAt / deliveredAt / cancelledAt` — state-machine timestamps

**But: NO chain has produced an actual transaction in staging.**

---

## Part 4 — Inherited Phase 3 gaps (revert collateral)

The Phase 3 code changes were reverted on 2026-09-22 (commit `115cb4e`). This reintroduced three gaps:

| Gap | Reference | Current state |
|---|---|---|
| 3.5 Inventory adjust DTO mismatch | `apps/admin/.../inventory/page.tsx` | `quantity: number` (should be `delta`); `TRANSFER_IN` / `TRANSFER_OUT` invalid enum values in dropdown |
| 3.6 CMS seed incomplete | `apps/api/prisma/seed.ts` | no `seedCmsDemo()`; DB has `cms_pages = 0`, `cms_menus = 0`, `cms_menu_items = 0` |
| 3.7 RBAC demo users | `apps/api/prisma/seed.ts` | no `seedDemoRoleUsers()`; DB has only `admin@bluegofer.local` |

---

## Part 5 — Prioritized gap list

### 🔴 Critical (TDD compliance / production blocker)

1. **All 4 cross-module chains unverified end-to-end** — TDD §A.5 requirement
2. **Website Orders → Accounting not posting** — 11 orders, 0 journal entries
3. **Dashboard stats hardcoded placeholder** — Step 12 task #40 incomplete
4. **Manual delivery status UI absent** — A.4 mandate
5. **Users backend controller missing** — admin UI calls non-existent API

### 🟡 High (functional gaps)

6. **Phase 3.5 revert** — inventory adjust DTO mismatch will fail on click
7. **Phase 3.6 revert** — CMS pages / menus / menu items are empty
8. **Phase 3.7 revert** — no RBAC demo users to test roles
9. **Storefront 500 error page missing** — no `error.tsx`

### 🟢 Low / Verify

10. **Language toggle** — verify actual component presence
11. **`inventory_adjustments = 2`** — trace origin (manual test? seed?)

---

## Part 6 — Recommended next steps

### Immediate (this session or next)

- **Run end-to-end chain tests on staging** (test data injection + verify journal postings). This is TDD §A.5's explicit acceptance criterion and has never been exercised.

### Short-term (post-audit fix cycle)

- Re-apply Phase 3.5 / 3.6 / 3.7 code (previous commit `584e76d` — revert of the revert)
- Wire dashboard stats to real API
- Add `error.tsx` to storefront
- Add manual delivery status controls to admin orders UI
- Investigate users backend controller

### Long-term (before production launch)

- Populate all four chains with demo data so UAT can walk them (per Step 16 task #117)
- Re-run this audit checklist after all fixes

---

## Appendix — Evidence captured (2026-09-22 session)

**Commands run on staging (SSM shell):**

orders = 11
payments = 11 (all PENDING, all COD)
journal_entries = 0
inventory_adjustments = 2
pos_sales = 0
branch_stock = 0
stock_transfers = 0
suppliers = 1
purchase_orders = 0
grns = 0
employees = 1
attendance_records = 0
payroll_runs = 0
payslips = 0
cms_pages = 0
cms_sections = 3
cms_menus = 0
cms_menu_items = 0

**DB schema verification:**
- `journal_lines_balance_check` trigger exists — enforces double-entry invariant
- `journal_lines_amounts_check` CHECK constraint — enforces single-sided line amounts
- `orders` has all state-machine timestamp columns
- `cms_sections` has `key`, `sectionType`, `config`, `isVisible`, `startsAt`, `endsAt`

---

**Audit complete:** 2026-09-22
**Next action:** See Part 6 — recommended next steps
**Related:** `docs/DECISIONS.md` (Phase 3 closure entry)