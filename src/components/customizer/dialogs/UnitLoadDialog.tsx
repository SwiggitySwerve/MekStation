/**
 * Unit Load Dialog Component
 *
 * Dialog for loading existing units (canonical or custom) into a new tab.
 * Provides search and filtering capabilities.
 *
 * @spec openspec/specs/customizer-toolbar/spec.md
 */

import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
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
  isLoadingUnit?: boolean;
  onSelectionChange?: () => void;
  onCreateBlankUnit?: () => void;
  onConfigureNewUnit?: () => void;
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
    <div className="border-border-theme-subtle shrink-0 space-y-3 border-b p-4">
      <div className="relative">
        <AppIcon
          name="search"
          size="inline"
          aria-hidden="true"
          className="text-text-theme-secondary absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by chassis or variant..."
          aria-label="Search by chassis or variant"
          className={cs.dialog.inputSearch}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 [&>select]:min-w-0">
        <select
          aria-label="Unit source"
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
          aria-label="Tech base"
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
          aria-label="Weight class"
          value={weightClassFilter}
          onChange={(event) =>
            setWeightClassFilter(event.target.value as WeightClass | 'all')
          }
          className={`${cs.dialog.selectFilter} col-span-2 sm:w-auto`}
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
  isLoadingUnit = false,
  onSelectionChange,
  onCreateBlankUnit,
  onConfigureNewUnit,
  onLoadUnit,
  onCancel,
}: UnitLoadDialogProps): React.ReactElement {
  const titleId = useId();

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<UnitWithSource | null>(null);

  // Load units when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoading(true);
    setLoadError(null);
    setSelectedUnit(null);
    setSearchQuery('');

    Promise.all([
      getCanonicalUnitService().getIndex({ strict: true }),
      customUnitApiService.list(),
    ])
      .then(([canonical, custom]) => {
        if (!active) return;
        setCanonicalUnits([...canonical]);
        setCustomUnits([...custom]);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setCanonicalUnits([]);
        setCustomUnits([]);
        setLoadError(
          'Could not load the library. Check your connection and try again.',
        );
        logger.error('Failed to load units:', error);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, retryCount]);

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

  useEffect(() => {
    if (
      selectedUnit &&
      !filteredUnits.some(
        (unit) =>
          unit.id === selectedUnit.id && unit.source === selectedUnit.source,
      )
    ) {
      setSelectedUnit(null);
      onSelectionChange?.();
    }
  }, [filteredUnits, selectedUnit, onSelectionChange]);

  const handleSelection = useCallback(
    (unit: UnitWithSource) => {
      if (
        unit.id !== selectedUnit?.id ||
        unit.source !== selectedUnit?.source
      ) {
        onSelectionChange?.();
      }
      setSelectedUnit(unit);
    },
    [selectedUnit, onSelectionChange],
  );

  // Handle load
  const handleLoad = useCallback(() => {
    if (selectedUnit && !isLoadingUnit) {
      onLoadUnit(selectedUnit, selectedUnit.source);
    }
  }, [selectedUnit, onLoadUnit, isLoadingUnit]);

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
      ariaLabelledBy={titleId}
      onClose={onCancel}
      fullScreenOnMobile
      className="flex w-full flex-col sm:mx-4 sm:max-h-[80vh] sm:max-w-6xl"
    >
      {/* Header */}
      <div
        className={`${cs.dialog.header} shrink-0 [&>button]:min-h-11 [&>button]:min-w-11`}
      >
        <h3 id={titleId} className={cs.dialog.headerTitle}>
          {onCreateBlankUnit ? 'Add unit' : 'Load Unit from Library'}
        </h3>
        <DialogCloseButton onClose={onCancel} />
      </div>

      {onCreateBlankUnit && (
        <div className="bg-surface-raised border-border-theme-subtle flex shrink-0 items-center justify-between gap-2 border-b p-4 sm:gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onCreateBlankUnit}
              className={`${cs.dialog.btnPrimary} min-h-11 max-sm:px-3 max-sm:text-xs`}
            >
              New blank unit
            </button>
            <p className="text-text-theme-secondary mt-2 hidden text-sm sm:block">
              50-ton Inner Sphere BattleMech. Change settings in the editor.
            </p>
          </div>
          {onConfigureNewUnit && (
            <button
              type="button"
              onClick={onConfigureNewUnit}
              className={`${cs.dialog.btnGhost} border-border-theme-strong hover:bg-surface-base min-h-11 rounded border max-sm:px-3 max-sm:text-xs`}
            >
              Choose starting settings
            </button>
          )}
        </div>
      )}
      {onCreateBlankUnit && (
        <p className="text-text-theme-secondary hidden shrink-0 px-4 pt-3 text-sm sm:block">
          Or start from a catalog unit. Official units and saved designs open as
          editable copies.
        </p>
      )}

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
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        {loadError ? (
          <div className="space-y-3 p-4" role="alert">
            <p>{loadError}</p>
            <button
              className={cs.dialog.btnPrimary}
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry loading library
            </button>
          </div>
        ) : (
          <UnitTableState
            filteredUnits={filteredUnits}
            handleDoubleClick={handleDoubleClick}
            isLoading={isLoading}
            selectedUnit={selectedUnit}
            setSelectedUnit={handleSelection}
          />
        )}
      </div>

      {/* Footer */}
      <div
        className={`${cs.dialog.footerBetween} bg-surface-base shrink-0 gap-3 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]`}
      >
        <span className="text-text-theme-secondary text-sm">
          {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''}{' '}
          found
        </span>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <button
            onClick={onCancel}
            className={`${cs.dialog.btnGhost} hidden sm:block`}
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selectedUnit || isLoadingUnit}
            aria-busy={isLoadingUnit}
            className={`${cs.dialog.btnPrimary} w-full sm:w-auto`}
          >
            {isLoadingUnit ? 'Loading Unit…' : 'Load Unit'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
