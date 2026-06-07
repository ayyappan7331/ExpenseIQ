'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * Minimal HTML5 DnD hook for reordering a string list.
 *
 * Event handlers are stable (never recreated) because items and onReorder
 * are stored in refs. This avoids stale-closure bugs when the list changes
 * between dragstart and drop.
 *
 * Usage:
 *   const dnd = useDraggableList(items, onReorder);
 *   // On the drag handle:
 *   <span draggable onDragStart={dnd.onDragStart(idx)} />
 *   // On the drop target (the row itself):
 *   <div onDragOver={dnd.onDragOver(idx)} onDrop={dnd.onDrop(idx)} onDragEnd={dnd.onDragEnd} />
 */
export function useDraggableList(
  items: string[],
  onReorder: ((newOrder: string[]) => void) | undefined
) {
  // Keep latest values in refs so handlers never go stale
  const itemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

  const dragIndex = useRef<number | null>(null);

  const onDragStart = useCallback(
    (idx: number) => (e: React.DragEvent) => {
      dragIndex.current = idx;
      e.dataTransfer.effectAllowed = 'move';
      // Set drag data so the browser knows this is a valid drag operation
      e.dataTransfer.setData('text/plain', String(idx));
    },
    []
  );

  const onDragOver = useCallback(
    // idx kept for API symmetry with onDragStart/onDrop
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (idx: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    []
  );

  const onDrop = useCallback(
    (idx: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const from = dragIndex.current;
      const to = idx;
      dragIndex.current = null;
      if (from === null || from === to) return;
      const next = [...itemsRef.current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorderRef.current?.(next);
    },
    []
  );

  const onDragEnd = useCallback(() => {
    dragIndex.current = null;
  }, []);

  return { onDragStart, onDragOver, onDrop, onDragEnd };
}
