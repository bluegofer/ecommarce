# Training 08 — Accounting & Reports

**Audience:** Finance Manager (FINANCE_MANAGER), Finance Read-only (FINANCE_READONLY)
**Prerequisites:** `01-login-and-dashboard.md`
**Estimated time:** 20 min
**Sidebar location:** Accounting · Reports · Analytics

---

## ১. Accounting module overview

BlueGofer double-entry accounting — প্রতিটা business transaction (order, POS sale, purchase, payroll) auto journal entry তৈরি করে।

**Chart of accounts** (default):
- **Assets:** Cash, Bank, MFS, AR (customer dues), Inventory, Fixed assets
- **Liabilities:** AP (supplier dues), Tax payable
- **Equity:** Capital, Retained earnings
- **Income:** Sales revenue, Other income
- **Expenses:** Salaries, Rent, Utilities, Marketing, COGS

---

## ২. Chart of accounts দেখতে

1. Sidebar → **Accounting → Chart of accounts**
2. Tree view: parent → child
3. প্রতিটা account:
   - Code (e.g., 1001 = Cash)
   - Type (Asset/Liability/Income/Expense)
   - Current balance
4. Add new account → super admin only

---

## ৩. Income / Expense entry

Business expense (non-product) রেকর্ড করতে:

1. Accounting → **Income / Expense**
2. **New entry:**
   - **Type:** Income / Expense
   - **Category:** (e.g., Rent, Utilities, Office supplies)
   - **Amount:** ৳ in poisha
   - **Date**
   - **Account:** Cash / Bank / MFS (যেখান থেকে টাকা গেলো)
   - **Reference / Notes**
3. Save → auto journal entry (Expense Dr / Cash Cr)

**Recurring entries:** মাসিক rent হলে template set করা যায়।

---

## ৪. Ledger browser

সব journal entries এখানে:

1. Accounting → **Ledger**
2. Filter: date range, account, source type
3. প্রতিটা entry:
   - Entry number (`JE-2026-0001`)
   - Date
   - Description
   - Debit lines + Credit lines
   - Status: DRAFT / POSTED / REVERSED
4. Click → details
5. **Reverse** button (posted entry হলে reversal entry তৈরি হবে)

**Balance indicator:** প্রতিটা entry-তে "BALANCED" badge দেখাবে — যদি না balance হয়, entry ডাটাবেসে যাবে না (constraint)।

---

## ৫. Accounts Receivable (AR)

Customer dues:

1. Accounting → **Receivables**
2. Customer-wise due list
3. **Record payment** → customer-এর account-এ credit
4. Aging report: <30 / 30-60 / 60-90 / >90 days

---

## ৬. Accounts Payable (AP)

Supplier dues (Supplier module থেকেও access করা যায়):

1. Accounting → **Payables**
2. Supplier-wise due
3. Payment record
4. Aging report

---

## ৭. Financial reports

### ৭.১ Profit & Loss (P&L)

1. Accounting → **Reports → P&L**
2. Date range select
3. দেখবেন:
   - **Revenue** (sales - returns)
   - **Cost of goods sold** (COGS)
   - **Gross profit**
   - **Operating expenses** (salary, rent, etc.)
   - **Net profit / loss**

### ৭.২ Balance Sheet

Assets vs Liabilities + Equity at a point in time।

- **Assets:** Cash + Bank + MFS + AR + Inventory
- **Liabilities:** AP + Tax payable
- **Equity:** Capital + Retained earnings
- **Balance check:** Assets = Liabilities + Equity ✓

### ৭.৩ Cash Flow Statement

Cash in vs cash out over period:

- **Operating activities:** sales receipts, expense payments
- **Investing:** asset purchase
- **Financing:** loan, capital

### ৭.৪ Export

সব report **Export CSV** → accountant / CA-কে দিন।

---

## ৮. Built-in business reports (Reports module)

1. Sidebar → **Reports**
2. Available:
   - **Sales daily/weekly/monthly**
   - **Orders by status**
   - **AOV** (average order value)
   - **Funnel** (visit → product → cart → checkout → paid)
   - **Top products / categories / brands**
   - **Repeat customer rate**
   - **Coupon performance**
   - **Return rate**
   - **Gross profit / Net profit** (from accounting)
   - **Employee performance**
   - **Branch performance**

3. প্রতিটা report-এ chart + CSV export

---

## ৯. Analytics (Traffic + Conversion)

1. Sidebar → **Analytics**
2. দেখবেন:
   - **GA4 integration** (page views, sessions)
   - **Meta Pixel** (conversions)
   - **Server-side events** (purchase via API — ad-blocker-proof)
3. Debug: test events দেখতে GA4 Realtime / Meta Events Manager

---

## ১০. Audit trail

সব sensitive action (price change, refund, journal posting) record হয়:

1. Settings → **Audit log**
2. Filter: user, date, entity type
3. প্রতিটা row: **who, what, when, before/after values**
4. **Export** to CSV

**Access:** super admin + finance।

---

## ১১. Common errors

| Error | কারণ | Fix |
|---|---|---|
| "Journal entry not balanced" | debit ≠ credit | Lines adjust |
| "Account locked" | reconciliation চলছে | পরে retry |
| Report numbers mismatch | wrong date range | Correct filter |
| Ledger shows negative balance | wrong account type | Account classification check |

---

## ১২. Best practices

- **Daily review:** P&L last 24h glance
- **Weekly:** AR/AP aging
- **Monthly:** full P&L + Balance Sheet + Cash Flow → export → save
- **Quarterly:** inventory valuation + tax prep
- **Yearly:** fiscal year close (future feature)

---

## ১৩. Report retention

- Reports **CSV export** → আপনার drive / accounting software-এ save
- **Backup:** system-এ 7-day RDS backup + manual snapshot
- **Access log:** কে কখন report export করেছে — audit log-এ দেখবেন

---

## ১৪. Next

Training সম্পূর্ণ। এখন আপনি admin panel-এ confident। কোনো question হলে super admin-কে জানান।