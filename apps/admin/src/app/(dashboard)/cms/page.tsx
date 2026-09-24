'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, GripVertical, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { PageHeader, StatusChip, EmptyState, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

type SectionType =
  | 'HERO_CAROUSEL'
  | 'DEAL_STRIP'
  | 'PROMO_TILES'
  | 'CATEGORY_TILES'
  | 'PRODUCT_CAROUSEL'
  | 'PROMO_BANNER'
  | 'WIDE_BANNER'
  | 'RECOMMENDED'
  | 'SEO_TEXT';

interface Section {
  id: string;
  key: string;
  sectionType: SectionType;
  titleEn: string | null;
  titleBn: string | null;
  position: number;
  isVisible: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const TYPE_LABEL: Record<SectionType, string> = {
  HERO_CAROUSEL: 'Hero carousel',
  DEAL_STRIP: 'Deal strip (countdown)',
  PROMO_TILES: 'Promo tiles (2×2 banners)',
  CATEGORY_TILES: 'Quick category tiles',
  PRODUCT_CAROUSEL: "Today's Deals / Best Sellers carousel",
  PROMO_BANNER: 'Promo banners',
  WIDE_BANNER: 'Wide campaign banner',
  RECOMMENDED: 'Recommended for you grid',
  SEO_TEXT: 'Collapsible SEO text block',
};

const ALL_TYPES: SectionType[] = [
  'HERO_CAROUSEL',
  'DEAL_STRIP',
  'PROMO_TILES',
  'CATEGORY_TILES',
  'PRODUCT_CAROUSEL',
  'PROMO_BANNER',
  'WIDE_BANNER',
  'RECOMMENDED',
  'SEO_TEXT',
];

function sectionLabel(s: Section): string {
  return s.titleEn ?? s.titleBn ?? TYPE_LABEL[s.sectionType] ?? s.sectionType;
}

interface AddFormState {
  key: string;
  sectionType: SectionType;
  titleEn: string;
  titleBn: string;
  position: number;
  isVisible: boolean;
}

const EMPTY_FORM: AddFormState = {
  key: '',
  sectionType: 'HERO_CAROUSEL',
  titleEn: '',
  titleBn: '',
  position: 0,
  isVisible: true,
};

export default function CmsPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<Section[]>('/api/v1/cms/sections');

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddFormState>({ ...EMPTY_FORM });

  const toggleMutation = useMutation<{ id: string; isVisible: boolean }, unknown>(
    'patch',
    (input) => `/api/v1/cms/sections/${(input as { id: string }).id}`,
  );
  const reorderMutation = useMutation<{ orderedIds: string[] }, unknown>(
    'post',
    '/api/v1/cms/sections/reorder',
  );
  const createMutation = useMutation<AddFormState, unknown>('post', '/api/v1/cms/sections');
  const deleteMutation = useMutation<string, unknown>(
    'delete',
    (input) => `/api/v1/cms/sections/${(input as unknown as string)}`,
  );

  async function move(id: string, dir: -1 | 1) {
    if (!data) return;
    const idx = data.findIndex((s) => s.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= data.length) return;
    const next = [...data];
    const a = next[idx];
    const b = next[newIdx];
    if (!a || !b) return;
    next[idx] = b;
    next[newIdx] = a;
    try {
      await reorderMutation.mutate({ orderedIds: next.map((s) => s.id) });
      toast.success('Order saved');
      void refetch();
    } catch (e) {
      toast.error('Reorder failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  function openAdd() {
    const nextPos = data && data.length > 0 ? Math.max(...data.map((s) => s.position)) + 1 : 0;
    setForm({ ...EMPTY_FORM, position: nextPos });
    setAddOpen(true);
  }

  async function handleCreate() {
    const key = form.key.trim();
    const titleEn = form.titleEn.trim();
    const titleBn = form.titleBn.trim();
    if (!key) {
      toast.error('Missing key', 'Provide a unique key (e.g. home-hero-2)');
      return;
    }
    try {
      await createMutation.mutate({
        key,
        sectionType: form.sectionType,
        titleEn,
        titleBn,
        position: form.position,
        isVisible: form.isVisible,
      });
      toast.success('Section created');
      setAddOpen(false);
      setForm({ ...EMPTY_FORM });
      void refetch();
    } catch (e) {
      toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function handleDelete(s: Section) {
    if (!confirm(`Delete section "${sectionLabel(s)}"?`)) return;
    try {
      await deleteMutation.mutate(s.id);
      toast.success('Section deleted');
      void refetch();
    } catch (e) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="CMS · Homepage"
        subtitle="Drag or arrow-reorder sections · schedule · hide · campaign linking"
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> Add section
          </button>
        }
      />

      <div className="text-[12.5px] text-slate-500">
        Preview:{' '}
        <Link href="/" className="text-sky-700 hover:underline font-medium">
          Home
        </Link>{' '}
        ·{' '}
        <Link href="/cms/pages" className="text-sky-700 hover:underline font-medium">
          Pages
        </Link>{' '}
        ·{' '}
        <Link href="/cms/menus" className="text-sky-700 hover:underline font-medium">
          Menus
        </Link>{' '}
        ·{' '}
        <Link href="/cms/media" className="text-sky-700 hover:underline font-medium">
          Media
        </Link>
      </div>

      <div className="card divide-y divide-border">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading sections…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No sections yet"
            description="Add the first homepage section to control the storefront home layout."
          />
        ) : (
          data.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-slate-50">
              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
              <span className="w-8 text-[12px] tabular-nums text-slate-400">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">{sectionLabel(s)}</div>
                <div className="text-[12px] text-slate-400">
                  {TYPE_LABEL[s.sectionType] ?? s.sectionType}
                  <code className="ml-2 font-mono text-[11px] text-slate-400">
                    {s.key}
                  </code>
                </div>
              </div>
              {!s.isVisible && <StatusChip label="Hidden" tone="neutral" />}
              {s.startsAt && <StatusChip label="Scheduled" tone="info" />}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void move(s.id, -1)}
                  disabled={i === 0}
                  className="h-7 w-7 grid place-items-center rounded hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => void move(s.id, 1)}
                  disabled={i === data.length - 1}
                  className="h-7 w-7 grid place-items-center rounded hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await toggleMutation.mutate({ id: s.id, isVisible: !s.isVisible });
                    toast.success(s.isVisible ? 'Section hidden' : 'Section visible');
                    void refetch();
                  }}
                  className="h-7 w-7 grid place-items-center rounded hover:bg-slate-100"
                  aria-label={s.isVisible ? 'Hide' : 'Show'}
                >
                  {s.isVisible ? (
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(s)}
                  className="h-7 w-7 grid place-items-center rounded hover:bg-slate-100"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4 text-danger-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Add Section modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add homepage section"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.loading || !form.key.trim()}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {createMutation.loading ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">
              Section type
            </span>
            <select
              value={form.sectionType}
              onChange={(e) =>
                setForm({ ...form, sectionType: e.target.value as SectionType })
              }
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">
              Key (unique)
            </span>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm font-mono"
              placeholder="e.g. home-hero-2"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">
              English title
            </span>
            <input
              type="text"
              value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
              placeholder="e.g. Hero carousel"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">
              Bangla title
            </span>
            <input
              type="text"
              value={form.titleBn}
              onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
              placeholder="e.g. হিরো ক্যারোসেল"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">Position</span>
            <input
              type="number"
              value={form.position}
              onChange={(e) =>
                setForm({ ...form, position: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) =>
                setForm({ ...form, isVisible: e.target.checked })
              }
            />
            <span className="text-sm text-slate-700">Visible on storefront</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}