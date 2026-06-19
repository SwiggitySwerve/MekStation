/**
 * Unit Load Dialog Component
 *
 * Dialog for loading existing units (canonical or custom) into a new tab.
 * Provides search and filtering capabilities.
 *
 * @spec openspec/specs/customizer-toolbar/spec.md
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { IUnitIndexEntry } from '@/services/common/types';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { ICustomUnitIndexEntry } from '@/types/persistence/UnitPersistence';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import { customizerStyles as cs } from '../styles';
import { DialogCloseButton } from './dialogPresentation';
import { ModalOverlay } from './ModalOverlay';
import { UnitTableState, UnitWithSource } from './UnitLoadDialog.parts';

// =============================================================================
// Types
// =============================================================================

/**
 * Source of the unit being loaded
 */
export type LoadUnitSource = 'canonical' | 'custom';

export interface UnitLoadDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Called when a unit is selected for loading */
  onLoadUnit: (unit: IUnitIndexEntry, source: LoadUnitSource) => void;
  /** Called when dialog is cancelled */
  onCancel: () => void;
}

type UnitSource = 'all' | 'canonical' | 'custom';

function toCustomUnitWithSource(unit: ICustomUnitIndexEntry): UnitWithSource {
  return {
    id: unit.id,
    chassis: unit.chassis,
    variant: unit.variant,
    tonnage: unit.tonnage,
    techBase: unit.techBase,
    era: unit.era,
    weightClass: unit.weightClass,
    unitType: unit.unitType as UnitType,
    name: `${unit.chassis} ${unit.variant}`,
    filePath: '',
    source: 'custom',
    currentVersion: unit.currentVersion,
  };
}

function getUnitsForSource(
  canonicalUnits: IUnitIndexEntry[],
  customUnits: ICustomUnitIndexEntry[],
  sourceFilter: UnitSource,
) {
  const units: UnitWithSource[] = [];

  if (sourceFilter !== 'custom') {
    units.push(
      ...canonicalUnits.map((unit) => ({
        ...unit,
        source: 'canonical' as const,
      })),
    );
  }

  if (sourceFilter !== 'canonical') {
    units.push(...customUnits.map(toCustomUnitWithSource));
  }

  return units;
}

function matchesSearch(unit: UnitWithSource, searchQuery: string) {
  if (!searchQuery) return true;

  const query = searchQuery.toLowerCase();
  return `${unit.chassis} ${unit.variant}`.toLowerCase().includes(query);
}

function matchesFilters(
  unit: UnitWithSource,
  filters: {
    searchQuery: string;
    techBaseFilter: TechBase | 'all';
    weightClassFilter: WeightClass | 'all';
  },
) {
  if (!matchesSearch(unit, filters.searchQuery)) return false;
  if (
    filters.techBaseFilter !== 'all' &&
    unit.techBase !== filters.techBaseFilter
  ) {
    return false;
  }
  if (
    filters.weightClassFilter !== 'all' &&
    unit.weightClass !== filters.weightClassFilter
  ) {
    return false;
  }

  return true;
}

function sortUnitsBySourceAndName(a: UnitWithSource, b: UnitWithSource) {
  if (a.source !== b.source) {
    return a.source === 'custom' ? -1 : 1;
  }

  return `${a.chassis} ${a.variant}`.localeCompare(`${b.chassis} ${b.variant}`);
}

function UnitSearchFilters({
  searchQuery,
  setSearchQuery,
  setSourceFilter,
  setTechBaseFilter,
  setWeightClassFilter,
  sourceFilter,
  techBaseFilter,
  weightClassFilter,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSourceFilter: (source: UnitSource) => void;
  setTechBaseFilter: (techBase: TechBase | 'all') => void;
  setWeightClassFilter: (weightClass: WeightClass | 'all') => void;
  sourceFilter: UnitSource;
  techBaseFilter: TechBase | 'all';
  weightClassFilter: WeightClass | 'all';
}) {
  return (
    <div className="border-border-theme-subtle space-y-3 border-b p-4">
      <div className="relative">
        <svg
          className="text-text-theme-secondary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by chassis or variant..."
          className={cs.dialog.inputSearch}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={sourceFilter}
          onChange={(event) =>
            setSourceFilter(event.target.value as UnitSource)
          }
          className={cs.dialog.selectFilter}
        >
          <option value="all">All Sources</option>
          <option value="custom">Custom Only</option>
          <option value="canonical">Official Only</option>
        </select>

        <select
          value={techBaseFilter}
          onChange={(event) =>
            setTechBaseFilter(event.target.value as TechBase | 'all')
          }
          className={cs.dialog.selectFilter}
        >
          <option value="all">All Tech Bases</option>
          <option value={TechBase.INNER_SPHERE}>Inner Sphere</option>
          <option value={TechBase.CLAN}>Clan</option>
        </select>

        <select
          value={weightClassFilter}
          onChange={(event) =>
            setWeightClassFilter(event.target.value as WeightClass | 'all')
          }
          className={cs.dialog.selectFilter}
        >
          <option value="all">All Weight Classes</option>
          <option value={WeightClass.LIGHT}>Light (20-35t)</option>
          <option value={WeightClass.MEDIUM}>Medium (40-55t)</option>
          <option value={WeightClass.HEAVY}>Heavy (60-75t)</option>
          <option value={WeightClass.ASSAULT}>Assault (80-100t)</option>
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function UnitLoadDialog({
  isOpen,
  onLoadUnit,
  onCancel,
}: UnitLoadDialogProps): React.ReactElement {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [techBaseFilter, setTechBaseFilter] = useState<TechBase | 'all'>('all');
  const [weightClassFilter, setWeightClassFilter] = useState<
    WeightClass | 'all'
  >('all');
  const [sourceFilter, setSourceFilter] = useState<UnitSource>('all');

  // Data state
  const [canonicalUnits, setCanonicalUnits] = useState<IUnitIndexEntry[]>([]);
  const [customUnits, setCustomUnits] = useState<ICustomUnitIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<UnitWithSource | null>(null);

  // Load units when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setSelectedUnit(null);
    setSearchQuery('');

    Promise.all([
      getCanonicalUnitService().getIndex(),
      customUnitApiService.list(),
    ])
      .then(([canonical, custom]) => {
        setCanonicalUnits([...canonical]);
        setCustomUnits([...custom]);
        setIsLoading(false);
      })
      .catch((error) => {
        logger.error('Failed to load units:', error);
        setIsLoading(false);
      });
  }, [isOpen]);

  // Combine and filter units
  const filteredUnits = useMemo(() => {
    const allUnits = getUnitsForSource(
      canonicalUnits,
      customUnits,
      sourceFilter,
    );
    return allUnits
      .filter((unit) =>
        matchesFilters(unit, {
          searchQuery,
          techBaseFilter,
          weightClassFilter,
        }),
      )
      .sort(sortUnitsBySourceAndName);
  }, [
    canonicalUnits,
    customUnits,
    searchQuery,
    techBaseFilter,
    weightClassFilter,
    sourceFilter,
  ]);

  // Handle load
  const handleLoad = useCallback(() => {
    if (selectedUnit) {
      onLoadUnit(selectedUnit, selectedUnit.source);
    }
  }, [selectedUnit, onLoadUnit]);

  // Handle double-click to load immediately
  const handleDoubleClick = useCallback(
    (unit: UnitWithSource) => {
      onLoadUnit(unit, unit.source);
    },
    [onLoadUnit],
  );

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onCancel}
      className="mx-4 flex max-h-[80vh] w-full max-w-6xl flex-col"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <h3 className={cs.dialog.headerTitle}>Load Unit from Library</h3>
        <DialogCloseButton onClose={onCancel} />
      </div>

      {/* Search and filters */}
      <UnitSearchFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setSourceFilter={setSourceFilter}
        setTechBaseFilter={setTechBaseFilter}
        setWeightClassFilter={setWeightClassFilter}
        sourceFilter={sourceFilter}
        techBaseFilter={techBaseFilter}
        weightClassFilter={weightClassFilter}
      />

      {/* Unit table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <UnitTableState
          filteredUnits={filteredUnits}
          handleDoubleClick={handleDoubleClick}
          isLoading={isLoading}
          selectedUnit={selectedUnit}
          setSelectedUnit={setSelectedUnit}
        />
      </div>

      {/* Footer */}
      <div className={cs.dialog.footerBetween}>
        <span className="text-text-theme-secondary text-sm">
          {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''}{' '}
          found
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className={cs.dialog.btnGhost}>
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selectedUnit}
            className={cs.dialog.btnPrimary}
          >
            Load Unit
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
