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
  category?: string;
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
  category: string;
  techBase: string;
  rulesLevel: string;
}

const ITEMS_PER_PAGE = 30;

// Category display names and badge colors
const categoryConfig: Record<string, { label: string; variant: 'red' | 'orange' | 'cyan' | 'yellow' | 'emerald' | 'violet' }> = {
  ENERGY_WEAPON: { label: 'Energy Weapons', variant: 'red' },
  BALLISTIC_WEAPON: { label: 'Ballistic Weapons', variant: 'red' },
  MISSILE_WEAPON: { label: 'Missile Weapons', variant: 'red' },
  PHYSICAL_WEAPON: { label: 'Physical Weapons', variant: 'red' },
  AMMUNITION: { label: 'Ammunition', variant: 'orange' },
  ELECTRONICS: { label: 'Electronics', variant: 'cyan' },
  HEAT_SINK: { label: 'Heat Sinks', variant: 'yellow' },
  JUMP_JET: { label: 'Jump Jets', variant: 'emerald' },
  MYOMER: { label: 'Myomer', variant: 'violet' },
  MOVEMENT_ENHANCEMENT: { label: 'Movement Enhancements', variant: 'emerald' },
  TARGETING_SYSTEM: { label: 'Targeting Systems', variant: 'cyan' },
  INDUSTRIAL: { label: 'Industrial Equipment', variant: 'violet' },
  MISC_EQUIPMENT: { label: 'Misc Equipment', variant: 'violet' },
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

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', techBase: '', rulesLevel: '' });
  };

  // Build select options
  const categoryOptions = Object.entries(categoryConfig).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  const techBaseOptions = Object.values(TechBase).map(tb => ({
    value: tb,
    label: tb.replace(/_/g, ' '),
  }));

  if (loading) {
    return <PageLoading message="Loading equipment catalog..." />;
  }

  if (error) {
    return (
      <PageError
        title="Error Loading Equipment"
        message={error}
        backLink={{ href: '/', label: 'Go Home' }}
      />
    );
  }

  return (
    <PageLayout
      title="Equipment Catalog"
      subtitle={`Browse ${equipment.length.toLocaleString()} items across all categories`}
    >
      {/* Filters */}
      <Card variant="header" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              accent="cyan"
            />
          </div>

          {/* Category */}
          <Select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            options={categoryOptions}
            placeholder="All Categories"
            accent="cyan"
          />

          {/* Tech Base */}
          <Select
            value={filters.techBase}
            onChange={(e) => handleFilterChange('techBase', e.target.value)}
            options={techBaseOptions}
            placeholder="All Tech Bases"
            accent="cyan"
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

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
              <Card variant="interactive" className="h-full">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                    {eq.name}
                  </h3>
                  {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
                </div>

                {eq.category && categoryConfig[eq.category] && (
                  <Badge 
                    variant={categoryConfig[eq.category].variant} 
                    size="sm"
                    className="mb-3"
                  >
                    {categoryConfig[eq.category].label}
                  </Badge>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {eq.weight !== undefined && (
                    <div className="text-slate-400">
                      Weight: <span className="text-slate-300 font-mono">{eq.weight}t</span>
                    </div>
                  )}
                  {eq.criticalSlots !== undefined && (
                    <div className="text-slate-400">
                      Slots: <span className="text-slate-300 font-mono">{eq.criticalSlots}</span>
                    </div>
                  )}
                  {eq.damage !== undefined && (
                    <div className="text-slate-400">
                      Damage: <span className="text-slate-300 font-mono">{eq.damage}</span>
                    </div>
                  )}
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
