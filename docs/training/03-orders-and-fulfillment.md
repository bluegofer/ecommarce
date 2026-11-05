# Training 03 — Orders & Fulfillment

**Audience:** Order / Support Staff (ORDER_SUPPORT)
**Prerequisites:** `01-login-and-dashboard.md`
**Estimated time:** 15 min
**Sidebar location:** Orders · Delivery · Returns

---

## ১. Order lifecycle (state machine)

প্রতিটা order এই ধাপগুলোর মধ্য দিয়ে যায়:
PLACED → VERIFIED → PROCESSING → SHIPPED → DELIVERED
│
└→ CANCELLED (customer/staff)
└→ RETURN (delivered হলে)
└→ EXCHANGE (delivered হলে)

**আপনার কাজ:** order-কে PLACED থেকে DELIVERED পর্যন্ত নিয়ে যাওয়া — প্রতিটা step-এ customer-কে জানানো।

---

## ২. Daily work view — Order queue

1. Sidebar → **Orders**
2. **Filter panel:**
   - **Status:** PENDING / VERIFIED / PROCESSING / SHIPPED / DELIVERED / CANCELLED / RETURN / EXCHANGE
   - **Date range:** today / last 7 days / custom
   - **Payment:** PAID / PENDING / COD
   - **Courier:** Pathao / other
3. **Search bar:** order number, customer phone/email

---

## ৩. Order verify করা (Verification queue)

**কেন verify:** প্রতিটা নতুন order যাচাই করা দরকার — phone/address valid কিনা, stock আছে কিনা, payment situation।

1. **Orders → filter PENDING**
2. Order row ক্লিক করুন → detail page
3. দেখুন:
   - Customer info (phone, address)
   - Items (variant, qty, price)
   - Payment status
   - Total (subtotal + delivery + discount)
4. **যদি সব ঠিক:**
   - **Verify** button ক্লিক করুন → status `VERIFIED`
5. **যদি সমস্যা:**
   - Customer-কে phone করুন (address confirm)
   - **Cancel** button → reason লিখুন (`customer request`, `invalid address`, etc.)
   - Refund process (payment module)

**Bulk verify:** একই page-এ multiple order select → **Bulk verify** button।

---

## ৪. Processing stage

Verify হওয়ার পরে:

1. **Orders → filter VERIFIED**
2. Order ক্লিক → detail
3. **Packaging info** verify করুন
4. Invoice print: **Print invoice** button (PDF)
5. Packing slip: **Print packing slip**
6. Pack complete হলে → **Mark processing** → status `PROCESSING`

---

## ৫. Dispatch (Courier-এ দেওয়া)

1. Order → **Dispatch** button
2. Modal:
   - **Courier:** Pathao (default) / Steadfast / RedX / Manual
   - **Delivery address confirm**
   - **COD amount** (if applicable)
3. **Confirm dispatch**

**Automatic (Pathao live হলে):**
- সিস্টেম Pathao API-তে consignment create করবে
- Tracking number auto-order-এ save হবে
- Customer SMS/email যাবে

**Manual (API না হলে):**
- আপনি নিজে courier office-এ গিয়ে parcel দিবেন
- Tracking number manually order note-এ লিখুন
- Status manually update করবেন

**Status:** `SHIPPED`

---

## ৬. Manual delivery status update (A.4 mandate)

**কেন manual:** আমাদের setup-এ courier webhook auto-update করে, কিন্তু **staff-এর set করা status কখনো override হবে না**। Conflict হলে review flag।

1. Order detail → **Delivery status** section
2. Dropdown:
   - In Transit
   - Out for Delivery
   - Delivered
   - Failed
   - Returned
3. Select → **Update status**
4. Note দিন (optional)

**Customer tracking page:** স্বয়ংক্রিয়ভাবে নতুন status দেখাবে।

> ⚠️ **Best practice:** status update করার আগে customer-কে SMS/phone দিয়ে জানান।

---

## ৭. Rider assignment (in-house delivery)

নিজস্ব rider থাকলে:

1. Order → **Assign rider** button
2. Rider list থেকে select করুন
3. **Assign**
4. Rider-এর phone auto customer-কে SMS যাবে
5. Delivery হয়ে গেলে: **Mark delivered by rider**

---

## ৮. Returns / Exchanges

### ৮.১ Customer return request handle

1. Sidebar → **Returns**
2. Filter: **Requested**
3. Order ক্লিক → দেখুন:
   - Customer-এর reason + photo (সাধারণত)
   - Return window (7 days from delivery — D-14)
4. **Approve** অথবা **Reject:**
   - **Approve:** courier pickup create → item receive হলে **restock + refund**
   - **Reject:** reason লিখুন → customer notification যাবে

### ৮.২ Refund process

1. Return approved → status `APPROVED`
2. Item received → **Mark received**
3. **Refund** button:
   - **Full refund:** পুরো টাকা
   - **Partial refund:** কিছু অংশ (restocking fee, etc.)
   - **Method:** original payment method / cash / bank
4. **Confirm**

Backend-এ automatic ledger posting হবে (revenue reversal)।

### ৮.৩ Exchange process

1. Order detail → **Exchange** button
2. Modal:
   - **Old item:** যা ফেরত আসছে
   - **New item:** যা যাবে
   - **Price difference:** সিস্টেম auto compute করবে
3. Confirm → return + new sale compose হবে (single transaction)

---

## ৯. Notifications (auto)

সিস্টেম automatic পাঠায় (template-based):
- Order placed → SMS + email
- Order verified → SMS
- Shipped (tracking number সহ) → SMS + email
- Out for delivery → SMS
- Delivered → email
- Refund processed → email

**কোনো template off করতে:** Settings → Notifications → template toggle।

---

## ১০. Common errors

| Error | কারণ | Fix |
|---|---|---|
| "Insufficient stock" | variant stock শেষ | restock করুন অথবা cancel |
| "Payment gateway timeout" | gateway down | Order recoverable — retry link SMS যাবে |
| "Courier API error" | Pathao down | Manual dispatch-এ switch |
| "Invalid transition" | ভুল status step | Sequence follow করুন |
| Customer paid but no order | gateway webhook delay | 10 min অপেক্ষা; না হলে payment module check |

---

## ১১. Daily routine checklist

- [ ] সকালে: PENDING orders verify
- [ ] দুপুর: VERIFIED → PROCESSING → SHIPPED
- [ ] বিকেল: courier dispatch confirmation
- [ ] সারাদিন: customer inquiries handle
- [ ] শেষে: Returns queue check
- [ ] শেষে: status updates সব order-এ

---

## ১২. Next guide

→ `04-promotions-and-cms.md`