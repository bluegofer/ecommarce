# Training 05 — POS Operations

**Audience:** Store / POS Staff (STORE_POS_STAFF)
**Prerequisites:** `01-login-and-dashboard.md`
**Estimated time:** 10 min
**Sidebar location:** POS · Sessions · POS Returns

---

## ১. POS module কী

Physical shop-এ customer সরাসরি এসে কিনলে, POS module দিয়ে sale ring up করবেন — cash / card / MFS tender, receipt print, stock auto deduct।

**Real-time sync:**
- Storefront stock + POS stock **একই source** → কেউ oversell হবে না
- POS sale → website-এ stock কমে যাবে within seconds

---

## ২. Session open (দিনের শুরু)

প্রতিটা shift-এ session open করা লাগবে।

1. Sidebar → **POS → Sessions**
2. **Open session** ক্লিক
3. Modal:
   - **Register:** আপনার register select
   - **Opening balance:** কত টাকা cash drawer-এ রাখলেন (e.g., 5000 poisha)
4. Confirm

**Session open অবস্থায়:**
- Sale ring up করতে পারবেন
- Cash-in / Cash-out record করতে পারবেন
- Session close করে expected vs actual balance verify করবেন

---

## ৩. Sale ring up

1. Sidebar → **POS** → register screen
2. **Barcode scan:**
   - Cursor search box-এ থাকবে
   - Barcode scanner দিয়ে scan → item auto cart-এ যোগ হবে
   - Manual lookup: SKU / product name type → dropdown
3. **Cart:**
   - প্রতিটা line: product + qty + unit price + line total
   - Qty edit করা যায় (+/-)
   - **Remove** দিয়ে line delete
4. **Customer phone** (optional):
   - লিখলে customer-এর account-এ auto attach হবে
5. **Discount** (optional):
   - Coupon code অথবা manual amount
6. **Total** দেখবেন (subtotal + VAT - discount)
7. **Tender:**
   - **Cash** → কত টাকা পেলেন লিখুন → change compute
   - **Card** → POS terminal-এ swipe + confirm
   - **MFS** (bKash/Nagad/Rocket) → customer-এর app-এ send money + reference
8. **Complete sale** ক্লিক করুন

**Receipt print:** Auto print হবে / manual print button

**Stock:** auto deduct + audit log entry

---

## ৪. Sale return

Customer ফেরত দিলে:

1. Sidebar → **POS → Returns** (অথবা main POS screen-এ **Return** mode)
2. **Find original sale:**
   - Receipt number input
   - অথবা search by customer phone / date
3. **Items select** — কত return আসছে
4. **Reason:**
   - Wrong product
   - Defective
   - Customer changed mind
   - Other (note লিখুন)
5. **Refund method:**
   - Cash
   - Original payment method (Card reversal / MFS return)
   - Store credit (future purchase-এর জন্য)
6. **Confirm return**

**Stock auto restock** হবে (reason code `POS_RETURN`)।

---

## ৫. Exchange

Customer এক জিনিস ফেরত দিয়ে আরেকটা নিতে চাইলে:

1. Sale return mode-এ original receipt খুঁজুন
2. **Exchange** button (Return-এর পাশে)
3. Old item select → New item select
4. Price difference compute হবে:
   - New বেশি হলে → customer pay
   - New কম হলে → customer refund
5. Tender difference → Complete

---

## ৬. Cash drawer management

### ৬.১ Cash-in (mid-shift)

Drawer-এ extra cash দিলে (change এর জন্য):

1. POS → Sessions → আপনার active session
2. **Cash-in** button
3. Amount + reason
4. Confirm

### ৬.২ Cash-out (mid-shift)

Drawer থেকে টাকা নিলে (e.g., bank deposit):

1. **Cash-out** button
2. Amount + reason (e.g., "Bank deposit")
3. Confirm

### ৬.৩ Session close (দিনের শেষ)

1. POS → Sessions → **Close session**
2. Modal:
   - **Expected balance:** সিস্টেম auto compute করবে (opening + cash sales + cash-in - cash-out)
   - **Counted balance:** আপনি drawer-এ count করে number লিখুন
   - **Variance:** auto compute (counted - expected)
3. **যদি variance < threshold:** Confirm close
4. **যদি variance > threshold:** Manager approval লাগবে — manager-কে call করুন
5. Receipt print → drawer-এ টাকা bank deposit

---

## ৭. Reports (staff-এর view)

- **Daily sales report:** আজ কত বেচলেন, কত cash, card, MFS
- **Session report:** opening vs closing
- **Top products:** today-এর best sellers

**Access:** POS → Reports (role-এ থাকলে)

---

## ৮. Common errors

| Error | কারণ | Fix |
|---|---|---|
| "Barcode not found" | SKU/variant inactive | Catalog-এ check করুন |
| "Insufficient stock" | এই branch-এ stock নেই | অন্য branch-এ transfer / new restock |
| "Session required" | Session open করা হয়নি | Sessions → Open |
| "Variance approval required" | Drawer count mismatch | Manager-কে call |
| Receipt not printing | Printer connection | USB/network check |

---

## ৯. Best practices

- **প্রতিটা shift শুরুতে** session open করুন
- **প্রতিটা sale-এ customer phone** নিন (loyalty tracking)
- **Cash drawer** প্রতি 4 ঘণ্টায় count করুন
- **High-value return** (৳5000+)-এ manager-কে জানান
- **Day end:** session close + receipt print + bank deposit

---

## ১০. Next guide

→ `06-purchase-and-suppliers.md`