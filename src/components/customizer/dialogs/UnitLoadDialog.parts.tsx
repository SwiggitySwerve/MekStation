import React from 'react';

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
        <SpinnerIcon className="mr-2 h-6 w-6 animate-spin" />
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
      onClick={() => setSelectedUnit(unit)}
      onDoubleClick={() => onDoubleClick(unit)}
      className={`${cs.dialog.tableRow} ${
        isSelected ? cs.dialog.tableRowSelected : ''
      }`}
    >
      <td className="px-3 py-1.5 text-white">{unit.chassis}</td>
      <td className="px-3 py-1.5 text-slate-300">
        <UnitVariantLabel unit={unit} />
      </td>
      <td className="text-text-theme-secondary px-3 py-1.5 text-right tabular-nums">
        {unit.tonnage} t
      </td>
      <td className="text-text-theme-secondary px-3 py-1.5 text-right tabular-nums">
        {unit.year ?? '-'}
      </td>
      <td className="text-text-theme-secondary px-3 py-1.5">
        {getTechLabel(unit.techBase)}
      </td>
      <td className="text-text-theme-secondary px-3 py-1.5">
        {unit.role ?? '-'}
      </td>
      <td className="px-3 py-1.5">
        <UnitSourceLabel unit={unit} />
      </td>
      <td className="px-2 py-1.5 text-right">
        {isSelected && (
          <CheckIcon className="inline-block h-4 w-4 text-blue-400" />
        )}
      </td>
    </tr>
  );
}

function UnitVariantLabel({ unit }: { unit: UnitWithSource }) {
  return (
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
  );
}

function UnitSourceLabel({ unit }: { unit: UnitWithSource }) {
  if (unit.source === 'custom') {
    return <span className="text-accent">Custom</span>;
  }

  return <span className="text-text-theme-secondary">{unit.era}</span>;
}
