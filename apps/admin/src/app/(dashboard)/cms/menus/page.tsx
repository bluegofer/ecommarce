'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Menu as MenuIcon, Plus, Trash2, Pencil, Link2 } from 'lucide-react';
import {
  PageHeader,
  Modal,
  EmptyState,
  StatusChip,
  useToast,
} from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

type MenuLocation = 'HEADER' | 'FOOTER' | 'MOBILE';

interface CmsMenuItem {
  id: string;
  menuId: string;
  parentId: string | null;
  labelEn: string;
  labelBn: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  children?: CmsMenuItem[];
}

interface CmsMenu {
  id: string;
  location: MenuLocation;
  name: string;
  items: CmsMenuItem[];
}

interface MenuItemFormState {
  id: string | null;
  parentId: string | null;
  labelEn: string;
  labelBn: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

const LOCATIONS: Array<{ key: MenuLocation; label: string }> = [
  { key: 'HEADER', label: 'Header menu' },
  { key: 'FOOTER', label: 'Footer links' },
  { key: 'MOBILE', label: 'Mobile menu' },
];

const EMPTY_FORM: MenuItemFormState = {
  id: null,
  parentId: null,
  labelEn: '',
  labelBn: '',
  url: '',
  sortOrder: 0,
  isActive: true,
};

export default function CmsMenusPage() {
  const toast = useToast();
  const [activeLocation, setActiveLocation] = useState<MenuLocation>('HEADER');
  const [itemForm, setItemForm] = useState<MenuItemFormState | null>(null);
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');

  const menuQuery = useQuery<CmsMenu | null>(
    `/api/v1/cms/menus/${activeLocation.toLowerCase()}`,
  );

  const menu = menuQuery.data;

  const upsertMenuMutation = useMutation<{ name: string }, unknown>(
    'post',
    `/api/v1/cms/menus/${activeLocation.toLowerCase()}`,
  );

  const saveItemMutation = useMutation<unknown, unknown>(
    itemForm?.id ? 'patch' : 'post',
    itemForm?.id
      ? `/api/v1/cms/menus/items/${itemForm.id}`
      : `/api/v1/cms/menus/${activeLocation.toLowerCase()}/items`,
  );

  const deleteItemMutation = useMutation<string, unknown>(
    'delete',
    (input) => `/api/v1/cms/menus/items/${(input as unknown as string)}`,
  );

  // Flatten items (including children) for display — mock shows a flat table.
  const flatItems = useMemo<CmsMenuItem[]>(() => {
    if (!menu) return [];
    const out: CmsMenuItem[] = [];
    const walk = (nodes: CmsMenuItem[]) => {
      for (const n of nodes) {
        const { children, ...rest } = n;
        out.push(rest);
        if (children && children.length) walk(children);
      }
    };
    walk(menu.items);
    return out;
  }, [menu]);

  async function handleCreateMenu() {
    if (!newMenuName.trim()) return;
    try {
      await upsertMenuMutation.mutate({ name: newMenuName.trim() });
      toast.success('Menu created');
      setCreatingMenu(false);
      setNewMenuName('');
      void menuQuery.refetch();
    } catch (e) {
      toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function handleSaveItem() {
    if (!itemForm) return;
    if (!itemForm.labelEn.trim() || !itemForm.labelBn.trim() || !itemForm.url.trim()) {
      toast.error('Missing fields', 'English label, Bangla label, and URL are required');
      return;
    }
    const payload = {
      labelEn: itemForm.labelEn.trim(),
      labelBn: itemForm.labelBn.trim(),
      url: itemForm.url.trim(),
      parentId: itemForm.parentId,
      sortOrder: itemForm.sortOrder,
      isActive: itemForm.isActive,
    };
    try {
      await saveItemMutation.mutate(payload);
      toast.success(itemForm.id ? 'Item updated' : 'Item added');
      setItemForm(null);
      void menuQuery.refetch();
    } catch (e) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function handleDeleteItem(item: CmsMenuItem) {
    if (!confirm(`Delete "${item.labelEn}"?`)) return;
    try {
      await deleteItemMutation.mutate(item.id);
      toast.success('Item deleted');
      void menuQuery.refetch();
    } catch (e) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-[12.5px] text-slate-500">
        <Link href="/cms" className="text-sky-700 hover:underline font-medium">
          ← CMS Home
        </Link>
      </div>

      <PageHeader
        title="CMS · Menus"
        subtitle="Header menus, footer links, and mobile navigation"
        actions={
          menu ? (
            <button
              type="button"
              onClick={() => setItemForm({ ...EMPTY_FORM })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" /> Add item
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingMenu(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" /> Create menu
            </button>
          )
        }
      />

      {/* Location tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.key}
            type="button"
            onClick={() => setActiveLocation(loc.key)}
            className={
              'h-10 px-3 text-sm font-medium border-b-2 -mb-px transition-colors ' +
              (activeLocation === loc.key
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {loc.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {menuQuery.loading && !menuQuery.data ? (
          <div className="p-10 text-center text-slate-400">Loading menu…</div>
        ) : menuQuery.error ? (
          <div className="p-10 text-center text-danger-700">{menuQuery.error.message}</div>
        ) : !menu ? (
          <EmptyState
            icon={MenuIcon}
            title={`No ${activeLocation.toLowerCase()} menu yet`}
            description="Create a menu to add navigation links — required for header/footer navigation."
          />
        ) : flatItems.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No items in this menu"
            description="Use “Add item” to add the first link."
          />
        ) : (
          <ul className="divide-y divide-border">
            {flatItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 p-4 hover:bg-slate-50"
              >
                <span className="w-10 text-[12px] tabular-nums text-slate-400">
                  {item.sortOrder}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      {item.labelEn}
                    </span>
                    {item.labelBn && (
                      <span className="text-[12px] text-slate-500 truncate">
                        / {item.labelBn}
                      </span>
                    )}
                    {!item.isActive && <StatusChip label="Hidden" tone="neutral" />}
                  </div>
                  <code className="text-[12px] text-slate-400 font-mono truncate">
                    {item.url}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setItemForm({
                        id: item.id,
                        parentId: item.parentId,
                        labelEn: item.labelEn,
                        labelBn: item.labelBn,
                        url: item.url,
                        sortOrder: item.sortOrder,
                        isActive: item.isActive,
                      })
                    }
                    className="h-8 w-8 grid place-items-center rounded hover:bg-slate-100"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteItem(item)}
                    className="h-8 w-8 grid place-items-center rounded hover:bg-slate-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-danger-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add/Edit item modal */}
      <Modal
        open={!!itemForm}
        onClose={() => setItemForm(null)}
        title={itemForm?.id ? 'Edit menu item' : 'Add menu item'}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setItemForm(null)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              disabled={saveItemMutation.loading}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {saveItemMutation.loading ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {itemForm && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">
                English label
              </span>
              <input
                type="text"
                value={itemForm.labelEn}
                onChange={(e) =>
                  setItemForm({ ...itemForm, labelEn: e.target.value })
                }
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                placeholder="e.g. Shop"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">
                Bangla label
              </span>
              <input
                type="text"
                value={itemForm.labelBn}
                onChange={(e) =>
                  setItemForm({ ...itemForm, labelBn: e.target.value })
                }
                className="mt-1 w-full h-9 rounded border border-border text-sm"
                placeholder="e.g. শপ"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">URL</span>
              <input
                type="text"
                value={itemForm.url}
                onChange={(e) =>
                  setItemForm({ ...itemForm, url: e.target.value })
                }
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm font-mono"
                placeholder="/shop or https://example.com"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">
                Sort order
              </span>
              <input
                type="number"
                value={itemForm.sortOrder}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    sortOrder: Number(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm tabular-nums"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={itemForm.isActive}
                onChange={(e) =>
                  setItemForm({ ...itemForm, isActive: e.target.checked })
                }
              />
              <span className="text-sm text-slate-700">Visible on storefront</span>
            </label>
          </div>
        )}
      </Modal>

      {/* Create menu modal */}
      <Modal
        open={creatingMenu}
        onClose={() => setCreatingMenu(false)}
        title={`Create ${activeLocation.toLowerCase()} menu`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreatingMenu(false)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateMenu}
              disabled={upsertMenuMutation.loading || !newMenuName.trim()}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {upsertMenuMutation.loading ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <label className="block">
          <span className="text-[12.5px] font-medium text-slate-700">Menu name</span>
          <input
            type="text"
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
            placeholder="e.g. Main header"
          />
        </label>
      </Modal>
    </div>
  );
}