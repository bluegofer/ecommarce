'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  Package,
  ReceiptText,
  Truck,
  Wallet,
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
  UserPlus,
  Clock,
  Banknote,
  ShieldCheck,
  BarChart3,
  Settings,
  ChevronRight,
  Layers,
  Image,
  Megaphone,
  Menu as MenuIcon,
  Mail,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLeaf {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

type NavItem = NavLeaf | NavGroup;

interface NavSection {
  title: string;
  items: NavItem[];
}

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item;
}

// Structure mirrors packages/mock-reference-admin sidebar and now covers
// every route that exists under apps/admin/src/app/(dashboard)/**.
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', href: '/products', icon: ShoppingBag },
      { label: 'Categories', href: '/categories', icon: FolderTree },
      {
        label: 'Inventory',
        icon: Package,
        children: [
          { label: 'Overview', href: '/inventory', icon: Package },
          { label: 'Low stock', href: '/inventory/low-stock', icon: Package },
          { label: 'Transfers', href: '/inventory/transfers', icon: Package },
        ],
      },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', href: '/orders', icon: ReceiptText },
      {
        label: 'Delivery',
        icon: Truck,
        children: [
          { label: 'Overview', href: '/delivery', icon: Truck },
          { label: 'Settlements', href: '/delivery/settlements', icon: Wallet },
        ],
      },
      { label: 'Payments', href: '/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Returns & RMA', href: '/returns', icon: RotateCcw },
      { label: 'Reviews', href: '/reviews', icon: Star },
    ],
  },
  {
    title: 'Marketing',
    items: [
      {
        label: 'Promotions',
        icon: Tag,
        children: [
          { label: 'Coupons', href: '/promotions', icon: Tag },
        ],
      },
      {
        label: 'CMS',
        icon: FileText,
        children: [
          { label: 'Overview', href: '/cms', icon: FileText },
          { label: 'Pages', href: '/cms/pages', icon: FileText },
          { label: 'Announcements', href: '/cms/announcements', icon: Megaphone },
          { label: 'Menus', href: '/cms/menus', icon: MenuIcon },
          { label: 'Media library', href: '/cms/media', icon: Image },
          { label: 'Popups', href: '/cms/popups', icon: Megaphone },
          { label: 'Contact inbox', href: '/cms/contact', icon: Mail },
        ],
      },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Newsletter', href: '/newsletter', icon: Mail },
    ],
  },
  {
    title: 'ERP Suite',
    items: [
      {
        label: 'POS',
        icon: Store,
        children: [
          { label: 'Register', href: '/pos', icon: Store },
          { label: 'Sessions', href: '/pos/sessions', icon: Store },
          { label: 'Returns', href: '/pos/returns', icon: Store },
        ],
      },
      { label: 'Accounting', href: '/accounting', icon: BookOpen },
      {
        label: 'Purchases',
        icon: ShoppingCart,
        children: [
          { label: 'Requisitions', href: '/purchases/requisitions', icon: ShoppingCart },
          { label: 'Purchase orders', href: '/purchases/orders', icon: ShoppingCart },
          { label: 'Receiving (GRN)', href: '/purchases/receiving', icon: ShoppingCart },
        ],
      },
      { label: 'Suppliers', href: '/suppliers', icon: Factory },
      {
        label: 'HR',
        icon: UserCog,
        children: [
          { label: 'Employees', href: '/hr/employees', icon: UserPlus },
          { label: 'Attendance', href: '/hr/attendance', icon: Clock },
          { label: 'Payroll', href: '/hr/payroll', icon: Banknote },
        ],
      },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Users & Roles', href: '/settings/users', icon: ShieldCheck },
      {
        label: 'Settings',
        icon: Settings,
        children: [
          { label: 'Profile', href: '/settings/profile', icon: Settings },
          { label: 'Audit log', href: '/settings/audit-log', icon: ShieldCheck },
          { label: 'Roles', href: '/settings/roles', icon: ShieldCheck },
          { label: 'Checkout', href: '/settings/checkout', icon: Settings },
        ],
      },
    ],
  },
];

// Flatten every leaf href, longest first — so /inventory/transfers beats
// /inventory when both match the current pathname.
const ALL_LEAF_HREFS: string[] = NAV_SECTIONS.flatMap((s) =>
  s.items.flatMap((it) => (isGroup(it) ? it.children.map((c) => c.href) : [it.href])),
).sort((a, b) => b.length - a.length);

function resolveActiveHref(pathname: string): string | null {
  if (pathname === '/' || pathname === '/(dashboard)') return '/';
  for (const h of ALL_LEAF_HREFS) {
    if (h === '/') continue;
    if (pathname === h || pathname.startsWith(h + '/')) return h;
  }
  return null;
}

const STORAGE_KEY = 'admin.sidebar.expanded';

function readExpandedFromStorage(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeExpandedToStorage(state: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname ?? '');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Load persisted expanded state once on mount.
  useEffect(() => {
    setExpanded(readExpandedFromStorage());
  }, []);

  // Auto-expand the group that contains the current route.
  useEffect(() => {
    const toOpen: string[] = [];
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (!isGroup(item)) continue;
        if (item.children.some((c) => c.href === activeHref)) {
          toOpen.push(item.label);
        }
      }
    }
    if (toOpen.length === 0) return;
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const label of toOpen) {
        if (!next[label]) {
          next[label] = true;
          changed = true;
        }
      }
      if (!changed) return prev;
      writeExpandedToStorage(next);
      return next;
    });
  }, [activeHref]);

  const toggleGroup = (label: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      writeExpandedToStorage(next);
      return next;
    });
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
                if (isGroup(item)) {
                  const isOpen = expanded[item.label] ?? false;
                  const groupActive = item.children.some((c) => c.href === activeHref);
                  const GroupIcon = item.icon;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        aria-expanded={isOpen}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium transition-colors',
                          groupActive
                            ? 'text-sky-900'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        <GroupIcon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            groupActive ? 'text-sky-700' : 'text-slate-400',
                          )}
                        />
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            'w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform',
                            isOpen && 'rotate-90',
                          )}
                        />
                      </button>
                      {isOpen && (
                        <ul className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-0.5">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = child.href === activeHref;
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  {...(onMobileClose ? { onClick: onMobileClose } : {})}
                                  aria-current={childActive ? 'page' : undefined}
                                  className={cn(
                                    'flex items-center gap-2 px-2.5 py-1.5 rounded text-[13px] font-medium transition-colors',
                                    childActive
                                      ? 'bg-sky-100 text-sky-900'
                                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                                  )}
                                >
                                  <ChildIcon
                                    className={cn(
                                      'w-3.5 h-3.5 shrink-0',
                                      childActive ? 'text-sky-700' : 'text-slate-400',
                                    )}
                                  />
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }

                const Icon = item.icon;
                const active = item.href === activeHref;
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
