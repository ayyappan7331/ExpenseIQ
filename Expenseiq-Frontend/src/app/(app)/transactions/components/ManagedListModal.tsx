'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, GripVertical } from 'lucide-react';
import { Modal, Button, Input, ConfirmDialog } from '@/components/ui';
import { useDraggableList } from '@/lib/hooks/useDraggableList';

export interface ManagedListModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  defaultItems: ReadonlySet<string>;
  isLoading?: boolean;
  isSaving?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  deleteWarning?: (name: string) => string;
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
  onRename?: (oldName: string, newName: string) => void;
  onReorder?: (newOrder: string[]) => void;
  addDisabled?: boolean;
  header?: React.ReactNode;
}

export function ManagedListModal({
  open,
  onClose,
  title,
  items,
  isLoading,
  isSaving,
  placeholder = 'New item...',
  emptyMessage = 'No items yet',
  deleteWarning,
  onAdd,
  onDelete,
  onRename,
  onReorder,
  addDisabled = false,
  header,
}: ManagedListModalProps) {
  const [newName, setNewName] = useState('');
  const [inputError, setInputError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) { setInputError('Name is required'); return; }
    if (addDisabled) { setInputError('Select a category first'); return; }
    if (items.map(i => i.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInputError('Already exists'); return;
    }
    setInputError('');
    onAdd(trimmed);
    setNewName('');
  }

  function startEdit(item: string) {
    setEditingItem(item);
    setEditValue(item);
  }

  function cancelEdit() {
    setEditingItem(null);
    setEditValue('');
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === editingItem) { cancelEdit(); return; }
    if (items.filter(i => i !== editingItem).map(i => i.toLowerCase()).includes(trimmed.toLowerCase())) {
      return; // duplicate — don't save
    }
    onRename?.(editingItem!, trimmed);
    cancelEdit();
  }

  const dnd = useDraggableList(items, onReorder);

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} size="sm">
        <div className="space-y-4">
          {header}

          {/* Add row — compact + button aligned with input */}
          <div className="flex gap-1.5 items-start">
            <div className="flex-1">
              <Input
                placeholder={placeholder}
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setInputError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                error={inputError}
                aria-label={placeholder}
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={addDisabled || isSaving}
              aria-label="Add item"
              title="Add"
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-card-border bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          {isLoading ? (
            <p className="text-xs text-text-3 text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {items.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-text-3 mb-3">{emptyMessage}</p>
                  <p className="text-xs text-text-3">Use the form above to create your first item.</p>
                </div>
              )}
              {items.map((item, idx) => (
                <div
                  key={item}
                  draggable={!!onReorder}
                  onDragStart={onReorder ? dnd.onDragStart(idx) : undefined}
                  onDragOver={onReorder ? dnd.onDragOver(idx) : undefined}
                  onDrop={onReorder ? dnd.onDrop(idx) : undefined}
                  onDragEnd={onReorder ? dnd.onDragEnd : undefined}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-bg-2 border border-card-border transition-opacity"
                >
                  {/* Drag handle */}
                  {onReorder && (
                    <span
                      aria-label="Drag to reorder"
                      className="flex-shrink-0 cursor-grab active:cursor-grabbing text-text-3 hover:text-text-2 touch-none"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {/* Inline edit or display */}
                  {editingItem === item ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 min-w-0 px-1.5 py-0.5 text-sm bg-bg-3 border border-accent/50 rounded text-text focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                  ) : (
                    <span className="flex-1 min-w-0 text-sm text-text truncate px-1">{item}</span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {editingItem === item ? (
                      <>
                        <Button variant="icon" size="sm" onClick={commitEdit} aria-label="Save">
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button variant="icon" size="sm" onClick={cancelEdit} aria-label="Cancel">
                          <X className="w-3.5 h-3.5 text-expense" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {onRename && (
                          <Button variant="icon" size="sm" onClick={() => startEdit(item)} aria-label={`Edit ${item}`}>
                            <Pencil className="w-3.5 h-3.5 text-text-3 hover:text-text" />
                          </Button>
                        )}
                        <Button variant="icon" size="sm" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item}`}>
                          <Trash2 className="w-3.5 h-3.5 text-expense" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <p className="text-[11px] text-text-3">
              Renaming does not affect existing transactions — they keep their stored values.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { onDelete(deleteTarget); setDeleteTarget(null); } }}
        message={deleteTarget ? (deleteWarning?.(deleteTarget) ?? `Delete "${deleteTarget}"?`) : ''}
        confirmLabel="Delete"
        loading={isSaving}
      />
    </>
  );
}
