'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui';
import { ManagedListModal } from './ManagedListModal';
import { useCategories, useCategoryMutations } from '@/lib/hooks/useCategories';
import { useSubcategories, useSubcategoryMutations } from '@/lib/hooks/useSubcategories';
import { useRenameCascade } from '../mutations';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManageCategoriesModal({ open, onClose }: Props) {
  const { expenseCategories, incomeCategories, isLoading } = useCategories();
  const mutation = useCategoryMutations();
  const { map: subcategoryMap } = useSubcategories();
  const subcatMutation = useSubcategoryMutations();
  const cascade = useRenameCascade();
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  const currentList = tab === 'expense' ? expenseCategories : incomeCategories;

  function handleAdd(name: string) {
    const updated = tab === 'expense'
      ? { customExpenseCategories: [...expenseCategories, name], customIncomeCategories: incomeCategories }
      : { customExpenseCategories: expenseCategories, customIncomeCategories: [...incomeCategories, name] };
    mutation.mutate(updated);
  }

  function handleDelete(name: string) {
    const updated = tab === 'expense'
      ? { customExpenseCategories: expenseCategories.filter(c => c !== name), customIncomeCategories: incomeCategories }
      : { customExpenseCategories: expenseCategories, customIncomeCategories: incomeCategories.filter(c => c !== name) };
    mutation.mutate(updated);
  }

  function handleRename(oldName: string, newName: string) {
    // 1. Rename in category list
    const rename = (list: string[]) => list.map(c => c === oldName ? newName : c);
    const updated = tab === 'expense'
      ? { customExpenseCategories: rename(expenseCategories), customIncomeCategories: incomeCategories }
      : { customExpenseCategories: expenseCategories, customIncomeCategories: rename(incomeCategories) };
    mutation.mutate(updated, {
      onSuccess: () => cascade('category', oldName, newName),
    });

    // 2. Cascade: rename the key in subcategoryMap so subcategories stay attached
    if (subcategoryMap[oldName] !== undefined) {
      const newMap = { ...subcategoryMap };
      newMap[newName] = newMap[oldName];
      delete newMap[oldName];
      subcatMutation.mutate(newMap);
    }
  }

  function handleReorder(newOrder: string[]) {
    const updated = tab === 'expense'
      ? { customExpenseCategories: newOrder, customIncomeCategories: incomeCategories }
      : { customExpenseCategories: expenseCategories, customIncomeCategories: newOrder };
    mutation.mutate(updated);
  }

  return (
    <ManagedListModal
      open={open}
      onClose={onClose}
      title="Manage Categories"
      items={currentList}
      defaultItems={new Set()}
      isLoading={isLoading}
      isSaving={mutation.isPending}
      placeholder="New category name..."
      emptyMessage={`No ${tab} categories yet. Add your first one!`}
      deleteWarning={(name) => `Delete category "${name}"? Existing transactions using this category will keep their value.`}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onRename={handleRename}
      onReorder={handleReorder}
      header={
        <Tabs
          tabs={[{ id: 'expense', label: 'Expense' }, { id: 'income', label: 'Income' }]}
          active={tab}
          onChange={(id) => setTab(id as 'expense' | 'income')}
        />
      }
    />
  );
}
