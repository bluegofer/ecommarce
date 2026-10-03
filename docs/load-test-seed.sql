-- Step 15.10 load-test seed (record copy)
-- Used on staging before k6 tests (2026-09-20).
-- Idempotent — safe to re-run to reset test data.

BEGIN;

DELETE FROM "variants" WHERE id IN ('aaaaaaaa-3333-3333-3333-333333333333', 'aaaaaaaa-5555-5555-5555-555555555555');
DELETE FROM "products" WHERE id IN ('aaaaaaaa-2222-2222-2222-222222222222', 'aaaaaaaa-4444-4444-4444-444444444444');
DELETE FROM "categories" WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111';

INSERT INTO "categories" ("id", "nameEn", "nameBn", "slug", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'Load Test Category', 'লোড টেস্ট ক্যাটাগরি', 'load-test-category', 999, true, NOW(), NOW());

INSERT INTO "products" ("id", "categoryId", "slug", "titleEn", "titleBn", "descriptionEn", "descriptionBn", "status", "publishedAt", "createdAt", "updatedAt")
VALUES ('aaaaaaaa-2222-2222-2222-222222222222', 'aaaaaaaa-1111-1111-1111-111111111111', 'load-test-product-a', 'Load Test Product A', 'লোড টেস্ট পণ্য A', 'For load testing', 'লোড টেস্টের জন্য', 'PUBLISHED', NOW(), NOW(), NOW());

INSERT INTO "variants" ("id", "productId", "sku", "pricePoisha", "compareAtPoisha", "stock", "lowStockThreshold", "attributeValues", "isActive", "createdAt", "updatedAt")
VALUES ('aaaaaaaa-3333-3333-3333-333333333333', 'aaaaaaaa-2222-2222-2222-222222222222', 'LOAD-TEST-A1', 100000, 150000, 100, 5, '{"option":"A"}'::jsonb, true, NOW(), NOW());

INSERT INTO "products" ("id", "categoryId", "slug", "titleEn", "titleBn", "descriptionEn", "descriptionBn", "status", "publishedAt", "createdAt", "updatedAt")
VALUES ('aaaaaaaa-4444-4444-4444-444444444444', 'aaaaaaaa-1111-1111-1111-111111111111', 'flash-sale-product', 'Flash Sale Product', 'ফ্ল্যাশ সেল পণ্য', 'Flash sale oversell test', 'ফ্ল্যাশ সেল টেস্ট', 'PUBLISHED', NOW(), NOW(), NOW());

INSERT INTO "variants" ("id", "productId", "sku", "pricePoisha", "compareAtPoisha", "stock", "lowStockThreshold", "attributeValues", "isActive", "createdAt", "updatedAt")
VALUES ('aaaaaaaa-5555-5555-5555-555555555555', 'aaaaaaaa-4444-4444-4444-444444444444', 'FLASH-SALE-5UNITS', 50000, 100000, 5, 5, '{"option":"A"}'::jsonb, true, NOW(), NOW());

COMMIT;