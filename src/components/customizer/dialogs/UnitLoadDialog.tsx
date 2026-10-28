/**
 * Unit Load Dialog Component
 *
 * Dialog for loading existing units (canonical or custom) into a new tab.
 * Provides search and filtering capabilities.
 *
 * @spec openspec/specs/customizer-toolbar/spec.md
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useId,
  useRef,
} from 'react';

import { IUnitIndexEntry } from '@/services/common/types';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { ICustomUnitIndexEntry } from '@/types/persistence/UnitPersistence';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { formatNumberWithSeparators } from '@/utils/formatting';
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
import { useWholeRowsHeight } from './wholeRows';

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

  const nameKey = (unit: UnitWithSource) =>
    `${unit.chassis} ${unit.variant}`.replace(/^[\p{P}\p{Z}\s]+/u, '');
  return nameKey(a).localeCompare(nameKey(b));
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
        // Handled: the alert above reports it and offers Retry.
        logger.warn('Failed to load units:', error);
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

  // Phones: the list ends on a whole row above the sticky footer.
  const listFrameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listHeight = useWholeRowsHeight(
    listFrameRef,
    listRef,
    `${isOpen}-${isLoading}-${filteredUnits.length}`,
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
          {onCreateBlankUnit ? 'Add Unit' : 'Load Unit from Library'}
        </h3>
        <DialogCloseButton onClose={onCancel} />
      </div>

      {onCreateBlankUnit && (
        <div className="bg-surface-raised border-border-theme-subtle shrink-0 border-b p-4">
          {/* Each action carries its own caption directly under it, aligned to
              the button's left edge. The two actions sit side by side at the
              same height; on phones they share two equal columns so the
              catalog keeps more height. On phones the captions wrap at the
              button's width (w-0 min-w-full) so they never push the second
              action away from the first; both are short enough to stay one
              even 13px line in a 390px phone column. From 640px each caption
              keeps its own single line, which may run past a narrow button. */}
          <div className="grid grid-cols-2 items-start gap-3 sm:flex sm:flex-row sm:justify-start">
            <div className="flex min-w-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={onCreateBlankUnit}
                aria-describedby={`${titleId}-blank-help`}
                className={`${cs.dialog.btnPrimary} h-11 max-sm:w-full max-sm:!px-3 sm:min-w-52 sm:px-6`}
              >
                New Blank Unit
              </button>
              <p
                id={`${titleId}-blank-help`}
                className="text-text-theme-secondary m-0 w-0 min-w-full text-[13px] leading-snug sm:w-auto sm:whitespace-nowrap"
              >
                A 50-ton Inner Sphere Mech.
              </p>
            </div>
            {onConfigureNewUnit && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={onConfigureNewUnit}
                  aria-describedby={`${titleId}-configure-help`}
                  className={`${cs.dialog.btnGhost} hover:border-border-theme-strong hover:bg-surface-base h-11 rounded border border-[var(--field-border)] max-sm:w-full max-sm:!px-3 max-sm:text-sm`}
                >
                  Set Up a New Unit…
                </button>
                <p
                  id={`${titleId}-configure-help`}
                  className="text-text-theme-secondary m-0 w-0 min-w-full text-[13px] leading-snug sm:w-auto sm:whitespace-nowrap"
                >
                  Pick type, tonnage and tech.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {onCreateBlankUnit && (
        <p className="text-text-theme-secondary hidden shrink-0 px-4 pt-3 text-[13px] leading-[18px] sm:block">
          Or start from a catalog unit. Official units and saved designs open as
          editable copies.
        </p>
      )}

      {/* Search and filters */}
      <div className="contents">
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
      </div>

      {/* Unit table */}
      {/* Phones: the list is cut to whole rows (the frame keeps any spare
          height) and snaps row by row, so no row is ever cut by the footer. */}
      <div ref={listFrameRef} className="flex min-h-0 flex-1 flex-col">
        <div
          ref={listRef}
          className="min-h-0 flex-1 scroll-pb-4 overflow-auto overscroll-contain pb-4 max-sm:snap-y max-sm:snap-proximity"
          style={
            listHeight === undefined
              ? undefined
              : { height: listHeight, flex: 'none' }
          }
        >
          {loadError ? (
            <div className="space-y-3 p-4" role="alert">
              <p>{loadError}</p>
              <button
                className={cs.dialog.btnPrimary}
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Retry Loading Library
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
      </div>

      {/* Footer */}
      <div
        className={`${cs.dialog.footerBetween} bg-surface-base shrink-0 gap-3 max-sm:flex-col max-sm:items-stretch max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]`}
      >
        <span className="text-text-theme-secondary text-sm max-sm:w-full">
          {formatNumberWithSeparators(filteredUnits.length)} unit
          {filteredUnits.length !== 1 ? 's' : ''} found
        </span>
        {/* Cancel, then the disabled Load Unit with its reason right beside
            it (directly above it on phones, at 13px), so the hint reads as
            why the button is off rather than as a separate label. */}
        <div className="flex w-full items-center justify-end gap-2 max-sm:flex-col sm:w-auto sm:flex-none">
          <button
            onClick={onCancel}
            className={`${cs.dialog.btnGhost} hidden sm:mr-2 sm:block`}
          >
            Cancel
          </button>
          {!selectedUnit && (
            <span
              id={`${titleId}-load-hint`}
              className="text-text-theme-secondary text-center text-[13px] leading-[18px] sm:text-sm"
            >
              Select a unit to load
            </span>
          )}
          <button
            onClick={handleLoad}
            disabled={!selectedUnit || isLoadingUnit}
            aria-busy={isLoadingUnit}
            aria-describedby={
              !selectedUnit ? `${titleId}-load-hint` : undefined
            }
            className={`${cs.dialog.btnPrimary} ${cs.button.disabledVisible} min-h-11 w-full border border-transparent sm:w-auto`}
          >
            {isLoadingUnit ? 'Loading Unit…' : 'Load Unit'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
