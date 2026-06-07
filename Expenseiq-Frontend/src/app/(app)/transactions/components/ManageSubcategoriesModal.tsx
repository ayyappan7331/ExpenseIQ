'use client';

import { useState, useMemo } from 'react';
import { Select } from '@/components/ui';
import { ManagedListModal } from './ManagedListModal';
import { useCategories } from '@/lib/hooks/useCategories';
import { useSubcategories, useSubcategoryMutations } from '@/lib/hooks/useSubcategories';
import { useRenameCascade } from '../mutations';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManageSubcategoriesModal({ open, onClose }: Props) {
  const { expenseCategories, incomeCategories } = useCategories();
  const { map, isLoading } = useSubcategories();
  const mutation = useSubcategoryMutations();
  const cascade = useRenameCascade();

  const allCategories = useMemo(
    () => [...expenseCategories, ...incomeCategories],
    [expenseCategories, incomeCategories]
  );

  // Default to first available category; falls back to '' when list is empty
  const [selectedCategory, setSelectedCategory] = useState('');

  // Derive effective selection — if stored value no longer exists, fall back to first
  const effectiveCategory = allCategories.includes(selectedCategory)
    ? selectedCategory
    : allCategories[0] ?? '';

  const currentSubs = effectiveCategory ? (map[effectiveCategory] || []) : [];

  function handleAdd(name: string) {
    mutation.mutate({ ...map, [effectiveCategory]: [...currentSubs, name] });
  }

  function handleDelete(name: string) {
    const remaining = currentSubs.filter((s) => s !== name);
    const updated = { ...map };
    if (remaining.length === 0) {
      delete updated[effectiveCategory];
    } else {
      updated[effectiveCategory] = remaining;
    }
    mutation.mutate(updated);
  }

  function handleRename(oldName: string, newName: string) {
    const updated = { ...map, [effectiveCategory]: currentSubs.map(s => s === oldName ? newName : s) };
    mutation.mutate(updated, {
      onSuccess: () => cascade('subcategory', oldName, newName),
    });
  }

  function handleReorder(newOrder: string[]) {
    mutation.mutate({ ...map, [effectiveCategory]: newOrder });
  }

  return (
    <ManagedListModal
      open={open}
      onClose={onClose}
      title="Manage Subcategories"
      items={currentSubs}
      defaultItems={new Set()}
      isLoading={isLoading}
      isSaving={mutation.isPending}
      placeholder="New subcategory..."
      emptyMessage={
        allCategories.length === 0
          ? 'Add categories first before adding subcategories'
          : effectiveCategory
          ? `No subcategories for "${effectiveCategory}" yet`
          : 'Select a category first'
      }
      deleteWarning={(name) => `Delete subcategory "${name}"? Existing transactions using it will keep their value.`}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onRename={handleRename}
      onReorder={handleReorder}
      addDisabled={!effectiveCategory}
      header={
        <Select
          label="Parent Category"
          value={effectiveCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={allCategories.map((c) => ({ value: c, label: c }))}
          placeholder={allCategories.length === 0 ? 'No categories yet' : 'Select a category...'}
        />
      }
    />
  );
}
