'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { PageHeader, StatusChip, Modal, useToast } from '@/components/ui';
import { useMutation, useQuery } from '@/lib/hooks';
import { formatPoisha } from '@/lib/utils';

interface Variant {
  id: string;
  sku: string;
  pricePoisha: number;
  compareAtPoisha: number | null;
  stock: number;
  barcode: string | null;
  isActive: boolean;
}

// Update payload — explicit `string | null | undefined` per exactOptionalPropertyTypes
interface ProductUpdatePayload {
  titleEn: string | undefined;
  titleBn: string | null | undefined;
  descriptionEn: string | null | undefined;
  descriptionBn: string | null | undefined;
  brand: string | null | undefined;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED' | undefined;
  metaTitle: string | null | undefined;
  metaDescription: string | null | undefined;
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
  metaTitle: string | null;
  metaDescription: string | null;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
}

const TABS = ['Details', 'Variants', 'Media', 'SEO'] as const;
type Tab = (typeof TABS)[number];

export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('Details');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const productId = params?.id;
  const { data, loading, error, refetch } = useQuery<ProductDetail>(
    productId ? `/api/v1/products/${productId}` : null,
  );

  const [form, setForm] = useState<Partial<ProductDetail>>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const updateMutation = useMutation<ProductUpdatePayload, ProductDetail>(
    'patch',
    `/api/v1/products/${productId}`,
  );
  const deleteMutation = useMutation<void, void>(
    'delete',
    `/api/v1/products/${productId}`,
  );

  async function onSave() {
    try {
      await updateMutation.mutate({
        titleEn: form.titleEn,
        titleBn: form.titleBn,
        descriptionEn: form.descriptionEn,
        descriptionBn: form.descriptionBn,
        brand: form.brand,
        status: form.status,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      });
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
              <Save className="w-4 h-4" />
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
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'Details' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5 space-y-4">
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
              <div>
                <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                  Description (English)
                </label>
                <textarea
                  value={form.descriptionEn ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descriptionEn: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descriptionBn: e.target.value }))
                  }
                  rows={5}
                  className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
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

      {tab === 'Variants' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="font-semibold text-slate-900">Variants ({data.variants.length})</h3>
              <p className="text-[12.5px] text-slate-500">Each variant is a SKU with its own price and stock.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                toast.push({ tone: 'info', title: 'Variant matrix generator', description: 'Batch B.3 wires the matrix UI.' })
              }
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" />
              Add variant
            </button>
          </div>
          {data.variants.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No variants yet — click “Add variant” to generate from category attributes.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">SKU</th>
                  <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Price</th>
                  <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Stock</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">Barcode</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-mono text-slate-700">{v.sku}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{formatPoisha(v.pricePoisha)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.stock}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[12.5px]">{v.barcode ?? '—'}</td>
                    <td className="px-4 py-3">
                      {v.isActive ? <StatusChip label="Active" tone="success" /> : <StatusChip label="Inactive" tone="neutral" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Media' && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Media gallery</h3>
          <p className="text-[12.5px] text-slate-500 mb-4">Drag to reorder · first image is the PDP main image · auto-converted to WebP.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded border border-dashed border-border bg-slate-50 grid place-items-center text-slate-300">
                <ImageIcon className="w-6 h-6" />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" /> Upload images
          </button>
        </div>
      )}

      {tab === 'SEO' && (
        <div className="card p-5 space-y-4 max-w-2xl">
          <Field
            label="Meta title"
            value={form.metaTitle ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, metaTitle: v }))}
          />
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Meta description</label>
            <textarea
              value={form.metaDescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
              rows={3}
              className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
            />
          </div>
          <p className="text-[12px] text-slate-400">JSON-LD is auto-generated from these fields and variant pricing (Step 14).</p>
        </div>
      )}

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
        <p className="text-sm text-slate-600">
          This will permanently remove <strong>{data.titleEn}</strong> and its variants. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
      />
    </div>
  );
}