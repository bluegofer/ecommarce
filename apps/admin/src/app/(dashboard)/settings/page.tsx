'use client';

import Link from 'next/link';
import { ShieldCheck, Users, ScrollText, Truck, CreditCard, Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui';

const CARDS = [
  { href: '/settings/roles', label: 'Roles & Permissions', description: 'RBAC matrix — incl. Finance, Purchase, Store/POS, HR', Icon: ShieldCheck },
  { href: '/settings/users', label: 'Staff Users', description: 'Invites, 2FA reset, deactivate', Icon: Users },
  { href: '/settings/audit-log', label: 'Audit log', description: 'Every mutating action with before/after diff', Icon: ScrollText },
  { href: '/settings/delivery', label: 'Delivery zones & charges', description: 'Inside Dhaka / Outside Dhaka, free-shipping threshold', Icon: Truck },
  { href: '/settings/checkout', label: 'Checkout settings', description: 'COD limits, OTP provider, payment methods', Icon: CreditCard },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="RBAC, staff, audit trail, delivery rules, checkout controls" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.Icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="card p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 grid place-items-center rounded-lg bg-sky-50 text-sky-700">
                  <Icon className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900">{c.label}</h3>
              <p className="text-[12.5px] text-slate-500 mt-1">{c.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}