-- Step 3: pg_trgm + full-text search indexes (no generated columns)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS products_title_en_trgm_idx
  ON products USING gin ("titleEn" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_title_bn_trgm_idx
  ON products USING gin ("titleBn" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_brand_trgm_idx
  ON products USING gin (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS categories_slug_trgm_idx
  ON categories USING gin (slug gin_trgm_ops);

CREATE INDEX IF NOT EXISTS variants_sku_trgm_idx
  ON variants USING gin (sku gin_trgm_ops);

-- Expression-based full-text index (no extra column → no Prisma drift)
CREATE INDEX IF NOT EXISTS products_search_idx
  ON products USING gin (
    (to_tsvector('simple',
      coalesce("titleEn", '') || ' ' ||
      coalesce("titleBn", '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce("descriptionEn", '')
    ))
  );