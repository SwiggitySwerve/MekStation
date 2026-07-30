import type React from 'react';

import type { IRailUnit } from './TacticalTurnRail.types';

interface ForceGroupProps {
  readonly id: 'allied' | 'opposing' | 'unassigned';
  readonly label: string;
  readonly units: readonly IRailUnit[];
  readonly renderUnit: (unit: IRailUnit) => React.ReactNode;
}

export function ForceGroup(props: ForceGroupProps): React.ReactElement {
  const { id, label, units, renderUnit } = props;
  const terminalCount = (status: IRailUnit['status']): number =>
    units.filter((unit) => unit.status === status).length;
  const eliminatedCount = terminalCount('destroyed');
  const withdrawnCount = terminalCount('withdrawn');
  const operationalCount = units.length - eliminatedCount - withdrawnCount;
  const labelId = `rail-force-${id}-label`;

  return (
    <section
      className="grid min-h-0 min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] overflow-hidden rounded border border-white/25 bg-black/20"
      data-testid={`rail-force-${id}`}
      data-operational-count={operationalCount}
      data-eliminated-count={eliminatedCount}
      data-withdrawn-count={withdrawnCount}
      aria-labelledby={labelId}
    >
      <div className="flex min-h-0 flex-col justify-center border-r border-white/20 px-2 py-1">
        <span
          id={labelId}
          className="text-[10px] leading-tight font-bold uppercase"
          data-testid={`rail-force-${id}-label`}
        >
          {label}
        </span>
        <span className="text-[10px] leading-tight text-white/75">
          {operationalCount} operational
          <span className="text-cyan-100/80 lg:hidden"> · Swipe →</span>
        </span>
        {(eliminatedCount > 0 || withdrawnCount > 0) && (
          <span className="truncate text-[10px] leading-tight text-white/60">
            {eliminatedCount > 0 ? `${eliminatedCount} eliminated` : ''}
            {eliminatedCount > 0 && withdrawnCount > 0 ? ' · ' : ''}
            {withdrawnCount > 0 ? `${withdrawnCount} withdrawn` : ''}
          </span>
        )}
      </div>
      <div
        className="flex min-w-0 items-stretch gap-1.5 overflow-x-auto p-1"
        data-testid={`rail-force-${id}-list`}
        role="list"
        aria-labelledby={labelId}
      >
        {units.length === 0 && (
          <span
            role="listitem"
            className="self-center px-2 text-xs text-white/50"
          >
            No units
          </span>
        )}
        {units.map((unit) => (
          <div key={unit.id} role="listitem">
            {renderUnit(unit)}
          </div>
        ))}
      </div>
    </section>
  );
}
