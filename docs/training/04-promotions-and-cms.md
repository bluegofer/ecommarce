# Training 04 — Promotions & CMS

**Audience:** Marketing Manager (MARKETING_MANAGER)
**Prerequisites:** `01-login-and-dashboard.md`
**Estimated time:** 15 min
**Sidebar location:** Promotions · Flash sales · CMS

---

## ১. Coupon system বোঝা

**Coupon** = customer code দিয়ে discount।

**Type:**
- **Percentage:** 10% off
- **Fixed amount:** ৳100 off
- **Free shipping:** delivery charge ৳0

**Rule options:**
- Minimum order value (e.g., ৳1000+)
- Usage limit (total + per customer)
- Validity window
- Applicable categories/products/brands
- First-order-only (নতুন customer-দের জন্য)
- Customer segments

---

## ২. নতুন coupon বানানো

1. Sidebar → **Promotions → Coupons**
2. **Create coupon** ক্লিক
3. Form:
   - **Code:** `EID25` (customer এটা দিবে)
   - **Type:** Percentage
   - **Value:** `10` (মানে 10%)
   - **Min order:** `1000` (৳)
   - **Max uses total:** `500`
   - **Max uses per customer:** `1`
   - **Validity:** Start date → End date
   - **Applicable to:** All products / Specific category (e.g., Fashion)
   - **First order only:** Yes/No
   - **Combinable:** No (default)
4. **Save**

**Dashboard-এ দেখবেন:**
- Total redemptions
- Revenue driven
- Discount cost (how much you paid in discounts)

---

## ৩. Automatic discount (code ছাড়া)

**কখন use:** সবসময় চলবে এমন offer (e.g., "Beauty category-তে 5% off this week")।

1. Promotions → **Auto-discounts**
2. **Create** → Same fields, কিন্তু **code নেই**
3. Category-wide / brand-wide select

---

## ৪. Flash sale

**কেন:** Time-boxed deal (e.g., 6 ঘণ্টার for "Flash Deal")।

1. Sidebar → **Promotions → Flash sales**
2. **Create flash sale:**
   - **Name:** `Eid Flash Sale`
   - **Schedule:** Start date-time → End date-time
   - **Products:** specific variants select
   - **Discount:** % off (per product)
   - **Sold cap:** maximum কত unit বেচবেন
3. Save → সিস্টেম auto:
   - Schedule time-এ sale শুরু
   - End time-এ বন্ধ
   - Stock cap hit হলে stop

**Storefront-এ দেখাবে:** countdown timer + "% claimed" bar।

---

## ৫. CMS — Homepage builder

Storefront-এর homepage সব section admin-এ controllable।

1. Sidebar → **CMS**
2. Section list দেখবেন। প্রতিটা section:
   - **Reorder** (উপরের ↑ ↓ অথবা drag)
   - **Toggle visibility** (eye icon)
   - **Schedule** (start/end date)
   - **Edit content**
   - **Delete**

**Section types:**
| Type | কী দেখায় |
|---|---|
| HERO_CAROUSEL | বড় ছবি slideshow |
| QUICK_TILES | 4টা category টাইল |
| DEAL_STRIP | Flash sale countdown strip |
| CAROUSEL | Today's Deals / Best Sellers |
| PROMO_TILES | 2×2 promo banners |
| WIDE_BANNER | Wide campaign banner |
| RECOMMENDED | "Recommended for you" grid |
| SEO_TEXT | নিচে collapsible SEO text |

**Example workflow:**
1. Eid campaign-এর জন্য **HERO_CAROUSEL** edit → নতুন ছবি upload → start date: 25 Ramadan, end date: 5 Shawwal
2. Start time-এ auto appear, end time-এ auto disappear

---

## ৬. CMS — Static pages

**কেন:** About Us, Contact Us, FAQ, Privacy Policy, Terms

1. Sidebar → **CMS → Pages**
2. **Add page:**
   - **Slug:** `about-us`
   - **Title EN/BN**
   - **Body EN/BN** (rich text — bold, italic, list, link)
   - **Status:** DRAFT / PUBLISHED
   - **SEO meta title/description**
3. Save → Storefront-এ `https://nolimitshopping.com/bn/pages/about-us`-এ live

**Revision history:** প্রতিটা edit-এ নতুন revision save হয় → **Restore** দিয়ে আগের version ফেরানো যায়।

---

## ৭. CMS — Menus

Header ও footer menu:

1. Sidebar → **CMS → Menus** (অথবা similar)
2. **Header menu:** items যোগ করুন
   - Home (`/`)
   - Shop (`/c`)
   - Deals (`/deals`)
   - About (`/pages/about-us`)
   - Contact (`/pages/contact-us`)
3. প্রতিটা item: **Label EN, Label BN, URL, Sort order**
4. Parent-child support (e.g., Shop → Fashion, Shop → Electronics)
5. Save

Storefront-এ auto render হবে।

---

## ৮. Announcement bar / Popup

**Announcement bar:** Page-এর top-এ একটা thin bar (e.g., "Free delivery over ৳1500 this Eid")

1. CMS → **Announcements**
2. Add:
   - **Text EN/BN**
   - **Link** (optional)
   - **Dismissible:** Yes/No
   - **Schedule**

**Popup:** Modal popup (e.g., "Subscribe and get 5% off")

1. CMS → **Popups**
2. Same fields + display frequency (once per session, once per day)

---

## ৯. Media library

সব ছবি এক central repository-তে।

1. Sidebar → **CMS → Media**
2. **Upload** অথবা **Browse** existing
3. Reuse across product, banner, page

**Image optimization:** Upload করলে auto WebP convert + multiple sizes।

---

## ১০. Contact form inbox

Customer contact form submission এখানে জমা হবে:

1. CMS → **Contact Messages** (বা **CMS → Inbox**)
2. List → click → reply → mark resolved

---

## ১১. Common errors

| Error | কারণ | Fix |
|---|---|---|
| Coupon code "not applicable" | min order hit হয়নি | min value কমান |
| Flash sale stock "already claimed" | cap hit | নতুন cap set করুন |
| CMS page slug conflict | same slug exists | slug-এ `-2` লাগান |
| Banner image blurry | size কম | larger image upload |
| Menu reorder save হয় না | drag sort bug | arrow button use করুন |

---

## ১২. Best practices

- **Coupon code readable রাখুন** — `EID25` (not `XK8Z2Q`)
- **Always set expiry** — indefinite coupon confusion ফেলে
- **Flash sale 6-12h preferable** — longer হলে urgency কমে
- **CMS preview** selalu deploy-এর আগে
- **Customer segment tight রাখুন** — over-discounting from too-broad rules

---

## ১৩. Next guide

→ `05-pos-operations.md`