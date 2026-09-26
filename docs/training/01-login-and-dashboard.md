# Training 01 — Login & Dashboard

**Audience:** সব admin users
**Prerequisites:** phone + password, TOTP auth app (Google Authenticator / Authy)
**Estimated time:** 5 min (first time 10 min)

---

## ১. Login

### 1.1 URL
https://admin.nolimitshopping.com/login

### 1.2 প্রথমবার login (TOTP setup সহ)

1. `/login`-এ যান
2. **Phone:** আপনার staff phone number (e.g., `+8801700000000`)
3. **Password:** admin-এর দেওয়া password
4. **Sign in** ক্লিক করুন

   → প্রথমবার হলে সিস্টেম আপনাকে TOTP enrol করতে দেবে (QR code দেখাবে)

5. **Google Authenticator / Authy** mobile app খুলুন
6. **Add account** → **Scan QR code** → স্ক্রিনের QR scan করুন
7. App-এ 6-digit code দেখাবে → সেই code admin panel-এ দিন
8. **Verify & Continue** ক্লিক করুন

   → Dashboard-এ চলে যাবেন

> ⚠️ **গুরুত্বপূর্ণ:** এই QR/secret কোথাও save করে রাখুন (backup)। Phone হারালে এই secret দিয়ে আবার setup করবেন।

### 1.3 প্রতিবার login

1. Phone + password দিন
2. Authenticator app থেকে 6-digit code দিন
3. Dashboard-এ ঢুকবেন

---

## ২. Dashboard reading

Login হয়ে গেলে প্রথমে যে page আসে সেটাই **Dashboard**। এখানে ৪টা কার্ড দেখবেন:

| Card | মানে |
|---|---|
| **Gross sales (today)** | আজকের total বিক্রি (৳ poisha→Taka) |
| **Orders (today)** | আজকের order সংখ্যা |
| **Pending verification** | যে order-গুলো verify করতে হবে (নিচে দেখুন) |
| **Low-stock SKUs** | যেসব product-এর stock কম (5-এর নিচে) |

> 📌 **Note:** এখন এই কার্ডগুলো placeholder দেখাতে পারে (৳0.00) — API wiring pending। Production launch-এর আগে real data আসবে।

**Dashboard-এর নিচে:**
- Sales-overview chart (দিন/week অনুযায়ী)
- Recent orders (সর্বশেষ 5-10 order)
- Pending actions list:
  - Returns awaiting action
  - Failed jobs / DLQ depth
  - Payment mismatches
  - Unreconciled courier settlements

---

## ৩. Sidebar map

Login করার পর বাম দিকের sidebar-এ modules দেখবেন। আপনার role-অনুযায়ী সব দেখা যাবে না — যেগুলো দেখা যাবে সেগুলোই আপনার কাজের scope।

### 3.1 Commerce section

| Menu | কী করে |
|---|---|
| **Orders** | সব order-এর list, filter, search |
| **Catalog** | Products, categories, attributes |
| **Categories** | Category tree |
| **Products** | Product + variants add/edit |
| **Inventory** | Stock grid (branch-wise) |
| **Promotions** | Coupons, auto-discounts |
| **Flash sales** | Time-boxed deals |
| **CMS** | Homepage section builder |
| **Customers** | Customer 360 view |
| **Returns** | RMA queue |
| **Reviews** | Moderation |
| **Notifications** | Templates + log |

### 3.2 ERP section

| Menu | কী করে |
|---|---|
| **POS** | Physical store sale |
| **Sessions** | Cash drawer control |
| **Purchases** | Requisition → PO → GRN |
| **Suppliers** | Vendor profiles + payables |
| **Accounting** | Ledger, income/expense, reports |
| **HR** | Employees, attendance, payroll |

### 3.3 Insights

| Menu | কী করে |
|---|---|
| **Reports** | Built-in business reports |
| **Analytics** | Traffic + funnel |
| **Delivery** | Courier dispatch queue |

### 3.4 Settings

| Menu | কে access পাবে |
|---|---|
| **Profile** | সবাই (নিজের profile) |
| **Users** | Super admin |
| **Roles** | Super admin |
| **Audit log** | Super admin, Finance |
| **Delivery** | Super admin |
| **Checkout** | Super admin |

---

## ৪. Common tasks

### 4.1 Logout
উপরে ডানদিকে profile avatar → **Sign out**

### 4.2 Language switch
UI বাংলা default + English mixed। সব label ইংরেজিতে দেখতে চাইলে browser locale পরিবর্তন করুন।

### 4.3 Help / Support
কোনো issue হলে super admin-কে জানান। প্রতিটা action audit log-এ যায় — `Settings → Audit log`-এ নিজের activity দেখা যায়।

---

## ৫. Common errors

| Error | কারণ | Fix |
|---|---|---|
| "Invalid credentials" | ভুল phone/password | Password reset করুন (admin-কে বলুন) |
| "TOTP code invalid" | Code expired (30s window) | নতুন code দিন |
| "Session expired" | 30 মিনিট inactive | আবার login করুন |
| "Permission denied" | Role-এ সেই module নেই | Super admin-কে বলুন role update করতে |
| Dashboard blank | API down বা internet issue | Page refresh করুন, না হলে dev team-কে জানান |

---

## ৬. Safety reminder

- ✅ সবসময় নিজের device থেকে login করুন
- ✅ Session শেষ হলে logout করুন
- ❌ shared computer-এ "remember me" use করবেন না
- ❌ Screenshot-এ customer data share করবেন না
- ❌ Password / TOTP কোথাও লিখে রাখবেন না (backup secret ছাড়া)

---

## ৭. Next guide

- Catalog Manager হলে → `02-catalog-and-inventory.md`
- Order / Support হলে → `03-orders-and-fulfillment.md`
- Marketing হলে → `04-promotions-and-cms.md`
- POS / Store Staff হলে → `05-pos-operations.md`
- Purchase Manager হলে → `06-purchase-and-suppliers.md`
- HR Manager হলে → `07-hr-attendance-payroll.md`
- Finance Manager হলে → `08-accounting-and-reports.md`
