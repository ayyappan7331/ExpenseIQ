'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* ── Full-screen backdrop — fixed, covers everything, blocks all clicks ── */}
      <div
        className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Scroll container — fixed, sits above backdrop, scrollable ── */}
      <div
        className="fixed inset-0 z-[100] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Inner centering wrapper — min-h full so short modals still center */}
        <div className="flex min-h-full items-center justify-center p-4 py-20">
          <div
            ref={panelRef}
            tabIndex={-1}
            className={`
              glass-surface relative w-full ${sizeMap[size]}
              bg-card border border-card-border rounded-2xl
              shadow-[var(--shadow)]
              animate-in fade-in zoom-in-95 duration-200
              flex flex-col
              max-h-[calc(100vh-10rem)]
            `}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-card-border flex-shrink-0">
                <h2 className="text-base font-semibold text-text">{title}</h2>
                <Button variant="icon" size="sm" onClick={onClose} aria-label="Close">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="p-5 overflow-y-auto flex-1 min-h-0">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
