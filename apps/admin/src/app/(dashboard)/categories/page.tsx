'use client';

import { useState } from 'react';
import { FolderTree, Plus, ChevronRight, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { PageHeader, StatusChip } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { CategoryFormModal } from '@/components/catalog/category-form-modal';
import { CategoryDeleteDialog } from '@/components/catalog/category-delete-dialog';
import type { CategoryDto, CategoryTreeNode } from '@ecommarce/types';

export default function CategoriesPage() {
  const { data, loading, error, refetch } = useQuery<CategoryTreeNode[]>(
    '/api/v1/categories/tree',
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDto | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const findNode = (nodes: CategoryTreeNode[], id: string): CategoryTreeNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children ?? [], id);
      if (found) return found;
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        subtitle="Infinite-depth tree · drag to reorder · category attributes drive product forms"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New category
          </button>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading tree…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <FolderTree className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            No categories yet — create your first one to build the catalog.
          </div>
        ) : (
          <div className="p-2">
            {data.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                onEdit={(n) => setEditTarget(n)}
                onDelete={(n) => setDeleteTarget(n)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-[12px] text-slate-400">
        Tip: categories with no children can be parents of products; any node can hold attributes.
      </div>

      <CategoryFormModal
        mode="create"
        category={null}
        categories={data ?? []}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          void refetch();
        }}
      />

      <CategoryFormModal
        mode="edit"
        category={editTarget}
        categories={data ?? []}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          void refetch();
        }}
      />

      <CategoryDeleteDialog
        category={deleteTarget}
        hasChildren={!!(deleteTarget && findNode(data ?? [], deleteTarget.id)?.children?.length)}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          setDeleteTarget(null);
          void refetch();
        }}
      />
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  node: CategoryTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (n: CategoryTreeNode) => void;
  onDelete: (n: CategoryTreeNode) => void;
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
          className={`w-5 h-5 grid place-items-center rounded ${
            hasChildren ? 'text-slate-500 hover:bg-slate-100' : 'text-transparent'
          }`}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {hasChildren && (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>
        <span className="font-medium text-slate-800 text-sm">{node.nameEn}</span>
        <span className="text-[12.5px] text-slate-400">{node.nameBn}</span>
        <code className="text-[11.5px] text-slate-400 font-mono">{node.slug}</code>
        {!node.isActive && <StatusChip label="Inactive" tone="neutral" />}
        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        node.children!.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}