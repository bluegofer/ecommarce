# BlueGofer — Admin Suite Design Mockup

**Static HTML / CSS / Vanilla JS — TDD v2.0 + Appendix A (12 Sep 2026)**
**Brand: BlueGofer · Primary: SkyBlue · Admin-only (storefront built separately)**

---

## 🇧🇩 কিভাবে ব্যবহার করবেন

### 1️⃣ ফোল্ডারটি ওপেন করুন
- পুরো `bluegofer_admin` ফোল্ডারটি আনজিপ করুন।
- যেকোনো একটি অপশন দিয়ে ওপেন করতে পারেন:
  - **`index.html`** ফাইলটি ডাবল-ক্লিক করুন (Chrome / Edge / Firefox এ)।
  - অথবা VS Code-এ "Live Server" extension দিয়ে ওপেন করুন।
  - অথবা terminal এ `python3 -m http.server` চালিয়ে `http://localhost:8000` এ যান।

### 2️⃣ কী কী পাবেন (Admin Suite only)
| ফোল্ডার | কন্টেন্ট | মডিউল |
|---|---|---|
| `/index.html` | Admin ল্যান্ডিং — সব admin পেজের লিংক | পুরো মডিউল index |
| `/admin/login.html` | 2FA সহ sign-in | System |
| `/admin/dashboard.html` | Real-time control room | Overview |
| `/admin/products.html` | Products list + new-product modal | Catalog |
| `/admin/categories.html` | Infinite tree + attributes + SEO | Catalog |
| `/admin/inventory.html` | Quick stock editor + adjustments + multi-branch A.3 | Catalog |
| `/admin/orders.html` | OMS state-machine + Verify(A.1) + Exchange(A.1) | Sales |
| `/admin/delivery.html` | Courier adapters + in-house rider + COD reconciliation A.4 | Sales |
| `/admin/payments.html` | Multi-gateway ledger + refunds | Sales |
| `/admin/customers.html` | CRM + CLV + segments + follow-ups A.3 | Customer |
| `/admin/returns.html` | RMA + tickets + call/chat history A.3 | Customer |
| `/admin/reviews.html` | Moderation queue | Customer |
| `/admin/promotions.html` | Coupons + flash sale timeline + referral A.3 | Marketing |
| `/admin/cms.html` | Homepage builder + pages + popup | Marketing |
| `/admin/notifications.html` | SMS / Email templates + automation | Marketing |
| `/admin/pos.html` | POS Terminal A.1 (barcode, multi-pay, drawer) | ERP Suite |
| `/admin/accounting.html` | GL + AR + AP + P&L A.2.2 | ERP Suite |
| `/admin/purchases.html` | PR → PO → GRN workflow A.2.3 | ERP Suite |
| `/admin/suppliers.html` | Vendor performance A.2.4 | ERP Suite |
| `/admin/hr.html` | Employees + RBAC linkage A.2.5 | ERP Suite |
| `/admin/attendance.html` | Present/Absent/Late/OT A.2.6 | ERP Suite |
| `/admin/payroll.html` | Auto-post payroll A.2.7 | ERP Suite |
| `/admin/users.html` | RBAC + 2FA + audit | System |
| `/admin/analytics.html` | BI: Gross/Net profit, branch+employee perf A.3 | Insights |

### 3️⃣ ডেভেলপারকে কী হ্যান্ড-ওভার করবেন
- পুরো `bluegofer_admin` ফোল্ডারই।
- ব্যাকেন্ড ডেভেলপার — প্রতিটি admin পেজ দেখে API endpoint, data field, workflow বুঝবে।
- `assets/css/style.css` — একটাই CSS ফাইলে সবকিছু আছে, easily extend করার জন্য CSS variable দিয়ে তৈরি।
- **Storefront (home / category / product / cart / checkout / confirmation / account) আলাদাভাবে বানানো হবে** — এই প্যাকেজে শুধু admin suite আছে।

### 4️⃣ নোটস
- ❌ Python / ডেটাবেজ নেই — শুধু static mockup।
- ❌ Python অথবা .pyc ফাইল সব মুছে ফেলা হয়েছে।
- ❌ Storefront পেজ এই প্যাকেজে নেই (আলাদাভাবে develop হচ্ছে)।
- ✅ সব responsive (desktop / tablet / mobile)।
- ✅ Brand "BlueGofer" প্রতি header এ।
- ✅ Primary color: SkyBlue (#0284c7)।
- ✅ Vanilla JS দিয়ে: sidebar mobile-toggle, tabs, modals, toast, qty stepper, payment pick (POS)।

### 5️⃣ কী এখনো কাজ বাকি (আপস্ট্রিম)
- এইটা শুধু **visual mock**। Real product এ React/Next.js + Tailwind/Material + TypeScript এ port করতে হবে।
- API (NestJS + PostgreSQL + Redis) পরে ইমপ্লিমেন্ট হবে।
- ব্র্যান্ড নাম / রঙ পরে B2B ক্লায়ন্ট চাইলে সহজেই change করা যাবে।
