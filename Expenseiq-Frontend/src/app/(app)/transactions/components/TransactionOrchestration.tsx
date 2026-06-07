'use client';

// Lightweight orchestration helpers for transaction page state management.
// Keeps the main page component focused on rendering.

import { useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types/api';

// Row orchestration - manages inline row state
export function useRowOrchestration() {
  const [showInlineRow, setShowInlineRow] = useState(false);
  const [duplicateTransaction, setDuplicateTransaction] = useState<Transaction | undefined>();

  const showInlineRowFn = useCallback(() => {
    setDuplicateTransaction(undefined);
    setShowInlineRow(true);
  }, []);

  const showInlineRowWithDuplicate = useCallback((txn: Transaction) => {
    setDuplicateTransaction(txn);
    setShowInlineRow(true);
  }, []);

  const hideInlineRow = useCallback(() => {
    setShowInlineRow(false);
    setDuplicateTransaction(undefined);
  }, []);

  return {
    showInlineRow,
    duplicateTransaction,
    showInlineRowFn,
    showInlineRowWithDuplicate,
    hideInlineRow,
  };
}

// Modal orchestration - manages all modal states
export function useModalOrchestration() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | undefined>();
  const [deleteTxn, setDeleteTxn] = useState<Transaction | undefined>();
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);
  const [managePaymentsOpen, setManagePaymentsOpen] = useState(false);
  const [manageSubcatsOpen, setManageSubcatsOpen] = useState(false);

  const openAdd = useCallback(() => {
    setEditTxn(undefined);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTxn(undefined);
  }, []);

  const openDelete = useCallback((txn: Transaction) => {
    setDeleteTxn(txn);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteTxn(undefined);
  }, []);

  return {
    modalOpen,
    editTxn,
    deleteTxn,
    bulkConfirmOpen,
    bulkEditOpen,
    importExportOpen,
    manageCatsOpen,
    managePaymentsOpen,
    manageSubcatsOpen,
    openAdd,
    closeModal,
    openDelete,
    closeDelete,
    setBulkConfirmOpen,
    setBulkEditOpen,
    setImportExportOpen,
    setManageCatsOpen,
    setManagePaymentsOpen,
    setManageSubcatsOpen,
  };
}

// Action orchestration - manages transaction actions
export function useActionOrchestration(
  deleteMutation: { mutate: (id: string, options?: { onSuccess?: () => void }) => void },
  bulkDelete: { mutate: (ids: string[], options?: { onSuccess?: () => void }) => void },
  clearSelection: () => void,
  getSelectedIds: () => string[]
) {
  const confirmDelete = useCallback((deleteTxn: Transaction | undefined, closeDelete: () => void) => {
    if (!deleteTxn) return;
    deleteMutation.mutate(deleteTxn.id, { 
      onSuccess: () => closeDelete() 
    });
  }, [deleteMutation]);

  const confirmBulkDelete = useCallback((setBulkConfirmOpen: (open: boolean) => void) => {
    const ids = getSelectedIds();
    bulkDelete.mutate(ids, {
      onSuccess: () => { 
        clearSelection(); 
        setBulkConfirmOpen(false); 
      },
    });
  }, [bulkDelete, clearSelection, getSelectedIds]);

  const handleBulkEditSuccess = useCallback((setBulkEditOpen: (open: boolean) => void) => {
    clearSelection();
    setBulkEditOpen(false);
  }, [clearSelection]);

  return {
    confirmDelete,
    confirmBulkDelete,
    handleBulkEditSuccess,
  };
}