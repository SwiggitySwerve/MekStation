import Link from 'next/link';

import { Card, TechBaseBadge, WeightClassBadge } from '@/components/ui';
import { IUnitEntry } from '@/types/pages';

import { RULES_LEVEL_LABELS } from './units.constants';
import { SortColumn, SortDirection } from './units.helpers';

interface UnitsTableProps {
  units: IUnitEntry[];
  sort: { column: SortColumn; direction: SortDirection };
  onSort: (column: SortColumn) => void;
}

export function UnitsTable({
  units,
  sort,
  onSort,
}: UnitsTableProps): React.ReactElement {
  return (
    <Card variant="dark" className="overflow-hidden pb-20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-surface-base">
            <tr className="text-text-theme-secondary text-left text-xs tracking-wide uppercase">
              <SortableHeader
                label="Chassis"
                column="chassis"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
              />
              <SortableHeader
                label="Model"
                column="variant"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
              />
              <SortableHeader
                label="Weight"
                column="tonnage"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-20 text-right"
              />
              <SortableHeader
                label="Year"
                column="year"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-16 text-right"
              />
              <SortableHeader
                label="Class"
                column="weightClass"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-24"
              />
              <SortableHeader
                label="Tech"
                column="techBase"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-28"
              />
              <SortableHeader
                label="Type"
                column="unitType"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-28"
              />
              <SortableHeader
                label="Level"
                column="rulesLevel"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-16"
              />
              <SortableHeader
                label="Price"
                column="cost"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-24 text-right"
              />
              <SortableHeader
                label="BV"
                column="bv"
                currentColumn={sort.column}
                direction={sort.direction}
                onSort={onSort}
                className="w-16 text-right"
              />
            </tr>
          </thead>
          <tbody className="divide-border-theme-subtle/50 divide-y">
            {units.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-text-theme-secondary px-3 py-8 text-center"
                >
                  No units found matching your filters
                </td>
              </tr>
            ) : (
              units.map((unit) => (
                <tr
                  key={unit.id}
                  className="hover:bg-surface-raised/30 transition-colors"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/compendium/units/${unit.id}`}
                      className="group"
                    >
                      <span className="text-text-theme-primary group-hover:text-accent text-sm font-medium whitespace-nowrap transition-colors">
                        {unit.chassis}
                      </span>
                    </Link>
                  </td>
                  <td className="text-text-theme-primary/80 px-3 py-2 text-sm whitespace-nowrap">
                    {unit.variant}
                  </td>
                  <td className="text-text-theme-primary/80 px-3 py-2 text-right font-mono text-sm">
                    {unit.tonnage} t
                  </td>
                  <td className="text-text-theme-secondary px-3 py-2 text-right font-mono text-sm">
                    {unit.year ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <WeightClassBadge weightClass={unit.weightClass} />
                  </td>
                  <td className="px-3 py-2">
                    <TechBaseBadge techBase={unit.techBase} />
                  </td>
                  <td className="text-text-theme-secondary px-3 py-2 text-sm whitespace-nowrap">
                    {unit.unitType === 'BattleMech' ? 'Mek' : unit.unitType}
                  </td>
                  <td className="text-text-theme-secondary px-3 py-2 font-mono text-xs whitespace-nowrap">
                    {RULES_LEVEL_LABELS[unit.rulesLevel ?? ''] ??
                      unit.rulesLevel ??
                      '—'}
                  </td>
                  <td className="text-text-theme-primary/80 px-3 py-2 text-right font-mono text-xs whitespace-nowrap">
                    {unit.cost
                      ? `${(unit.cost / 1000000).toPrecision(3)}M`
                      : '—'}
                  </td>
                  <td className="text-accent px-3 py-2 text-right font-mono text-xs font-medium whitespace-nowrap">
                    {unit.bv?.toLocaleString() ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = column === currentColumn;
  const isRightAligned = className.includes('text-right');

  return (
    <th
      className={`hover:text-text-theme-primary cursor-pointer px-3 py-2 font-medium transition-colors select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <span
        className={`flex items-center gap-1 ${isRightAligned ? 'justify-end' : ''}`}
      >
        {label}
        {isActive && (
          <span className="text-accent text-[10px]">
            {direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </span>
    </th>
  );
}
