-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('ORDER', 'CATEGORY', 'PRODUCT', 'BRAND');

-- CreateEnum
CREATE TYPE "CmsPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CmsMenuLocation" AS ENUM ('HEADER', 'FOOTER', 'MOBILE');

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM');

-- DropIndex
DROP INDEX "categories_slug_trgm_idx";

-- DropIndex
DROP INDEX "products_brand_trgm_idx";

-- DropIndex
DROP INDEX "products_title_bn_trgm_idx";

-- DropIndex
DROP INDEX "products_title_en_trgm_idx";

-- DropIndex
DROP INDEX "variants_sku_trgm_idx";

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "valuePercent" INTEGER,
    "valuePoisha" INTEGER,
    "minOrderPoisha" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountPoisha" INTEGER,
    "totalUsageLimit" INTEGER,
    "perCustomerLimit" INTEGER,
    "timesRedeemed" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "combinable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "descriptionEn" TEXT,
    "descriptionBn" TEXT,
    "rulesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "discountPoisha" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automatic_discounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "scope" "DiscountScope" NOT NULL DEFAULT 'ORDER',
    "valuePercent" INTEGER,
    "valuePoisha" INTEGER,
    "minOrderPoisha" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountPoisha" INTEGER,
    "scopeJson" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automatic_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sale_items" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "dealPricePoisha" INTEGER NOT NULL,
    "capQuantity" INTEGER,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxPerCustomer" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "bodyEn" TEXT,
    "bodyBn" TEXT,
    "status" "CmsPageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_page_revisions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "bodyEn" TEXT,
    "bodyBn" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_page_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_sections" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleBn" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_menus" (
    "id" TEXT NOT NULL,
    "location" "CmsMenuLocation" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_menu_items" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "parentId" TEXT,
    "labelEn" TEXT NOT NULL,
    "labelBn" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cms_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textBn" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL DEFAULT '#164561',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "linkUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popups" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "bodyEn" TEXT,
    "bodyBn" TEXT,
    "imageUrl" TEXT,
    "ctaLabelEn" TEXT,
    "ctaLabelBn" TEXT,
    "ctaUrl" TEXT,
    "dismissRule" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_library" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "orderNo" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "replyBody" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_isActive_validFrom_validUntil_idx" ON "coupons"("isActive", "validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_idx" ON "coupon_redemptions"("couponId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_userId_idx" ON "coupon_redemptions"("userId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_orderId_idx" ON "coupon_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "automatic_discounts_isActive_validFrom_validUntil_idx" ON "automatic_discounts"("isActive", "validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "flash_sales_isActive_startsAt_endsAt_idx" ON "flash_sales"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "flash_sale_items_flashSaleId_idx" ON "flash_sale_items"("flashSaleId");

-- CreateIndex
CREATE INDEX "flash_sale_items_variantId_idx" ON "flash_sale_items"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "flash_sale_items_flashSaleId_variantId_key" ON "flash_sale_items"("flashSaleId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "cms_pages_slug_idx" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "cms_pages_status_idx" ON "cms_pages"("status");

-- CreateIndex
CREATE INDEX "cms_page_revisions_pageId_idx" ON "cms_page_revisions"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "cms_page_revisions_pageId_revisionNumber_key" ON "cms_page_revisions"("pageId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cms_sections_key_key" ON "cms_sections"("key");

-- CreateIndex
CREATE INDEX "cms_sections_position_idx" ON "cms_sections"("position");

-- CreateIndex
CREATE UNIQUE INDEX "cms_menus_location_key" ON "cms_menus"("location");

-- CreateIndex
CREATE INDEX "cms_menu_items_menuId_sortOrder_idx" ON "cms_menu_items"("menuId", "sortOrder");

-- CreateIndex
CREATE INDEX "cms_menu_items_parentId_idx" ON "cms_menu_items"("parentId");

-- CreateIndex
CREATE INDEX "announcements_isActive_startsAt_endsAt_idx" ON "announcements"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "popups_isActive_startsAt_endsAt_idx" ON "popups"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "media_library_filename_idx" ON "media_library"("filename");

-- CreateIndex
CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sale_items" ADD CONSTRAINT "flash_sale_items_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "flash_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_page_revisions" ADD CONSTRAINT "cms_page_revisions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "cms_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_menu_items" ADD CONSTRAINT "cms_menu_items_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "cms_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_menu_items" ADD CONSTRAINT "cms_menu_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "cms_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
