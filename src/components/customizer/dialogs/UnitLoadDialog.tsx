/**
 * Unit Load Dialog Component
 *
 * Dialog for loading existing units (canonical or custom) into a new tab.
 * Provides search and filtering capabilities.
 *
 * @spec openspec/specs/customizer-toolbar/spec.md
 */

import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';

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
import {
  UnitSearchFilters,
  UnitTableState,
  type UnitSource,
  UnitWithSource,
} from './UnitLoadDialog.parts';

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
        <div className="bg-surface-raised border-border-theme-subtle shrink-0 border-b p-4">
          {/* The primary action and its secondary settings step sit side by
              side at the same height; the explanation reads under the pair. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
            <button
              type="button"
              onClick={onCreateBlankUnit}
              aria-describedby={`${titleId}-blank-help`}
              className={`${cs.dialog.btnPrimary} h-11 max-sm:w-full max-sm:px-3 sm:px-6`}
            >
              New blank unit
            </button>
            {onConfigureNewUnit && (
              <button
                type="button"
                onClick={onConfigureNewUnit}
                className={`${cs.dialog.btnGhost} border-border-theme-strong hover:bg-surface-base h-11 rounded border max-sm:w-full max-sm:px-3 max-sm:text-sm`}
              >
                Choose tonnage and tech first…
              </button>
            )}
          </div>
          <p
            id={`${titleId}-blank-help`}
            className="text-text-theme-secondary mt-2 text-xs sm:text-sm"
          >
            Starts a 50-ton Inner Sphere BattleMech you can change.
          </p>
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
      <div className="min-h-0 flex-1 scroll-pb-4 overflow-auto overscroll-contain pb-4">
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
        className={`${cs.dialog.footerBetween} bg-surface-base shrink-0 gap-3 max-sm:flex-col max-sm:items-stretch max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]`}
      >
        <span className="text-text-theme-secondary text-sm max-sm:w-full">
          {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''}{' '}
          found
        </span>
        <div className="flex w-full items-center justify-end gap-2 max-sm:flex-col sm:w-auto sm:flex-none">
          {!selectedUnit && (
            <span
              id={`${titleId}-load-hint`}
              className="text-text-theme-secondary order-last text-center text-xs sm:order-none sm:mr-1 sm:text-sm"
            >
              Select a unit to load
            </span>
          )}
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
            aria-describedby={
              !selectedUnit ? `${titleId}-load-hint` : undefined
            }
            className={`${cs.dialog.btnPrimary} min-h-11 w-full sm:w-auto`}
          >
            {isLoadingUnit ? 'Loading Unit…' : 'Load Unit'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
