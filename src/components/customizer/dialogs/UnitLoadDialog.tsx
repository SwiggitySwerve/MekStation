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
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { ICustomUnitIndexEntry } from '@/types/persistence/UnitPersistence';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import { customizerStyles as cs } from '../styles';
import { ModalOverlay } from './ModalOverlay';

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

interface UnitWithSource extends IUnitIndexEntry {
  source: 'canonical' | 'custom';
  currentVersion?: number;
  year?: number;
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

    Promise.all([canonicalUnitService.getIndex(), customUnitApiService.list()])
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
    // Combine with source tagging
    const allUnits: UnitWithSource[] = [
      ...(sourceFilter !== 'custom'
        ? canonicalUnits.map((u) => ({ ...u, source: 'canonical' as const }))
        : []),
      ...(sourceFilter !== 'canonical'
        ? customUnits.map((u) => ({
            id: u.id,
            chassis: u.chassis,
            variant: u.variant,
            tonnage: u.tonnage,
            techBase: u.techBase,
            era: u.era,
            weightClass: u.weightClass,
            unitType: u.unitType as UnitType, // Cast string to UnitType
            name: `${u.chassis} ${u.variant}`,
            filePath: '', // Custom units don't have file paths
            source: 'custom' as const,
            currentVersion: u.currentVersion,
          }))
        : []),
    ];

    // Apply filters
    return allUnits
      .filter((unit) => {
        // Search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const name = `${unit.chassis} ${unit.variant}`.toLowerCase();
          if (!name.includes(query)) {
            return false;
          }
        }

        // Tech base filter
        if (techBaseFilter !== 'all' && unit.techBase !== techBaseFilter) {
          return false;
        }

        // Weight class filter
        if (
          weightClassFilter !== 'all' &&
          unit.weightClass !== weightClassFilter
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort: custom first, then by name
        if (a.source !== b.source) {
          return a.source === 'custom' ? -1 : 1;
        }
        return `${a.chassis} ${a.variant}`.localeCompare(
          `${b.chassis} ${b.variant}`,
        );
      });
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
        <button onClick={onCancel} className={cs.dialog.closeBtn}>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Search and filters */}
      <div className="border-border-theme-subtle space-y-3 border-b p-4">
        {/* Search input */}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by chassis or variant..."
            className={cs.dialog.inputSearch}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as UnitSource)}
            className={cs.dialog.selectFilter}
          >
            <option value="all">All Sources</option>
            <option value="custom">Custom Only</option>
            <option value="canonical">Official Only</option>
          </select>

          <select
            value={techBaseFilter}
            onChange={(e) =>
              setTechBaseFilter(e.target.value as TechBase | 'all')
            }
            className={cs.dialog.selectFilter}
          >
            <option value="all">All Tech Bases</option>
            <option value={TechBase.INNER_SPHERE}>Inner Sphere</option>
            <option value={TechBase.CLAN}>Clan</option>
          </select>

          <select
            value={weightClassFilter}
            onChange={(e) =>
              setWeightClassFilter(e.target.value as WeightClass | 'all')
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

      {/* Unit table */}
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className={cs.dialog.loading}>
            <svg
              className="mr-2 h-6 w-6 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading units...
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className={cs.dialog.empty}>
            <div className="text-center">
              <svg
                className={cs.dialog.emptyIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No units found</p>
              <p className="mt-1 text-sm">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        ) : (
          <table className={cs.dialog.table}>
            <thead className={cs.dialog.tableHeader}>
              <tr>
                <th className="px-3 py-2 font-medium">Chassis</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 text-right font-medium">Weight</th>
                <th className="px-3 py-2 text-right font-medium">Year</th>
                <th className="px-3 py-2 font-medium">Tech</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className={cs.dialog.tableBody}>
              {filteredUnits.map((unit) => (
                <tr
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  onDoubleClick={() => handleDoubleClick(unit)}
                  className={`${cs.dialog.tableRow} ${
                    selectedUnit?.id === unit.id
                      ? cs.dialog.tableRowSelected
                      : ''
                  }`}
                >
                  <td className="px-3 py-1.5 text-white">{unit.chassis}</td>
                  <td className="px-3 py-1.5 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      {unit.variant}
                      {unit.source === 'custom' &&
                        unit.currentVersion &&
                        unit.currentVersion > 1 && (
                          <span className="rounded bg-blue-500/20 px-1 py-0.5 text-[10px] leading-none text-blue-400">
                            v{unit.currentVersion}
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="text-text-theme-secondary px-3 py-1.5 text-right tabular-nums">
                    {unit.tonnage} t
                  </td>
                  <td className="text-text-theme-secondary px-3 py-1.5 text-right tabular-nums">
                    {unit.year ?? '-'}
                  </td>
                  <td className="text-text-theme-secondary px-3 py-1.5">
                    {unit.techBase === TechBase.INNER_SPHERE
                      ? 'IS'
                      : unit.techBase === TechBase.CLAN
                        ? 'Clan'
                        : 'Mix'}
                  </td>
                  <td className="text-text-theme-secondary px-3 py-1.5">
                    {unit.role ?? '-'}
                  </td>
                  <td className="px-3 py-1.5">
                    {unit.source === 'custom' ? (
                      <span className="text-accent">Custom</span>
                    ) : (
                      <span className="text-text-theme-secondary">
                        {unit.era}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {selectedUnit?.id === unit.id && (
                      <svg
                        className="inline-block h-4 w-4 text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
