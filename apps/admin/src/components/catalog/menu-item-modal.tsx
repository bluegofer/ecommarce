'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMutation, useQuery } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type {
  CmsMenuItemDto,
  CmsMenuLocation,
  CmsPageDto,
  CategoryTreeNode,
} from '@ecommarce/types';

interface MenuItemModalProps {
  mode: 'create' | 'edit';
  location: CmsMenuLocation;
  item?: CmsMenuItemDto | null;
  siblings: CmsMenuItemDto[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type LinkType = 'category' | 'page' | 'custom';

interface FormState {
  labelEn: string;
  labelBn: string;
  linkType: LinkType;
  categorySlug: string;
  pageSlug: string;
  customUrl: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY: FormState = {
  labelEn: '',
  labelBn: '',
  linkType: 'category',
  categorySlug: '',
  pageSlug: '',
  customUrl: '',
  parentId: null,
  sortOrder: 0,
  isActive: true,
};

const inputCls =
  'w-full h-9 px-3 rounded border border-border bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500';

export function MenuItemModal({
  mode,
  location,
  item,
  siblings,
  open,
  onClose,
  onSuccess,
}: MenuItemModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categoriesQuery = useQuery<CategoryTreeNode[]>('/api/v1/categories/tree', {
    enabled: open,
  });
  const pagesQuery = useQuery<CmsPageDto[]>('/api/v1/cms/pages', { enabled: open });

  const isEdit = mode === 'edit';
  const editUrl = isEdit && item ? `/api/v1/cms/menus/items/${item.id}` : '';
  const createUrl = `/api/v1/cms/menus/${location.toLowerCase()}/items`;

  const createMut = useMutation<Record<string, unknown>>('post', createUrl);
  const updateMut = useMutation<Record<string, unknown>>('patch', editUrl);
  const mutation = isEdit ? updateMut : createMut;

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (isEdit && item) {
      let linkType: LinkType = 'custom';
      let categorySlug = '';
      let pageSlug = '';
      let customUrl = item.url ?? '';

      const catMatch =
        item.url?.match(/^\/c\/(.+)$/) || item.url?.match(/^\/(?:bn|en)\/c\/(.+)$/);
      const pageMatch =
        item.url?.match(/^\/pages\/(.+)$/) ||
        item.url?.match(/^\/(?:bn|en)\/pages\/(.+)$/);

      if (catMatch) {
        linkType = 'category';
        categorySlug = catMatch[1] ?? '';
        customUrl = '';
      } else if (pageMatch) {
        linkType = 'page';
        pageSlug = pageMatch[1] ?? '';
        customUrl = '';
      }

      setForm({
        labelEn: item.labelEn ?? '',
        labelBn: item.labelBn ?? '',
        linkType,
        categorySlug,
        pageSlug,
        customUrl,
        parentId: item.parentId ?? null,
        sortOrder: item.sortOrder ?? 0,
        isActive: item.isActive ?? true,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, isEdit, item]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const buildUrl = (): string => {
    if (form.linkType === 'category') {
      return form.categorySlug ? `/c/${form.categorySlug}` : '';
    }
    if (form.linkType === 'page') {
      return form.pageSlug ? `/pages/${form.pageSlug}` : '';
    }
    return form.customUrl;
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!form.labelEn.trim() || !form.labelBn.trim()) {
      setSubmitError('Both English and Bangla labels are required');
      return;
    }

    const url = buildUrl().trim();
    if (!url) {
      setSubmitError('Please select or enter a link destination');
      return;
    }

    const payload: Record<string, unknown> = {
      labelEn: form.labelEn.trim(),
      labelBn: form.labelBn.trim(),
      url,
      parentId: form.parentId,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    try {
      await mutation.mutate(payload);
      toast.push({
        tone: 'success',
        title: isEdit ? 'Menu item updated' : 'Menu item added',
        description: `${form.labelEn} saved.`,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Save failed';
      setSubmitError(msg);
      toast.push({ tone: 'error', title: 'Save failed', description: msg });
    }
  };

  // Parent dropdown — exclude self + descendants in edit mode
  const parentOptions = useMemo(() => {
    const flat: Array<{ id: string; label: string; depth: number }> = [];
    const blocked = new Set<string>();

    if (isEdit && item) {
      const collect = (nodes: CmsMenuItemDto[]): void => {
        for (const n of nodes) {
          blocked.add(n.id);
          collect(n.children ?? []);
        }
      };
      const find = (nodes: CmsMenuItemDto[]): boolean => {
        for (const n of nodes) {
          if (n.id === item.id) {
            collect([n]);
            return true;
          }
          if (find(n.children ?? [])) return true;
        }
        return false;
      };
      find(siblings);
    }

    const walk = (nodes: CmsMenuItemDto[], depth: number) => {
      for (const n of nodes) {
        if (blocked.has(n.id)) continue;
        flat.push({ id: n.id, label: n.labelEn, depth });
        walk(n.children ?? [], depth + 1);
      }
    };
    walk(siblings, 0);
    return flat;
  }, [siblings, isEdit, item]);

  const flatCategories = useMemo(() => {
    const flat: Array<{ slug: string; label: string; depth: number }> = [];
    const walk = (nodes: CategoryTreeNode[], depth: number) => {
      for (const n of nodes) {
        flat.push({ slug: n.slug, label: n.nameEn, depth });
        walk(n.children ?? [], depth + 1);
      }
    };
    walk(categoriesQuery.data ?? [], 0);
    return flat;
  }, [categoriesQuery.data]);

  const isBusy = mutation.loading;

  return (
    <Modal
      open={open}
      onClose={isBusy ? () => undefined : onClose}
      title={isEdit ? 'Edit menu item' : 'New menu item'}
      size="md"
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
            {isEdit ? 'Save changes' : 'Add item'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Label (English)" required>
            <input
              type="text"
              value={form.labelEn}
              onChange={(e) => update('labelEn', e.target.value)}
              placeholder="e.g. Electronics"
              className={inputCls}
              autoFocus
            />
          </Field>
          <Field label="Label (বাংলা)" required>
            <input
              type="text"
              value={form.labelBn}
              onChange={(e) => update('labelBn', e.target.value)}
              placeholder="যেমন: ইলেকট্রনিক্স"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Link type">
          <div className="flex items-center gap-1">
            {(['category', 'page', 'custom'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('linkType', t)}
                className={cn(
                  'px-3 py-1 rounded text-[12.5px] capitalize',
                  form.linkType === t
                    ? 'bg-sky-100 text-sky-700'
                    : 'hover:bg-slate-100 text-slate-600',
                )}
              >
                {t === 'custom' ? 'Custom URL' : t}
              </button>
            ))}
          </div>
        </Field>

        {form.linkType === 'category' && (
          <Field label="Category" hint="Pick a category or sub-category.">
            <select
              value={form.categorySlug}
              onChange={(e) => update('categorySlug', e.target.value)}
              className={inputCls}
            >
              <option value="">— Select category —</option>
              {flatCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {'— '.repeat(c.depth)}
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {form.linkType === 'page' && (
          <Field label="Page" hint="Pick a CMS page.">
            <select
              value={form.pageSlug}
              onChange={(e) => update('pageSlug', e.target.value)}
              className={inputCls}
            >
              <option value="">— Select page —</option>
              {(pagesQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.titleEn}
                </option>
              ))}
            </select>
          </Field>
        )}

        {form.linkType === 'custom' && (
          <Field
            label="URL"
            hint="Relative (/deals) or absolute (https://example.com)."
          >
            <input
              type="text"
              value={form.customUrl}
              onChange={(e) => update('customUrl', e.target.value)}
              placeholder="/deals"
              className={cn(inputCls, 'font-mono text-[13px]')}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Parent item" hint="Leave empty for a top-level menu item.">
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

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => update('isActive', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span className="text-sm text-slate-700">Active (visible on storefront)</span>
        </label>
      </div>
    </Modal>
  );
}

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