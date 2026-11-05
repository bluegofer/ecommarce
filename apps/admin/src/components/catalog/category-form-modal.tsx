'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMutation, useUpload } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { CategoryDto, CategoryTreeNode } from '@ecommarce/types';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface CategoryFormModalProps {
  mode: 'create' | 'edit';
  category?: CategoryDto | null;
  categories: CategoryTreeNode[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  nameEn: string;
  nameBn: string;
  slug: string;
  slugManuallyEdited: boolean;
  parentId: string | null;
  iconName: string;
  descriptionEn: string;
  descriptionBn: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY_FORM: FormState = {
  nameEn: '',
  nameBn: '',
  slug: '',
  slugManuallyEdited: false,
  parentId: null,
  iconName: '',
  descriptionEn: '',
  descriptionBn: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
  metaTitle: '',
  metaDescription: '',
};

// Curated lucide icon names — most-used for e-commerce categories.
// Users can still switch to "Custom" and type any lucide name.
const ICON_LIBRARY: readonly string[] = [
  'shirt',
  'shopping-bag',
  'home',
  'smartphone',
  'laptop',
  'watch',
  'gem',
  'shopping-cart',
  'package',
  'gift',
  'coffee',
  'utensils',
  'apple',
  'carrot',
  'baby',
  'paw-print',
  'dog',
  'cat',
  'book',
  'graduation-cap',
  'music',
  'headphones',
  'camera',
  'video',
  'gamepad-2',
  'dumbbell',
  'bike',
  'car',
  'truck',
  'plane',
  'flower',
  'flower-2',
  'leaf',
  'tree-pine',
  'sun',
  'moon',
  'bed',
  'sofa',
  'armchair',
  'lamp',
  'lamp-desk',
  'fan',
  'wrench',
  'hammer',
  'paintbrush',
  'scissors',
  'stethoscope',
  'pill',
  'sparkles',
  'star',
  'heart',
  'tag',
  'percent',
  'badge',
];

const inputCls =
  'w-full h-9 px-3 rounded border border-border bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500';

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export function CategoryFormModal({
  mode,
  category,
  categories,
  open,
  onClose,
  onSuccess,
}: CategoryFormModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEdit = mode === 'edit';
  const editUrl = isEdit && category ? `/api/v1/categories/${category.id}` : '/api/v1/categories';

  const createMut = useMutation<Record<string, unknown>>('post', '/api/v1/categories');
  const updateMut = useMutation<Record<string, unknown>>('patch', editUrl);
  const mutation = isEdit ? updateMut : createMut;

  // Reset form whenever the modal opens or the target changes
  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (isEdit && category) {
      setForm({
        nameEn: category.nameEn,
        nameBn: category.nameBn,
        slug: category.slug,
        slugManuallyEdited: true,
        parentId: category.parentId,
        iconName: category.iconName ?? '',
        descriptionEn: category.descriptionEn ?? '',
        descriptionBn: category.descriptionBn ?? '',
        imageUrl: category.imageUrl ?? '',
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        metaTitle: category.metaTitle ?? '',
        metaDescription: category.metaDescription ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, isEdit, category]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next: FormState = { ...prev, [key]: value };
      if (key === 'nameEn' && !prev.slugManuallyEdited && typeof value === 'string') {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!form.nameEn.trim() || !form.nameBn.trim()) {
      setSubmitError('Name (English) and Name (বাংলা) are required');
      return;
    }

    const payload: Record<string, unknown> = {
      nameEn: form.nameEn.trim(),
      nameBn: form.nameBn.trim(),
      slug: form.slug.trim() || slugify(form.nameEn),
      parentId: form.parentId,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    if (form.descriptionEn.trim()) payload.descriptionEn = form.descriptionEn.trim();
    if (form.descriptionBn.trim()) payload.descriptionBn = form.descriptionBn.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.iconName.trim()) payload.iconName = form.iconName.trim();
    if (form.metaTitle.trim()) payload.metaTitle = form.metaTitle.trim();
    if (form.metaDescription.trim()) payload.metaDescription = form.metaDescription.trim();

    try {
      await mutation.mutate(payload);
      toast.push({
        tone: 'success',
        title: isEdit ? 'Category updated' : 'Category created',
        description: `${form.nameEn} saved successfully.`,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Something went wrong';
      setSubmitError(msg);
      toast.push({ tone: 'error', title: 'Save failed', description: msg });
    }
  };

  // Parent dropdown options — flat tree with indentation.
  // In edit mode, exclude self and descendants (would cause a cycle).
  const parentOptions = useMemo(() => {
    const flat: Array<{ id: string; label: string; depth: number }> = [];
    const blocked = new Set<string>();

    if (isEdit && category) {
      const collectIds = (nodes: CategoryTreeNode[]): void => {
        for (const n of nodes) {
          blocked.add(n.id);
          collectIds(n.children ?? []);
        }
      };
      const findAndBlock = (nodes: CategoryTreeNode[]): boolean => {
        for (const n of nodes) {
          if (n.id === category.id) {
            collectIds([n]);
            return true;
          }
          if (findAndBlock(n.children ?? [])) return true;
        }
        return false;
      };
      findAndBlock(categories);
    }

    const walk = (nodes: CategoryTreeNode[], depth: number) => {
      for (const n of nodes) {
        if (blocked.has(n.id)) continue;
        flat.push({ id: n.id, label: n.nameEn, depth });
        walk(n.children ?? [], depth + 1);
      }
    };
    walk(categories, 0);
    return flat;
  }, [categories, isEdit, category]);

  const isBusy = mutation.loading;

  return (
    <Modal
      open={open}
      onClose={isBusy ? () => undefined : onClose}
      title={isEdit ? 'Edit category' : 'New category'}
      size="lg"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="h-9 px-3 rounded border border-border text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isBusy}
            className="h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create category'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {submitError && (
          <div className="rounded border border-danger-200 bg-danger-50 px-3 py-2 text-[13px] text-danger-800">
            {submitError}
          </div>
        )}

        {/* Row 1 — Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name (English)" required>
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => update('nameEn', e.target.value)}
              placeholder="e.g. Electronics"
              className={inputCls}
              autoFocus
            />
          </Field>
          <Field label="Name (বাংলা)" required>
            <input
              type="text"
              value={form.nameBn}
              onChange={(e) => update('nameBn', e.target.value)}
              placeholder="যেমন: ইলেকট্রনিক্স"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Row 2 — Slug + Sort */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Slug" hint="Auto-generated from English name. Must be unique.">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => {
                update('slug', e.target.value);
                setForm((prev) => ({ ...prev, slugManuallyEdited: true }));
              }}
              placeholder="electronics"
              className={cn(inputCls, 'font-mono text-[13px]')}
            />
          </Field>
          <Field label="Sort order" hint="Lower numbers appear first.">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => update('sortOrder', Number(e.target.value) || 0)}
              min={0}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Row 3 — Parent + Icon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Parent category" hint="Leave empty for a top-level category.">
            <select
              value={form.parentId ?? ''}
              onChange={(e) => update('parentId', e.target.value || null)}
              className={inputCls}
            >
              <option value="">— None (top-level) —</option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {'— '.repeat(opt.depth)}
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Icon" hint="Used in storefront mega-menu & home tiles.">
            <IconPicker value={form.iconName} onChange={(v) => update('iconName', v)} />
          </Field>
        </div>

        {/* Row 4 — Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Description (English)">
            <textarea
              value={form.descriptionEn}
              onChange={(e) => update('descriptionEn', e.target.value)}
              rows={3}
              placeholder="Optional — short summary for SEO and the category page."
              className={cn(inputCls, 'h-auto py-2')}
            />
          </Field>
          <Field label="Description (বাংলা)">
            <textarea
              value={form.descriptionBn}
              onChange={(e) => update('descriptionBn', e.target.value)}
              rows={3}
              placeholder="ঐচ্ছিক — ক্যাটাগরি পেজের জন্য ছোট বর্ণনা।"
              className={cn(inputCls, 'h-auto py-2')}
            />
          </Field>
        </div>

        {/* Row 5 — Image */}
        <Field label="Category image" hint="Upload from media library or paste a URL.">
          <ImageUploadField value={form.imageUrl} onChange={(v) => update('imageUrl', v)} />
        </Field>

        {/* Row 6 — Active toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => update('isActive', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span className="text-sm text-slate-700">Active (visible on storefront)</span>
        </label>

        {/* Row 7 — SEO */}
        <details className="rounded border border-border bg-slate-50 px-4 py-3">
          <summary className="text-sm font-medium text-slate-700 cursor-pointer select-none">
            SEO (optional)
          </summary>
          <div className="mt-3 space-y-3">
            <Field label="Meta title" hint="Defaults to category name if empty.">
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) => update('metaTitle', e.target.value)}
                placeholder="Best Electronics in Bangladesh"
                className={inputCls}
              />
            </Field>
            <Field label="Meta description" hint="Recommended 150–160 characters.">
              <textarea
                value={form.metaDescription}
                onChange={(e) => update('metaDescription', e.target.value)}
                rows={2}
                placeholder="Shop top-rated electronics with fast delivery across Bangladesh."
                className={cn(inputCls, 'h-auto py-2')}
              />
            </Field>
          </div>
        </details>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Form primitives
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
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-medium text-slate-700">
        {label}
        {required && <span className="text-danger-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-slate-500">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Icon picker
// ─────────────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<'grid' | 'custom'>(
    value && !ICON_LIBRARY.includes(value) ? 'custom' : 'grid',
  );
  const [showGrid, setShowGrid] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowGrid((s) => !s)}
          className="h-9 px-3 rounded border border-border bg-white text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
        >
          {value ? <span className="font-mono text-[12.5px]">{value}</span> : <span className="text-slate-400">Select icon…</span>}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-2 rounded hover:bg-slate-100 text-slate-500"
            aria-label="Clear icon"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 text-[11.5px] text-slate-500">
          <button
            type="button"
            onClick={() => setMode('grid')}
            className={cn('px-2 py-0.5 rounded', mode === 'grid' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100')}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={cn('px-2 py-0.5 rounded', mode === 'custom' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100')}
          >
            Custom
          </button>
        </div>
      </div>

      {mode === 'custom' ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. shopping-bag (any lucide icon name)"
          className={cn(inputCls, 'font-mono text-[13px]')}
        />
      ) : showGrid ? (
        <div className="rounded border border-border bg-white p-3 max-h-56 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {ICON_LIBRARY.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onChange(name);
                  setShowGrid(false);
                }}
                className={cn(
                  'aspect-square rounded text-[10px] text-slate-600 flex items-center justify-center border truncate px-0.5',
                  value === name ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-transparent hover:bg-sky-50',
                )}
                title={name}
              >
                {name.slice(0, 6)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] text-slate-500">
          Click the button above to browse {ICON_LIBRARY.length} icons, or switch to Custom for any lucide name.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Image upload — file picker + URL fallback
// ─────────────────────────────────────────────────────────────────────

function ImageUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const upload = useUpload<{ url: string }>('/api/v1/uploads/media');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const res = await upload.upload(file);
      onChange(res.url);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Upload failed';
      setError(msg);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cn('text-[11.5px] px-2 py-0.5 rounded', mode === 'upload' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100')}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn('text-[11.5px] px-2 py-0.5 rounded', mode === 'url' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100')}
        >
          Paste URL
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void handleFile(e.target.files?.[0])}
            className="hidden"
            id="cat-image-input"
          />
          <label
            htmlFor="cat-image-input"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {upload.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {upload.loading ? 'Uploading…' : 'Choose file'}
          </label>
          {value && <span className="text-[11.5px] text-slate-500 font-mono truncate">{value}</span>}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/media/categories/electronics.webp"
          className={cn(inputCls, 'font-mono text-[13px]')}
        />
      )}

      {error && <p className="text-[11.5px] text-danger-700">{error}</p>}

      {value && (
        <div className="mt-2 flex items-center gap-2">
          <img
            src={value}
            alt="Category preview"
            className="w-16 h-16 rounded border border-border object-cover bg-slate-50"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11.5px] text-danger-600 hover:underline"
          >
            Remove image
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}