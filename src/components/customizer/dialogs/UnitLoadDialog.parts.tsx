import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { IUnitIndexEntry } from '@/services/common/types';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

import { customizerStyles as cs } from '../styles';
import { CheckIcon, SpinnerIcon } from './dialogPresentation';

export type UnitSource = 'all' | 'canonical' | 'custom';

export interface UnitWithSource extends IUnitIndexEntry {
  source: 'canonical' | 'custom';
  currentVersion?: number;
  year?: number;
}

function getTechLabel(techBase: UnitWithSource['techBase']) {
  if (techBase === TechBase.INNER_SPHERE) return 'IS';
  if (techBase === TechBase.CLAN) return 'Clan';

  return 'Mix';
}

export function UnitTableState({
  filteredUnits,
  handleDoubleClick,
  isLoading,
  selectedUnit,
  setSelectedUnit,
}: {
  filteredUnits: UnitWithSource[];
  handleDoubleClick: (unit: UnitWithSource) => void;
  isLoading: boolean;
  selectedUnit: UnitWithSource | null;
  setSelectedUnit: (unit: UnitWithSource) => void;
}): React.ReactElement {
  if (isLoading) {
    return (
      <div className={cs.dialog.loading}>
        <SpinnerIcon size="toolbar" className="mr-2" />
        Loading units...
      </div>
    );
  }

  if (filteredUnits.length === 0) {
    return <NoUnitsFound />;
  }

  return (
    <UnitTable
      filteredUnits={filteredUnits}
      handleDoubleClick={handleDoubleClick}
      selectedUnit={selectedUnit}
      setSelectedUnit={setSelectedUnit}
    />
  );
}

function NoUnitsFound() {
  return (
    <div className={cs.dialog.empty}>
      <div className="text-center">
        <AppIcon
          name="info"
          size="feature"
          className={cs.dialog.emptyIcon}
          aria-hidden="true"
        />
        <p>No units found</p>
        <p className="mt-1 text-sm">Try adjusting your search or filters</p>
      </div>
    </div>
  );
}

function UnitTable({
  filteredUnits,
  handleDoubleClick,
  selectedUnit,
  setSelectedUnit,
}: {
  filteredUnits: UnitWithSource[];
  handleDoubleClick: (unit: UnitWithSource) => void;
  selectedUnit: UnitWithSource | null;
  setSelectedUnit: (unit: UnitWithSource) => void;
}) {
  return (
    <table
      role="table"
      aria-label="Available units"
      className={`${cs.dialog.table} block sm:table`}
    >
      <thead
        className={`${cs.dialog.tableHeader} z-10 hidden sm:table-header-group`}
      >
        <tr>
          <th className="px-3 py-2 font-medium">Chassis</th>
          <th className="px-3 py-2 font-medium">Model</th>
          <th className="px-3 py-2 text-right font-medium">Weight</th>
          <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">
            Year
          </th>
          <th className="hidden px-3 py-2 font-medium sm:table-cell">Tech</th>
          <th className="hidden px-3 py-2 font-medium md:table-cell">Role</th>
          <th className="hidden px-3 py-2 font-medium sm:table-cell">Era</th>
          <th className="w-8"></th>
        </tr>
      </thead>
      <tbody
        role="rowgroup"
        className={`${cs.dialog.tableBody} block sm:table-row-group`}
      >
        {filteredUnits.map((unit) => (
          <UnitTableRow
            key={unit.id}
            onDoubleClick={handleDoubleClick}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            unit={unit}
          />
        ))}
      </tbody>
    </table>
  );
}

/**
 * Accent bar down the left edge of the selected row (on top of the tinted
 * background and the check mark), so the selection reads at a glance. Phones
 * draw it on the row; the table layout draws it on the first cell.
 */
const SELECTED_ROW_BAR =
  'max-sm:shadow-[inset_3px_0_0_var(--accent-primary)] sm:[&>td:first-child]:shadow-[inset_3px_0_0_var(--accent-primary)]';

function UnitTableRow({
  onDoubleClick,
  selectedUnit,
  setSelectedUnit,
  unit,
}: {
  onDoubleClick: (unit: UnitWithSource) => void;
  selectedUnit: UnitWithSource | null;
  setSelectedUnit: (unit: UnitWithSource) => void;
  unit: UnitWithSource;
}) {
  const isSelected = selectedUnit?.id === unit.id;

  return (
    <tr
      role="row"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={() => setSelectedUnit(unit)}
      onDoubleClick={() => onDoubleClick(unit)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setSelectedUnit(unit);
        }
      }}
      className={`${cs.dialog.tableRow} focus-visible:outline-accent relative block px-4 py-3 pr-10 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:table-row sm:p-0 ${
        isSelected ? `${cs.dialog.tableRowSelected} ${SELECTED_ROW_BAR}` : ''
      }`}
    >
      <td
        role="cell"
        className="text-text-theme-primary inline font-semibold sm:table-cell sm:px-3 sm:py-1.5 sm:font-normal"
      >
        {unit.chassis}{' '}
      </td>
      <td
        role="cell"
        className="text-text-theme-primary sm:text-text-theme-secondary inline font-semibold sm:table-cell sm:px-3 sm:py-1.5 sm:font-normal"
      >
        <UnitVariantLabel unit={unit} />
      </td>
      <td
        role="cell"
        className="text-text-theme-secondary mt-1 block text-xs tabular-nums sm:table-cell sm:px-3 sm:py-1.5 sm:text-right sm:text-sm"
      >
        {unit.tonnage} t
        <span className="sm:hidden">
          {unit.year ? ` · ${unit.year}` : ''} · {getTechLabel(unit.techBase)}
          {unit.role ? ` · ${unit.role}` : ''} · <UnitSourceLabel unit={unit} />
        </span>
      </td>
      <td className="text-text-theme-secondary hidden px-3 py-1.5 text-right tabular-nums sm:table-cell">
        {unit.year ?? '-'}
      </td>
      <td className="text-text-theme-secondary hidden px-3 py-1.5 sm:table-cell">
        {getTechLabel(unit.techBase)}
      </td>
      <td className="text-text-theme-secondary hidden px-3 py-1.5 md:table-cell">
        {unit.role || '\u2014'}
      </td>
      <td className="hidden px-3 py-1.5 sm:table-cell">
        <UnitSourceLabel unit={unit} />
      </td>
      <td className="absolute top-3 right-3 text-right sm:static sm:px-2 sm:py-1.5">
        {isSelected && <CheckIcon className="text-accent inline-block" />}
      </td>
    </tr>
  );
}

function UnitVariantLabel({ unit }: { unit: UnitWithSource }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {unit.variant}
      {unit.source === 'custom' &&
        unit.currentVersion &&
        unit.currentVersion > 1 && (
          <span className="rounded bg-blue-500/20 px-1 py-0.5 text-[10px] leading-none text-blue-400">
            v{unit.currentVersion}
          </span>
        )}
    </div>
  );
}

function UnitSourceLabel({ unit }: { unit: UnitWithSource }) {
  if (unit.source === 'custom') {
    return <span className="text-accent">Custom</span>;
  }

  return <span className="text-text-theme-secondary">{unit.era}</span>;
}

export function UnitSearchFilters({
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
}): React.ReactElement {
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
