// apps/api/src/modules/catalog/import-export/import-export.service.ts
// Minimal CSV import/export for products + variants with per-row errors.
// Format (header required, comma-separated, quotes allowed):
//   product_slug,title_en,title_bn,category_slug,brand,status,
//   variant_sku,price_poisha,compare_at_poisha,stock,color,size
//   one row = one variant; multiple rows with the same product_slug share the product.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { CsvImportErrorDto, CsvImportResultDto } from '@ecommarce/types';

interface ParsedRow {
  product_slug: string;
  title_en: string;
  title_bn: string;
  category_slug: string;
  brand: string;
  status: string;
  variant_sku: string;
  price_poisha: string;
  compare_at_poisha: string;
  stock: string;
  color: string;
  size: string;
}

const REQUIRED_HEADERS = [
  'product_slug',
  'title_en',
  'title_bn',
  'category_slug',
  'variant_sku',
  'price_poisha',
  'stock',
];

@Injectable()
export class ImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse a CSV string into rows. Handles quoted fields and CRLF/LF.
   * Not a full RFC-4180 parser — enough for our own export round-trip and
   * hand-authored sheets without exotic escaping.
   */
  parseCsv(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0);
    if (lines.length === 0) throw new BadRequestException('empty csv');
    const headers = this.splitCsvLine(lines[0]).map((h) => h.trim());
    const rows = lines.slice(1).map((l) => this.splitCsvLine(l));
    return { headers, rows };
  }

  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    out.push(cur);
    return out;
  }

  async importProductsCsv(text: string): Promise<CsvImportResultDto> {
    const { headers, rows } = this.parseCsv(text);
    for (const req of REQUIRED_HEADERS) {
      if (!headers.includes(req)) {
        throw new BadRequestException(`missing required header: ${req}`);
      }
    }

    const idx = (name: string) => headers.indexOf(name);
    const errors: CsvImportErrorDto[] = [];

    let importedProducts = 0;
    let importedVariants = 0;
    let failedRows = 0;

    const productCache = new Map<string, string>(); // slug -> productId

    for (let i = 0; i < rows.length; i += 1) {
      const rowNum = i + 2; // 1-based, +1 for header
      const cells = rows[i];
      const get = (name: string): string => (cells[idx(name)] ?? '').trim();

      const row: ParsedRow = {
        product_slug: get('product_slug'),
        title_en: get('title_en'),
        title_bn: get('title_bn'),
        category_slug: get('category_slug'),
        brand: get('brand'),
        status: get('status') || 'PUBLISHED',
        variant_sku: get('variant_sku'),
        price_poisha: get('price_poisha'),
        compare_at_poisha: get('compare_at_poisha'),
        stock: get('stock'),
        color: get('color'),
        size: get('size'),
      };

      // --- validate required cells ---
      if (!row.product_slug) {
        errors.push({ row: rowNum, field: 'product_slug', message: 'required' });
        failedRows += 1;
        continue;
      }
      if (!row.variant_sku) {
        errors.push({ row: rowNum, field: 'variant_sku', message: 'required' });
        failedRows += 1;
        continue;
      }
      const price = Number(row.price_poisha);
      if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) {
        errors.push({
          row: rowNum,
          field: 'price_poisha',
          message: 'must be a non-negative integer (poisha)',
        });
        failedRows += 1;
        continue;
      }
      const stock = Number(row.stock);
      if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
        errors.push({
          row: rowNum,
          field: 'stock',
          message: 'must be a non-negative integer',
        });
        failedRows += 1;
        continue;
      }

      // --- category lookup ---
      const category = await this.prisma.category.findUnique({
        where: { slug: row.category_slug },
      });
      if (!category) {
        errors.push({
          row: rowNum,
          field: 'category_slug',
          message: `category not found: ${row.category_slug}`,
        });
        failedRows += 1;
        continue;
      }

      // --- product upsert (once per slug) ---
      let productId = productCache.get(row.product_slug);
      if (!productId) {
        const existing = await this.prisma.product.findUnique({
          where: { slug: row.product_slug },
        });
        if (existing) {
          productId = existing.id;
        } else {
          const status = row.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
          const created = await this.prisma.product.create({
            data: {
              categoryId: category.id,
              slug: row.product_slug,
              titleEn: row.title_en || row.product_slug,
              titleBn: row.title_bn || row.title_en || row.product_slug,
              brand: row.brand || null,
              status,
              publishedAt: status === 'PUBLISHED' ? new Date() : null,
            },
          });
          productId = created.id;
          importedProducts += 1;
        }
        productCache.set(row.product_slug, productId);
      }

      // --- variant upsert (by sku) ---
      const attributeValues: Record<string, string> = {};
      if (row.color) attributeValues.color = row.color;
      if (row.size) attributeValues.size = row.size;

      const compareAt = row.compare_at_poisha ? Number(row.compare_at_poisha) : null;

      const existingVariant = await this.prisma.variant.findUnique({
        where: { sku: row.variant_sku },
      });
      if (existingVariant) {
        if (existingVariant.productId !== productId) {
          errors.push({
            row: rowNum,
            field: 'variant_sku',
            message: `sku ${row.variant_sku} already belongs to another product`,
          });
          failedRows += 1;
          continue;
        }
        await this.prisma.variant.update({
          where: { id: existingVariant.id },
          data: {
            pricePoisha: price,
            compareAtPoisha: compareAt,
            stock,
            attributeValues: attributeValues as unknown as object,
          },
        });
        importedVariants += 1;
      } else {
        await this.prisma.variant.create({
          data: {
            productId,
            sku: row.variant_sku,
            pricePoisha: price,
            compareAtPoisha: compareAt,
            stock,
            attributeValues: attributeValues as unknown as object,
          },
        });
        importedVariants += 1;
      }
    }

    return {
      totalRows: rows.length,
      importedProducts,
      importedVariants,
      failedRows,
      errors,
    };
  }

  /**
   * Export all active products+variants as CSV (round-trippable with import).
   */
  async exportProductsCsv(): Promise<string> {
    const variants = await this.prisma.variant.findMany({
      where: { isActive: true },
      include: { product: { include: { category: true } } },
      orderBy: [{ productId: 'asc' }, { sku: 'asc' }],
    });

    const header = [
      'product_slug',
      'title_en',
      'title_bn',
      'category_slug',
      'brand',
      'status',
      'variant_sku',
      'price_poisha',
      'compare_at_poisha',
      'stock',
      'color',
      'size',
    ].join(',');

    const lines = variants.map((v) => {
      const av = (v.attributeValues as Record<string, string>) ?? {};
      const esc = (s: string | null | undefined) =>
        `"${(s ?? '').toString().replace(/"/g, '""')}"`;
      return [
        esc(v.product.slug),
        esc(v.product.titleEn),
        esc(v.product.titleBn),
        esc(v.product.category.slug),
        esc(v.product.brand),
        esc(v.product.status),
        esc(v.sku),
        String(v.pricePoisha),
        v.compareAtPoisha === null ? '' : String(v.compareAtPoisha),
        String(v.stock),
        esc(av.color ?? ''),
        esc(av.size ?? ''),
      ].join(',');
    });

    return [header, ...lines].join('\n');
  }
}