'use client';

import { useRef, useCallback } from 'react';

interface KeyboardFlowOptions {
  enabled?: boolean;
  preserveCursor?: boolean;
  preventBlurOnEscape?: boolean;
}

export function useEnhancedKeyboardFlow(options: KeyboardFlowOptions = {}) {
  const {
    enabled = true,
    preserveCursor = true,
    preventBlurOnEscape = true,
  } = options;

  const cursorPositions = useRef<Map<string, number>>(new Map());

  // Save cursor position when element loses focus
  const saveCursorPosition = useCallback((element: HTMLInputElement | HTMLTextAreaElement) => {
    if (!preserveCursor) return;
    
    const key = element.name || element.id || element.className;
    if (key) {
      cursorPositions.current.set(key, element.selectionStart || 0);
    }
  }, [preserveCursor]);

  // Restore cursor position when element gains focus
  const restoreCursorPosition = useCallback((element: HTMLInputElement | HTMLTextAreaElement) => {
    if (!preserveCursor) return;
    
    const key = element.name || element.id || element.className;
    if (key) {
      const savedPosition = cursorPositions.current.get(key);
      if (savedPosition !== undefined) {
        setTimeout(() => {
          element.setSelectionRange(savedPosition, savedPosition);
        }, 0);
      }
    }
  }, [preserveCursor]);

  // Enhanced tab navigation that skips disabled elements
  const handleTabNavigation = useCallback((event: KeyboardEvent, currentElement: HTMLElement) => {
    if (!enabled || event.key !== 'Tab') return false;

    const form = currentElement.closest('form') || currentElement.closest('tr') || document;
    const focusableElements = form.querySelectorAll(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
    );
    
    const focusableArray = Array.from(focusableElements) as HTMLElement[];
    const currentIndex = focusableArray.indexOf(currentElement);
    
    if (currentIndex === -1) return false;

    event.preventDefault();
    
    let nextIndex;
    if (event.shiftKey) {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = focusableArray.length - 1;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= focusableArray.length) nextIndex = 0;
    }
    
    const nextElement = focusableArray[nextIndex];
    if (nextElement) {
      nextElement.focus();
      
      if (nextElement instanceof HTMLInputElement || nextElement instanceof HTMLTextAreaElement) {
        restoreCursorPosition(nextElement);
      }
    }
    
    return true;
  }, [enabled, restoreCursorPosition]);

  // Create keyboard event handler for form elements
  const createKeyboardHandler = useCallback((callbacks: {
    onEscape?: () => void;
    onEnter?: () => void;
    onTab?: (event: KeyboardEvent) => boolean;
  } = {}) => {
    return (event: React.KeyboardEvent<HTMLElement>) => {
      const element = event.currentTarget;
      
      // Save cursor position on blur
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        saveCursorPosition(element);
      }
      
      // Handle escape
      if (event.key === 'Escape' && preventBlurOnEscape && callbacks.onEscape) {
        event.preventDefault();
        event.stopPropagation();
        callbacks.onEscape();
        return;
      }
      
      // Handle tab navigation
      if (callbacks.onTab) {
        if (callbacks.onTab(event.nativeEvent)) return;
      } else {
        if (handleTabNavigation(event.nativeEvent, element)) return;
      }
      
      // Handle enter
      if (event.key === 'Enter' && callbacks.onEnter) {
        if (element instanceof HTMLTextAreaElement) {
          if (event.ctrlKey || element.rows === 1) {
            event.preventDefault();
            callbacks.onEnter();
          }
        } else {
          event.preventDefault();
          callbacks.onEnter();
        }
      }
    };
  }, [saveCursorPosition, handleTabNavigation, preventBlurOnEscape]);

  return {
    createKeyboardHandler,
    saveCursorPosition,
    restoreCursorPosition,
  };
}