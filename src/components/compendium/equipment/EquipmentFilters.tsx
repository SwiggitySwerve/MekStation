/**
 * Equipment Filters Panel Component
 */
import { Button, Select } from '@/components/ui';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import {
  CATEGORY_OPTIONS,
  TECH_BASE_OPTIONS,
  RULES_LEVEL_OPTIONS,
} from './equipment.constants';

interface FilterState {
  search: string;
  category: EquipmentCategory | '';
  techBase: TechBase | '';
  rulesLevel: RulesLevel | '';
}

interface EquipmentFiltersProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function EquipmentFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: EquipmentFiltersProps): React.ReactElement {
  return (
    <div className="bg-surface-base/40 border-border-theme-subtle/50 animate-fadeIn mb-4 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.category}
          onChange={(e) =>
            onFilterChange('category', e.target.value as EquipmentCategory | '')
          }
          options={CATEGORY_OPTIONS}
          placeholder="Category"
          accent="amber"
          aria-label="Filter by category"
          className="w-36"
        />
        <Select
          value={filters.techBase}
          onChange={(e) =>
            onFilterChange('techBase', e.target.value as TechBase | '')
          }
          options={TECH_BASE_OPTIONS}
          placeholder="Tech Base"
          accent="amber"
          aria-label="Filter by tech base"
          className="w-36"
        />
        <Select
          value={filters.rulesLevel}
          onChange={(e) =>
            onFilterChange('rulesLevel', e.target.value as RulesLevel | '')
          }
          options={RULES_LEVEL_OPTIONS}
          placeholder="Rules Level"
          accent="amber"
          aria-label="Filter by rules level"
          className="w-36"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-text-theme-secondary hover:text-text-theme-primary"
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
