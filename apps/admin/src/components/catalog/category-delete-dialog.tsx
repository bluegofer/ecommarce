'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMutation } from '@/lib/hooks';
import type { CategoryDto } from '@ecommarce/types';

interface CategoryDeleteDialogProps {
  category: CategoryDto | null;
  hasChildren: boolean;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryDeleteDialog({
  category,
  hasChildren,
  open,
  onClose,
  onSuccess,
}: CategoryDeleteDialogProps) {
  const toast = useToast();
  const deleteUrl = category ? `/api/v1/categories/${category.id}` : '/api/v1/categories';
  const del = useMutation<void, { ok: true }>('delete', deleteUrl);

  if (!category) return null;

  const handleDelete = async () => {
    try {
      await del.mutate(undefined as unknown as void);
      toast.push({
        tone: 'success',
        title: 'Category deleted',
        description: `${category.nameEn} has been removed.`,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Delete failed';
      toast.push({ tone: 'error', title: 'Delete failed', description: msg });
    }
  };

  const isBusy = del.loading;
  const blocked = hasChildren;

  return (
    <Modal
      open={open}
      onClose={isBusy ? () => undefined : onClose}
      title="Delete category"
      size="sm"
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
            onClick={() => void handleDelete()}
            disabled={isBusy || blocked}
            className="h-9 px-4 rounded bg-danger-600 text-white text-sm font-medium hover:bg-danger-700 disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-danger-50 grid place-items-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm text-slate-800">
              Delete <span className="font-semibold">{category.nameEn}</span>?
            </p>
            <p className="text-[12.5px] text-slate-500">
              This action cannot be undone. Products or sub-categories linked to
              this category must be cleared first.
            </p>
          </div>
        </div>

        {blocked && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            This category has sub-categories. Delete or move them first.
          </div>
        )}

        <div className="rounded bg-slate-50 border border-border px-3 py-2 text-[12px] text-slate-600">
          <div className="font-mono">{category.slug}</div>
        </div>
      </div>
    </Modal>
  );
}