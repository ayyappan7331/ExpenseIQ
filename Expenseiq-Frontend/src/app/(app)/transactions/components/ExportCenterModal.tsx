'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { FileText, FileSpreadsheet, FileJson, FileType, File } from 'lucide-react';
import { transactionsToCSV, downloadCSV } from '@/lib/utils/csv';
import { exportJSON, exportXLSX, exportDOCX, exportPDF } from '@/lib/utils/export';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { useToast } from '@/components/ui/Toast';
import type { Transaction } from '@/lib/types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

type Format = 'csv' | 'xlsx' | 'pdf' | 'json' | 'docx';

const FORMATS: { id: Format; label: string; ext: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'csv',
    label: 'CSV',
    ext: '.csv',
    description: 'Comma-separated values. Compatible with Excel, Google Sheets, and any spreadsheet app.',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'xlsx',
    label: 'XLSX',
    ext: '.xlsx',
    description: 'Excel workbook with multiple sheets: Transactions, Categories, Subcategories, Payment Methods, Payment Apps.',
    icon: <FileSpreadsheet className="w-5 h-5" />,
  },
  {
    id: 'pdf',
    label: 'PDF',
    ext: '.pdf',
    description: 'Opens a print-ready report in a new tab. Use your browser\'s Print → Save as PDF.',
    icon: <FileType className="w-5 h-5" />,
  },
  {
    id: 'json',
    label: 'JSON',
    ext: '.json',
    description: 'Structured JSON with metadata. Useful for backups and programmatic processing.',
    icon: <FileJson className="w-5 h-5" />,
  },
  {
    id: 'docx',
    label: 'DOCX',
    ext: '.docx',
    description: 'Word document with a formatted transaction table. Opens in Microsoft Word or Google Docs.',
    icon: <File className="w-5 h-5" />,
  },
];

export function ExportCenterModal({ open, onClose, transactions }: Props) {
  const [selected, setSelected] = useState<Format>('csv');
  const [exporting, setExporting] = useState(false);
  const { data: config } = useFinancialConfig();
  const { toast } = useToast();

  const dateStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  function handleExport() {
    if (transactions.length === 0) {
      toast('No transactions to export', 'error');
      return;
    }
    setExporting(true);
    try {
      const base = `expenseiq-transactions-${dateStr}`;
      switch (selected) {
        case 'csv': {
          const csv = transactionsToCSV(transactions);
          downloadCSV(csv, `${base}.csv`);
          toast('Exported as CSV');
          break;
        }
        case 'xlsx':
          exportXLSX(transactions, config, `${base}.xlsx`);
          toast('Exported as XLSX');
          break;
        case 'pdf':
          exportPDF(transactions, config);
          toast('Print dialog opened — save as PDF');
          break;
        case 'json':
          exportJSON(transactions, `${base}.json`);
          toast('Exported as JSON');
          break;
        case 'docx':
          exportDOCX(transactions, `${base}.docx`);
          toast('Exported as DOCX');
          break;
      }
      if (selected !== 'pdf') onClose();
    } finally {
      setExporting(false);
    }
  }

  const selectedMeta = FORMATS.find(f => f.id === selected)!;

  return (
    <Modal open={open} onClose={onClose} title="Export Center" size="md">
      <div className="space-y-4">
        <p className="text-xs text-text-3">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · current month
        </p>

        {/* Format selector */}
        <div className="grid grid-cols-5 gap-1.5">
          {FORMATS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f.id)}
              className={[
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                selected === f.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-card-border bg-bg-2 text-text-2 hover:bg-bg-3 hover:text-text',
              ].join(' ')}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Description */}
        <div className="p-3 rounded-lg bg-bg-2 border border-card-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-text">{selectedMeta.label}</span>
            <span className="text-xs text-text-3">{selectedMeta.ext}</span>
          </div>
          <p className="text-xs text-text-2">{selectedMeta.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleExport}
            loading={exporting}
            disabled={transactions.length === 0}
          >
            Export {selectedMeta.label}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
