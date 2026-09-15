'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, EyeOff, GripVertical, LayoutGrid } from 'lucide-react';
import { PageHeader, StatusChip, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Section {
  id: string;
  type: 'HERO' | 'QUICK_TILES' | 'DEAL_STRIP' | 'CAROUSEL' | 'PROMO_BANNER' | 'WIDE_BANNER' | 'RECOMMENDED' | 'SEO_TEXT';
  title: string | null;
  position: number;
  visible: boolean;
  scheduledFrom: string | null;
  scheduledTo: string | null;
}

const TYPE_LABEL: Record<Section['type'], string> = {
  HERO: 'Hero carousel',
  QUICK_TILES: 'Quick category tiles',
  DEAL_STRIP: 'Deal strip (countdown)',
  CAROUSEL: "Today's Deals / Best Sellers carousel",
  PROMO_BANNER: 'Promo 2×2 banners',
  WIDE_BANNER: 'Wide campaign banner',
  RECOMMENDED: 'Recommended for you grid',
  SEO_TEXT: 'Collapsible SEO text block',
};

export default function CmsPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<Section[]>('/api/v1/cms/sections');

  const toggleMutation = useMutation<{ id: string; visible: boolean }, unknown>(
    'patch',
    (input) => `/api/v1/cms/sections/${(input as { id: string }).id}`,
  );
  const reorderMutation = useMutation<{ ids: string[] }, unknown>(
    'post',
    '/api/v1/cms/sections/reorder',
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
      await reorderMutation.mutate({ ids: next.map((s) => s.id) });
      toast.success('Order saved');
      void refetch();
    } catch (e) {
      toast.error('Reorder failed', e instanceof Error ? e.message : 'Unknown');
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
            onClick={() => toast.push({ tone: 'info', title: 'Add section', description: 'Modal in follow-up.' })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> Add section
          </button>
        }
      />

      <div className="text-[12.5px] text-slate-500">
        Preview: <Link href="/" className="text-sky-700 hover:underline font-medium">Home</Link> ·{' '}
        <Link href="/cms/pages" className="text-sky-700 hover:underline font-medium">Pages</Link> ·{' '}
        <Link href="/cms/menus" className="text-sky-700 hover:underline font-medium">Menus</Link> ·{' '}
        <Link href="/cms/media" className="text-sky-700 hover:underline font-medium">Media</Link>
      </div>

      <div className="card divide-y divide-border">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading sections…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <LayoutGrid className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            No sections yet — add the first one.
          </div>
        ) : (
          data.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-slate-50">
              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
              <span className="w-8 text-[12px] tabular-nums text-slate-400">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">{s.title ?? TYPE_LABEL[s.type]}</div>
                <div className="text-[12px] text-slate-400">{TYPE_LABEL[s.type]}</div>
              </div>
              {!s.visible && <StatusChip label="Hidden" tone="neutral" />}
              {s.scheduledFrom && <StatusChip label="Scheduled" tone="info" />}
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
                    await toggleMutation.mutate({ id: s.id, visible: !s.visible });
                    toast.success(s.visible ? 'Section hidden' : 'Section visible');
                    void refetch();
                  }}
                  className="h-7 w-7 grid place-items-center rounded hover:bg-slate-100"
                  aria-label={s.visible ? 'Hide' : 'Show'}
                >
                  {s.visible ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}