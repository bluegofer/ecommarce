'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, useToast } from '@/components/ui';
import { useMutation, useQuery } from '@/lib/hooks';

interface CategoryNode {
  id: string;
  nameEn: string;
  slug: string;
  children?: CategoryNode[];
}

function flattenCategories(nodes: CategoryNode[], depth = 0): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: `${'— '.repeat(depth)}${n.nameEn}` });
    if (n.children?.length) out.push(...flattenCategories(n.children, depth + 1));
  }
  return out;
}

export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();

  const [categoryId, setCategoryId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [brand, setBrand] = useState('');
  const [slug, setSlug] = useState('');

  const { data: tree } = useQuery<CategoryNode[]>('/api/v1/categories/tree');

  const flat = tree ? flattenCategories(tree) : [];

  // Auto-slug from titleEn
  useEffect(() => {
    if (!slug && titleEn) {
      setSlug(
        titleEn
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  }, [titleEn, slug]);

  const createMutation = useMutation<Record<string, unknown>, { id: string }>(
    'post',
    '/api/v1/products',
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !titleEn) {
      toast.error('Category and English title are required');
      return;
    }
    try {
      const created = await createMutation.mutate({
        categoryId,
        titleEn,
        titleBn: titleBn || titleEn,
        brand: brand || undefined,
        slug,
        status: 'DRAFT',
      });
      toast.success('Product created', 'Now add variants and media.');
      router.push(`/products/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to create product', msg);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
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

      <form onSubmit={onSubmit} className="card p-5 space-y-5">
        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
            Category <span className="text-danger-600">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
          >
            <option value="">Select a category…</option>
            {flat.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[12px] text-slate-400">
            Attributes for this category load automatically after selection (Batch B.3).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Title (English) <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              required
              placeholder="Wireless headphone X200"
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Title (বাংলা)
            </label>
            <input
              type="text"
              value={titleBn}
              onChange={(e) => setTitleBn(e.target.value)}
              placeholder="ওয়্যারলেস হেডফোন X200"
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Brand
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Sony"
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Slug <span className="text-slate-400">(auto from title)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="wireless-headphone-x200"
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 placeholder:text-slate-400 font-mono focus:border-sky-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Link
            href="/products"
            className="inline-flex items-center h-10 px-4 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.loading}
            className="inline-flex items-center h-10 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {createMutation.loading ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </form>
    </div>
  );
}