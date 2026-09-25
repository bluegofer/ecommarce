'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Plus,
  Trash2,
  UploadCloud,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { PageHeader, StatusChip, EmptyState, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation, useUpload } from '@/lib/hooks';

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

interface HeroSlideConfig {
  imageUrl: string;
  titleEn: string;
  titleBn: string;
  ctaHref: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
}

interface BannerConfig {
  imageUrl: string;
  titleEn: string;
  titleBn: string;
  ctaHref: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
}

interface Section {
  id: string;
  key: string;
  sectionType: SectionType;
  titleEn: string | null;
  titleBn: string | null;
  position: number;
  config: Record<string, unknown> | null;
  isVisible: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

interface CategoryNode {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  children?: CategoryNode[];
}

interface UploadResult {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
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

const BANNER_MAX: Partial<Record<SectionType, number>> = {
  PROMO_TILES: 4,
  PROMO_BANNER: 4,
  WIDE_BANNER: 1,
};

interface AddFormState {
  key: string;
  sectionType: SectionType;
  titleEn: string;
  titleBn: string;
  position: number;
  isVisible: boolean;
  heroSlides: HeroSlideConfig[];
  categoryIds: string[];
  banners: BannerConfig[];
}

const EMPTY_SLIDE: HeroSlideConfig = {
  imageUrl: '',
  titleEn: '',
  titleBn: '',
  ctaHref: '',
  ctaLabelEn: '',
  ctaLabelBn: '',
};

const EMPTY_BANNER: BannerConfig = {
  imageUrl: '',
  titleEn: '',
  titleBn: '',
  ctaHref: '',
  ctaLabelEn: '',
  ctaLabelBn: '',
};

const EMPTY_FORM: AddFormState = {
  key: '',
  sectionType: 'HERO_CAROUSEL',
  titleEn: '',
  titleBn: '',
  position: 0,
  isVisible: true,
  heroSlides: [],
  categoryIds: [],
  banners: [],
};

function sectionLabel(s: Section): string {
  return s.titleEn ?? s.titleBn ?? TYPE_LABEL[s.sectionType] ?? s.sectionType;
}

function flattenCategories(nodes: CategoryNode[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  const out: Array<{ id: string; name: string; depth: number }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: `${'— '.repeat(depth)}${n.nameEn}`, depth });
    if (n.children?.length) out.push(...flattenCategories(n.children, depth + 1));
  }
  return out;
}

export default function CmsPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<Section[]>('/api/v1/cms/sections');
  const categoriesQuery = useQuery<CategoryNode[]>('/api/v1/categories/tree');

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
  const createMutation = useMutation<
    {
      key: string;
      sectionType: SectionType;
      titleEn?: string;
      titleBn?: string;
      position: number;
      config?: Record<string, unknown>;
      isVisible: boolean;
    },
    unknown
  >('post', '/api/v1/cms/sections');
  const deleteMutation = useMutation<string, unknown>(
    'delete',
    (input) => `/api/v1/cms/sections/${(input as unknown as string)}`,
  );

  const uploadMutation = useUpload<UploadResult>('/api/v1/uploads/media');

  const saveMediaLibraryMutation = useMutation<
    { url: string; filename: string; mimeType: string; sizeBytes: number; altText?: string },
    unknown
  >('post', '/api/v1/cms/media-library');

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

    // Build config based on sectionType
    let config: Record<string, unknown> | undefined = undefined;

    if (form.sectionType === 'HERO_CAROUSEL') {
      const validSlides = form.heroSlides.filter(
        (s) => s.imageUrl.trim() && s.titleEn.trim() && s.ctaHref.trim(),
      );
      if (validSlides.length === 0) {
        toast.error('Missing slides', 'Hero carousel needs at least 1 complete slide');
        return;
      }
      config = { slides: validSlides };
    } else if (form.sectionType === 'CATEGORY_TILES') {
      if (form.categoryIds.length === 0) {
        toast.error('Missing categories', 'Select at least 1 category');
        return;
      }
      config = { categoryIds: form.categoryIds };
    } else if (
      form.sectionType === 'PROMO_TILES' ||
      form.sectionType === 'PROMO_BANNER' ||
      form.sectionType === 'WIDE_BANNER'
    ) {
      const max = BANNER_MAX[form.sectionType] ?? 4;
      const validBanners = form.banners
        .filter((b) => b.imageUrl.trim() && b.titleEn.trim() && b.ctaHref.trim())
        .slice(0, max);
      if (validBanners.length === 0) {
        toast.error('Missing banners', 'Add at least 1 complete banner tile');
        return;
      }
      config = { banners: validBanners };
    }

    try {
      const payload: {
        key: string;
        sectionType: SectionType;
        titleEn?: string;
        titleBn?: string;
        position: number;
        config?: Record<string, unknown>;
        isVisible: boolean;
      } = {
        key,
        sectionType: form.sectionType,
        position: form.position,
        isVisible: form.isVisible,
      };
      if (titleEn) payload.titleEn = titleEn;
      if (titleBn) payload.titleBn = titleBn;
      if (config) payload.config = config;

      await createMutation.mutate(payload);
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

  // Hero slide helpers
  function addSlide() {
    setForm((f) => ({ ...f, heroSlides: [...f.heroSlides, { ...EMPTY_SLIDE }] }));
  }
  function updateSlide(idx: number, patch: Partial<HeroSlideConfig>) {
    setForm((f) => {
      const slides = [...f.heroSlides];
      slides[idx] = { ...slides[idx]!, ...patch };
      return { ...f, heroSlides: slides };
    });
  }
  function removeSlide(idx: number) {
    setForm((f) => ({ ...f, heroSlides: f.heroSlides.filter((_, i) => i !== idx) }));
  }
  async function uploadSlideImage(idx: number, file: File) {
    try {
      const uploaded = await uploadMutation.upload(file);
      await saveMediaLibraryMutation.mutate({
        url: uploaded.url,
        filename: uploaded.filename,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        altText: uploaded.filename,
      });
      updateSlide(idx, { imageUrl: uploaded.url });
      toast.success('Image uploaded');
    } catch (e) {
      toast.error('Upload failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  // Category toggle
  function toggleCategory(id: string) {
    setForm((f) => {
      const has = f.categoryIds.includes(id);
      return {
        ...f,
        categoryIds: has
          ? f.categoryIds.filter((c) => c !== id)
          : [...f.categoryIds, id],
      };
    });
  }

  // Banner helpers
  function addBanner() {
    const max = BANNER_MAX[form.sectionType] ?? 4;
    setForm((f) => {
      if (f.banners.length >= max) return f;
      return { ...f, banners: [...f.banners, { ...EMPTY_BANNER }] };
    });
  }
  function updateBanner(idx: number, patch: Partial<BannerConfig>) {
    setForm((f) => {
      const banners = [...f.banners];
      banners[idx] = { ...banners[idx]!, ...patch };
      return { ...f, banners };
    });
  }
  function removeBanner(idx: number) {
    setForm((f) => ({ ...f, banners: f.banners.filter((_, i) => i !== idx) }));
  }
  async function uploadBannerImage(idx: number, file: File) {
    try {
      const uploaded = await uploadMutation.upload(file);
      await saveMediaLibraryMutation.mutate({
        url: uploaded.url,
        filename: uploaded.filename,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        altText: uploaded.filename,
      });
      updateBanner(idx, { imageUrl: uploaded.url });
      toast.success('Image uploaded');
    } catch (e) {
      toast.error('Upload failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  const flatCategories = categoriesQuery.data ? flattenCategories(categoriesQuery.data) : [];
  const bannerMax = BANNER_MAX[form.sectionType] ?? 4;
  const isBannerType =
    form.sectionType === 'PROMO_TILES' ||
    form.sectionType === 'PROMO_BANNER' ||
    form.sectionType === 'WIDE_BANNER';

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
        </Link>{' '}
        ·{' '}
        <Link href="/cms/announcements" className="text-sky-700 hover:underline font-medium">
          Announcements
        </Link>{' '}
        ·{' '}
        <Link href="/cms/popups" className="text-sky-700 hover:underline font-medium">
          Popups
        </Link>{' '}
        ·{' '}
        <Link href="/cms/contact" className="text-sky-700 hover:underline font-medium">
          Contact
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

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add homepage section"
        size="lg"
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
            <span className="text-[12.5px] font-medium text-slate-700">Section type</span>
            <select
              value={form.sectionType}
              onChange={(e) => {
                const st = e.target.value as SectionType;
                setForm((f) => ({
                  ...f,
                  sectionType: st,
                  heroSlides: st === 'HERO_CAROUSEL' && f.heroSlides.length === 0
                    ? [{ ...EMPTY_SLIDE }]
                    : f.heroSlides,
                  banners:
                    (st === 'PROMO_TILES' || st === 'PROMO_BANNER' || st === 'WIDE_BANNER') &&
                    f.banners.length === 0
                      ? [{ ...EMPTY_BANNER }]
                      : f.banners,
                }));
              }}
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
            <span className="text-[12.5px] font-medium text-slate-700">Key (unique)</span>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm font-mono"
              placeholder="e.g. home-hero-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">English title</span>
              <input
                type="text"
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">Bangla title</span>
              <input
                type="text"
                value={form.titleBn}
                onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
              />
            </label>
          </div>
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
              onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
            />
            <span className="text-sm text-slate-700">Visible on storefront</span>
          </label>

          {/* ── HERO_CAROUSEL: slides editor ── */}
          {form.sectionType === 'HERO_CAROUSEL' && (
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-semibold text-slate-700">
                  Hero slides ({form.heroSlides.length})
                </span>
                <button
                  type="button"
                  onClick={addSlide}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded bg-sky-600 text-white text-[12.5px] font-medium hover:bg-sky-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Add slide
                </button>
              </div>
              {form.heroSlides.length === 0 ? (
                <p className="text-[12px] text-slate-400 py-3 text-center bg-slate-50 rounded">
                  No slides yet — click “Add slide”.
                </p>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {form.heroSlides.map((slide, idx) => (
                    <div key={idx} className="rounded border border-border bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11.5px] font-semibold text-slate-600">
                          Slide #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlide(idx)}
                          className="h-7 w-7 grid place-items-center rounded hover:bg-slate-200"
                          aria-label="Remove slide"
                        >
                          <X className="w-3.5 h-3.5 text-danger-600" />
                        </button>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-24 h-24 shrink-0">
                          {slide.imageUrl ? (
                            <div className="relative w-24 h-24 rounded overflow-hidden border border-border">
                              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => updateSlide(idx, { imageUrl: '' })}
                                className="absolute top-0.5 right-0.5 p-1 rounded bg-danger-600 text-white hover:bg-danger-700"
                                aria-label="Remove image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-24 h-24 rounded border-2 border-dashed border-sky-400 bg-white grid place-items-center text-sky-600 hover:bg-sky-50 cursor-pointer text-[11px] font-medium">
                              <UploadCloud className="w-5 h-5" />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadMutation.loading}
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void uploadSlideImage(idx, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                          <input type="text" value={slide.titleEn} onChange={(e) => updateSlide(idx, { titleEn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="Title (EN)" />
                          <input type="text" value={slide.titleBn} onChange={(e) => updateSlide(idx, { titleBn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="Title (BN)" />
                          <input type="text" value={slide.ctaLabelEn} onChange={(e) => updateSlide(idx, { ctaLabelEn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="CTA (EN)" />
                          <input type="text" value={slide.ctaLabelBn} onChange={(e) => updateSlide(idx, { ctaLabelBn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="CTA (BN)" />
                          <input type="text" value={slide.ctaHref} onChange={(e) => updateSlide(idx, { ctaHref: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px] font-mono col-span-2" placeholder="Link URL" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CATEGORY_TILES: category multi-select ── */}
          {form.sectionType === 'CATEGORY_TILES' && (
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-semibold text-slate-700">
                  Categories ({form.categoryIds.length} selected)
                </span>
                {categoriesQuery.loading && (
                  <span className="text-[11px] text-slate-400">Loading…</span>
                )}
              </div>
              {categoriesQuery.error ? (
                <p className="text-[12px] text-danger-600 py-2">
                  Failed to load categories: {categoriesQuery.error.message}
                </p>
              ) : flatCategories.length === 0 ? (
                <p className="text-[12px] text-slate-400 py-3 text-center bg-slate-50 rounded">
                  No categories found.
                </p>
              ) : (
                <div className="max-h-[280px] overflow-y-auto border border-border rounded bg-slate-50 p-2 space-y-1">
                  {flatCategories.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer text-[12.5px] text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.categoryIds.includes(c.id)}
                        onChange={() => toggleCategory(c.id)}
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[11.5px] text-slate-400 mt-1">
                Selected categories show as quick tiles (max 4).
              </p>
            </div>
          )}

          {/* ── PROMO_TILES / PROMO_BANNER / WIDE_BANNER: banners editor ── */}
          {isBannerType && (
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-semibold text-slate-700">
                  Banner tiles ({form.banners.length}/{bannerMax})
                </span>
                <button
                  type="button"
                  onClick={addBanner}
                  disabled={form.banners.length >= bannerMax}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded bg-sky-600 text-white text-[12.5px] font-medium hover:bg-sky-700 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add tile
                </button>
              </div>
              {form.banners.length === 0 ? (
                <p className="text-[12px] text-slate-400 py-3 text-center bg-slate-50 rounded">
                  No banners yet — click “Add tile”.
                </p>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {form.banners.map((banner, idx) => (
                    <div key={idx} className="rounded border border-border bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11.5px] font-semibold text-slate-600">
                          Tile #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBanner(idx)}
                          className="h-7 w-7 grid place-items-center rounded hover:bg-slate-200"
                          aria-label="Remove tile"
                        >
                          <X className="w-3.5 h-3.5 text-danger-600" />
                        </button>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-24 h-24 shrink-0">
                          {banner.imageUrl ? (
                            <div className="relative w-24 h-24 rounded overflow-hidden border border-border">
                              <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => updateBanner(idx, { imageUrl: '' })}
                                className="absolute top-0.5 right-0.5 p-1 rounded bg-danger-600 text-white hover:bg-danger-700"
                                aria-label="Remove image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-24 h-24 rounded border-2 border-dashed border-sky-400 bg-white grid place-items-center text-sky-600 hover:bg-sky-50 cursor-pointer text-[11px] font-medium">
                              <ImageIcon className="w-5 h-5" />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadMutation.loading}
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void uploadBannerImage(idx, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                          <input type="text" value={banner.titleEn} onChange={(e) => updateBanner(idx, { titleEn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="Title (EN)" />
                          <input type="text" value={banner.titleBn} onChange={(e) => updateBanner(idx, { titleBn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="Title (BN)" />
                          <input type="text" value={banner.ctaLabelEn} onChange={(e) => updateBanner(idx, { ctaLabelEn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="CTA (EN)" />
                          <input type="text" value={banner.ctaLabelBn} onChange={(e) => updateBanner(idx, { ctaLabelBn: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px]" placeholder="CTA (BN)" />
                          <input type="text" value={banner.ctaHref} onChange={(e) => updateBanner(idx, { ctaHref: e.target.value })} className="h-8 px-2 rounded border border-border text-[12px] font-mono col-span-2" placeholder="Link URL" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Other types — placeholder ── */}
          {form.sectionType !== 'HERO_CAROUSEL' &&
            form.sectionType !== 'CATEGORY_TILES' &&
            !isBannerType && (
              <p className="text-[11.5px] text-slate-400 bg-slate-50 rounded p-2">
                Config editor for <strong>{TYPE_LABEL[form.sectionType]}</strong> will arrive in a follow-up. For now this section uses default storefront content.
              </p>
            )}
        </div>
      </Modal>
    </div>
  );
}