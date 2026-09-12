'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  Package,
  ReceiptText,
  Truck,
  CreditCard,
  Users,
  RotateCcw,
  Star,
  Tag,
  FileText,
  Bell,
  Store,
  BookOpen,
  ShoppingCart,
  Factory,
  UserCog,
  Clock,
  Banknote,
  ShieldCheck,
  BarChart3,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Order + sections strictly match packages/mock-reference-admin/README.md
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'ADMIN — Dashboard',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'CATALOG',
    items: [
      { label: 'Products', href: '/products', icon: ShoppingBag },
      { label: 'Categories', href: '/categories', icon: FolderTree },
      { label: 'Inventory', href: '/inventory', icon: Package },
    ],
  },
  {
    title: 'SALES',
    items: [
      { label: 'Orders', href: '/orders', icon: ReceiptText },
      { label: 'Delivery', href: '/delivery', icon: Truck },
      { label: 'Payments', href: '/payments', icon: CreditCard },
    ],
  },
  {
    title: 'CUSTOMER',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Returns & RMA', href: '/returns', icon: RotateCcw },
      { label: 'Reviews', href: '/reviews', icon: Star },
    ],
  },
  {
    title: 'MARKETING',
    items: [
      { label: 'Promotions', href: '/promotions', icon: Tag },
      { label: 'CMS', href: '/cms', icon: FileText },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'ERP SUITE',
    items: [
      { label: 'POS', href: '/pos', icon: Store },
      { label: 'Accounting', href: '/accounting', icon: BookOpen },
      { label: 'Purchases', href: '/purchases', icon: ShoppingCart },
      { label: 'Suppliers', href: '/suppliers', icon: Factory },
      { label: 'HR', href: '/hr', icon: UserCog },
      { label: 'Attendance', href: '/attendance', icon: Clock },
      { label: 'Payroll', href: '/payroll', icon: Banknote },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Users & Roles', href: '/users', icon: ShieldCheck },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === '/(dashboard)';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const content = (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
        <span className="w-9 h-9 grid place-items-center rounded-lg bg-sky-600 text-white text-lg">
          🛍️
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-slate-900 text-[15px]">BlueGofer</span>
          <span className="text-[11px] text-slate-500">Admin &amp; ERP Console</span>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto lg:hidden p-1.5 rounded hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
        aria-label="Main navigation"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      {...(onMobileClose ? { onClick: onMobileClose } : {})}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium transition-colors',
                        active
                          ? 'bg-sky-100 text-sky-900'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0',
                          active ? 'text-sky-700' : 'text-slate-400',
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <p className="text-[11px] text-slate-400">
          © 2026 BlueGofer · Phase 1
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar (fixed) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-surface border-r border-border flex-col z-30">
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-40"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-surface border-r border-border flex flex-col z-50 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!mobileOpen}
      >
        {content}
      </aside>
    </>
  );
}