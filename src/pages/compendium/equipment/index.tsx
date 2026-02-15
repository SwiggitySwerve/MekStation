/**
 * Equipment Browser Page (Compendium Section)
 * Browse and search the equipment catalog with filtering and multiple view modes.
 * Inspired by COMP/CON's efficient, compact UI layout.
 *
 * Uses centralized colors from @/utils/colors/equipmentColors.ts
 */
import { useEffect, useState, useCallback } from 'react';

import type { ViewMode } from '@/components/ui';

import { CompendiumLayout } from '@/components/compendium';
import { ITEMS_PER_PAGE } from '@/components/compendium/equipment/equipment.constants';
import { EquipmentFilters } from '@/components/compendium/equipment/EquipmentFilters';
import {
  EquipmentGridView,
  EquipmentListView,
  EquipmentTableView,
  type EquipmentEntry,
} from '@/components/compendium/equipment/EquipmentViews';
import {
  PageLoading,
  PageError,
  Button,
  PaginationButtons,
  Input,
  EmptyState,
  ViewModeToggle,
} from '@/components/ui';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

interface FilterState {
  search: string;
  category: EquipmentCategory | '';
  techBase: TechBase | '';
  rulesLevel: RulesLevel | '';
}

export default function EquipmentListPage(): React.ReactElement {
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    techBase: '',
    rulesLevel: '',
  });

  const hasActiveFilters =
    filters.category || filters.techBase || filters.rulesLevel;
  const activeFilterCount = [
    filters.category,
    filters.techBase,
    filters.rulesLevel,
  ].filter(Boolean).length;

  // Fetch equipment on mount
  useEffect(() => {
    async function fetchEquipment() {
      try {
        const response = await fetch('/api/equipment/catalog');
        const data = (await response.json()) as {
          success: boolean;
          data?: EquipmentEntry[];
          error?: string;
        };

        if (data.success) {
          setEquipment(data.data || []);
          setFilteredEquipment(data.data || []);
        } else {
          setError(data.error || 'Failed to load equipment');
        }
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }

    fetchEquipment();
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    let result = [...equipment];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (eq) =>
          eq.name.toLowerCase().includes(searchLower) ||
          eq.id.toLowerCase().includes(searchLower),
      );
    }

    if (filters.category) {
      result = result.filter((eq) => eq.category === filters.category);
    }

    if (filters.techBase) {
      result = result.filter((eq) => eq.techBase === filters.techBase);
    }

    if (filters.rulesLevel) {
      result = result.filter((eq) => eq.rulesLevel === filters.rulesLevel);
    }

    setFilteredEquipment(result);
    setCurrentPage(1);
  }, [equipment, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Pagination
  const totalPages = Math.ceil(filteredEquipment.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedEquipment = filteredEquipment.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', techBase: '', rulesLevel: '' });
  };

  if (loading) {
    return <PageLoading message="Loading equipment catalog..." />;
  }

  if (error) {
    return (
      <PageError
        title="Error Loading Equipment"
        message={error}
        backLink="/compendium"
        backLabel="Back to Compendium"
      />
    );
  }

  // Header actions for the layout
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* View Mode Toggle */}
      <ViewModeToggle mode={viewMode} onChange={setViewMode} />

      {/* Search */}
      <div className="w-64">
        <Input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          accent="amber"
          aria-label="Search equipment"
          className="!py-1.5 text-sm"
        />
      </div>

      {/* Filter Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          showFilters || hasActiveFilters
            ? 'bg-accent text-text-theme-primary'
            : 'bg-surface-raised/50 text-text-theme-primary/80 hover:bg-surface-raised'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <CompendiumLayout
      title="Equipment Catalog"
      subtitle={`${filteredEquipment.length} items`}
      breadcrumbs={[{ label: 'Equipment' }]}
      headerActions={headerActions}
      maxWidth="wide"
    >
      {/* Collapsible Filter Panel */}
      {showFilters && (
        <EquipmentFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          hasActiveFilters={!!hasActiveFilters}
        />
      )}

      {/* Equipment Display */}
      {displayedEquipment.length === 0 ? (
        <EmptyState
          title="No equipment found"
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <>
          {viewMode === 'grid' && (
            <EquipmentGridView equipment={displayedEquipment} />
          )}
          {viewMode === 'list' && (
            <EquipmentListView equipment={displayedEquipment} />
          )}
          {viewMode === 'table' && (
            <EquipmentTableView equipment={displayedEquipment} />
          )}
        </>
      )}

      {/* Pagination - Compact */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-text-theme-muted text-xs">
            Page {currentPage} of {totalPages}
          </span>
          <PaginationButtons
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </CompendiumLayout>
  );
}
