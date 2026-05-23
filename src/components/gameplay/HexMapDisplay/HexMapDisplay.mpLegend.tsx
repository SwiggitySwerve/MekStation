import React from 'react';

import type { MapMovementPointLegendState } from './HexMapDisplay.types';

import { formatMovementModeLabel } from './HexCell.labels';

export function MapMovementPointLegend({
  active,
  jumpAvailable,
  movementMode,
  walkMP,
  runMP,
  jumpMP,
}: MapMovementPointLegendState): React.ReactElement {
  const movementModeLabel = movementMode
    ? formatMovementModeLabel(movementMode)
    : undefined;
  const mpByKind = {
    walk: walkMP,
    run: runMP,
    jump: jumpMP,
  } satisfies Record<'walk' | 'run' | 'jump', number | undefined>;

  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1 rounded bg-white/90 p-2 text-xs shadow"
      data-testid="mp-legend"
      data-movement-mode={movementMode}
      data-walk-mp={walkMP}
      data-run-mp={runMP}
      data-jump-mp={jumpMP}
    >
      {movementModeLabel && (
        <div
          className="pointer-events-auto rounded bg-slate-100 px-1 py-0.5 font-semibold text-slate-700"
          data-testid="mp-legend-motive"
          data-movement-mode={movementMode}
          aria-label={`Movement motive ${movementModeLabel}`}
          title={`Movement motive ${movementModeLabel}`}
        >
          Motive {movementModeLabel}
        </div>
      )}
      {(['walk', 'run', 'jump'] as const).map((kind) => {
        const isActive = active === kind;
        const isJumpDisabled = kind === 'jump' && !jumpAvailable;
        const disabledReason = isJumpDisabled
          ? 'No jump capability'
          : undefined;
        const mp = mpByKind[kind];
        const mpLabel = mp === undefined ? undefined : `${mp} MP`;
        const swatch =
          kind === 'walk'
            ? 'bg-green-500'
            : kind === 'run'
              ? 'bg-yellow-500'
              : 'bg-blue-500';
        const label =
          kind === 'walk' ? 'Walk' : kind === 'run' ? 'Run' : 'Jump';
        const stateParts = [
          `${label} movement range`,
          isActive ? 'active' : 'inactive',
        ];
        if (mpLabel) stateParts.push(mpLabel);
        if (movementModeLabel) stateParts.push(`motive ${movementModeLabel}`);
        if (disabledReason) stateParts.push(`disabled: ${disabledReason}`);
        const stateLabel = stateParts.join('; ');

        return (
          <div
            key={kind}
            className={`pointer-events-auto flex items-center gap-2 rounded px-1 py-0.5 ${
              isActive ? 'font-semibold ring-1 ring-slate-700' : 'opacity-70'
            } ${isJumpDisabled ? 'opacity-40' : ''}`}
            data-testid={`mp-legend-${kind}`}
            data-active={isActive ? 'true' : undefined}
            data-disabled={isJumpDisabled ? 'true' : undefined}
            data-disabled-reason={disabledReason}
            data-mp={mp}
            aria-label={stateLabel}
            title={disabledReason}
          >
            <span className={`inline-block h-3 w-3 rounded-sm ${swatch}`} />
            <span>{mp === undefined ? label : `${label} ${mp}MP`}</span>
          </div>
        );
      })}
    </div>
  );
}
