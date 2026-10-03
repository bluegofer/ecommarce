'use client';

import { Mail, Clock, Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@/lib/hooks';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifLog } = useQuery<Array<{
    id: string;
    channel: string;
    templateKey: string;
    recipient: string;
    status: string;
    createdAt: string;
  }>>(notifOpen ? '/api/v1/notifications/log' : null);

  return (
    <header className="sticky top-0 z-20 h-16 bg-surface border-b border-border">
      <div className="h-full px-4 lg:px-6 flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>

        {/* Global search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search orders, products, customers…"
              className="w-full h-9 pl-9 pr-3 rounded border border-border bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              aria-label="Global search"
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded hover:bg-slate-100"
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {notifLog && notifLog.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-500" />
            )}
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setNotifOpen(false)}
                aria-hidden="true"
              />
              <div
                className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface rounded shadow-md border border-border py-1 z-40"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[13px] font-semibold text-slate-800">Recent notifications</p>
                  <p className="text-[11px] text-slate-500">Latest 200 records</p>
                </div>
                {!notifLog ? (
                  <p className="px-3 py-6 text-center text-[12px] text-slate-400">Loading…</p>
                ) : notifLog.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] text-slate-400">No notifications yet</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {notifLog.slice(0, 10).map((n) => (
                      <li key={n.id} className="px-3 py-2 hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[12px] font-medium text-slate-800 truncate">{n.templateKey}</span>
                          <span className="text-[10px] uppercase font-medium text-slate-500 flex-shrink-0">{n.channel}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{n.recipient}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="px-3 py-2 border-t border-border">
                  <Link
                    href="/notifications/log"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-[12px] font-medium text-sky-700 hover:text-sky-900"
                  >
                    View all →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded hover:bg-slate-100"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <span className="w-8 h-8 grid place-items-center rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">
              AD
            </span>
            <span className="hidden sm:block text-left leading-tight">
              <span className="block text-[13px] font-medium text-slate-800">
                Admin
              </span>
              <span className="block text-[11px] text-slate-500">
                Super Admin
              </span>
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-surface rounded shadow-md border border-border py-1 z-40"
              >
                <a
                  href="/settings/profile"
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Profile &amp; Security
                </a>
                <a
                  href="/settings/audit-log"
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Audit log
                </a>
                <div className="my-1 h-px bg-border" />
                <a
                  href="/login"
                  className="block px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  Sign out
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
