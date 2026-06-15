'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  Menu, LogOut, User, ChevronDown,
  Palette, Settings as SettingsIcon, Pencil, Check, X,
} from 'lucide-react';
import { MonthFilter } from './MonthFilter';
import { ThemeToggle } from './ThemeToggle';
import { pageTitleFor } from './nav';
import { clearToken, isAuthEnabled, getStoredUser, setStoredUser } from '@/lib/api/token';
import { authApi } from '@/lib/api/auth';
import { useQueryClient } from '@tanstack/react-query';

interface TopbarProps {
  onMenuClick: () => void;
  
}

function IconButton({ label, onClick, children }: {
  label: string; onClick?: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="p-2 rounded-lg text-text-2 hover:text-text hover:bg-bg-3 transition-colors">
      {children}
    </button>
  );
}

function initials(name: string, email: string): string {
  const src = name?.trim() || email?.trim() || '?';
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function avatarColor(seed: string): string {
  const colors = [
    'bg-[#7c6ff7]', 'bg-[#38bdf8]', 'bg-[#f472b6]',
    'bg-[#34d399]', 'bg-[#fb923c]', 'bg-[#a78bfa]',
    'bg-[#06d6a0]', 'bg-[#ef4444]',
  ];
  return colors[(seed.charCodeAt(0) || 0) % colors.length];
}

const PURPOSE_LABEL: Record<string, string> = {
  personal:   'Personal Finance',
  business:   'Business & Freelance',
  family:     'Family Budget',
  student:    'Student Budget',
  investment: 'Investments & Wealth',
  travel:     'Travel & Expenses',
  startup:    'Startup / Side Project',
  savings:    'Savings Goals',
  debt:       'Debt Payoff Tracker',
  other:      'Other',
};

const PURPOSES = [
  { value: 'personal',   label: 'Personal Finance' },
  { value: 'business',   label: 'Business & Freelance' },
  { value: 'family',     label: 'Family Budget' },
  { value: 'student',    label: 'Student Budget' },
  { value: 'investment', label: 'Investments & Wealth' },
  { value: 'travel',     label: 'Travel & Expenses' },
  { value: 'startup',    label: 'Startup / Side Project' },
  { value: 'savings',    label: 'Savings Goals' },
  { value: 'debt',       label: 'Debt Payoff Tracker' },
  { value: 'other',      label: 'Other' },
];

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname  = usePathname();
  const title     = pageTitleFor(pathname);
  const router    = useRouter();
  const qc        = useQueryClient();
  const dropRef   = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dropOpen, setDropOpen] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');

  // Hover open — cancel any pending close
  function openDrop() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDropOpen(true);
  }
  // Hover leave — small delay so moving to the panel doesn't flicker
  function closeDrop() {
    closeTimer.current = setTimeout(() => {
      setDropOpen(false);
      setEditing(false);
    }, 120);
  }

  const user      = isAuthEnabled() ? getStoredUser() : null;
  const [editName,    setEditName]    = useState(user?.name    ?? '');
  const [editDob,     setEditDob]     = useState(user?.dob     ?? '');
  const [editPurpose, setEditPurpose] = useState(user?.purpose ?? '');

  const ini      = user ? initials(user.name, user.email) : '';
  const avatarBg = user ? avatarColor(user.name || user.email) : 'bg-accent';

  // Re-sync edit fields each time the dropdown opens
  useEffect(() => {
    if (user && dropOpen) {
      setEditName(user.name ?? '');
      setEditDob(user.dob ?? '');
      setEditPurpose(user.purpose ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropOpen]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  function handleLogout() {
    clearToken();
    qc.clear();
    router.push('/login');
  }

  async function handleSave() {
    setSaveErr('');
    setSaving(true);
    try {
      const updated = await authApi.updateMe({
        name: editName.trim(),
        dob: editDob,
        purpose: editPurpose,
      });
      setStoredUser({ id: updated.id, email: updated.email, name: updated.name, dob: updated.dob, purpose: updated.purpose });
      setEditing(false);
    } catch (err: unknown) {
      setSaveErr(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-2.5 py-1.5 text-xs bg-bg-2 border border-card-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent/50';

  return (
    <header className="glass-surface sticky top-0 z-30 h-[56px] flex items-center justify-between gap-3 px-4 bg-bg-2/95 backdrop-blur border-b border-card-border">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={onMenuClick} aria-label="Open menu"
          className="md:hidden p-2 rounded-lg text-text-2 hover:bg-bg-3">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-semibold font-display truncate" data-testid="page-title">
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <MonthFilter />
        
        <ThemeToggle />

        {/* User avatar / hover dropdown */}
        {isAuthEnabled() ? (
          <div className="relative" ref={dropRef} onMouseEnter={openDrop} onMouseLeave={closeDrop}>
            <button
              type="button"
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-bg-3 transition-colors focus:outline-none"
              aria-label="User menu"
              aria-expanded={dropOpen}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${avatarBg}`}>
                {ini || <User className="w-3.5 h-3.5" />}
              </span>
              {user?.name && (
                <span className="hidden sm:block text-xs font-medium text-text max-w-[100px] truncate">
                  {user.name.split(' ')[0]}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-text-3 transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropOpen && (
              <div className="glass-surface absolute right-0 top-full mt-1 w-72 bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">

                {/* User header */}
                <div className="px-4 py-3 border-b border-card-border bg-bg-2/60">
                  <div className="flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${avatarBg}`}>
                      {ini || <User className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {user?.name && <p className="text-sm font-semibold text-text truncate">{user.name}</p>}
                      <p className="text-[11px] text-text-3 truncate">{user?.email}</p>
                      {user?.purpose && (
                        <p className="text-[10px] text-accent mt-0.5">{PURPOSE_LABEL[user.purpose] ?? user.purpose}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => setEditing(v => !v)}
                      title="Edit profile"
                      className="p-1.5 rounded-lg hover:bg-bg-3 text-text-3 hover:text-accent transition-colors flex-shrink-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit profile panel */}
                {editing && (
                  <div className="px-4 py-3 border-b border-card-border space-y-2.5 bg-bg-2/40">
                    <p className="text-[11px] font-semibold text-text-2 uppercase tracking-wider">Edit Profile</p>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-3">Full Name</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                        placeholder="Your name" className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-3">Date of Birth</label>
                      <input type="date" value={editDob} onChange={e => setEditDob(e.target.value)}
                        className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-3">Purpose</label>
                      <select value={editPurpose} onChange={e => setEditPurpose(e.target.value)}
                        className={`${inputCls} appearance-none`}>
                        <option value="">Select...</option>
                        {PURPOSES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    {saveErr && <p className="text-[11px] text-expense">{saveErr}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-60 transition-colors">
                        <Check className="w-3 h-3" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={() => { setEditing(false); setSaveErr(''); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-text-2 bg-bg-2 border border-card-border rounded-lg hover:bg-bg-3 transition-colors">
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Account info read-only */}
                {!editing && (user?.dob || user?.purpose) && (
                  <div className="px-4 py-2.5 border-b border-card-border space-y-1.5">
                    {user?.dob && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-3">Date of Birth</span>
                        <span className="text-text-2 font-medium">
                          {new Date(user.dob + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {user?.purpose && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-3">Purpose</span>
                        <span className="text-text-2 font-medium">{PURPOSE_LABEL[user.purpose] ?? user.purpose}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Appearance + Settings */}
                <div className="p-1.5 border-b border-card-border">
                  <Link href="/themes"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-2 hover:bg-bg-3 hover:text-text transition-colors">
                    <Palette className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                    Appearance
                  </Link>
                  <button type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-2 hover:bg-bg-3 hover:text-text transition-colors text-left">
                    <SettingsIcon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="p-1.5">
                  <button type="button" onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-expense hover:bg-expense/10 transition-colors text-left">
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    Sign out
                  </button>
                </div>

              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/themes" aria-label="Appearance" title="Appearance"
              className="p-2 rounded-lg text-text-2 hover:text-text hover:bg-bg-3 transition-colors">
              <Palette className="w-4 h-4" strokeWidth={1.8} />
            </Link>
            <IconButton label="Settings">
              <SettingsIcon className="w-4 h-4" strokeWidth={1.8} />
            </IconButton>
          </>
        )}
      </div>
    </header>
  );
}
