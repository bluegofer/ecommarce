# Acceptance Checklist

**Step:** 15.15 (pre-UAT consolidation) | **Updated:** 2026-09-21
**Authority:** TDD §16, Workflow v2 §10 (Project Done Definition), Appendix A §A.5
**Sign-off:** Completed + signed by client at Step 16 UAT

**Legend:**
- `[x]` = verified in staging/build evidence (Step 15.15)
- `[ ]` = to be verified by client at Step 16 UAT

---

## Part A — Shopper Journeys (Storefront)

### A1. Browse and Discover
- [ ] Home page loads with CMS-driven sections (SSR)
- [ ] Category mega-menu opens from header
- [ ] PLP shows facets + active chips + result count
- [ ] Search with typo-tolerant suggestions
- [ ] Language toggle (bn default / en) switches all strings

### A2. Product Detail
- [ ] PDP loads with all images, variants, JSON-LD
- [ ] Variant change updates price + stock + URL
- [ ] Out-of-stock PDP shows Notify Me

### A3. Cart and Coupon
- [ ] Cart persists (guest localStorage, user API)
- [ ] Guest cart merges on login (DECISIONS.md Step-8.7)
- [ ] Coupon apply shows success + error inline
- [ ] Free-shipping progress updates

### A4. Checkout and Order
- [ ] 3-step wizard (Address → Payment → Review)
- [ ] Address book picker for authenticated user; inline form for guest
- [ ] All 4 payment methods render: bKash / Nagad / SSLCommerz / COD
- [ ] Place Order is idempotent (no double order)
- [ ] Order confirmation reachable only with valid session
- [ ] Guest confirmation shows sign-in CTA for invoice download

### A5. Account
- [ ] Auth-gated redirect to /signin?next=
- [ ] Order tracking timeline (5-node)
- [ ] Wishlist with Move to Cart

### A6. Returns and Support
- [ ] Return request from order detail (reason + photo)
- [ ] Ticket creation from contact form

### A7. Notifications
- [ ] Order placed → SMS + email
- [ ] Shipped → tracking link included
- [ ] Delivered → confirmation email
- [ ] Refund processed → notification

### A8. PWA
- [ ] Manifest + icons valid
- [ ] Installable on mobile
- [ ] Service worker caches catalog pages
- [ ] Push opt-in hook present

---

## Part B — Admin Operations (Commerce)

### B1. Catalog
- [ ] Create category → attribute → product with variants → publish
- [ ] CSV import with per-row error report
- [ ] Media upload with WebP conversion
- [ ] Draft / scheduled publishing

### B2. Inventory
- [ ] Low-stock alerts
- [ ] Adjustment with reason code
- [ ] Inter-branch transfer (Step 11)
- [ ] Valuation CSV export

### B3. Promotions and CMS
- [ ] Coupon builder with all rule fields
- [ ] Flash-sale schedule + cap
- [ ] CMS page revision restore
- [ ] Homepage section reorder (no deploy)

### B4. Orders and Courier
- [ ] Order state-machine transitions (PENDING → VERIFIED → PROCESSING → SHIPPED → DELIVERED)
- [ ] Verification queue (bulk + single verify)
- [ ] Exchange action (order-level)
- [ ] Consignment creation (Pathao)
- [ ] COD reconciliation report
- [ ] Manual delivery status (staff-set, not overwritten by courier sync — A.4)

### B5. Payments and Refunds
- [ ] Full and partial refund
- [ ] Settlement reconciliation
- [ ] Gateway webhook signature verification

### B6. RMA and Reviews
- [ ] Return request → approve → receive → restock
- [ ] Review moderation publish / hide

### B7. Customers and Reports
- [ ] Segment editor
- [ ] CLV column visible
- [ ] Follow-up tracking + complaint history (A.3)
- [ ] All reports CSV export

### B8. Settings and RBAC
- [ ] Role matrix enforced server-side
- [ ] Audit log search + export
- [ ] Delivery zone + charge rules
- [ ] Staff 2FA (TOTP) enforced

---

## Part C — ERP Modules (Appendix A)

### C1. POS (A.2.1)
- [ ] Barcode scan / quick product lookup
- [ ] Sale completion in one transaction (stock + payment + ledger)
- [ ] Cash/Card/MFS tender
- [ ] Receipt generation (80mm thermal payload)
- [ ] Sales return + exchange flow
- [ ] Cash drawer open/close with variance approval
- [ ] Daily + branch-wise sales report

### C2. Purchase (A.2.3)
- [ ] Requisition → PO → Invoice → GRN workflow
- [ ] GRN confirmation increments stock + supplier payable + ledger (one transaction)
- [ ] Supplier due payment recording

### C3. Suppliers (A.2.4)
- [ ] Supplier profile CRUD
- [ ] Payable balance per supplier
- [ ] Payment history
- [ ] Performance overview (delivery timeliness, order fulfillment %)

### C4. Accounting (A.2.2)
- [ ] Income/Expense entry with categories
- [ ] AR (customer dues) + AP (supplier dues) ledgers
- [ ] Cash/Bank/MFS account management
- [ ] Double-entry invariant (Σ debit = Σ credit)
- [ ] P&L / Balance Sheet / Cash Flow reports
- [ ] Website order auto-posts revenue
- [ ] POS sale auto-posts revenue
- [ ] Payroll payment auto-posts expense

### C5. HR (A.2.5)
- [ ] Employee CRUD with department + designation
- [ ] Salary structure per employee
- [ ] Role linkage with Admin RBAC

### C6. Attendance (A.2.6)
- [ ] Daily mark / bulk grid entry
- [ ] Leave request approve/reject
- [ ] Overtime capture
- [ ] Monthly attendance summary
- [ ] Device-events intake interface (normalized punch events)

### C7. Payroll (A.2.7)
- [ ] Monthly run generates payslips (present + OT + leave deductions)
- [ ] Payroll run idempotent (re-run replaces draft, not posted)
- [ ] Payment recording → ledger posting
- [ ] Payslip PDF / print view

---

## Part D — Cross-Module Automation Chains (Appendix A §A.5)

### D1. POS → Inventory → Accounting
- [ ] POS sale decrements branch stock (conditional UPDATE ... WHERE stock >= n)
- [ ] Revenue journal entry created (Cash/MFS Dr / Sales Revenue Cr)
- [ ] Concurrent POS sale + website checkout for last unit → exactly one succeeds

### D2. Purchase → Inventory → Supplier Accounts
- [ ] GRN confirmation increments stock
- [ ] Supplier payable increments
- [ ] Balanced journal posting (Inventory Dr / Supplier AP Cr)
- [ ] Mid-transaction failure → nothing half-written (rollback test)

### D3. HR → Attendance → Payroll → Accounts
- [ ] Attendance feed drives salary calculation
- [ ] Payslip payment creates balanced ledger entry
- [ ] Cash Flow report reflects payroll expense

### D4. Website Orders → Inventory → Accounting
- [ ] Order payment → revenue posting
- [ ] COD orders → AR until collected
- [ ] Refund → reversal entry

---

## Part E — Integrations

### E1. Payments
- [ ] bKash: sandbox redirect → webhook → paid
- [ ] Nagad: sandbox redirect → webhook → paid
- [ ] SSLCommerz: card flow works
- [ ] COD: availability rules by value/zone
- [ ] Tampered signature rejected
- [ ] Amount mismatch rejected
- [ ] Duplicate webhook replay changes nothing (idempotency)

### E2. Courier
- [ ] Pathao consignment created from admin
- [ ] Tracking number written back to order
- [ ] Courier webhook moves status (In Transit / Delivered)
- [ ] Conflicting manual status raises review flag (A.4)
- [ ] COD settlement report matches seeded payout fixture

### E3. Messaging
- [ ] SMS aggregator connected (D-09)
- [ ] SES verified (SPF + DKIM)
- [ ] Guest invoice PDF delivered via email
- [ ] Web push opt-in works

### E4. Analytics
- [ ] GA4 server-side purchase event
- [ ] Meta CAPI server-side event
- [ ] Server-side path works with browser blocked (ad-blocker proof)

---

## Part F — SEO and Performance

- [ ] Rich Results test passes: PDP + PLP + FAQ
- [ ] Product + Offer + AggregateRating JSON-LD valid
- [ ] Deleted product returns 410
- [ ] Renamed slug 301s once
- [ ] LCP ≤ 2.5s / CLS ≤ 0.1 on key templates
- [ ] Sitemap fetched in Search Console
- [ ] hreflang bn (default) + en

---

## Part G — Infrastructure, Security, DR

### G1. Infrastructure
- [ ] Staging URL over HTTPS (nolimitshopping.com)
- [ ] Production URL over HTTPS (Step 16)
- [ ] DB unreachable from internet (SG test)
- [ ] CloudWatch 6 alarms wired to SNS
- [ ] Sentry capturing errors on all 3 apps
- [ ] Backups: RDS auto 7d + manual snapshot + S3 versioning + Redis BGSAVE

### G2. Security Baseline
- [ ] Rate limit trips on scripted login burst
- [ ] TOTP enforced for staff (soft mode at launch, DECISIONS.md Step 15.9)
- [ ] CSP / HSTS / frame-ancestors headers present
- [ ] No secrets in git (grep audit)
- [ ] Dependency scanning blocks known CVEs in CI

### G3. DR (Step 15.13 evidence)
- [x] **DR drill executed 2026-09-20** — RTO measured ~8 min (target ≤4h), RPO met
- [x] Restore integrity: 97/97 tables match, 10/10 ERP-critical present
- [x] Temp instance cleanup verified (`DBInstanceNotFound`)
- [ ] Billing alert fires in a test
- [ ] DR drill #2 (S3 media object-level test) before Step 16

---

## Part H — TDD §16 Deliverables (Project Done Definition)

- [ ] Storefront live on client domain — bn/en, brand-configured
- [ ] Admin dashboard operational across ALL modules (commerce + ERP)
- [ ] All 4 cross-module chains (A.5) proven in production
- [ ] Payments + Courier live with verified webhooks + reconciliation
- [ ] AWS infra in client account; backups + DR documented
- [ ] SEO: SSR/ISR verified, structured data passing, sitemap in Search Console
- [ ] Security baseline §10 verified with written report
- [ ] Data-integrity §11 proven by tests (no oversell, idempotent, balanced ledgers)
- [ ] Test suite green in CI; load-test report on file
- [ ] Handover pack delivered; all third-party accounts owned by client

---

## Sign-off

**Client name:** Musavi Fardin / MD ANIMUL HOQ

**Signature:** ______________________

**Date:** ______________________

**UAT environment:** https://nolimitshopping.com (staging)

**Notes:**

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________