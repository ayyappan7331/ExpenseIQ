// Transaction page components
export { TransactionForm } from './TransactionForm';
export { TransactionModal } from './TransactionModal';
export { TransactionFilters, type FilterState } from './TransactionFilters';
export { TransactionTable } from './TransactionTable';
export { ManageCategoriesModal } from './ManageCategoriesModal';
export { ManagePaymentMethodsModal } from './ManagePaymentMethodsModal';
export { ManagePaymentAppsModal } from './ManagePaymentAppsModal';
export { ExportCenterModal } from './ExportCenterModal';
export { ManageSubcategoriesModal } from './ManageSubcategoriesModal';
export { InlineTransactionRowEnhanced } from './InlineTransactionRowEnhanced';
export { ImportExportModal } from './ImportExportModal';
export { StickyInlineRow } from './StickyInlineRow';
export { BulkEditModal } from './BulkEditModal';
export { ToolbarActions } from './ToolbarActions';
export { QuickFilterChips } from './QuickFilterChips';
export { SmartSimpleSwitch } from './SmartSimpleSwitch';

// E3.5 features
export { TransactionTemplatesModal } from './TransactionTemplatesModal';
export { FavoriteTransactions } from './FavoriteTransactions';
export { SmartSuggestions } from './SmartSuggestions';

// E3.6+ hooks
export { usePinnedTransactions } from './usePinnedTransactions';
export { useDensityMode, type DensityMode, type ViewMode } from './useDensityMode';
export { useFavoriteIds } from './useFavoriteIds';
export { useGroupCollapse } from './useGroupCollapse';
export { usePageKeyboardShortcuts } from './usePageKeyboardShortcuts';
export { useMultiRowOrchestration, MAX_QUICK_ADD_ROWS, type QuickAddRow } from './useMultiRowOrchestration';

// Core hooks
export { useTransactionRowController } from './useTransactionRowController';
export { useBulkSelection } from './BulkActionControls';
export * from './TransactionOrchestration';
export * from './FilterStateHelpers';
export { useDebouncedSearch } from './PerformanceOptimizations';

// E4.2: favorites domain helpers
export * from './favoritesStorage';

// E4.3: pinned domain helpers
export * from './pinnedStorage';

// E4.4: backend readiness helpers
export * from './favoritesBackendReadiness';
export * from './pinnedBackendReadiness';
