'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/lib/hooks/queries';
import { getActiveProfileId } from '@/lib/api/profile';
import { todayMonth, prevMonth } from '@/lib/utils/dates';

interface SmartSuggestion {
  value: string;
  frequency: number;
  lastUsed: string;
  context?: string;
}

interface SmartSuggestionsProps {
  type: 'category' | 'subcategory' | 'paymentMethod' | 'notes';
  currentCategory?: string;
  currentType?: 'income' | 'expense';
  onSelect: (value: string) => void;
  maxSuggestions?: number;
}

export function SmartSuggestions({ 
  type, 
  currentCategory, 
  currentType, 
  onSelect, 
  maxSuggestions = 3 
}: SmartSuggestionsProps) {
  const profileId = getActiveProfileId();
  const currentMonth = todayMonth();
  const lastMonth = prevMonth(currentMonth);
  
  // Get recent transactions for analysis
  const { data: currentTxns } = useTransactions({ profileId, month: currentMonth });
  const { data: lastMonthTxns } = useTransactions({ profileId, month: lastMonth });
  
  const allTransactions = useMemo(() => {
    return [...(currentTxns || []), ...(lastMonthTxns || [])];
  }, [currentTxns, lastMonthTxns]);

  const suggestions = useMemo(() => {
    if (!allTransactions.length) return [];

    // Filter transactions by type if specified
    let filteredTxns = allTransactions;
    if (currentType) {
      filteredTxns = filteredTxns.filter(t => t.type === currentType);
    }

    // Further filter by category for subcategory/payment/notes suggestions
    if (currentCategory && (type === 'subcategory' || type === 'paymentMethod' || type === 'notes')) {
      filteredTxns = filteredTxns.filter(t => t.category === currentCategory);
    }

    // Extract values based on type
    const valueMap = new Map<string, { count: number; lastUsed: string; contexts: Set<string> }>();
    
    filteredTxns.forEach(txn => {
      let value: string | undefined;
      let context: string | undefined;
      
      switch (type) {
        case 'category':
          value = txn.category;
          context = txn.type;
          break;
        case 'subcategory':
          value = txn.subcategory;
          context = txn.category;
          break;
        case 'paymentMethod':
          value = txn.paymentMethod;
          context = `${txn.category}${txn.subcategory ? ` • ${txn.subcategory}` : ''}`;
          break;
        case 'notes':
          value = txn.notes;
          context = `${txn.category} • ${txn.paymentMethod || 'No method'}`;
          break;
      }
      
      if (value && value.trim()) {
        const existing = valueMap.get(value) || { count: 0, lastUsed: txn.date, contexts: new Set() };
        existing.count += 1;
        if (txn.date > existing.lastUsed) {
          existing.lastUsed = txn.date;
        }
        if (context) {
          existing.contexts.add(context);
        }
        valueMap.set(value, existing);
      }
    });

    // Convert to suggestions and sort by relevance
    const suggestions: SmartSuggestion[] = Array.from(valueMap.entries())
      .map(([value, data]) => ({
        value,
        frequency: data.count,
        lastUsed: data.lastUsed,
        context: Array.from(data.contexts).slice(0, 2).join(', '),
      }))
      .sort((a, b) => {
        // Sort by frequency first, then by recency
        if (a.frequency !== b.frequency) {
          return b.frequency - a.frequency;
        }
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      })
      .slice(0, maxSuggestions);

    return suggestions;
  }, [allTransactions, type, currentCategory, currentType, maxSuggestions]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-text-2">Recent:</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.value}
            onClick={() => onSelect(suggestion.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(suggestion.value);
              }
            }}
            className="group relative px-2 py-1 text-xs bg-accent/10 text-accent rounded border border-accent/20 hover:bg-accent/20 transition-colors focus:outline-none focus:ring-1 focus:ring-accent/50"
            title={`Used ${suggestion.frequency}x • ${suggestion.context || 'Recent'}`}
          >
            <span className="flex items-center gap-1">
              <span className="truncate max-w-[120px]">{suggestion.value}</span>
              {suggestion.frequency > 1 && (
                <span className="text-[10px] opacity-70">×{suggestion.frequency}</span>
              )}
            </span>
            
            {/* Keyboard hint */}
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent/20 text-accent rounded-full text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {index + 1}
            </span>
          </button>
        ))}
      </div>
      
      {/* Keyboard shortcuts hint */}
      <div className="text-[10px] text-text-3 mt-1">
        Press 1-{suggestions.length} or click to select
      </div>
    </div>
  );
}

// Hook for keyboard shortcuts to select suggestions
export function useSmartSuggestionsKeyboard(
  suggestions: SmartSuggestion[],
  onSelect: (value: string) => void
) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle number keys 1-9 for quick selection
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < suggestions.length) {
        e.preventDefault();
        onSelect(suggestions[index].value);
      }
    }
  };

  return { handleKeyDown };
}