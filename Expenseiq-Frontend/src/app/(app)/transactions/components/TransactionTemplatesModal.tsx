'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { LayoutTemplate, Trash2, Copy, Pencil, Star, Check, X } from 'lucide-react';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { getActiveProfileId } from '@/lib/api/profile';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/hooks/queries/keys';
import type { Transaction, TransactionTemplate, FinancialConfig } from '@/lib/types/api';

interface TransactionTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onUseTemplate: (template: Omit<TransactionTemplate, 'id' | 'name' | 'createdAt'>) => void;
  /** When provided, shows a "Save as Template" form pre-filled from this transaction. */
  currentTransaction?: Partial<Transaction>;
}

export function TransactionTemplatesModal({
  open,
  onClose,
  onUseTemplate,
  currentTransaction,
}: TransactionTemplatesModalProps) {
  const profileId = getActiveProfileId();
  const qc = useQueryClient();
  const { data: config } = useFinancialConfig();
  const templates = config?.transactionTemplates ?? [];

  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editing state: { id, name }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fcKey = queryKeys.financialConfig.one(profileId);

  const patchTemplates = async (next: TransactionTemplate[]) => {
    qc.setQueryData<FinancialConfig>(fcKey, (old) =>
      old ? { ...old, transactionTemplates: next } : old
    );
    try {
      await financialConfigApi.patch({ profileId, transactionTemplates: next });
      qc.invalidateQueries({ queryKey: fcKey });
    } catch {
      qc.invalidateQueries({ queryKey: fcKey });
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim() || !currentTransaction) return;
    const template: TransactionTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      type: currentTransaction.type || 'expense',
      category: currentTransaction.category || '',
      subcategory: currentTransaction.subcategory,
      paymentMethod: currentTransaction.paymentMethod,
      paymentApp: currentTransaction.paymentApp,
      notes: currentTransaction.notes,
      amount: currentTransaction.amount,
      createdAt: new Date().toISOString(),
    };
    setIsSaving(true);
    await patchTemplates([template, ...templates]);
    setNewTemplateName('');
    setShowSaveForm(false);
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    await patchTemplates(templates.filter((t) => t.id !== id));
  };

  const handleDuplicate = async (template: TransactionTemplate) => {
    const copy: TransactionTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (copy)`,
      createdAt: new Date().toISOString(),
    };
    await patchTemplates([copy, ...templates]);
  };

  const handleToggleFavorite = async (template: TransactionTemplate) => {
    // Favorites float to top: toggle by moving to front or back
    const isFav = templates[0]?.id === template.id && templates.length > 1;
    if (isFav) {
      // Move to end
      await patchTemplates([
        ...templates.filter((t) => t.id !== template.id),
        template,
      ]);
    } else {
      // Move to front
      await patchTemplates([
        template,
        ...templates.filter((t) => t.id !== template.id),
      ]);
    }
  };

  const startEdit = (template: TransactionTemplate) => {
    setEditingId(template.id);
    setEditingName(template.name);
  };

  const commitEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await patchTemplates(
      templates.map((t) =>
        t.id === editingId ? { ...t, name: editingName.trim() } : t
      )
    );
    setEditingId(null);
    setEditingName('');
  };

  const handleUseTemplate = (template: TransactionTemplate) => {
    onUseTemplate({
      type: template.type,
      category: template.category,
      subcategory: template.subcategory,
      paymentMethod: template.paymentMethod,
      paymentApp: template.paymentApp,
      notes: template.notes,
      amount: template.amount,
    });
    onClose();
  };

  const canSaveTemplate = currentTransaction?.category && currentTransaction?.type;

  return (
    <Modal open={open} onClose={onClose} title="Transaction Templates" size="md">
      <div className="space-y-4">
        {/* Save current transaction as template */}
        {canSaveTemplate && (
          <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
            {!showSaveForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-accent">Save Current Transaction</p>
                  <p className="text-xs text-accent/80">
                    {currentTransaction.type} • {currentTransaction.category}
                    {currentTransaction.subcategory && ` • ${currentTransaction.subcategory}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(true)}>
                  Save as Template
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Template name (e.g., 'Grocery Shopping')"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveAsTemplate();
                    if (e.key === 'Escape') setShowSaveForm(false);
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveAsTemplate}
                    disabled={!newTemplateName.trim() || isSaving}
                    loading={isSaving}
                  >
                    Save Template
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-text mb-3">
            Saved Templates {templates.length > 0 && <span className="text-text-3 font-normal">({templates.length})</span>}
          </h3>

          {templates.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <LayoutTemplate className="w-10 h-10 mx-auto text-text-3 opacity-40" />
              <p className="text-sm font-medium text-text-2">No templates created yet</p>
              <p className="text-xs text-text-3">
                Create frequently used transactions for one-click entry
              </p>
              {!canSaveTemplate && (
                <p className="text-xs text-text-3 mt-1">
                  Open a transaction and use &quot;Save as Template&quot; to get started.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {templates.map((template, idx) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 bg-bg-2 rounded-lg border border-card-border hover:bg-bg-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    {editingId === template.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="flex-1 text-sm bg-bg-3 border border-accent/40 rounded px-2 py-0.5 text-text focus:outline-none focus:ring-1 focus:ring-accent/40"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                          }}
                          autoFocus
                        />
                        <button type="button" onClick={commitEdit} className="text-income hover:opacity-80" aria-label="Confirm rename">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => { setEditingId(null); setEditingName(''); }} className="text-text-3 hover:text-text" aria-label="Cancel rename">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          {idx === 0 && templates.length > 1 && (
                            <Star className="w-3 h-3 text-accent flex-shrink-0" fill="currentColor" />
                          )}
                          <h4 className="text-sm font-medium text-text truncate">{template.name}</h4>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded flex-shrink-0 ${
                            template.type === 'income'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}>
                            {template.type}
                          </span>
                        </div>
                        <p className="text-xs text-text-3 truncate">
                          {template.category}
                          {template.subcategory && ` • ${template.subcategory}`}
                          {template.paymentMethod && ` • ${template.paymentMethod}`}
                          {template.amount ? ` • ₹${template.amount.toLocaleString()}` : ''}
                        </p>
                      </>
                    )}
                  </div>

                  {editingId !== template.id && (
                    <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUseTemplate(template)}
                        className="text-accent hover:text-accent text-xs px-2"
                      >
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(template)}
                        aria-label="Rename"
                        title="Rename"
                        className="text-text-3 hover:text-text"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDuplicate(template)}
                        aria-label="Duplicate"
                        title="Duplicate"
                        className="text-text-3 hover:text-accent"
                        icon={<Copy className="w-3.5 h-3.5" />}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleFavorite(template)}
                        aria-label={idx === 0 ? 'Unfavorite' : 'Favorite (move to top)'}
                        title={idx === 0 ? 'Unfavorite' : 'Favorite'}
                        className={idx === 0 ? 'text-accent' : 'text-text-3 hover:text-accent'}
                        icon={<Star className="w-3.5 h-3.5" fill={idx === 0 ? 'currentColor' : 'none'} />}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(template.id)}
                        aria-label="Delete"
                        className="text-text-3 hover:text-red-500"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-card-border">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
