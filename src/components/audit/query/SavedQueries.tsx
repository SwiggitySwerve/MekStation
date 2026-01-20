/**
 * SavedQueries Component
 * List and management of saved query presets with localStorage persistence.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { type IEventQueryFilters } from '@/types/events';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// =============================================================================
// Types
// =============================================================================

export interface SavedQuery {
  /** Unique ID */
  id: string;
  /** User-defined name */
  name: string;
  /** The saved filters */
  filters: IEventQueryFilters;
  /** When the query was saved */
  createdAt: string;
}

export interface SavedQueriesProps {
  /** Current filter state (for saving) */
  currentFilters: IEventQueryFilters;
  /** Callback when a saved query is loaded */
  onLoad: (filters: IEventQueryFilters) => void;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'mekstation-saved-event-queries';

// =============================================================================
// Icons
// =============================================================================

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
  </svg>
);

const LoadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10.75 6.75a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" />
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0V5Z" clipRule="evenodd" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
);

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z" />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `sq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getFilterSummary(filters: IEventQueryFilters): string {
  const parts: string[] = [];

  if (filters.category) {
    parts.push(filters.category);
  }
  if (filters.types && filters.types.length > 0) {
    parts.push(`${filters.types.length} type${filters.types.length > 1 ? 's' : ''}`);
  }
  if (filters.context) {
    const ctxCount = Object.values(filters.context).filter(Boolean).length;
    if (ctxCount > 0) {
      parts.push(`${ctxCount} context${ctxCount > 1 ? 's' : ''}`);
    }
  }
  if (filters.timeRange) {
    parts.push('time range');
  }
  if (filters.sequenceRange) {
    parts.push('seq range');
  }
  if (filters.rootEventsOnly) {
    parts.push('root only');
  }

  return parts.length > 0 ? parts.join(', ') : 'No filters';
}

function loadFromStorage(): SavedQuery[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as SavedQuery[];
    }
  } catch (e) {
    console.error('Failed to load saved queries:', e);
  }
  return [];
}

function saveToStorage(queries: SavedQuery[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
  } catch (e) {
    console.error('Failed to save queries:', e);
  }
}

function hasFilters(filters: IEventQueryFilters): boolean {
  return !!(
    filters.category ||
    (filters.types && filters.types.length > 0) ||
    filters.context ||
    filters.timeRange ||
    filters.sequenceRange ||
    filters.rootEventsOnly ||
    filters.causedByEventId
  );
}

// =============================================================================
// Component
// =============================================================================

export function SavedQueries({
  currentFilters,
  onLoad,
  className = '',
}: SavedQueriesProps): React.ReactElement {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [queryName, setQueryName] = useState('');

  // Load saved queries from localStorage on mount
  useEffect(() => {
    setSavedQueries(loadFromStorage());
  }, []);

  // Check if current filters can be saved
  const canSave = useMemo(() => hasFilters(currentFilters), [currentFilters]);

  // Open save modal
  const handleOpenModal = useCallback(() => {
    setQueryName('');
    setIsModalOpen(true);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setQueryName('');
  }, []);

  // Save current filters
  const handleSave = useCallback(() => {
    if (!queryName.trim()) return;

    const newQuery: SavedQuery = {
      id: generateId(),
      name: queryName.trim(),
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };

    const updated = [newQuery, ...savedQueries];
    setSavedQueries(updated);
    saveToStorage(updated);
    handleCloseModal();
  }, [queryName, currentFilters, savedQueries, handleCloseModal]);

  // Load a saved query
  const handleLoad = useCallback(
    (query: SavedQuery) => {
      onLoad(query.filters);
    },
    [onLoad]
  );

  // Delete a saved query
  const handleDelete = useCallback(
    (id: string) => {
      const updated = savedQueries.filter((q) => q.id !== id);
      setSavedQueries(updated);
      saveToStorage(updated);
    },
    [savedQueries]
  );

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-theme-secondary">
          <FolderIcon />
          <span className="text-sm font-medium">Saved Queries</span>
          {savedQueries.length > 0 && (
            <Badge variant="slate" size="sm">
              {savedQueries.length}
            </Badge>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenModal}
          leftIcon={<SaveIcon />}
          disabled={!canSave}
        >
          Save Current
        </Button>
      </div>

      {/* Saved Queries List */}
      {savedQueries.length === 0 ? (
        <div className="text-center py-8 text-text-theme-muted">
          <FolderIcon />
          <p className="mt-2 text-sm">No saved queries yet</p>
          <p className="text-xs mt-1">Build a query and save it for quick access</p>
        </div>
      ) : (
        <div className="space-y-2">
          {savedQueries.map((query) => (
            <Card
              key={query.id}
              variant="interactive"
              className="flex items-center justify-between gap-3 !p-3"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-text-theme-primary truncate">
                  {query.name}
                </h4>
                <p className="text-xs text-text-theme-muted truncate mt-0.5">
                  {getFilterSummary(query.filters)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoad(query)}
                  leftIcon={<LoadIcon />}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Load
                </Button>
                <button
                  type="button"
                  onClick={() => handleDelete(query.id)}
                  className="
                    p-2 rounded-lg text-text-theme-muted
                    hover:text-red-400 hover:bg-red-500/10
                    transition-colors duration-150
                  "
                  aria-label={`Delete ${query.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Save Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-surface-deep/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal Content */}
          <div
            className="
              relative w-full max-w-md
              bg-surface-raised border border-border-theme rounded-xl
              shadow-2xl animate-in fade-in zoom-in-95 duration-200
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-theme-subtle">
              <h3 className="text-lg font-semibold text-text-theme-primary">
                Save Query
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="
                  p-1 rounded-lg text-text-theme-muted
                  hover:text-text-theme-primary hover:bg-surface-base/50
                  transition-colors duration-150
                "
              >
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <Input
                label="Query Name"
                placeholder="My custom query..."
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                autoFocus
              />

              {/* Preview */}
              <div className="p-3 bg-surface-base/50 rounded-lg border border-border-theme-subtle">
                <p className="text-xs text-text-theme-muted mb-1">Filters to save:</p>
                <p className="text-sm text-text-theme-secondary">
                  {getFilterSummary(currentFilters)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!queryName.trim()}
                  leftIcon={<SaveIcon />}
                >
                  Save Query
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedQueries;
