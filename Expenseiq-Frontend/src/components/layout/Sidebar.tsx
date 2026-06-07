'use client';

// Fixed sidebar. Collapsed = 72px (icons only). Hover expands to 232px
// revealing labels — same mechanic as the legacy SPA (CSS line 92-117).
// We do it with Tailwind `group` + `group-hover:` so there's no JS state.
//
// On <md screens the sidebar slides in from the left when `mobileOpen`
// is true; the AppShell renders a backdrop next to it.
//
// Nav items are drag-and-drop reorderable. Order persists to Settings.navOrder
// on the backend (profile-scoped, survives refresh and profile switches).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavOrder } from '@/lib/hooks/useNavOrder';
import { useDraggableList } from '@/lib/hooks/useDraggableList';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { orderedItems, saveOrder } = useNavOrder();

  const dnd = useDraggableList(
    orderedItems.map((n) => n.href),
    (newHrefs) => saveOrder(newHrefs)
  );

  return (
    <aside
      data-testid="sidebar"
      data-mobile-open={mobileOpen || undefined}
      className={`glass-surface group fixed top-0 left-0 z-50 h-dvh w-[232px] md:w-[72px] md:hover:w-[232px] transition-[width,transform] duration-300 ease-out bg-bg-2 border-r border-card-border overflow-x-hidden overflow-y-auto flex flex-col ${
        mobileOpen ? 'translate-x-0 shadow-[4px_0_32px_rgba(0,0,0,0.4)]' : '-translate-x-full'
      } md:translate-x-0`}
    >
      {/* Logo */}
      <div className="h-[56px] flex items-center px-[18px] border-b border-card-border flex-shrink-0">
        <div className="font-display text-2xl font-bold leading-none tracking-tight whitespace-nowrap drop-shadow-[0_2px_10px_rgba(124,111,247,0.25)]">
          <span className="relative inline-block bg-gradient-to-br from-[#a78bfa] via-[#7c6ff7] to-[#5ee8b0] bg-clip-text text-transparent">
            E
            <span
              aria-hidden="true"
              className="absolute -right-[5px] bottom-[3px] w-1 h-1 rounded-full bg-accent-2 shadow-[0_0_6px_var(--accent-2)] opacity-90 md:group-hover:-right-[7px] transition-[right]"
            />
          </span>
          <span className="inline-block max-w-[200px] md:max-w-0 md:group-hover:max-w-[200px] opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-x-0 md:-translate-x-2 md:group-hover:translate-x-0 overflow-hidden transition-all duration-[420ms] bg-gradient-to-br from-[#a78bfa] via-[#7c6ff7] to-[#5ee8b0] bg-clip-text text-transparent">
            xpenseIQ
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2.5 py-3.5 md:px-2 md:group-hover:px-2.5 flex-1 transition-[padding] duration-300">
        <ul className="space-y-0.5">
          {orderedItems.map(({ href, label, Icon }, idx) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <li
                key={href}
                onDragOver={dnd.onDragOver(idx)}
                onDrop={dnd.onDrop(idx)}
                onDragEnd={dnd.onDragEnd}
                className="list-none relative"
              >
                {/* Drag handle — sits on top of the link, initiates the drag.
                    Kept narrow so the rest of the row is still clickable. */}
                <span
                  draggable
                  onDragStart={dnd.onDragStart(idx)}
                  aria-label="Drag to reorder"
                  className="absolute left-0 top-0 bottom-0 w-6 z-10 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Drag to reorder"
                />
                <Link
                  href={href}
                  draggable={false}
                  data-active={active || undefined}
                  data-testid={`nav-${href.replace('/', '')}`}
                  onClick={onCloseMobile}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-2 hover:bg-bg-3 hover:text-text data-[active]:bg-accent/15 data-[active]:text-text transition-colors"
                  title={label}
                >
                  <Icon
                    className="w-5 h-5 shrink-0"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="overflow-hidden whitespace-nowrap w-auto md:w-0 md:group-hover:w-auto opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 delay-[50ms]">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-2.5 py-4 md:px-2 md:group-hover:px-2.5 border-t border-card-border transition-[padding] duration-300">
        <div className="text-[10px] text-text-3 px-1 whitespace-nowrap overflow-hidden opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          Phase F3 shell
        </div>
      </div>
    </aside>
  );
}
