# Training 06 — Purchase & Suppliers

**Audience:** Purchase Manager (PURCHASE_MANAGER)
**Prerequisites:** `01-login-and-dashboard.md`, `02-catalog-and-inventory.md`
**Estimated time:** 15 min
**Sidebar location:** Suppliers · Purchases

---

## ১. Purchase workflow
Requisition → Purchase Order (PO) → GRN (Goods Received) → Supplier Invoice → Payment

প্রতিটা step-এ data flow:
- **Requisition:** "আমাদের X product দরকার"
- **PO:** Supplier-কে অর্ডার
- **GRN:** মাল হাতে পেলে stock-এ যোগ
- **Invoice:** Supplier-এর bill
- **Payment:** টাকা দেওয়া

**Auto-posting:**
- GRN confirm → stock + supplier payable + balanced journal entry (Inventory Dr / Supplier AP Cr)
- Payment → Supplier AP Dr / Cash-Bank-MFS Cr

---

## ২. Supplier add

1. Sidebar → **Suppliers**
2. **Add supplier:**
   - **Code:** `SUP-001`
   - **Name:** ABC Traders
   - **Contact person, phone, email**
   - **Address**
   - **Payment terms:** Net 15 (১৫ দিনে payment)
   - **Opening balance:** (পুরনো due থাকলে)
3. Save

**Dashboard-এ দেখবেন:**
- Current payable
- Payment history
- Performance (delivery timeliness, fulfilment %)

---

## ৩. Requisition তৈরি

1. Purchases → **Requisitions** → **New**
2. Items:
   - Product (variant) select
   - Quantity
   - Expected cost
   - Needed by date
3. Save → status `DRAFT`
4. Approve হলে → `APPROVED`

---

## ৪. Purchase Order (PO)

Approved requisition → PO-তে convert।

1. Purchases → **Orders** → **New** (অথবা requisition → **Convert to PO**)
2. Supplier select
3. Items (variant, qty, unit price)
4. **Delivery date promised**
5. **Payment terms** (default from supplier)
6. Save → PO number (`PO-2026-0001`)

**Print PO:** Supplier-কে PDF/email পাঠান।

---

## ৫. GRN — Goods Received Note

মাল হাতে পেলে:

1. Purchases → **Receiving** → **New GRN**
2. PO select
3. প্রতিটা line:
   - **Ordered qty**
   - **Received qty** (সব না এলে partial)
   - **Unit cost** confirm
   - **Batch/expiry** (grocery হলে)
   - **Damaged qty** (যদি থাকে)
4. **Confirm GRN**

**Auto effects:**
- Stock increment (variant.stock += received qty)
- Supplier payable increment (invoice amount)
- Journal entry: Inventory Dr / Supplier AP Cr

**Partial receive:** প্রথম GRN-এ partial → status `PARTIAL` → বাকি এলে দ্বিতীয় GRN।

---

## ৬. Supplier invoice

Some suppliers GRN-এর পরে separate invoice পাঠায়:

1. Purchases → **Invoices** → **New**
2. Supplier + PO select
3. Invoice number + date + amount
4. Save → payable-এ যোগ

---

## ৭. Supplier payment

Due payment করতে:

1. Suppliers → supplier select → **Record payment**
2. Modal:
   - **Amount:** (partial / full)
   - **Method:** Cash / Bank / MFS
   - **Reference:** cheque no / transaction ID
   - **Date**
3. **Confirm**

**Auto-posting:** Supplier AP Dr / Cash-Bank-MFS Cr

**Statement:** Supplier profile-এ full payment history।

---

## ৮. Payables dashboard

1. Sidebar → **Accounting → Payables**
2. Supplier-wise due list
3. Aging: <30, 30-60, 60-90, >90 days
4. **Export** to CSV for accountant

---

## ৯. Common errors

| Error | কারণ | Fix |
|---|---|---|
| "PO cannot be modified" | GRN already created | New PO |
| "Received qty > ordered" | typo | Correct করে re-enter |
| "Payable exceeds invoice" | overpayment | Payment adjust |
| Supplier not found | profile নেই | আগে supplier add |

---

## ১০. Best practices

- **Requisition always first** — direct PO chaos তৈরি করে
- **GRN same-day** — মাল হাতে পেলে সাথে সাথে
- **Partial receive** don't fear — partial GRN valid
- **Damaged item** GRN-এ mark করুন — supplier-কে claim করুন
- **Payment receipt** always save (scanned copy)

---

## ১১. Next guide

→ `07-hr-attendance-payroll.md`