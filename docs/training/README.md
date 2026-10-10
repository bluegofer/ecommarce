# BlueGofer Admin Training — Index

**Version:** 1.0
**Last updated:** 2026-09-22
**Target audience:** BlueGofer staff — admin console users
**Environment:** Staging (`https://admin.nolimitshopping.com`)

---

## ০. এই Training Pack কী

এই folder-এ staff/employee-দের জন্য **short, actionable guides** আছে। প্রতিটা guide একটা নির্দিষ্ট role-এর জন্য লেখা। Screen-এ যা দেখবেন, ঠিক তেমন language-এ লেখা — যাতে সহজে follow করতে পারেন।

**Brand:** BlueGofer
**Domain:** `nolimitshopping.com`
**Admin URL:** `https://admin.nolimitshopping.com`
**API:** `https://api.nolimitshopping.com/api/v1`

---

## ১. Guide list

| # | File | Audience | What you'll learn |
|---|---|---|---|
| 00 | `README.md` (এই file) | সবাই | Common login, sidebar map, conventions |
| 01 | `01-login-and-dashboard.md` | সবাই | Login, TOTP 2FA, dashboard reading |
| 02 | `02-catalog-and-inventory.md` | Catalog Manager | Category→Product→Variant, stock adjust, low-stock |
| 03 | `03-orders-and-fulfillment.md` | Order / Support | Verify queue, dispatch, delivery status, return/exchange |
| 04 | `04-promotions-and-cms.md` | Marketing | Coupon, flash sale, homepage sections, CMS pages |
| 05 | `05-pos-operations.md` | Store / POS Staff | Register sale, drawer open/close, POS return |
| 06 | `06-purchase-and-suppliers.md` | Purchase Manager | Requisition→PO→GRN, supplier payment |
| 07 | `07-hr-attendance-payroll.md` | HR Manager | Employee add, attendance grid, payroll run |
| 08 | `08-accounting-and-reports.md` | Finance Manager | Ledger, P&L / Balance Sheet / Cash Flow, exports |

---

## ২. Common — সবাই যা জানা দরকার

### 2.1 Login URL
https://admin.nolimitshopping.com/login

### 2.2 First-time login (TOTP 2FA setup)

1. Admin-এর কাছ থেকে `phone` + `password` নিন
2. `/login`-এ ঢুকুন → phone + password দিন
3. প্রথমবার হলে সিস্টেম আপনাকে **TOTP enrol** করতে বলবে
4. **Google Authenticator** / **Authy** mobile app-এ QR code scan করুন
5. Authenticator-এ দেখানো 6-digit code দিন
6. **মনে রাখুন** — প্রতিবার login-এ এই 6-digit code লাগবে

### 2.3 প্রতিবার login করার সময়

1. `phone` + `password` দিন
2. Authenticator app খুলুন → 6-digit code দিন
3. Dashboard-এ চলে যাবেন

### 2.4 Sidebar map

Login করার পরে বাম দিকে sidebar-এ সব module দেখবেন:

**Commerce:**
- Dashboard
- Orders
- Catalog · Categories · Products
- Inventory (+ Low-stock, Transfers)
- Promotions (+ Flash sales)
- CMS (+ Media, Pages)
- Customers
- Returns
- Reviews
- Notifications

**ERP:**
- POS (+ Sessions, Returns)
- Purchases (+ Requisitions, Orders, Receiving)
- Suppliers
- Accounting
- HR (+ Employees, Attendance, Payroll)

**Insights:**
- Reports
- Analytics
- Delivery

**Settings:**
- Profile
- Users
- Roles
- Audit log
- Delivery
- Checkout

### 2.5 আপনার role অনুযায়ী কী দেখবেন

প্রতিটা role শুধু তার নির্ধারিত module দেখতে পাবে। যদি কোনো menu item না দেখেন — আপনার role-এ সেটা নেই। Admin-এর সাথে কথা বলুন।

| Role | Main modules |
|---|---|
| SUPER_ADMIN | সব |
| CATALOG_MANAGER | Catalog, Categories, Products, Inventory |
| ORDER_SUPPORT | Orders, Delivery, Returns, Customers |
| MARKETING_MANAGER | Promotions, Flash sales, CMS |
| FINANCE_MANAGER | Accounting, Payments, Reports |
| FINANCE_READONLY | Payments (view), Reports (view) |
| PURCHASE_MANAGER | Suppliers, Purchases, Inventory (view) |
| STORE_POS_STAFF | POS, Sessions |
| HR_MANAGER | HR, Employees, Attendance, Payroll |

### 2.6 Common conventions

- **Money display:** সব poisha-তে backend-এ, admin UI-তে ৳ (Taka) দেখাবে
- **Date format:** YYYY-MM-DD (ISO)
- **Language:** UI বাংলা + English mixed
- **Tab navigation:** প্রতিটা screen-এর sidebar multiple tabs থাকতে পারে
- **Filter:** প্রায় প্রতিটা list-এ search + filter + date range আছে
- **Export:** প্রায় প্রতিটা list থেকে CSV download করা যায়
- **Audit log:** প্রতিটা action register হয় — `/settings/audit-log`-এ দেখা যায়

---

## ৩. Support

- **Admin panel bug / access issue:** super admin-কে জানান
- **Order-specific problem:** respective staff group-এ escalate করুন
- **Backend / API issue:** dev team-কে জানান
- **Data discrepancy:** audit log check করুন → তারপর escalate

---

## ৪. Safety rules (সবাই পড়ুন)

1. **Password কারো সাথে share করবেন না**
2. **TOTP code কারো সাথে share করবেন না** — আপনার auth app আপনার নিজের
3. **Audit log-এ সব action record হয়** — যেকোনো change-এ responsible থাকুন
4. **Refund / cancel / journal entries** — সব action irreversible হতে পারে — **double-check করুন**
5. **Suspicious activity দেখলে** সাথে সাথে super admin-কে জানান
6. **Logout করুন** — shared computer হলে সবসময় session বন্ধ করুন

---

## ৫. Index of related documents (repo-তে)

- `docs/DECISIONS.md` — সব product/technical decisions
- `docs/acceptance-checklist.md` — feature checklist
- `docs/aws-runbook.md` — infrastructure runbook (dev only)
- `docs/dr-runbook.md` — disaster recovery (dev only)
- `docs/phase-4-audit.md` — feature audit report
- TDD v2.1 — system design (client has copy)

---

*এই Training Pack চলমান — নতুন feature এলে update হবে। কোনো guide-এ প্রশ্ন থাকলে admin-কে জানান।*
