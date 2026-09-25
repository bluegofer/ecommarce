'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { PageHeader, useToast } from '@/components/ui';
import { useMutation, useQuery } from '@/lib/hooks';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface CategoryNode {
  id: string;
  nameEn: string;
  slug: string;
  children?: CategoryNode[];
}

interface SpecPair {
  key: string;
  value: string;
}

type ProductStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: `${'— '.repeat(depth)}${n.nameEn}` });
    if (n.children?.length) out.push(...flattenCategories(n.children, depth + 1));
  }
  return out;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

const inputCls =
  'w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none';

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();

  // Basic
  const [categoryId, setCategoryId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [brand, setBrand] = useState('');

  // Descriptions
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');

  // Bullets (multi-line)
  const [bulletsText, setBulletsText] = useState('');

  // Specs (key:value pairs)
  const [specs, setSpecs] = useState<SpecPair[]>([]);

  // Delivery + Video (NEW)
  const [deliveryTimeEn, setDeliveryTimeEn] = useState('');
  const [deliveryTimeBn, setDeliveryTimeBn] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Status
  const [status, setStatus] = useState<ProductStatus>('DRAFT');
  const [publishedAt, setPublishedAt] = useState('');

  // SEO
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Featured
  const [isFeatured, setIsFeatured] = useState(false);

  const { data: tree } = useQuery<CategoryNode[]>('/api/v1/categories/tree');
  const flat = useMemo(() => (tree ? flattenCategories(tree) : []), [tree]);

  // Auto-slug from titleEn (until user edits manually)
  useEffect(() => {
    if (!slugManuallyEdited && titleEn) {
      setSlug(slugify(titleEn));
    }
  }, [titleEn, slugManuallyEdited]);

  const createMutation = useMutation<Record<string, unknown>, { id: string }>(
    'post',
    '/api/v1/products',
  );

  // Specs handlers
  const addSpecRow = () => setSpecs((s) => [...s, { key: '', value: '' }]);
  const updateSpec = (i: number, field: keyof SpecPair, v: string) =>
    setSpecs((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));
  const removeSpec = (i: number) => setSpecs((s) => s.filter((_, idx) => idx !== i));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoryId || !titleEn.trim()) {
      toast.error('Category and English title are required');
      return;
    }

    // Build payload — omit empty optional fields
    const bullets = bulletsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const specsJson: Record<string, string> = {};
    for (const pair of specs) {
      if (pair.key.trim() && pair.value.trim()) {
        specsJson[pair.key.trim()] = pair.value.trim();
      }
    }

    const payload: Record<string, unknown> = {
      categoryId,
      titleEn: titleEn.trim(),
      titleBn: titleBn.trim() || titleEn.trim(),
      slug: slug.trim() || slugify(titleEn),
      status,
      isFeatured,
    };

    if (brand.trim()) payload.brand = brand.trim();
    if (descriptionEn.trim()) payload.descriptionEn = descriptionEn.trim();
    if (descriptionBn.trim()) payload.descriptionBn = descriptionBn.trim();
    if (bullets.length > 0) payload.bulletFeatures = bullets;
    if (Object.keys(specsJson).length > 0) payload.specsJson = specsJson;
    if (deliveryTimeEn.trim()) payload.deliveryTimeEn = deliveryTimeEn.trim();
    if (deliveryTimeBn.trim()) payload.deliveryTimeBn = deliveryTimeBn.trim();
    if (videoUrl.trim()) payload.videoUrl = videoUrl.trim();
    if (metaTitle.trim()) payload.metaTitle = metaTitle.trim();
    if (metaDescription.trim()) payload.metaDescription = metaDescription.trim();
    if (status === 'SCHEDULED' && publishedAt) {
      payload.publishedAt = new Date(publishedAt).toISOString();
    }

    try {
      const created = await createMutation.mutate(payload);
      toast.success('Product created', 'Now add variants and media.');
      router.push(`/products/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to create product', msg);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to products
      </Link>

      <PageHeader
        title="New product"
        subtitle="Create a draft product — add variants, media, and publish when ready"
      />

      <form onSubmit={onSubmit} className="space-y-5">
        {/* ── BASIC ──────────────────────────────────────────────── */}
        <section className="card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-800">Basic information</h2>

          <Field label="Category" required>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select a category…</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-slate-400 mt-1">
              Category attributes drive the product variant matrix later.
            </p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (English)" required>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                required
                placeholder="Wireless headphone X200"
                className={inputCls}
              />
            </Field>
            <Field label="Title (বাংলা)">
              <input
                type="text"
                value={titleBn}
                onChange={(e) => setTitleBn(e.target.value)}
                placeholder="ওয়্যারলেস হেডফোন X200"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand">
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Sony"
                className={inputCls}
              />
            </Field>
            <Field label="Slug" hint="Auto-generated from English title. Must be unique.">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="wireless-headphone-x200"
                className={cn(inputCls, 'font-mono text-[13px]')}
              />
            </Field>
          </div>
        </section>

        {/* ── DESCRIPTIONS ──────────────────────────────────────── */}
        <section className="card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-800">Descriptions</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Description (English)" hint="Full product description.">
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                rows={5}
                placeholder="Long-form description for the PDP..."
                className={cn(inputCls, 'h-auto py-2')}
              />
            </Field>
            <Field label="Description (বাংলা)">
              <textarea
                value={descriptionBn}
                onChange={(e) => setDescriptionBn(e.target.value)}
                rows={5}
                placeholder="পণ্যের বিস্তারিত বর্ণনা..."
                className={cn(inputCls, 'h-auto py-2')}
              />
            </Field>
          </div>

          <Field
            label="Bullet features"
            hint="One feature per line — displayed as a checklist on the product page."
          >
            <textarea
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
              rows={4}
              placeholder={'Active noise cancellation\n30-hour battery life\nBluetooth 5.3'}
              className={cn(inputCls, 'h-auto py-2')}
            />
          </Field>
        </section>

        {/* ── SPECIFICATIONS ────────────────────────────────────── */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Specifications</h2>
            <button
              type="button"
              onClick={addSpecRow}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded border border-border text-[12.5px] text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add row
            </button>
          </div>
          {specs.length === 0 ? (
            <p className="text-[12.5px] text-slate-400">
              No specs yet — click &quot;Add row&quot; to add key:value specifications.
            </p>
          ) : (
            <div className="space-y-2">
              {specs.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => updateSpec(i, 'key', e.target.value)}
                    placeholder="Key (e.g. Battery)"
                    className={cn(inputCls, 'h-9 flex-1')}
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateSpec(i, 'value', e.target.value)}
                    placeholder="Value (e.g. 5000 mAh)"
                    className={cn(inputCls, 'h-9 flex-1')}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(i)}
                    className="p-1.5 rounded hover:bg-danger-50 text-danger-600"
                    aria-label="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── DELIVERY + MEDIA ───────────────────────────────────── */}
        <section className="card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-800">Delivery &amp; video</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery time (English)" hint="e.g. 2-3 days (Inside Dhaka)">
              <input
                type="text"
                value={deliveryTimeEn}
                onChange={(e) => setDeliveryTimeEn(e.target.value)}
                placeholder="2-3 days"
                className={inputCls}
              />
            </Field>
            <Field label="Delivery time (বাংলা)" hint="যেমন: ২-৩ দিন">
              <input
                type="text"
                value={deliveryTimeBn}
                onChange={(e) => setDeliveryTimeBn(e.target.value)}
                placeholder="২-৩ দিন"
                className={inputCls}
              />
            </Field>
          </div>

          <Field
            label="Video URL"
            hint="YouTube or Vimeo link — embedded on the product page."
          >
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={cn(inputCls, 'font-mono text-[13px]')}
            />
          </Field>
        </section>

        {/* ── STATUS & PUBLISHING ────────────────────────────────── */}
        <section className="card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-800">Publishing</h2>

          <Field label="Status">
            <div className="flex flex-wrap items-center gap-2">
              {(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'h-9 px-3 rounded border text-[12.5px] font-medium capitalize',
                    status === s
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-border bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
          </Field>

          {status === 'SCHEDULED' && (
            <Field label="Publish at" hint="Product will go live automatically at this date.">
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className={inputCls}
              />
            </Field>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-700">Featured product</span>
          </label>
        </section>

        {/* ── SEO ───────────────────────────────────────────────── */}
        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">SEO</h2>
          <Field label="Meta title" hint="Defaults to product title if empty.">
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Wireless Headphone X200 | Buy Online"
              className={inputCls}
            />
          </Field>
          <Field label="Meta description" hint="Recommended 150–160 characters.">
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              placeholder="Shop the X200 wireless headphone with active noise cancellation and 30-hour battery."
              className={cn(inputCls, 'h-auto py-2')}
            />
          </Field>
        </section>

        {/* ── ACTIONS ───────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href="/products"
            className="inline-flex items-center h-10 px-4 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.loading}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {createMutation.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {createMutation.loading ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Form primitive
// ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-danger-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[12px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}