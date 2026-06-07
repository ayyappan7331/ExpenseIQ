'use client';

import { forwardRef, useEffect, useRef, useCallback, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Maximum visible rows before internal scroll kicks in. Default: 5 */
  maxRows?: number;
}

const LINE_HEIGHT_PX = 20; // matches text-sm line-height
const PADDING_PX = 16;     // py-2 = 8px top + 8px bottom

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, maxRows = 5, onChange, onKeyDown, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    // Merge forwarded ref with inner ref
    const ref = (forwardedRef as React.RefObject<HTMLTextAreaElement>) || innerRef;

    const minHeight = LINE_HEIGHT_PX + PADDING_PX;
    const maxHeight = LINE_HEIGHT_PX * maxRows + PADDING_PX;

    const resize = useCallback(() => {
      const el = ref.current;
      if (!el) return;
      // Reset to min so scrollHeight reflects actual content
      el.style.height = `${minHeight}px`;
      const next = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [ref, minHeight, maxHeight]);

    // Resize on mount (edit mode pre-filled value)
    useEffect(() => { resize(); }, [resize]);

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      resize();
      onChange?.(e);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      // Enter without Shift → submit the parent form
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (form) {
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        }
      }
      // Shift+Enter → default textarea newline behavior (no preventDefault)
      onKeyDown?.(e);
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={1}
          style={{ minHeight, maxHeight, resize: 'none', transition: 'height 0.1s ease' }}
          className={`w-full px-3 py-2 text-sm bg-bg-2 border border-card-border rounded-xl text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors leading-5 ${error ? 'border-expense focus:ring-expense/40' : ''} ${className}`}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {error && <span className="text-xs text-expense">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
