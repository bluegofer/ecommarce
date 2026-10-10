'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Download, Filter, MoreHorizontal, Package } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface ProductRow {
  id: string;
  slug: string;
  titleEn: string;
  titleBn: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED';
  category: { id: string; nameEn: string } | null;
  brand: string | null;
  variantCount: number;
  minPricePoisha: number | null;
  totalStock: number;
  createdAt: string;
}

interface ProductListResponse {
  items: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_TONE: Record<ProductRow['status'], 'neutral' | 'success' | 'warning' | 'info'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
  SCHEDULED: 'info',
};

export default function ProductsListPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const toast = useToast();

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (status) query.set('status', status);
  query.set('page', String(page));
  query.set('pageSize', '20');

  const { data, loading, error, refetch } = useQuery<ProductListResponse>(
    `/api/v1/products?${query.toString()}`,
  );

  const columns: Column<ProductRow>[] = [
    {
      key: 'title',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded bg-slate-100 grid place-items-center shrink-0">
            <Package className="w-4 h-4 text-slate-400" />
          </span>
          <div className="min-w-0">
            <Link
              href={`/products/${row.id}`}
              className="font-medium text-slate-800 hover:text-sky-700 truncate block"
            >
              {row.titleEn}
            </Link>
            <span className="text-[12px] text-slate-400 font-mono truncate block">
              {row.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) =>
        row.category ? (
          <span className="text-slate-700">{row.category.nameEn}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (row) => row.brand ?? <span className="text-slate-400">—</span>,
    },
    {
      key: 'price',
      header: 'Price from',
      align: 'right',
      render: (row) =>
        row.minPricePoisha != null ? (
          <span className="tabular-nums text-slate-800 font-medium">
            {formatPoisha(row.minPricePoisha)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (row) =>
        row.totalStock > 0 ? (
          <span className="tabular-nums text-slate-700">{row.totalStock}</span>
        ) : (
          <StatusChip label="Out of stock" tone="danger" />
        ),
    },
    {
      key: 'variants',
      header: 'Variants',
      align: 'center',
      render: (row) => (
        <span className="tabular-nums text-slate-600">{row.variantCount}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusChip label={row.status} tone={STATUS_TONE[row.status]} />
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => (
        <span className="text-slate-500 text-[12.5px]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Link
          href={`/products/${row.id}`}
          className="inline-flex items-center text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
        >
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        subtitle="Manage your catalog across categories and variants"
        actions={
          <>
            <button
              type="button"
              onClick={() => toast.push({ tone: 'info', title: 'CSV export queued', description: 'Batch E wires the real download.' })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" />
              New product
            </Link>
          </>
        }
      />

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, SKU, or slug…"
            className="w-full h-9 pl-9 pr-3 rounded border border-border bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div className="inline-flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 pl-2 pr-8 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading products…</div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-danger-700 font-medium">
              Failed to load products
            </p>
            <p className="text-[12.5px] text-slate-500 mt-1">{error.message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 h-9 px-3 rounded bg-sky-600 text-white text-sm"
            >
              Retry
            </button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Create your first product or import a CSV to get started."
            action={
              <Link
                href="/products/new"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
              >
                <Plus className="w-4 h-4" />
                New product
              </Link>
            }
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data.items}
              rowKey={(r) => r.id}
            />
            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12.5px] text-slate-500">
              <span>
                Showing {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 px-2.5 rounded border border-border bg-white text-slate-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="tabular-nums">
                  Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * data.pageSize >= data.total}
                  className="h-8 px-2.5 rounded border border-border bg-white text-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hint for the developer / operator */}
      <p className="text-[12px] text-slate-400">
        Tip: press <kbd className="px-1.5 py-0.5 rounded border border-border bg-slate-50 text-slate-600 text-[11px]">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded border border-border bg-slate-50 text-slate-600 text-[11px]">K</kbd> for global search (wired in Batch F).
      </p>
    </div>
  );
}