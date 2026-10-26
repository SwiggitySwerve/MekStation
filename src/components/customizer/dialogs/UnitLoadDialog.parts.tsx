import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { IUnitIndexEntry } from '@/services/common/types';
import { TechBase } from '@/types/enums/TechBase';

import { customizerStyles as cs } from '../styles';
import { CheckIcon, SpinnerIcon } from './dialogPresentation';

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
          <th className="hidden px-3 py-2 font-medium sm:table-cell">Source</th>
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
        isSelected ? cs.dialog.tableRowSelected : ''
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
        {unit.role ?? '-'}
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
