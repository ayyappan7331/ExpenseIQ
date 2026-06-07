'use client';

import { RefObject } from 'react';

export interface RowKeyboardHandlers {
  handleDateKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTimeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCategoryKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  handleSubcategoryKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  handleNotesKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaymentKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  handlePaymentAppKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  handleAmountKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface CreateRowKeyboardHandlersProps {
  dateRef: RefObject<HTMLInputElement | null>;
  timeRef: RefObject<HTMLInputElement | null>;
  categoryRef: RefObject<HTMLSelectElement | null>;
  subcategoryRef: RefObject<HTMLSelectElement | null>;
  notesRef: RefObject<HTMLTextAreaElement | null>;
  paymentRef: RefObject<HTMLSelectElement | null>;
  paymentAppRef: RefObject<HTMLSelectElement | null>;
  amountRef: RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onSaveAndAddAnother?: () => void;
  onCancel?: () => void;
}

function focusWithCursorPreservation(element: HTMLElement) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const cursorPosition = element.selectionStart || 0;
    element.focus();
    setTimeout(() => { element.setSelectionRange(cursorPosition, cursorPosition); }, 0);
  } else {
    element.focus();
  }
}

function getNextFocusableField(
  currentRef: RefObject<HTMLElement | null>,
  allRefs: RefObject<HTMLElement | null>[],
  direction: 'forward' | 'backward' = 'forward'
): RefObject<HTMLElement | null> | null {
  const currentIndex = allRefs.indexOf(currentRef);
  if (currentIndex === -1) return null;
  const increment = direction === 'forward' ? 1 : -1;
  for (let i = 1; i < allRefs.length; i++) {
    const index = (currentIndex + i * increment + allRefs.length) % allRefs.length;
    const ref = allRefs[index];
    const element = ref.current;
    if (element && !element.hasAttribute('disabled') && element.offsetParent !== null) {
      return ref;
    }
  }
  return null;
}

export function createRowKeyboardHandlers({
  dateRef,
  timeRef,
  categoryRef,
  subcategoryRef,
  notesRef,
  paymentRef,
  paymentAppRef,
  amountRef,
  onSave,
  onSaveAndAddAnother,
  onCancel,
}: CreateRowKeyboardHandlersProps): RowKeyboardHandlers {
  const allRefs = [dateRef, timeRef, categoryRef, subcategoryRef, notesRef, paymentRef, paymentAppRef, amountRef];

  const handleEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel?.(); }
  };

  const handleTab = (e: React.KeyboardEvent, currentRef: RefObject<HTMLElement | null>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextRef = getNextFocusableField(currentRef, allRefs, e.shiftKey ? 'backward' : 'forward');
      if (nextRef?.current) focusWithCursorPreservation(nextRef.current);
    }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { handleEscape(e); handleTab(e, dateRef); };
  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { handleEscape(e); handleTab(e, timeRef); };
  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => { handleEscape(e); handleTab(e, categoryRef); };
  const handleSubcategoryKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => { handleEscape(e); handleTab(e, subcategoryRef); };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleEscape(e);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSaveAndAddAnother?.(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(); return; }
    handleTab(e, notesRef);
  };

  const handlePaymentKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => { handleEscape(e); handleTab(e, paymentRef); };
  const handlePaymentAppKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => { handleEscape(e); handleTab(e, paymentAppRef); };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleEscape(e);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSaveAndAddAnother?.(); return; }
    if (e.key === 'Enter') { e.preventDefault(); onSave(); return; }
    handleTab(e, amountRef);
  };

  return {
    handleDateKeyDown,
    handleTimeKeyDown,
    handleCategoryKeyDown,
    handleSubcategoryKeyDown,
    handleNotesKeyDown,
    handlePaymentKeyDown,
    handlePaymentAppKeyDown,
    handleAmountKeyDown,
  };
}
