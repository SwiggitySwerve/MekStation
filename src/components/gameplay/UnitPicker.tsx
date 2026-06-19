/**
 * UnitPicker
 *
 * Per-side unit picker for the pre-battle skirmish setup screen. Lists
 * canonical units from `CanonicalUnitService.getIndex()`, supports
 * filter-by-name and tonnage range, and emits add/remove events as the
 * user fills (or empties) two slots per side.
 *
 * @spec openspec/changes/add-skirmish-setup-ui/tasks.md § 2 (Per-side Unit Picker)
 */

import { useMemo, useState } from 'react';

import type { ISkirmishUnitSelection } from '@/utils/gameplay/preBattleSessionBuilder';

import { Badge, Card } from '@/components/ui';

import {
  CatalogPicker,
  filterCatalog,
  type TonnageFilter,
  useCanonicalUnitCatalog,
} from './UnitPicker.parts';
import { SelectedUnitsList } from './UnitPicker.roster';

// =============================================================================
// Public Props
// =============================================================================

export interface UnitPickerProps {
  /** Visual identifier (Player vs Opponent) — drives accent color. */
  side: 'player' | 'opponent';
  /** Display title (e.g. "Player Force Roster"). */
  title: string;
  /** Maximum unit slots for this side. */
  maxUnits: number;
  /** Currently picked units for this side. */
  selectedUnits: readonly ISkirmishUnitSelection[];
  /** Add a unit to this side. */
  onAdd: (selection: ISkirmishUnitSelection) => void;
  /** Remove a unit from this side by `unitId`. */
  onRemove: (unitId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function UnitPicker({
  side,
  title,
  maxUnits,
  selectedUnits,
  onAdd,
  onRemove,
}: UnitPickerProps): React.ReactElement {
  const isOpponent = side === 'opponent';
  const accentClass = isOpponent
    ? 'border-red-500/30 text-red-400'
    : 'border-cyan-500/30 text-cyan-400';
  const { catalog, isLoading, loadError } = useCanonicalUnitCatalog();
  const [searchQuery, setSearchQuery] = useState('');
  const [tonnageFilter, setTonnageFilter] = useState<TonnageFilter>('all');
  const filteredCatalog = useMemo(
    () =>
      filterCatalog({
        catalog,
        selectedUnits,
        searchQuery,
        tonnageFilter,
      }),
    [catalog, searchQuery, selectedUnits, tonnageFilter],
  );
  const isFull = selectedUnits.length >= maxUnits;
  const remainingSlots = maxUnits - selectedUnits.length;

  return (
    <Card
      className={`mb-6 border ${accentClass}`}
      data-testid={`${side}-unit-picker`}
    >
      <div className="border-border-theme-subtle border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium ${accentClass}`}>{title}</h3>
          <Badge variant={isOpponent ? 'red' : 'cyan'}>
            {selectedUnits.length} / {maxUnits}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <SelectedUnitsList
          side={side}
          selectedUnits={selectedUnits}
          onRemove={onRemove}
        />
        <CatalogPicker
          side={side}
          title={title}
          searchQuery={searchQuery}
          tonnageFilter={tonnageFilter}
          isLoading={isLoading}
          loadError={loadError}
          filteredCatalog={filteredCatalog}
          remainingSlots={remainingSlots}
          isFull={isFull}
          maxUnits={maxUnits}
          setSearchQuery={setSearchQuery}
          setTonnageFilter={setTonnageFilter}
          onAdd={onAdd}
        />
      </div>
    </Card>
  );
}
