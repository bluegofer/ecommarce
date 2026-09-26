'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  X,
  UploadCloud,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { PageHeader, StatusChip, Modal, useToast } from '@/components/ui';
import { useMutation, useQuery, useUpload } from '@/lib/hooks';
import { formatPoisha, cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  sku: string;
  pricePoisha: number;
  compareAtPoisha: number | null;
  stock: number;
  barcode: string | null;
  isActive: boolean;
  attributeValues?: Record<string, string>;
}

interface ProductDetail {
  id: string;
  slug: string;
  titleEn: string;
  titleBn: string | null;
  descriptionEn: string | null;
  descriptionBn: string | null;
  brand: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  categoryId: string;
  category: { id: string; nameEn: string } | null;
  deliveryTimeEn: string | null;
  deliveryTimeBn: string | null;
  videoUrl: string | null;
  bulletFeatures: string[] | null;
  specsJson: Record<string, string> | null;
  metaTitle: string | null;
  metaDescription: string | null;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
  media?: Array<{ id: string; url: string; altText: string | null }>;
}

interface MediaLibraryItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
}

interface UploadResult {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface SpecPair {
  key: string;
  value: string;
}

// Tab names
const TABS = ['Details', 'Variants', 'Media', 'SEO'] as const;
type Tab = (typeof TABS)[number];

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('Details');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);

  const productId = params?.id;

  const { data, loading, error, refetch } = useQuery<ProductDetail>(
    productId ? `/api/v1/products/${productId}` : null,
  );

  // ── Form state ──────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<ProductDetail>>({});
  const [bulletsText, setBulletsText] = useState('');
  const [specs, setSpecs] = useState<SpecPair[]>([]);
  const [publishedAtInput, setPublishedAtInput] = useState('');

  useEffect(() => {
    if (!data) return;
    setForm(data);
    setBulletsText((data.bulletFeatures ?? []).join('\n'));
    setSpecs(
      data.specsJson
        ? Object.entries(data.specsJson).map(([key, value]) => ({ key, value: String(value) }))
        : [],
    );
    setPublishedAtInput(
      data.status === 'SCHEDULED' && data.updatedAt
        ? data.updatedAt.slice(0, 16)
        : '',
    );
  }, [data]);

  // ── Mutations ───────────────────────────────────────────────────
  const updateMutation = useMutation<Record<string, unknown>, ProductDetail>(
    'patch',
    `/api/v1/products/${productId}`,
  );
  const deleteMutation = useMutation<void, void>('delete', `/api/v1/products/${productId}`);

  const mediaQuery = useQuery<MediaLibraryItem[]>(
    mediaPickerOpen ? '/api/v1/cms/media-library' : null,
  );

  const attachMediaMutation = useMutation<
    { productId: string; url: string; altText?: string },
    unknown
  >('post', `/api/v1/products/${productId}/media`);

  const detachMediaMutation = useMutation<string, unknown>(
    'delete',
    (input) => `/api/v1/products/${productId}/media/${(input as unknown as string)}`,
  );

  const uploadMutation = useUpload<UploadResult>('/api/v1/uploads/media');

  const saveMediaLibraryMutation = useMutation<
    { url: string; filename: string; mimeType: string; sizeBytes: number; altText?: string },
    unknown
  >('post', '/api/v1/cms/media-library');

  // ── Handlers ────────────────────────────────────────────────────
  async function onSave() {
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
      titleEn: form.titleEn,
      titleBn: form.titleBn,
      descriptionEn: form.descriptionEn,
      descriptionBn: form.descriptionBn,
      brand: form.brand,
      status: form.status,
      deliveryTimeEn: form.deliveryTimeEn ?? null,
      deliveryTimeBn: form.deliveryTimeBn ?? null,
      videoUrl: form.videoUrl ?? null,
      bulletFeatures: bullets,
      specsJson,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
    };

    if (form.status === 'SCHEDULED' && publishedAtInput) {
      payload.publishedAt = new Date(publishedAtInput).toISOString();
    }

    try {
      await updateMutation.mutate(payload);
      toast.success('Product saved');
      void refetch();
    } catch (e) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function onDelete() {
    try {
      await deleteMutation.mutate(undefined as unknown as void);
      toast.success('Product deleted');
      router.push('/products');
    } catch (e) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function attachMedia(item: MediaLibraryItem) {
    try {
      await attachMediaMutation.mutate({
        productId: productId!,
        url: item.url,
        altText: item.altText ?? item.filename,
      });
      toast.success('Image attached');
      setMediaPickerOpen(false);
      void refetch();
    } catch (e) {
      toast.error('Attach failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function detachMedia(mediaId: string) {
    if (!confirm('Remove this image from the product?')) return;
    try {
      await detachMediaMutation.mutate(mediaId);
      toast.success('Image removed');
      void refetch();
    } catch (e) {
      toast.error('Remove failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function uploadAndAttach(file: File) {
    try {
      const uploaded = await uploadMutation.upload(file);
      await saveMediaLibraryMutation.mutate({
        url: uploaded.url,
        filename: uploaded.filename,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        altText: uploaded.filename,
      });
      await attachMediaMutation.mutate({
        productId: productId!,
        url: uploaded.url,
        altText: uploaded.filename,
      });
      toast.success('Image uploaded and attached');
      void refetch();
    } catch (e) {
      toast.error('Upload failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  // Spec rows
  const addSpecRow = () => setSpecs((s) => [...s, { key: '', value: '' }]);
  const updateSpec = (i: number, field: keyof SpecPair, v: string) =>
    setSpecs((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));
  const removeSpec = (i: number) => setSpecs((s) => s.filter((_, idx) => idx !== i));

  // ── Loading / error ─────────────────────────────────────────────
  if (loading && !data) {
    return <div className="p-10 text-center text-slate-400">Loading product…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-10 text-center">
        <p className="font-medium text-danger-700">Product not found</p>
        <p className="text-sm text-slate-500 mt-1">{error?.message}</p>
        <Link href="/products" className="mt-4 inline-block text-sky-700 font-medium hover:underline">
          ← Back to products
        </Link>
      </div>
    );
  }

  const productMedia = data.media ?? [];

  return (
    <div className="space-y-5">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to products
      </Link>

      <PageHeader
        title={data.titleEn}
        subtitle={`${data.category?.nameEn ?? 'No category'} · ${data.variants.length} variants`}
        actions={
          <>
            <StatusChip
              label={data.status}
              tone={
                data.status === 'PUBLISHED'
                  ? 'success'
                  : data.status === 'DRAFT'
                    ? 'neutral'
                    : 'info'
              }
            />
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-danger-200 bg-white text-danger-700 text-sm font-medium hover:bg-danger-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={updateMutation.loading}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {updateMutation.loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {updateMutation.loading ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1" aria-label="Product sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* ── DETAILS TAB ─────────────────────────────────────────── */}
      {tab === 'Details' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <section className="card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Basic</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Title (English)"
                  value={form.titleEn ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, titleEn: v }))}
                />
                <Field
                  label="Title (বাংলা)"
                  value={form.titleBn ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, titleBn: v }))}
                />
              </div>
              <Field
                label="Brand"
                value={form.brand ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, brand: v }))}
              />
            </section>

            <section className="card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Descriptions</h3>
              <div>
                <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                  Description (English)
                </label>
                <textarea
                  value={form.descriptionEn ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                  rows={5}
                  className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                  Description (বাংলা)
                </label>
                <textarea
                  value={form.descriptionBn ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionBn: e.target.value }))}
                  rows={5}
                  className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                  Bullet features
                </label>
                <textarea
                  value={bulletsText}
                  onChange={(e) => setBulletsText(e.target.value)}
                  rows={4}
                  placeholder={'One feature per line\nActive noise cancellation\n30-hour battery'}
                  className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
                />
                <p className="mt-1 text-[11.5px] text-slate-400">
                  One feature per line — displayed as a checklist on the product page.
                </p>
              </div>
            </section>

            <section className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Specifications</h3>
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
                  No specs yet. Click &quot;Add row&quot; to add specifications.
                </p>
              ) : (
                <div className="space-y-2">
                  {specs.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateSpec(i, 'key', e.target.value)}
                        placeholder="Key"
                        className="w-full h-9 px-3 rounded border border-border bg-white text-sm flex-1"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => updateSpec(i, 'value', e.target.value)}
                        placeholder="Value"
                        className="w-full h-9 px-3 rounded border border-border bg-white text-sm flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpec(i)}
                        className="p-1.5 rounded hover:bg-danger-50 text-danger-600"
                        aria-label="Remove row"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Delivery &amp; video</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Delivery time (English)"
                  value={form.deliveryTimeEn ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, deliveryTimeEn: v }))}
                  placeholder="2-3 days"
                />
                <Field
                  label="Delivery time (বাংলা)"
                  value={form.deliveryTimeBn ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, deliveryTimeBn: v }))}
                  placeholder="২-৩ দিন"
                />
              </div>
              <Field
                label="Video URL"
                value={form.videoUrl ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, videoUrl: v }))}
                placeholder="https://www.youtube.com/watch?v=..."
                hint="YouTube or Vimeo link — embedded on the product page."
              />
            </section>
          </div>

          <aside className="space-y-4">
            <div className="card p-5 space-y-4">
              <div>
                <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status ?? 'DRAFT'}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as ProductDetail['status'] }))
                  }
                  className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              {form.status === 'SCHEDULED' && (
                <div>
                  <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                    Publish at
                  </label>
                  <input
                    type="datetime-local"
                    value={publishedAtInput}
                    onChange={(e) => setPublishedAtInput(e.target.value)}
                    className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700"
                  />
                </div>
              )}
              <div>
                <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={data.slug}
                  readOnly
                  className="w-full h-10 px-3 rounded border border-border bg-slate-50 text-sm text-slate-500 font-mono"
                />
              </div>
              <div className="text-[12px] text-slate-400">
                Created {new Date(data.createdAt).toLocaleString()}
                <br />
                Updated {new Date(data.updatedAt).toLocaleString()}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── VARIANTS TAB ────────────────────────────────────────── */}
      {tab === 'Variants' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="font-semibold text-slate-900">
                Variants ({data.variants.length})
              </h3>
              <p className="text-[12.5px] text-slate-500">
                Each variant is a SKU with its own price and stock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMatrixOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Sparkles className="w-4 h-4" />
              Generate variants
            </button>
          </div>
          {data.variants.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No variants yet — click &quot;Generate variants&quot; to create combinations from
              category attributes.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">
                    Barcode
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-mono text-slate-700">{v.sku}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                      {formatPoisha(v.pricePoisha)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.stock}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[12.5px]">
                      {v.barcode ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {v.isActive ? (
                        <StatusChip label="Active" tone="success" />
                      ) : (
                        <StatusChip label="Inactive" tone="neutral" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── MEDIA TAB ───────────────────────────────────────────── */}
      {tab === 'Media' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Media gallery</h3>
              <p className="text-[12.5px] text-slate-500">
                First image is the PDP main image · auto-WebP on upload.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3 rounded border border-sky-600 bg-white text-sky-700 text-sm font-medium hover:bg-sky-50 cursor-pointer',
                  uploadMutation.loading && 'opacity-60 cursor-wait',
                )}
              >
                <UploadCloud className="w-4 h-4" />
                {uploadMutation.loading ? 'Uploading…' : 'Upload new'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadMutation.loading}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAndAttach(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
              >
                <Plus className="w-4 h-4" /> Add from library
              </button>
            </div>
          </div>

          {productMedia.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label
                className={cn(
                  'aspect-square rounded border-2 border-dashed border-sky-400 bg-sky-50 grid place-items-center text-sky-600 hover:bg-sky-100 cursor-pointer',
                  uploadMutation.loading && 'opacity-60 cursor-wait',
                )}
              >
                <UploadCloud className="w-8 h-8" />
                <span className="text-[12px] font-medium mt-1">
                  {uploadMutation.loading ? 'Uploading…' : 'Upload'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadMutation.loading}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAndAttach(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded border border-dashed border-border bg-slate-50 grid place-items-center text-slate-300"
                >
                  <ImageIcon className="w-6 h-6" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {productMedia.map((m) => (
                <div
                  key={m.id}
                  className="group relative aspect-square rounded border border-border bg-slate-50 overflow-hidden"
                >
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img src={m.url} alt={m.altText ?? ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                    <button
                      type="button"
                      onClick={() => void detachMedia(m.id)}
                      className="p-1.5 rounded bg-danger-600 text-white hover:bg-danger-700"
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="aspect-square rounded border border-dashed border-sky-300 bg-sky-50 grid place-items-center text-sky-500 hover:bg-sky-100"
                aria-label="Add from library"
              >
                <Plus className="w-6 h-6" />
              </button>
              <label
                className={cn(
                  'aspect-square rounded border border-dashed border-sky-300 bg-sky-50 grid place-items-center text-sky-500 hover:bg-sky-100 cursor-pointer',
                  uploadMutation.loading && 'opacity-60 cursor-wait',
                )}
                aria-label="Upload new image"
              >
                <UploadCloud className="w-6 h-6" />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadMutation.loading}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAndAttach(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* ── SEO TAB ─────────────────────────────────────────────── */}
      {tab === 'SEO' && (
        <div className="card p-5 space-y-4 max-w-2xl">
          <Field
            label="Meta title"
            value={form.metaTitle ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, metaTitle: v }))}
          />
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Meta description
            </label>
            <textarea
              value={form.metaDescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
              rows={3}
              className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
            />
          </div>
          <p className="text-[12px] text-slate-400">
            JSON-LD is auto-generated from these fields and variant pricing (Step 14).
          </p>
        </div>
      )}

      {/* ── MATRIX GENERATOR MODAL ──────────────────────────────── */}
      <VariantMatrixModal
        open={matrixOpen}
        onClose={() => setMatrixOpen(false)}
        productId={productId ?? ''}
        onSuccess={() => {
          setMatrixOpen(false);
          void refetch();
        }}
      />

      {/* ── MEDIA PICKER MODAL ──────────────────────────────────── */}
      <Modal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        title="Pick from Media Library"
        size="lg"
      >
        {mediaQuery.loading && !mediaQuery.data ? (
          <p className="text-center text-slate-400 py-6">Loading media…</p>
        ) : mediaQuery.error ? (
          <p className="text-center text-danger-700 py-6">{mediaQuery.error.message}</p>
        ) : !mediaQuery.data || mediaQuery.data.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">
              Media library is empty. Use &quot;Upload new&quot; in the Media tab to add one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto">
            {mediaQuery.data.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => void attachMedia(m)}
                className="group relative aspect-square rounded border border-border bg-slate-50 overflow-hidden hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={m.url} alt={m.altText ?? m.filename} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-sky-600/0 group-hover:bg-sky-600/20 transition-colors" />
                <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[10.5px] font-mono truncate px-1.5 py-0.5 opacity-0 group-hover:opacity-100">
                  {m.filename}
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRM MODAL ────────────────────────────────── */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete product"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={deleteMutation.loading}
              className="h-9 px-3 rounded bg-danger-600 text-white text-sm font-medium hover:bg-danger-700 disabled:opacity-60"
            >
              {deleteMutation.loading ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Delete <span className="font-semibold">{data.titleEn}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant Matrix Generator Modal
// ─────────────────────────────────────────────────────────────────────

interface MatrixAxis {
  attributeSlug: string;
  values: string;
}

function VariantMatrixModal({
  open,
  onClose,
  productId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [basePrice, setBasePrice] = useState('');
  const [baseSku, setBaseSku] = useState('');
  const [axes, setAxes] = useState<MatrixAxis[]>([
    { attributeSlug: 'size', values: '' },
    { attributeSlug: 'color', values: '' },
  ]);

  const matrixMut = useMutation<Record<string, unknown>, unknown>(
    'post',
    '/api/v1/variants/matrix',
  );

  useEffect(() => {
    if (!open) {
      setAxes([
        { attributeSlug: 'size', values: '' },
        { attributeSlug: 'color', values: '' },
      ]);
      setBasePrice('');
      setBaseSku('');
    }
  }, [open]);

  const updateAxis = (i: number, field: keyof MatrixAxis, v: string) =>
    setAxes((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));

  async function generate() {
    const cleanAxes = axes
      .map((a) => ({
        attributeSlug: a.attributeSlug.trim(),
        values: a.values
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((a) => a.attributeSlug && a.values.length > 0);

    if (cleanAxes.length === 0) {
      toast.error('Add at least one attribute with values (comma-separated)');
      return;
    }

    const priceNum = Number(basePrice);
    if (!priceNum || priceNum <= 0) {
      toast.error('Enter a valid base price in Taka');
      return;
    }

    const payload: Record<string, unknown> = {
      productId,
      axes: cleanAxes,
      basePricePoisha: Math.round(priceNum * 100),
    };
    if (baseSku.trim()) payload.baseSku = baseSku.trim();

    try {
      const result = await matrixMut.mutate(payload);
      toast.success('Variants generated', `Created combinations successfully.`);
      void result;
      onSuccess();
    } catch (e) {
      toast.error('Generation failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate variants from attributes"
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={matrixMut.loading}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {matrixMut.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {matrixMut.loading ? 'Generating…' : 'Generate'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-500">
          Each axis (attribute) with a list of values generates one SKU per combination.
          For example: Size (S, M, L) × Color (Red, Blue) → 6 variants.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Base price (৳) <span className="text-danger-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="1200"
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Base SKU prefix
            </label>
            <input
              type="text"
              value={baseSku}
              onChange={(e) => setBaseSku(e.target.value)}
              placeholder="e.g. TSHIRT"
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm font-mono"
            />
          </div>
        </div>

        <div className="space-y-3">
          {axes.map((a, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2 border border-border rounded p-3">
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-1">
                  Attribute {i + 1} slug
                </label>
                <input
                  type="text"
                  value={a.attributeSlug}
                  onChange={(e) => updateAxis(i, 'attributeSlug', e.target.value)}
                  placeholder="size"
                  className="w-full h-9 px-2.5 rounded border border-border bg-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-1">
                  Values (comma-separated)
                </label>
                <input
                  type="text"
                  value={a.values}
                  onChange={(e) => updateAxis(i, 'values', e.target.value)}
                  placeholder="S, M, L"
                  className="w-full h-9 px-2.5 rounded border border-border bg-white text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Form primitives
// ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11.5px] text-slate-400">{hint}</p>}
    </div>
  );
}