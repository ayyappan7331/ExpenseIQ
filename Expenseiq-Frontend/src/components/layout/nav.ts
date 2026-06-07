// Single source of truth for the 9 nav entries the legacy SPA renders
// in its sidebar (lines 1408-1434). Used by Sidebar.tsx to render links
// and by Topbar.tsx to derive the current page title from the path.

import {
  BarChart3,
  CreditCard,
  GitCompare,
  Handshake,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Repeat,
  Target,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaction', Icon: Receipt },
  { href: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { href: '/goals', label: 'Goals', Icon: Target },
  { href: '/subscriptions', label: 'Subscriptions', Icon: Repeat },
  { href: '/debts', label: 'Debts', Icon: Handshake },
  { href: '/creditcards', label: 'Credit Cards', Icon: CreditCard },
  { href: '/budgets', label: 'Budgets', Icon: PiggyBank },
  { href: '/compare', label: 'Compare', Icon: GitCompare },
];

export function pageTitleFor(pathname: string | null | undefined): string {
  if (!pathname) return 'ExpenseIQ';
  if (pathname.startsWith('/themes')) return 'Appearance';
  const hit = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  return hit?.label ?? 'ExpenseIQ';
}
