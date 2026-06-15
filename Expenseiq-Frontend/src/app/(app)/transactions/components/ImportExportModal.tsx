'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import { Button, Modal, Badge } from '@/components/ui';
import { transactionsToCSV, downloadCSV, parseTransactionsCSV, type ImportResult } from '@/lib/utils/csv';
import type { Transaction } from '@/lib/types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

export function ImportExportModal({ open, onClose, transactions }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const bulkCreate = useMutation({
    mutationFn: (data: Parameters<typeof api.bulkCreateTransactions>[0]) => api.bulkCreateTransactions(data),
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast(`${data.length} transactions imported`);
      setImportResult(null);
      onClose();
    },
    onError: () => toast('Import failed', 'error'),
  });

  function handleExport() {
    const csv = transactionsToCSV(transactions);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `expenseiq-transactions-${date}.csv`);
    toast('Exported to CSV');
  }

  function handleFileSelect(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseTransactionsCSV(text);
      setImportResult(result);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    ev.target.value = '';
  }

  function confirmImport() {
    if (!importResult || importResult.valid.length === 0) return;
    setImporting(true);
    bulkCreate.mutate(importResult.valid, { onSettled: () => setImporting(false) });
  }

  function resetImport() {
    setImportResult(null);
  }

  return (
    <Modal open={open} onClose={() => { resetImport(); onClose(); }} title="Import / Export" size="md">
      <div className="space-y-5">
        {/* Export section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text">Export</h3>
          <p className="text-xs text-text-3">Download current month&apos;s transactions as CSV.</p>
          <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport} disabled={transactions.length === 0}>
            Export CSV ({transactions.length} rows)
          </Button>
        </div>

        <hr className="border-card-border" />

        {/* Import section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text">Import</h3>
          <p className="text-xs text-text-3">Upload a CSV with columns: date, type, amount, category, paymentMethod, notes</p>

          {!importResult ? (
            <div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              <Button variant="ghost" size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => fileRef.current?.click()}>
                Select CSV File
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-bg-2 rounded-xl border border-card-border">
              <div className="flex items-center gap-3">
                <Badge variant="income">{importResult.valid.length} valid</Badge>
                {importResult.errors.length > 0 && <Badge variant="expense">{importResult.errors.length} errors</Badge>}
                <span className="text-xs text-text-3">of {importResult.total} rows</span>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-expense">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Row {err.row}: {err.message}</span>
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-xs text-text-3">...and {importResult.errors.length - 10} more errors</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={confirmImport} loading={importing} disabled={importResult.valid.length === 0}>
                  Import {importResult.valid.length} Transactions
                </Button>
                <Button variant="ghost" size="sm" onClick={resetImport}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
