# Acceptance Checklist

Status: Skeleton created at Step 1. Completed + signed by client at Step 14.

---

## Part A - Shopper Journeys

### A1. Browse and Discover
- [ ] Home page loads with CMS-driven sections (SSR)
- [ ] Category mega-menu opens from header
- [ ] PLP shows facets + active chips + result count
- [ ] Search with typo-tolerant suggestions

### A2. Product Detail
- [ ] PDP loads with all images, variants, JSON-LD
- [ ] Variant change updates price + stock + URL
- [ ] Out-of-stock PDP shows Notify Me

### A3. Cart and Coupon
- [ ] Cart persists (guest localStorage, user API)
- [ ] Coupon apply shows success + error inline
- [ ] Free-shipping progress updates

### A4. Checkout and Order
- [ ] 3-step wizard
- [ ] Place Order is idempotent (no double order)
- [ ] Order confirmation reachable only with valid session

### A5. Account
- [ ] Auth-gated redirect to /signin?next=
- [ ] Order tracking timeline
- [ ] Wishlist with Move to Cart

---

## Part B - Admin Operations

### B1. Catalog
- [ ] Create category -> attribute -> product with variants -> publish
- [ ] CSV import with per-row error report

### B2. Inventory
- [ ] Low-stock alerts
- [ ] Adjustment with reason code

### B3. Promotions and CMS
- [ ] Coupon builder with all rule fields
- [ ] Flash-sale schedule + cap
- [ ] CMS page revision restore

### B4. Orders and Courier
- [ ] Order state-machine transitions
- [ ] Consignment creation
- [ ] COD reconciliation report

### B5. Payments and Refunds
- [ ] Full and partial refund
- [ ] Settlement reconciliation

### B6. RMA and Reviews
- [ ] Return request -> approve -> receive -> restock
- [ ] Review moderation publish / hide

### B7. Customers and Reports
- [ ] Segment editor
- [ ] All reports CSV export

### B8. Settings and RBAC
- [ ] Role matrix enforced server-side
- [ ] Audit log search + export
- [ ] Delivery zone + charge rules

---

## Part C - Infrastructure

- [ ] Staging URL over HTTPS
- [ ] Production URL over HTTPS
- [ ] DB unreachable from internet (verify)
- [ ] WAF blocks synthetic SQLi probe
- [ ] Rate limit trips on scripted login burst
- [ ] DR drill: restore production snapshot into staging
- [ ] Billing alert fires in a test

---

## Part D - SEO and Performance

- [ ] Rich Results test passes: PDP + PLP + FAQ
- [ ] Deleted product returns 410
- [ ] Renamed slug 301s once
- [ ] LCP <= 2.5s / CLS <= 0.1 on key templates
- [ ] Sitemap fetched in Search Console

---

## Sign-off

Client signature: ______________________
Date: ______________________