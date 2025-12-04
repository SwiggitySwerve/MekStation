/**
 * Equipment Browser Page
 * Browse and search the equipment catalog with filtering.
 */
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentCategory } from '@/types/equipment';
import { 
  PageLayout, 
  PageLoading, 
  PageError,
  Card,
  Badge,
  TechBaseBadge,
  Button,
  PaginationButtons,
  Input,
  Select,
  EmptyState,
} from '@/components/ui';

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

const ITEMS_PER_PAGE = 30;

// Category display names and badge colors - uses EquipmentCategory enum values
const categoryConfig: Record<EquipmentCategory, { label: string; variant: 'red' | 'orange' | 'cyan' | 'yellow' | 'emerald' | 'violet' }> = {
  [EquipmentCategory.ENERGY_WEAPON]: { label: 'Energy Weapons', variant: 'red' },
  [EquipmentCategory.BALLISTIC_WEAPON]: { label: 'Ballistic Weapons', variant: 'red' },
  [EquipmentCategory.MISSILE_WEAPON]: { label: 'Missile Weapons', variant: 'red' },
  [EquipmentCategory.ARTILLERY]: { label: 'Artillery', variant: 'red' },
  [EquipmentCategory.CAPITAL_WEAPON]: { label: 'Capital Weapons', variant: 'red' },
  [EquipmentCategory.PHYSICAL_WEAPON]: { label: 'Physical Weapons', variant: 'orange' },
  [EquipmentCategory.AMMUNITION]: { label: 'Ammunition', variant: 'yellow' },
  [EquipmentCategory.ELECTRONICS]: { label: 'Electronics', variant: 'cyan' },
  [EquipmentCategory.MOVEMENT]: { label: 'Movement', variant: 'emerald' },
  [EquipmentCategory.STRUCTURAL]: { label: 'Structural', variant: 'violet' },
  [EquipmentCategory.MISC_EQUIPMENT]: { label: 'Misc Equipment', variant: 'violet' },
};

export default function EquipmentListPage() {
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    techBase: '',
    rulesLevel: '',
  });
  
  // Build select options from enums
  const categoryOptions = Object.values(EquipmentCategory).map(cat => ({
    value: cat,
    label: categoryConfig[cat]?.label ?? cat,
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
        const data = await response.json();
        
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
        backLink="/"
        backLabel="Go Home"
      />
    );
  }

  return (
    <PageLayout
      title="Equipment Catalog"
      subtitle={`Browse ${equipment.length.toLocaleString()} items across all categories`}
      maxWidth="full"
    >
      {/* Filters */}
      <Card variant="header" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              accent="cyan"
              aria-label="Search equipment by name"
            />
          </div>

          {/* Category */}
          <Select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value as EquipmentCategory | '')}
            options={categoryOptions}
            placeholder="All Categories"
            accent="cyan"
            aria-label="Filter by equipment category"
          />

          {/* Tech Base */}
          <Select
            value={filters.techBase}
            onChange={(e) => handleFilterChange('techBase', e.target.value as TechBase | '')}
            options={techBaseOptions}
            placeholder="All Tech Bases"
            accent="cyan"
            aria-label="Filter by tech base"
          />

          {/* Rules Level */}
          <Select
            value={filters.rulesLevel}
            onChange={(e) => handleFilterChange('rulesLevel', e.target.value as RulesLevel | '')}
            options={rulesLevelOptions}
            placeholder="All Rules Levels"
            accent="cyan"
            aria-label="Filter by rules level"
          />

          {/* Clear Filters */}
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-slate-400">
          Showing {displayedEquipment.length} of {filteredEquipment.length} results
          {filteredEquipment.length !== equipment.length && (
            <span className="text-cyan-400 ml-2">
              (filtered from {equipment.length} total)
            </span>
          )}
        </div>
      </Card>

      {/* Equipment Grid - Compact layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mb-6">
        {displayedEquipment.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No equipment found matching your filters"
              action={<Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>}
            />
          </div>
        ) : (
          displayedEquipment.map((eq) => (
            <Link
              key={eq.id}
              href={`/equipment/${encodeURIComponent(eq.id)}`}
            >
              <Card variant="interactive" className="h-full !p-2.5">
                {/* Top row: Name + Badges stacked */}
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Name + Stats */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white leading-tight line-clamp-1 mb-1">
                      {eq.name}
                    </h3>
                    {/* Stats inline under name */}
                    <div className="flex flex-wrap gap-x-2 text-xs text-slate-400">
                      {eq.weight !== undefined && (
                        <span><span className="text-slate-300 font-mono">{eq.weight}</span> tons</span>
                      )}
                      {eq.criticalSlots !== undefined && (
                        <span><span className="text-slate-300 font-mono">{eq.criticalSlots}</span> slots</span>
                      )}
                      {eq.damage !== undefined && (
                        <span><span className="text-slate-300 font-mono">{eq.damage}</span> dmg</span>
                      )}
                    </div>
                  </div>
                  {/* Right: Badges stacked */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
                    {eq.category && categoryConfig[eq.category as EquipmentCategory] && (
                      <Badge 
                        variant={categoryConfig[eq.category as EquipmentCategory].variant} 
                        size="sm"
                      >
                        {categoryConfig[eq.category as EquipmentCategory].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      <PaginationButtons
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </PageLayout>
  );
}
