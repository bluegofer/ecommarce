'use client';

import { useState } from 'react';
import { FolderTree, Plus, ChevronRight, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { PageHeader, StatusChip, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface CategoryNode {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  children?: CategoryNode[];
}

export default function CategoriesPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<CategoryNode[]>(
    '/api/v1/categories/tree',
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
        title="Categories"
        subtitle="Infinite-depth tree · drag to reorder · category attributes drive product forms"
        actions={
          <button
            type="button"
            onClick={() => toast.push({ tone: 'info', title: 'Create category', description: 'Modal wired in Batch B.3.' })}
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
                onEdit={(n) => toast.push({ tone: 'info', title: `Edit ${n.nameEn}`, description: 'Wired in B.3.' })}
                onDelete={(n) => toast.push({ tone: 'warning', title: `Delete ${n.nameEn}`, description: 'Confirm modal wired in B.3.' })}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-[12px] text-slate-400">
        Tip: categories with no children can be parents of products; any node can hold attributes.
      </div>
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
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (n: CategoryNode) => void;
  onDelete: (n: CategoryNode) => void;
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