'use client';

import { useState } from 'react';
import {
  Menu as MenuIcon,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PageHeader, StatusChip, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { MenuItemModal } from '@/components/catalog/menu-item-modal';
import type { CmsMenuDto, CmsMenuItemDto, CmsMenuLocation } from '@ecommarce/types';

const LOCATIONS: Array<{ key: CmsMenuLocation; label: string; hint: string }> = [
  { key: 'HEADER', label: 'Header', hint: 'Top navigation bar + drawer menu' },
  { key: 'FOOTER', label: 'Footer', hint: 'Footer columns' },
  { key: 'MOBILE', label: 'Mobile', hint: 'Mobile drawer (hamburger) menu' },
];

export default function MenusPage() {
  const toast = useToast();
  const [activeLoc, setActiveLoc] = useState<CmsMenuLocation>('HEADER');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CmsMenuItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsMenuItemDto | null>(null);

  const menuQuery = useQuery<CmsMenuDto>(
    `/api/v1/cms/menus/${activeLoc.toLowerCase()}`,
  );

  const items = menuQuery.data?.items ?? [];

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Menus"
        subtitle="Manage header, footer and mobile navigation. Items flow into the storefront automatically."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!menuQuery.data}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> New item
          </button>
        }
      />

      {/* Location tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.key}
            type="button"
            onClick={() => setActiveLoc(loc.key)}
            className={
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px ' +
              (activeLoc === loc.key
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {loc.label}
          </button>
        ))}
        <div className="ml-auto text-[12px] text-slate-500 pr-2">
          {LOCATIONS.find((l) => l.key === activeLoc)?.hint}
        </div>
      </div>

      {/* Content */}
      {menuQuery.loading && !menuQuery.data ? (
        <div className="card p-10 text-center text-slate-400">Loading menu…</div>
      ) : menuQuery.error ? (
        <div className="card p-10 text-center text-danger-700">
          {menuQuery.error.message}
        </div>
      ) : !menuQuery.data ? (
        <div className="card p-10 text-center text-slate-400">
          <MenuIcon className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          Menu not initialized. Use API to create the {activeLoc} menu first.
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <MenuIcon className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          No menu items yet. Click &quot;New item&quot; to start building {activeLoc.toLowerCase()} navigation.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-2">
            {items.map((node, idx) => (
              <MenuItemRow
                key={node.id}
                node={node}
                depth={0}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                expanded={expanded}
                onToggle={toggle}
                onEdit={(n) => setEditTarget(n)}
                onDelete={(n) => setDeleteTarget(n)}
                location={activeLoc}
                siblings={items}
                onReordered={() => void menuQuery.refetch()}
              />
            ))}
          </div>
        </div>
      )}

      <div className="text-[12px] text-slate-400">
        Tip: pick &quot;Category&quot; as link type to place a category or sub-category directly in the menu.
      </div>

      <MenuItemModal
        mode="create"
        location={activeLoc}
        item={null}
        siblings={items}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          void menuQuery.refetch();
        }}
      />

      <MenuItemModal
        mode="edit"
        location={activeLoc}
        item={editTarget}
        siblings={items}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          void menuQuery.refetch();
        }}
      />

      <DeleteItemDialog
        item={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          setDeleteTarget(null);
          void menuQuery.refetch();
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function MenuItemRow({
  node,
  depth,
  isFirst,
  isLast,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  location,
  siblings,
  onReordered,
}: {
  node: CmsMenuItemDto;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (n: CmsMenuItemDto) => void;
  onDelete: (n: CmsMenuItemDto) => void;
  location: CmsMenuLocation;
  siblings: CmsMenuItemDto[];
  onReordered: () => void;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen = expanded.has(node.id);

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-50 group"
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={
            'w-5 h-5 grid place-items-center rounded ' +
            (hasChildren ? 'text-slate-500 hover:bg-slate-100' : 'text-transparent')
          }
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {hasChildren &&
            (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>
        <span className="font-medium text-slate-800 text-sm">{node.labelEn}</span>
        <span className="text-[12.5px] text-slate-400">{node.labelBn}</span>
        <code className="text-[11.5px] text-slate-400 font-mono truncate max-w-[220px]">{node.url}</code>
        {!node.isActive && <StatusChip label="Inactive" tone="neutral" />}
        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ReorderButtons
            node={node}
            siblings={siblings}
            isFirst={isFirst}
            isLast={isLast}
            onDone={onReordered}
          />
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
            aria-label="Edit"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="p-1.5 rounded hover:bg-danger-50 text-danger-600"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </span>
      </div>
      {hasChildren &&
        isOpen &&
        node.children!.map((child, i, arr) => (
          <MenuItemRow
            key={child.id}
            node={child}
            depth={depth + 1}
            isFirst={i === 0}
            isLast={i === arr.length - 1}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            location={location}
            siblings={node.children!}
            onReordered={onReordered}
          />
        ))}
    </>
  );
}

function ReorderButtons({
  node,
  siblings,
  isFirst,
  isLast,
  onDone,
}: {
  node: CmsMenuItemDto;
  siblings: CmsMenuItemDto[];
  isFirst: boolean;
  isLast: boolean;
  onDone: () => void;
}) {
  const move = useMutation<Record<string, unknown>>(
    'patch',
    `/api/v1/cms/menus/items/${node.id}`,
  );

  const swap = async (dir: -1 | 1) => {
    const idx = siblings.findIndex((s) => s.id === node.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    if (!other) return;

    try {
      await move.mutate({ sortOrder: other.sortOrder } as Record<string, unknown>);
      await fetch(`/api/v1/cms/menus/items/${other.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: node.sortOrder }),
      });
      onDone();
    } catch {
      // silent — user will see no change
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void swap(-1)}
        disabled={isFirst}
        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
        aria-label="Move up"
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => void swap(1)}
        disabled={isLast}
        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
        aria-label="Move down"
      >
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
    </>
  );
}

function DeleteItemDialog({
  item,
  onClose,
  onSuccess,
}: {
  item: CmsMenuItemDto | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const del = useMutation<void, { ok: true }>(
    'delete',
    item ? `/api/v1/cms/menus/items/${item.id}` : '/api/v1/cms/menus/items/0',
  );

  if (!item) return null;

  const handleDelete = async () => {
    try {
      await del.mutate(undefined as unknown as void);
      toast.push({ tone: 'success', title: 'Item deleted', description: `${item.labelEn} removed.` });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Delete failed';
      toast.push({ tone: 'error', title: 'Delete failed', description: msg });
    }
  };

  const hasChildren = !!item.children?.length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[420px] bg-surface rounded shadow-md border border-border p-5 space-y-3">
        <div className="text-base font-semibold text-slate-900">Delete menu item?</div>
        <p className="text-[13px] text-slate-600">
          <span className="font-semibold">{item.labelEn}</span> — this cannot be undone.
        </p>
        {hasChildren && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            This item has sub-items. Delete or move them first.
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded border border-border text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={hasChildren || del.loading}
            className="h-9 px-4 rounded bg-danger-600 text-white text-sm font-medium hover:bg-danger-700 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}