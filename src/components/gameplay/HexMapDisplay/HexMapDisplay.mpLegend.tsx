import React from 'react';

interface MapMovementPointLegendProps {
  readonly active: 'walk' | 'run' | 'jump';
  readonly jumpAvailable: boolean;
}

export function MapMovementPointLegend({
  active,
  jumpAvailable,
}: MapMovementPointLegendProps): React.ReactElement {
  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1 rounded bg-white/90 p-2 text-xs shadow"
      data-testid="mp-legend"
    >
      {(['walk', 'run', 'jump'] as const).map((kind) => {
        const isActive = active === kind;
        const isJumpDisabled = kind === 'jump' && !jumpAvailable;
        const disabledReason = isJumpDisabled
          ? 'No jump capability'
          : undefined;
        const swatch =
          kind === 'walk'
            ? 'bg-green-500'
            : kind === 'run'
              ? 'bg-yellow-500'
              : 'bg-blue-500';
        const label =
          kind === 'walk' ? 'Walk' : kind === 'run' ? 'Run' : 'Jump';
        const stateLabel = `${label} movement range; ${
          isActive ? 'active' : 'inactive'
        }${disabledReason ? `; disabled: ${disabledReason}` : ''}`;

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
            aria-label={stateLabel}
            title={disabledReason}
          >
            <span className={`inline-block h-3 w-3 rounded-sm ${swatch}`} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
