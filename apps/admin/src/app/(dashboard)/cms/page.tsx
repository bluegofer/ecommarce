'use client';

import Link from 'next/link';
import { Eye, EyeOff, GripVertical, LayoutGrid, Plus } from 'lucide-react';
import { PageHeader, StatusChip, EmptyState, useToast } from '@/components/ui';
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

function sectionLabel(s: Section): string {
  return s.titleEn ?? s.titleBn ?? TYPE_LABEL[s.sectionType] ?? s.sectionType;
}

export default function CmsPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<Section[]>('/api/v1/cms/sections');

  const toggleMutation = useMutation<{ id: string; isVisible: boolean }, unknown>(
    'patch',
    (input) => `/api/v1/cms/sections/${(input as { id: string }).id}`,
  );
  const reorderMutation = useMutation<{ orderedIds: string[] }, unknown>(
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
      await reorderMutation.mutate({ orderedIds: next.map((s) => s.id) });
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
            onClick={() =>
              toast.push({
                tone: 'info',
                title: 'Add section',
                description: 'Modal in follow-up.',
              })
            }
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}