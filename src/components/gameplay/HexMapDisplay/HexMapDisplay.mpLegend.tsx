import React from 'react';

import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from './HexMapDisplay.types';

import { formatMovementModeLabel } from './HexCell.labels';

interface MapMovementPointLegendProps extends MapMovementPointLegendState {
  readonly onMovementModeSelect?: (mode: MapMovementKind) => void;
}

interface MovementLegendKindConfig {
  readonly kind: MapMovementKind;
  readonly label: string;
  readonly nonColorEncoding?: string;
  readonly nonColorEncodingLabel?: string;
  readonly swatchClassName: string;
}

interface MovementLegendButtonProps {
  readonly active: MapMovementKind;
  readonly config: MovementLegendKindConfig;
  readonly jumpAvailable: boolean;
  readonly movementModeLabel?: string;
  readonly mp?: number;
  readonly onMovementModeSelect?: (mode: MapMovementKind) => void;
}

const MOVEMENT_LEGEND_KINDS: readonly MovementLegendKindConfig[] = [
  { kind: 'walk', label: 'Walk', swatchClassName: 'bg-cyan-400' },
  {
    kind: 'run',
    label: 'Run',
    nonColorEncoding: 'dashed-border',
    nonColorEncodingLabel: 'dashed border for run-only tiles',
    swatchClassName: 'bg-yellow-500',
  },
  {
    kind: 'jump',
    label: 'Jump',
    nonColorEncoding: 'diagonal-hatch',
    nonColorEncodingLabel: 'diagonal hatch',
    swatchClassName: 'bg-red-500',
  },
];

function movementLegendDisabledReason(
  kind: MapMovementKind,
  jumpAvailable: boolean,
): string | undefined {
  return kind === 'jump' && !jumpAvailable ? 'No jump capability' : undefined;
}

function movementLegendStateLabel({
  disabledReason,
  isActive,
  label,
  movementModeLabel,
  nonColorEncodingLabel,
  mp,
}: {
  readonly disabledReason?: string;
  readonly isActive: boolean;
  readonly label: string;
  readonly movementModeLabel?: string;
  readonly nonColorEncodingLabel?: string;
  readonly mp?: number;
}): string {
  const stateParts = [
    `${label} movement range`,
    isActive ? 'active' : 'inactive',
  ];
  if (mp !== undefined) stateParts.push(`${mp} MP`);
  if (movementModeLabel) stateParts.push(`motive ${movementModeLabel}`);
  if (nonColorEncodingLabel) {
    stateParts.push(`non-color encoding ${nonColorEncodingLabel}`);
  }
  if (disabledReason) stateParts.push(`disabled: ${disabledReason}`);
  return stateParts.join('; ');
}

function MovementLegendButton({
  active,
  config,
  jumpAvailable,
  movementModeLabel,
  mp,
  onMovementModeSelect,
}: MovementLegendButtonProps): React.ReactElement {
  const { kind, label, swatchClassName } = config;
  const isActive = active === kind;
  const disabledReason = movementLegendDisabledReason(kind, jumpAvailable);
  const isSelectable =
    Boolean(onMovementModeSelect) && !isActive && !disabledReason;
  const stateLabel = movementLegendStateLabel({
    disabledReason,
    isActive,
    label,
    movementModeLabel,
    nonColorEncodingLabel: config.nonColorEncodingLabel,
    mp,
  });

  return (
    <button
      type="button"
      className={`pointer-events-auto flex items-center gap-2 rounded px-1 py-0.5 ${
        isActive ? 'font-semibold ring-1 ring-slate-700' : 'opacity-70'
      } ${disabledReason ? 'opacity-40' : ''}`}
      data-testid={`mp-legend-${kind}`}
      data-active={isActive ? 'true' : undefined}
      data-disabled={disabledReason ? 'true' : undefined}
      data-disabled-reason={disabledReason}
      data-non-color-encoding={config.nonColorEncoding}
      data-selectable={isSelectable ? 'true' : undefined}
      data-mp={mp}
      aria-pressed={isActive}
      aria-disabled={!isSelectable}
      aria-label={stateLabel}
      tabIndex={isSelectable ? 0 : -1}
      title={disabledReason}
      onClick={() => {
        if (isSelectable) onMovementModeSelect?.(kind);
      }}
    >
      <span className={`inline-block h-3 w-3 rounded-sm ${swatchClassName}`} />
      <span>{mp === undefined ? label : `${label} ${mp}MP`}</span>
    </button>
  );
}

export function MapMovementPointLegend({
  active,
  jumpAvailable,
  movementMode,
  walkMP,
  runMP,
  jumpMP,
  onMovementModeSelect,
}: MapMovementPointLegendProps): React.ReactElement {
  const movementModeLabel = movementMode
    ? formatMovementModeLabel(movementMode)
    : undefined;
  const mpByKind = {
    walk: walkMP,
    run: runMP,
    jump: jumpMP,
  } satisfies Record<MapMovementKind, number | undefined>;

  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1 rounded bg-white/90 p-2 text-xs shadow"
      data-testid="mp-legend"
      data-non-color-encodings="blocked:cross-hatch|run:dashed-border|jump:diagonal-hatch"
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
      {MOVEMENT_LEGEND_KINDS.map((config) => (
        <MovementLegendButton
          key={config.kind}
          active={active}
          config={config}
          jumpAvailable={jumpAvailable}
          movementModeLabel={movementModeLabel}
          mp={mpByKind[config.kind]}
          onMovementModeSelect={onMovementModeSelect}
        />
      ))}
      <div
        className="pointer-events-auto flex items-center gap-2 rounded px-1 py-0.5 text-slate-700"
        data-testid="mp-legend-blocked"
        data-non-color-encoding="cross-hatch"
        aria-label="Blocked movement projection; non-color encoding cross-hatch and blocked marker"
      >
        <span className="inline-block h-3 w-3 rounded-sm border border-slate-700 bg-slate-500" />
        <span>Blocked</span>
      </div>
    </div>
  );
}
