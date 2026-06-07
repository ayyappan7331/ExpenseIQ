'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: (direction: 'forward' | 'backward') => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  enabled?: boolean;
}

/**
 * Enhanced keyboard navigation hook for transaction forms
 * Provides consistent keyboard behavior across inline editing components
 */
export function useKeyboardNavigation({
  onEnter,
  onEscape,
  onTab,
  onArrowUp,
  onArrowDown,
  enabled = true,
}: KeyboardNavigationOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    switch (e.key) {
      case 'Enter':
        if (!e.shiftKey) {
          e.preventDefault();
          onEnter?.();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onEscape?.();
        break;
      case 'Tab':
        if (onTab) {
          e.preventDefault();
          onTab(e.shiftKey ? 'backward' : 'forward');
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          e.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          e.preventDefault();
          onArrowDown();
        }
        break;
    }
  }, [enabled, onEnter, onEscape, onTab, onArrowUp, onArrowDown]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
}

/**
 * Field navigation helper for moving between form fields
 */
export function useFieldNavigation(fieldRefs: React.RefObject<HTMLElement>[]) {
  const focusField = useCallback((index: number) => {
    const field = fieldRefs[index]?.current;
    if (field) {
      field.focus();
      // Select text if it's an input
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.select();
      }
    }
  }, [fieldRefs]);

  const moveToNext = useCallback((currentIndex: number) => {
    const nextIndex = (currentIndex + 1) % fieldRefs.length;
    focusField(nextIndex);
  }, [fieldRefs.length, focusField]);

  const moveToPrevious = useCallback((currentIndex: number) => {
    const prevIndex = currentIndex === 0 ? fieldRefs.length - 1 : currentIndex - 1;
    focusField(prevIndex);
  }, [fieldRefs.length, focusField]);

  return { focusField, moveToNext, moveToPrevious };
}