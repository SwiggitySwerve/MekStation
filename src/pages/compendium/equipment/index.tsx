/**
 * Equipment Browser Page (Compendium Section)
 * Browse and search the equipment catalog with filtering and multiple view modes.
 * Inspired by COMP/CON's efficient, compact UI layout.
 *
 * Uses centralized colors from @/utils/colors/equipmentColors.ts
 */
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentCategory } from '@/types/equipment';
import {
  PageLoading,
  PageError,
  Badge,
  TechBaseBadge,
  Button,
  PaginationButtons,
  Input,
  Select,
  EmptyState,
  ViewModeToggle,
} from '@/components/ui';
import type { ViewMode } from '@/components/ui';
import { CompendiumLayout } from '@/components/compendium';
import {
  EQUIPMENT_CATEGORY_COLORS,
  getCategoryColors,
  getAmmoColors,
} from '@/utils/colors/equipmentColors';

interface EquipmentEntry {
  id: string;
  name: string;
  category?: EquipmentCategory;
  techBase?: TechBase;
  rulesLevel?: RulesLevel;
  weight?: number;
  criticalSlots?: number;
  damage?: number;
  heat?: number;
  costCBills?: number;
  introductionYear?: number;
}

interface FilterState {
  search: string;
  category: EquipmentCategory | '';
  techBase: TechBase | '';
  rulesLevel: RulesLevel | '';
}

const ITEMS_PER_PAGE = 36;

export default function EquipmentListPage(): React.ReactElement {
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    techBase: '',
    rulesLevel: '',
  });

  const hasActiveFilters = filters.category || filters.techBase || filters.rulesLevel;
  const activeFilterCount = [filters.category, filters.techBase, filters.rulesLevel].filter(Boolean).length;

  // Build select options from centralized color config
  const categoryOptions = Object.values(EquipmentCategory).map(cat => ({
    value: cat,
    label: EQUIPMENT_CATEGORY_COLORS[cat]?.label ?? cat,
  }));

  const techBaseOptions = Object.values(TechBase).map(tb => ({
    value: tb,
    label: tb,
  }));

  const rulesLevelOptions = Object.values(RulesLevel).map(rl => ({
    value: rl,
    label: rl,
  }));

  // Fetch equipment on mount
  useEffect(() => {
    async function fetchEquipment() {
      try {
        const response = await fetch('/api/equipment/catalog');
        const data = await response.json() as { success: boolean; data?: EquipmentEntry[]; error?: string };

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
      result = result.filter(eq =>
        eq.name.toLowerCase().includes(searchLower) ||
        eq.id.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      result = result.filter(eq => eq.category === filters.category);
    }

    if (filters.techBase) {
      result = result.filter(eq => eq.techBase === filters.techBase);
    }

    if (filters.rulesLevel) {
      result = result.filter(eq => eq.rulesLevel === filters.rulesLevel);
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
  const displayedEquipment = filteredEquipment.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          showFilters || hasActiveFilters
            ? 'bg-accent text-text-theme-primary'
            : 'bg-surface-raised/50 text-text-theme-primary/80 hover:bg-surface-raised'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
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
          <div className="mb-4 p-3 bg-surface-base/40 border border-border-theme-subtle/50 rounded-lg animate-fadeIn">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value as EquipmentCategory | '')}
                options={categoryOptions}
                placeholder="Category"
                accent="amber"
                aria-label="Filter by category"
                className="w-36"
              />
              <Select
                value={filters.techBase}
                onChange={(e) => handleFilterChange('techBase', e.target.value as TechBase | '')}
                options={techBaseOptions}
                placeholder="Tech Base"
                accent="amber"
                aria-label="Filter by tech base"
                className="w-36"
              />
              <Select
                value={filters.rulesLevel}
                onChange={(e) => handleFilterChange('rulesLevel', e.target.value as RulesLevel | '')}
                options={rulesLevelOptions}
                placeholder="Rules Level"
                accent="amber"
                aria-label="Filter by rules level"
                className="w-36"
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-theme-secondary hover:text-text-theme-primary">
                  Clear All
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Equipment Display */}
        {displayedEquipment.length === 0 ? (
          <EmptyState
            title="No equipment found"
            action={<Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>}
          />
        ) : (
          <>
            {viewMode === 'grid' && <EquipmentGridView equipment={displayedEquipment} />}
            {viewMode === 'list' && <EquipmentListView equipment={displayedEquipment} />}
            {viewMode === 'table' && <EquipmentTableView equipment={displayedEquipment} />}
          </>
        )}

        {/* Pagination - Compact */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-text-theme-muted">
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

// ============================================================================
// View Components - Using centralized colors from equipmentColors.ts
// ============================================================================

interface ViewProps {
  equipment: EquipmentEntry[];
}

// Helper to get colors for an equipment item (handles ammo sub-types)
function getEquipmentDisplayColors(category: EquipmentCategory | undefined, name: string) {
  if (!category) return null;

  // For ammunition, use name-based detection for missile vs ballistic
  if (category === EquipmentCategory.AMMUNITION) {
    return getAmmoColors(name);
  }

  return getCategoryColors(category);
}

// Grid View - Compact cards (max 3 columns)
function EquipmentGridView({ equipment }: ViewProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {equipment.map((eq) => {
        const colors = getEquipmentDisplayColors(eq.category, eq.name);

        return (
          <Link key={eq.id} href={`/compendium/equipment/${encodeURIComponent(eq.id)}`}>
            <div className="group p-3 bg-surface-base/40 border border-border-theme-subtle/50 rounded-lg hover:bg-surface-base/60 hover:border-accent/50 transition-all cursor-pointer">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-text-theme-primary leading-tight group-hover:text-accent/90 line-clamp-1">
                  {eq.name}
                </h3>
                {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
              </div>

              {/* Stats row - compact inline */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-theme-secondary mb-2">
                {eq.weight !== undefined && (
                  <span><span className="text-text-theme-primary/80 font-mono">{eq.weight}</span>t</span>
                )}
                {eq.criticalSlots !== undefined && (
                  <span><span className="text-text-theme-primary/80 font-mono">{eq.criticalSlots}</span> slots</span>
                )}
                {eq.damage !== undefined && (
                  <span><span className="text-cyan-400 font-mono">{eq.damage}</span> dmg</span>
                )}
                {eq.heat !== undefined && (
                  <span><span className="text-accent font-mono">{eq.heat}</span> heat</span>
                )}
              </div>

              {/* Category badge - using centralized colors */}
              {colors && (
                <Badge variant={colors.badgeVariant as 'rose' | 'amber' | 'sky' | 'violet' | 'fuchsia' | 'slate' | 'yellow' | 'teal' | 'emerald' | 'lime' | 'red'} size="sm">
                  {colors.label}
                </Badge>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// List View - Ultra compact rows
function EquipmentListView({ equipment }: ViewProps): React.ReactElement {
  return (
    <div className="space-y-1">
      {equipment.map((eq) => {
        const colors = getEquipmentDisplayColors(eq.category, eq.name);

        return (
          <Link key={eq.id} href={`/compendium/equipment/${encodeURIComponent(eq.id)}`}>
            <div className="flex items-center gap-3 px-3 py-2 bg-surface-base/30 border border-transparent rounded hover:bg-surface-base/50 hover:border-border-theme-subtle/50 transition-all cursor-pointer group">
              {/* Category indicator bar - using centralized colors */}
              {colors && (
                <div className={`w-0.5 h-8 rounded-full ${colors.indicatorBg}`} />
              )}

              {/* Name */}
              <span className="flex-1 text-sm text-text-theme-primary group-hover:text-accent/90 truncate min-w-0">
                {eq.name}
              </span>

              {/* Quick stats */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-text-theme-muted flex-shrink-0">
                {eq.weight !== undefined && <span className="font-mono">{eq.weight}t</span>}
                {eq.criticalSlots !== undefined && <span className="font-mono">{eq.criticalSlots}sl</span>}
                {eq.damage !== undefined && <span className="font-mono text-cyan-500">{eq.damage}d</span>}
                {eq.heat !== undefined && <span className="font-mono text-accent">{eq.heat}h</span>}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {colors && (
                  <Badge variant={colors.badgeVariant as 'rose' | 'amber' | 'sky' | 'violet' | 'fuchsia' | 'slate' | 'yellow' | 'teal' | 'emerald' | 'lime' | 'red'} size="sm">
                    {colors.label}
                  </Badge>
                )}
                {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
              </div>

              {/* Arrow */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-border-theme group-hover:text-text-theme-secondary flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Table View - Compact data table
function EquipmentTableView({ equipment }: ViewProps): React.ReactElement {
  return (
    <div className="bg-surface-base/30 border border-border-theme-subtle/50 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-base/60 border-b border-border-theme-subtle/50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-theme-secondary uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-theme-secondary uppercase tracking-wider">Type</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-text-theme-secondary uppercase tracking-wider">Tech</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-text-theme-secondary uppercase tracking-wider">Wt</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-text-theme-secondary uppercase tracking-wider">Slots</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-text-theme-secondary uppercase tracking-wider">Dmg</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-text-theme-secondary uppercase tracking-wider">Heat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-theme-subtle/30">
            {equipment.map((eq) => {
              const colors = getEquipmentDisplayColors(eq.category, eq.name);

              return (
                <tr
                  key={eq.id}
                  className="hover:bg-surface-raised/20 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/compendium/equipment/${encodeURIComponent(eq.id)}`}
                >
                  <td className="px-3 py-2">
                    <span className="font-medium text-text-theme-primary">{eq.name}</span>
                  </td>
                  <td className="px-3 py-2">
                    {colors && (
                      <Badge variant={colors.badgeVariant as 'rose' | 'amber' | 'sky' | 'violet' | 'fuchsia' | 'slate' | 'yellow' | 'teal' | 'emerald' | 'lime' | 'red'} size="sm">
                        {colors.label}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-theme-primary/80">
                    {eq.weight !== undefined ? `${eq.weight}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-theme-primary/80">
                    {eq.criticalSlots ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-cyan-400">
                    {eq.damage ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-accent">
                    {eq.heat ?? '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
