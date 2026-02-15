import { Button, Card, Input, Select } from '@/components/ui';

import {
  TECH_BASE_OPTIONS,
  WEIGHT_CLASS_OPTIONS,
  RULES_LEVEL_OPTIONS,
} from './units.constants';

export interface FilterState {
  search: string;
  techBase: string;
  weightClass: string;
  rulesLevel: string;
  yearMin: string;
  yearMax: string;
  tonnageMin: string;
  tonnageMax: string;
  bvMin: string;
  bvMax: string;
}

interface UnitsFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onClearFilters: () => void;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
  hasAdvancedFilters: boolean;
  displayedCount: number;
  filteredCount: number;
  totalCount: number;
}

export function UnitsFilters({
  filters,
  onFilterChange,
  onClearFilters,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  hasAdvancedFilters,
  displayedCount,
  filteredCount,
  totalCount,
}: UnitsFiltersProps): React.ReactElement {
  return (
    <Card className="mb-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Input
            type="text"
            placeholder="Search chassis, model, or variant..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            aria-label="Search units"
          />
        </div>

        <Select
          value={filters.techBase}
          onChange={(e) => onFilterChange('techBase', e.target.value)}
          options={TECH_BASE_OPTIONS}
          aria-label="Filter by tech base"
        />

        <Select
          value={filters.weightClass}
          onChange={(e) => onFilterChange('weightClass', e.target.value)}
          options={WEIGHT_CLASS_OPTIONS}
          aria-label="Filter by weight class"
        />

        <Select
          value={filters.rulesLevel}
          onChange={(e) => onFilterChange('rulesLevel', e.target.value)}
          options={RULES_LEVEL_OPTIONS}
          aria-label="Filter by rules level"
        />

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onToggleAdvancedFilters}
            className={`flex-1 text-xs ${hasAdvancedFilters ? 'text-accent' : ''}`}
          >
            {showAdvancedFilters ? '▼' : '▶'} Filters
            {hasAdvancedFilters && ' •'}
          </Button>
          <Button
            variant="secondary"
            onClick={onClearFilters}
            className="px-3 text-xs"
          >
            Clear
          </Button>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="border-border-theme-subtle mt-4 border-t pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-text-theme-secondary mb-1.5 block text-xs tracking-wide uppercase">
                Design Year
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.yearMin}
                  onChange={(e) => onFilterChange('yearMin', e.target.value)}
                  className="text-center text-sm"
                  min={2000}
                  max={3150}
                />
                <span className="text-text-theme-muted">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.yearMax}
                  onChange={(e) => onFilterChange('yearMax', e.target.value)}
                  className="text-center text-sm"
                  min={2000}
                  max={3150}
                />
              </div>
            </div>

            <div>
              <label className="text-text-theme-secondary mb-1.5 block text-xs tracking-wide uppercase">
                Tonnage
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.tonnageMin}
                  onChange={(e) => onFilterChange('tonnageMin', e.target.value)}
                  className="text-center text-sm"
                  min={10}
                  max={200}
                  step={5}
                />
                <span className="text-text-theme-muted">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.tonnageMax}
                  onChange={(e) => onFilterChange('tonnageMax', e.target.value)}
                  className="text-center text-sm"
                  min={10}
                  max={200}
                  step={5}
                />
              </div>
            </div>

            <div>
              <label className="text-text-theme-secondary mb-1.5 block text-xs tracking-wide uppercase">
                Battle Value
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.bvMin}
                  onChange={(e) => onFilterChange('bvMin', e.target.value)}
                  className="text-center text-sm"
                  min={0}
                  max={5000}
                  step={50}
                />
                <span className="text-text-theme-muted">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.bvMax}
                  onChange={(e) => onFilterChange('bvMax', e.target.value)}
                  className="text-center text-sm"
                  min={0}
                  max={5000}
                  step={50}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-text-theme-secondary mt-4 flex items-center justify-between text-sm">
        <div>
          Showing {displayedCount} of {filteredCount} results
          {filteredCount !== totalCount && (
            <span className="text-accent ml-2">
              (filtered from {totalCount.toLocaleString()} total)
            </span>
          )}
        </div>
        {hasAdvancedFilters && (
          <div className="text-accent/70 text-xs">Advanced filters active</div>
        )}
      </div>
    </Card>
  );
}
