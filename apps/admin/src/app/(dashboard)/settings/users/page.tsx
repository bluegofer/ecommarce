'use client';

import { useState } from 'react';
import { UserPlus, Shield } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, useToast, Modal } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

interface StaffUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  roles: string[];
  lastLoginAt: string | null;
}

const ALL_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'EDITOR',
  'CATALOG_MANAGER',
  'ORDER_SUPPORT',
  'MARKETING_MANAGER',
  'FINANCE_MANAGER',
  'FINANCE_READONLY',
  'PURCHASE_MANAGER',
  'STORE_POS_STAFF',
  'HR_MANAGER',
] as const;

const SUPER_ADMIN_ONLY: string[] = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'];

export default function StaffUsersPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<StaffUser[]>('/api/v1/users');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);

  const meQuery = useQuery<{ roles: string[] }>('/api/v1/auth/me');
  const myRoles: string[] = Array.isArray(meQuery.data?.roles) ? meQuery.data.roles : [];
  const isSuperAdmin = myRoles.includes('SUPER_ADMIN');
  const isAdmin = myRoles.includes('ADMIN');

  // Filter roles we can assign
  const assignableRoles = isSuperAdmin
    ? ALL_ROLES.slice()
    : isAdmin
      ? ALL_ROLES.filter((r) => !SUPER_ADMIN_ONLY.includes(r))
      : [];

  const columns: Column<StaffUser>[] = [
    {
      key: 'name',
      header: 'User',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-800">{r.fullName}</div>
          <div className="text-[11.5px] text-slate-400 font-mono">{r.phone}</div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (r) => <span className="text-slate-600 text-[12.5px]">{r.email ?? '—'}</span>,
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.roles.map((role) => (
            <StatusChip
              key={role}
              label={role}
              tone={SUPER_ADMIN_ONLY.includes(role) ? 'warning' : 'info'}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip
          label={r.status}
          tone={r.status === 'ACTIVE' ? 'success' : 'danger'}
        />
      ),
    },
    {
      key: 'login',
      header: 'Last login',
      render: (r) =>
        r.lastLoginAt ? (
          <span className="text-[12.5px] text-slate-500">
            {formatDateTime(r.lastLoginAt)}
          </span>
        ) : (
          <span className="text-slate-400">Never</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) =>
        isSuperAdmin ? (
          <button
            type="button"
            onClick={() => setEditTarget(r)}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
          >
            <Shield className="w-3.5 h-3.5" />
            Edit roles
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff users"
        subtitle="Invite staff · assign role · deactivate — linked to HR employee records"
        actions={
          isSuperAdmin || isAdmin ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <UserPlus className="w-4 h-4" />
              New user
            </button>
          ) : null
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No staff users.</div>
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>

      {/* Create user modal */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        assignableRoles={assignableRoles}
        onSuccess={() => {
          setCreateOpen(false);
          void refetch();
          toast.success('User created');
        }}
      />

      {/* Edit roles modal */}
      <EditRolesModal
        user={editTarget}
        onClose={() => setEditTarget(null)}
        assignableRoles={assignableRoles}
        onSuccess={() => {
          setEditTarget(null);
          void refetch();
          toast.success('Roles updated');
        }}
      />
    </div>
  );
}

// ─── Create User Modal ───────────────────────────────────
function CreateUserModal({
  open,
  onClose,
  assignableRoles,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  assignableRoles: string[];
  onSuccess: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation<Record<string, unknown>, unknown>('post', '/api/v1/users');

  function reset() {
    setPhone(''); setFullName(''); setEmail(''); setSelectedRoles(new Set()); setError(null);
  }

  function toggleRole(r: string) {
    const next = new Set(selectedRoles);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    setSelectedRoles(next);
  }

  async function submit() {
    if (!phone.trim() || !fullName.trim() || selectedRoles.size === 0) {
      setError('Phone, name, and at least one role are required');
      return;
    }
    try {
      await createMut.mutate({
        phone: phone.trim(),
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        roles: Array.from(selectedRoles),
      });
      reset();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="New staff user"
      size="md"
      footer={
        <>
          <button type="button" onClick={() => { reset(); onClose(); }} className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={createMut.loading} className="h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60">
            {createMut.loading ? 'Creating…' : 'Create user'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-500">
          User will receive an SMS OTP on first login. Default password: <code className="font-mono">ChangeMe!2026</code> — prompt them to change on first use.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880..." className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Full name *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
        </div>

        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Roles *</label>
          <div className="flex flex-wrap gap-1.5">
            {assignableRoles.map((r) => {
              const active = selectedRoles.has(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={
                    'h-7 px-2.5 rounded border text-[11.5px] font-medium ' +
                    (active
                      ? 'bg-sky-100 border-sky-500 text-sky-800'
                      : 'bg-white border-border text-slate-600 hover:bg-slate-50')
                  }
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-[12.5px] text-danger-700 bg-danger-50 border border-danger-200 rounded p-2">{error}</p>}
      </div>
    </Modal>
  );
}

// ─── Edit Roles Modal ────────────────────────────────────
function EditRolesModal({
  user,
  onClose,
  assignableRoles,
  onSuccess,
}: {
  user: StaffUser | null;
  onClose: () => void;
  assignableRoles: string[];
  onSuccess: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Sync state when user changes
  useState(() => {
    if (user) setSelected(new Set(user.roles));
  });

  const updateMut = useMutation<{ roles: string[] }, unknown>(
    'patch',
    user ? `/api/v1/users/${user.id}/roles` : '/api/v1/users/0/roles',
  );

  if (!user) return null;

  function toggleRole(r: string) {
    const next = new Set(selected);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    setSelected(next);
  }

  async function submit() {
    if (selected.size === 0) {
      setError('Select at least one role');
      return;
    }
    try {
      await updateMut.mutate({ roles: Array.from(selected) });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Edit roles · ${user.fullName}`}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={updateMut.loading} className="h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60">
            {updateMut.loading ? 'Saving…' : 'Save roles'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-500">
          Toggle the roles this user should have. Only SUPER_ADMIN can assign ADMIN/EDITOR/SUPER_ADMIN.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {assignableRoles.map((r) => {
            const active = selected.has(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={
                  'h-7 px-2.5 rounded border text-[11.5px] font-medium ' +
                  (active
                    ? 'bg-sky-100 border-sky-500 text-sky-800'
                    : 'bg-white border-border text-slate-600 hover:bg-slate-50')
                }
              >
                {r}
              </button>
            );
          })}
        </div>

        {error && <p className="text-[12.5px] text-danger-700 bg-danger-50 border border-danger-200 rounded p-2">{error}</p>}
      </div>
    </Modal>
  );
}