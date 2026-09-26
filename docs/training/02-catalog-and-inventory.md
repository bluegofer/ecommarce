# Training 02 — Catalog & Inventory

**Audience:** Catalog Manager (CATALOG_MANAGER)
**Prerequisites:** `01-login-and-dashboard.md` সম্পূর্ণ
**Estimated time:** 15-20 min
**Sidebar location:** Catalog · Categories · Products · Inventory

---

## ১. Category tree বোঝা

BlueGofer category-agnostic — যেকোনো business (Electronics, Fashion, Grocery) একই system-এ চলবে। Category tree বানিয়ে আপনি বলছেন "আমাদের কী কী product আছে"।

- **Top-level category** = বড় ভাগ (e.g., Electronics, Fashion)
- **Sub-category** = ভিতরের ভাগ (e.g., Electronics → Mobiles → Smartphones)
- **Attributes** = প্রতিটা category-র জন্য কোন কোন field লাগবে (e.g., Electronics: RAM, Storage, Warranty; Fashion: Size, Color, Material)

**Attributes আগে define করতে হয়, তারপর product-এ ব্যবহার হবে।**

---

## ২. নতুন category বানানো

1. Sidebar → **Categories**
2. উপরে **Add category** ক্লিক করুন
3. Form fill:
   - **Name (English):** `Electronics`
   - **Name (Bangla):** `ইলেকট্রনিক্স`
   - **Slug:** `electronics` (URL-এ যাবে)
   - **Parent:** (top-level হলে খালি রাখুন)
   - **Sort order:** `0` (কত আগে দেখাবে)
   - **Status:** `ACTIVE`
4. **Save**

**Sub-category বানাতে:** একই ভাবে Add category → Parent-এ উপরের category select করুন।

---

## ৩. Category-র জন্য Attributes

1. Sidebar → **Catalog → Attributes**
2. **Add attribute** ক্লিক করুন
3. Fill:
   - **Name EN:** `RAM`
   - **Name BN:** `র‍্যাম`
   - **Type:** `SELECT` (dropdown) / `TEXT` / `NUMBER`
   - **Options:** `4GB, 6GB, 8GB, 12GB` (comma-separated)
   - **Required:** Yes/No
4. Save
5. এখন **Categories → আপনার category-তে যান → Attributes tab → এই attribute attach করুন**

**Repeat:** প্রতিটা category-র জন্য দরকার মতো attribute বানান।

**Example:**
- Electronics: RAM, Storage, Warranty
- Fashion: Size, Color, Material
- Grocery: Weight, Expiry

---

## ৪. নতুন product বানানো

1. Sidebar → **Products**
2. **Add product** ক্লিক করুন
3. **Basic info:**
   - **Title EN:** `Samsung Galaxy A55`
   - **Title BN:** `স্যামসাং গ্যালাক্সি এ৫৫`
   - **Slug:** `samsung-galaxy-a55`
   - **Category:** `Electronics → Mobiles`
   - **Brand:** `Samsung`
   - **Description EN/BN:** বিস্তারিত বর্ণনা
4. **SEO fields** (optional but recommended):
   - Meta title
   - Meta description
5. **Attributes:** category-র prescribed attribute-গুলো fill করুন
6. **Media:** ছবি upload করুন (drag order করা যায়) — **প্রথম ছবিটাই thumbnail**
7. **Variants** (নিচে দেখুন)
8. **Status:** Draft রাখলে publish হবে না; Publish চাপলে সাথে সাথে live

### ৪.১ Variants (SKU) — সবচেয়ে গুরুত্বপূর্ণ

**Variant মানে:** একই product-এর different sellable version।

**Example:** Samsung Galaxy A55
- Variant 1: 8GB/128GB, Blue → ৳32,000
- Variant 2: 12GB/256GB, Black → ৳38,000

**কিভাবে বানাবেন:**
1. Product editor-এ **Variants** tab
2. **Generate matrix:** attribute combinations select করুন (RAM × Storage × Color)
3. সিস্টেম সব combination generate করবে
4. প্রতি combination-এ fill:
   - **SKU:** unique code (e.g., `SAM-A55-8-128-BLU`)
   - **Price (poisha):** ৳32,000 → `3200000` (backend-এ integer poisha)
   - **Compare-at price:** (optional — strikethrough দেখানোর জন্য)
   - **Stock:** initial quantity
   - **Barcode:** (optional)
   - **Images:** specific variant-এর ছবি
5. **Save**

> 💡 **Tip:** stock শেষ হলে variant deactivate করুন — product page-এ "Out of stock" দেখাবে।

---

## ৫. Stock adjust করা

**কখন adjust করবেন:**
- নতুন stock এসেছে → RESTOCK
- Product damage → DAMAGE
- Customer return → RETURN
- System correction → CORRECTION

**কিভাবে:**
1. Sidebar → **Inventory**
2. **Branch selector** (উপরে) → সঠিক branch select করুন
3. Search box-এ SKU বা product name লিখুন
4. Product খুঁজে **Adjust** বাটন ক্লিক করুন
5. Modal:
   - **Delta (+/-):** `+50` মানে ৫০ যোগ, `-3` মানে ৩ বাদ
   - **Reason:** RESTOCK / DAMAGE / RETURN / CORRECTION
   - **Note** (optional): বিস্তারিত
6. **Apply**

> ⚠️ ভুল delta দিলে stock ভুল হবে — দিলে আবার adjust করে correction দিন (audit log-এ সব থাকবে)

---

## ৬. Low-stock alerts

1. Sidebar → **Inventory → Low-stock**
2. যেসব SKU-র stock threshold (5) এর নিচে সেগুলো auto list হবে
3. Restock করুন অথবা inactive করুন

**Threshold পরিবর্তন:** product editor → variant-এর `lowStockThreshold` field।

---

## ৭. Branch-wise stock

আপনার business-এ multiple branch থাকলে:

1. **Inventory** → **Branch dropdown** (উপরে)
2. প্রতিটা branch-এর আলাদা stock দেখবেন
3. **Stock transfer** করতে: Sidebar → **Inventory → Transfers**
   - **From branch:** source
   - **To branch:** destination
   - **Variant + quantity:** কী কত
   - **Dispatch** → **Receive** (দুই step)

**Transfer থাকা অবস্থায় quantity "In Transit" দেখাবে।**

---

## ৮. Bulk import (CSV)

Bulk product add করতে:

1. Sidebar → **Catalog → Import**
2. **Download template** (example সহ)
3. Excel-এ ভরে save as `.csv` (UTF-8)
4. **Upload** → সিস্টেম line-by-line validate করবে
5. **Errors দেখাবে** (e.g., "row 5: slug duplicate") → fix করে আবার upload
6. Success হলে **Import** ক্লিক করুন

**Export করতে:** একই পেজে **Export** button।

---

## ৯. Common errors

| Error | কারণ | Fix |
|---|---|---|
| "slug exists" | একই slug অন্য product-এ | slug-এ `-2`, `-3` লাগান |
| "SKU already in use" | variant-এর SKU unique হতে হবে | নতুন SKU |
| "Attribute required" | category-র prescribed attribute missing | সব attribute fill করুন |
| Image upload fail | file 5MB এর বেশি | ছোট করুন / compress করুন |
| Bulk import line error | CSV format ভুল | template দেখে reformat করুন |

---

## ১০. Quick checklist

- [ ] Category tree plan করা
- [ ] প্রতিটা category-র attribute define
- [ ] Product add + variants generate
- [ ] Initial stock set
- [ ] SEO title + description
- [ ] Minimum 1 media image
- [ ] Publish / Draft decision
- [ ] Low-stock threshold set

---

## ১১. Next guide

→ `03-orders-and-fulfillment.md`