'use client';

import { useState, useCallback, useRef } from 'react';
import { Plus, AlertCircle, Tag, CreditCard } from 'lucide-react';
import { useTransactions } from '@/lib/hooks/queries';
import { Button, SectionCard, ConfirmDialog, EmptyState, PageError, Badge } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useCategories } from '@/lib/hooks/useCategories';
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods';
import { useDeleteTransaction, useBulkDeleteTransactions } from './mutations';
import { parseTransactionsCSV } from '@/lib/utils/csv';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import {
  TransactionModal,
  TransactionFilters,
  TransactionTable,
  ManageCategoriesModal,
  ManagePaymentMethodsModal,
  ManageSubcategoriesModal,
  ImportExportModal,
  BulkEditModal,
  ToolbarActions,
  TransactionTemplatesModal,
  FavoriteTransactions,
  ExportCenterModal,
  useDensityMode,
  useFavoriteIds,
  useMultiRowOrchestration,
} from './components';
import { ManagePaymentAppsModal } from './components/ManagePaymentAppsModal';
import {
  useFilterState,
  useSortState,
  useTransactionFiltering,
  useUniqueCategories,
} from './components/FilterStateHelpers';
import { useBulkSelection } from './components/BulkActionControls';
import {
  useModalOrchestration,
  useActionOrchestration,
} from './components/TransactionOrchestration';
import { usePageKeyboardShortcuts } from './components/usePageKeyboardShortcuts';
import { getApiErrorMessage } from '@/lib/utils/apiErrors';
import { useMonth } from '@/components/layout/MonthContext';
import type { Transaction, TransactionTemplate } from '@/lib/types/api';

export default function TransactionsPage() {
  const { month: currentMonth } = useMonth();
  // When currentMonth is '' (All Months), pass undefined so the API
  // returns all transactions regardless of date.
  const { data: txns, isLoading, isError, error, refetch } = useTransactions({
    month: currentMonth || undefined,
  });
  const { expenseCategories, incomeCategories } = useCategories();
  const { paymentMethods } = usePaymentMethods();

  // E3.5: template prefill state
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<Transaction>>();
  const [saveAsTemplateData, setSaveAsTemplateData] = useState<Partial<Transaction> | undefined>();
  const [managePaymentAppsOpen, setManagePaymentAppsOpen] = useState(false);
  const [exportCenterOpen, setExportCenterOpen] = useState(false);

  // E3.6: density
  const { density, setDensity, groupPeriod, setGroupPeriod } = useDensityMode();
  const { favoriteIds } = useFavoriteIds(txns || []);

  // E3.9: search ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const hasCategories = expenseCategories.length > 0 || incomeCategories.length > 0;
  const hasPaymentMethods = paymentMethods.length > 0;

  // Multi-row quick add
  const multiRow = useMultiRowOrchestration();
  const modalOrchestration = useModalOrchestration();

  const { filters, setFilters } = useFilterState();
  const { sort, handleSort } = useSortState();
  const {
    selectedKeys,
    selectedCount,
    handleSelectRow,
    handleSelectAll,
    clearSelection,
    getSelectedIds,
  } = useBulkSelection();

  const deleteMutation = useDeleteTransaction();
  const bulkDelete = useBulkDeleteTransactions();

  const actionOrchestration = useActionOrchestration(
    deleteMutation,
    bulkDelete,
    clearSelection,
    getSelectedIds
  );

  const categories = useUniqueCategories(txns || []);
  const filtered = useTransactionFiltering(txns || [], filters, sort, undefined, favoriteIds);

  const handleSortClick = useCallback((key: string) => handleSort(key), [handleSort]);

  const handleSelectAllTransactions = useCallback(() => {
    handleSelectAll(filtered);
  }, [handleSelectAll, filtered]);

  // Derive whether any modal is open for keyboard shortcut guard
  const isAnyModalOpen =
    modalOrchestration.modalOpen ||
    modalOrchestration.bulkEditOpen ||
    modalOrchestration.bulkConfirmOpen ||
    modalOrchestration.importExportOpen ||
    modalOrchestration.manageCatsOpen ||
    modalOrchestration.managePaymentsOpen ||
    modalOrchestration.manageSubcatsOpen ||
    !!modalOrchestration.deleteTxn ||
    templatesOpen ||
    managePaymentAppsOpen ||
    exportCenterOpen;

  // E3.9: page-level keyboard shortcuts
  usePageKeyboardShortcuts({
    onNewRow: multiRow.addRow,
    onFocusSearch: () => searchInputRef.current?.focus(),
    searchInputRef,
    isRowOpen: multiRow.rowCount > 0,
    isAnyModalOpen,
  });

  const { toast } = useToast();
  const qc = useQueryClient();
  const bulkCreateMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.bulkCreateTransactions>[0]) => api.bulkCreateTransactions(data),
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast(`${data.length} transactions imported`);
    },
    onError: () => toast('Import failed', 'error'),
  });

  function handleDirectImportFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseTransactionsCSV(text);
      if (result.valid.length === 0) {
        toast(`No valid rows found (${result.errors.length} errors)`, 'error');
      } else {
        bulkCreateMutation.mutate(result.valid);
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  }
  // Use a template by opening a quick-add row pre-filled with template data
  const handleUseTemplateQuickAdd = useCallback((template: Omit<TransactionTemplate, 'id' | 'name' | 'createdAt'>) => {
    multiRow.addDuplicateRow({
      id: `tpl-${Date.now()}`,
      profileId: '',
      type: template.type,
      amount: template.amount ?? 0,
      category: template.category || '',
      subcategory: template.subcategory,
      date: '',
      paymentMethod: template.paymentMethod,
      paymentApp: template.paymentApp,
      notes: template.notes,
    } as Transaction);
    setTemplatesOpen(false);
  }, [multiRow]);

  // Save as Template: open templates modal pre-filled with transaction data
  const handleSaveAsTemplate = useCallback((txn: Transaction) => {
    setSaveAsTemplateData(txn);
    setTemplatesOpen(true);
  }, []);

  // Smart prefill: open modal with prefilled data from favorite
  const handleUseFavorite = useCallback((favorite: Partial<Transaction>) => {
    setPrefillData(favorite);
    modalOrchestration.openAdd();
  }, [modalOrchestration]);

  // When templates modal closes, clear saveAsTemplateData
  const handleTemplatesClose = useCallback(() => {
    setTemplatesOpen(false);
    setSaveAsTemplateData(undefined);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard className="h-[400px]" />
      </div>
    );
  }

  if (isError) {
    return <PageError message={getApiErrorMessage(error, 'Failed to load transactions')} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      {/* Onboarding guidance */}
      {(!hasCategories || !hasPaymentMethods) && (
        <SectionCard title="Setup Required">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text">Setup Required</h3>
              <p className="text-xs text-text-3">
                Before adding transactions, you need to set up your categories and payment methods.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {!hasCategories && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Tag className="w-3.5 h-3.5" />}
                    onClick={() => modalOrchestration.setManageCatsOpen(true)}
                  >
                    Add Categories
                    <Badge variant="accent" className="ml-1">Required</Badge>
                  </Button>
                )}
                {!hasPaymentMethods && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<CreditCard className="w-3.5 h-3.5" />}
                    onClick={() => modalOrchestration.setManagePaymentsOpen(true)}
                  >
                    Add Payment Methods
                    <Badge variant="default" className="ml-1">Optional</Badge>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Favorites quick access */}
      {hasCategories && (
        <FavoriteTransactions
          onUseTransaction={handleUseFavorite}
          className="p-4 bg-card border border-card-border rounded-xl"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-text">Financial Activity</h2>
          <p className="text-xs text-text-3">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            {!currentMonth && ' · all time'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ToolbarActions
            selectedCount={selectedCount}
            hasCategories={hasCategories}
            showInlineRow={multiRow.atMax}
            onBulkDelete={() => modalOrchestration.setBulkConfirmOpen(true)}
            onManageCategories={() => modalOrchestration.setManageCatsOpen(true)}
            onManageSubcategories={() => modalOrchestration.setManageSubcatsOpen(true)}
            onManagePayments={() => modalOrchestration.setManagePaymentsOpen(true)}
            onManagePaymentApps={() => setManagePaymentAppsOpen(true)}
            onImport={() => importFileRef.current?.click()}
            onOpenExportCenter={() => setExportCenterOpen(true)}
            onQuickAdd={multiRow.addRow}
            onAdd={modalOrchestration.openAdd}
            onOpenTemplates={() => setTemplatesOpen(true)}
            density={density}
            onSetDensity={setDensity}
            groupPeriod={groupPeriod}
            onSetGroupPeriod={setGroupPeriod}
          />
          {selectedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => modalOrchestration.setBulkEditOpen(true)}>
              Edit ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filters (includes quick filter chips) */}
      <TransactionFilters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        paymentMethods={paymentMethods}
        pinnedCount={0}
        searchInputRef={searchInputRef}
      />

      {/* Table — single instance always mounted so pageSize/page state survives
          txns loading transitions and mutation-triggered refetches. */}
      <SectionCard title="Ledger" padding={false}>
        <TransactionTable
          transactions={filtered}
          sort={sort}
          onSort={handleSortClick}
          selectedKeys={selectedKeys}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAllTransactions}
          onDelete={modalOrchestration.openDelete}
          onSaveAsTemplate={handleSaveAsTemplate}
          density={density}
          groupPeriod={groupPeriod}
          quickAddRows={multiRow.rows}
          onRemoveQuickAddRow={multiRow.removeRow}
        />
        {(!txns || txns.length === 0) && multiRow.rows.length === 0 && (
          <EmptyState
            emoji="📝"
            message={!hasCategories
              ? 'Set up categories first to start tracking transactions.'
              : 'No transactions this month. Add your first one!'}
            action={!hasCategories ? (
              <Button size="sm" icon={<Tag className="w-3.5 h-3.5" />} onClick={() => modalOrchestration.setManageCatsOpen(true)}>
                Add Categories
              </Button>
            ) : (
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={modalOrchestration.openAdd}>
                Add Transaction
              </Button>
            )}
          />
        )}
      </SectionCard>

      {/* Add/Edit Modal */}
      <TransactionModal
        open={modalOrchestration.modalOpen}
        onClose={() => {
          modalOrchestration.closeModal();
          setPrefillData(undefined);
        }}
        editTransaction={modalOrchestration.editTxn}
      />

      {/* Templates Modal */}
      <TransactionTemplatesModal
        open={templatesOpen}
        onClose={handleTemplatesClose}
        onUseTemplate={handleUseTemplateQuickAdd}
        currentTransaction={saveAsTemplateData ?? prefillData}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!modalOrchestration.deleteTxn}
        onClose={modalOrchestration.closeDelete}
        onConfirm={() => actionOrchestration.confirmDelete(modalOrchestration.deleteTxn, modalOrchestration.closeDelete)}
        message={`Delete this ${modalOrchestration.deleteTxn?.type || ''} transaction of ₹${modalOrchestration.deleteTxn?.amount?.toLocaleString() || 0}?`}
        loading={deleteMutation.isPending}
      />

      <ManageCategoriesModal open={modalOrchestration.manageCatsOpen} onClose={() => modalOrchestration.setManageCatsOpen(false)} />
      <ManageSubcategoriesModal open={modalOrchestration.manageSubcatsOpen} onClose={() => modalOrchestration.setManageSubcatsOpen(false)} />
      <ManagePaymentMethodsModal open={modalOrchestration.managePaymentsOpen} onClose={() => modalOrchestration.setManagePaymentsOpen(false)} />
      <ManagePaymentAppsModal open={managePaymentAppsOpen} onClose={() => setManagePaymentAppsOpen(false)} />
      <ExportCenterModal open={exportCenterOpen} onClose={() => setExportCenterOpen(false)} transactions={txns || []} />
      <ImportExportModal open={modalOrchestration.importExportOpen} onClose={() => modalOrchestration.setImportExportOpen(false)} transactions={txns || []} />

      <BulkEditModal
        open={modalOrchestration.bulkEditOpen}
        onClose={() => modalOrchestration.setBulkEditOpen(false)}
        selectedTransactions={filtered.filter(t => selectedKeys.has(t.id))}
        onSuccess={() => actionOrchestration.handleBulkEditSuccess(modalOrchestration.setBulkEditOpen)}
      />

      <ConfirmDialog
        open={modalOrchestration.bulkConfirmOpen}
        onClose={() => modalOrchestration.setBulkConfirmOpen(false)}
        onConfirm={() => actionOrchestration.confirmBulkDelete(modalOrchestration.setBulkConfirmOpen)}
        message={`Delete ${selectedCount} selected transaction${selectedCount > 1 ? 's' : ''}? This cannot be undone.`}
        loading={bulkDelete.isPending}
      />

      {/* Hidden file input for direct import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".csv"
        onChange={handleDirectImportFile}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}
