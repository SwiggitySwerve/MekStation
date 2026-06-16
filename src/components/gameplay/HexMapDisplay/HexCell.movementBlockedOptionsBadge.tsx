import React from 'react';

import type {
  IHexCoordinate,
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';
import type { ITacticalMapProjectionSourceReference } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatMovementOptionTitle,
  formatMovementTypeLabel,
  movementOptionAltitudeControlsAttribute,
  movementOptionBlockedReasonsAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionsForBadge,
} from './HexCell.movementOptionSummaries';

function blockedMovementOptionsFor(
  movementInfo: IMovementRangeHex,
): readonly IMovementRangeModeOption[] {
  return movementOptionsForBadge(movementInfo).filter(
    (option) => !option.reachable,
  );
}

function formatBlockedMovementOptionsLabel(
  options: readonly IMovementRangeModeOption[],
): string {
  const labels = options.map((option) =>
    formatMovementTypeLabel(option.movementType),
  );
  return `${Array.from(new Set(labels)).join('/')} BLK`;
}

function movementOptionBlockedTypesAttribute(
  options: readonly IMovementRangeModeOption[],
): string {
  return Array.from(new Set(options.map((option) => option.movementType))).join(
    ',',
  );
}

function formatBlockedMovementOptionsTitle(
  options: readonly IMovementRangeModeOption[],
): string {
  return `Blocked movement options: ${options.map(formatMovementOptionTitle).join('; ')}`;
}

function movementSourceReferencesFor(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): readonly ITacticalMapProjectionSourceReference[] {
  return (
    sourceReferences?.filter((source) => source.channel === 'movement') ?? []
  );
}

export function MovementBlockedOptionsBadge({
  x,
  y,
  hex,
  movementInfo,
  projectionExplanation,
  sourceReferences,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly movementInfo?: IMovementRangeHex;
  readonly projectionExplanation?: string;
  readonly sourceReferences?: readonly ITacticalMapProjectionSourceReference[];
}): React.ReactElement | null {
  if (!movementInfo?.reachable) return null;

  const blockedOptions = blockedMovementOptionsFor(movementInfo);
  if (blockedOptions.length === 0) return null;

  const label = formatBlockedMovementOptionsLabel(blockedOptions);
  const width = Math.max(32, label.length * 5.6 + 10);
  const left = x - width - 36;
  const movementSourceReferences =
    movementSourceReferencesFor(sourceReferences);
  const movementSourceRefsAttribute =
    formatTacticalProjectionSourceReferences(movementSourceReferences) ||
    undefined;
  const movementRuleRefsAttribute =
    formatTacticalProjectionRuleReferences(movementSourceReferences) ||
    undefined;
  const movementProjectionChannel =
    movementSourceReferences.length > 0 ? 'movement' : undefined;

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-movement-blocked-options-badge-${hex.q}-${hex.r}`}
      aria-label={formatBlockedMovementOptionsTitle(blockedOptions)}
      data-tactical-projection-source={
        movementProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={movementProjectionChannel}
      data-tactical-rules-surface={movementProjectionChannel}
      data-movement-blocked-options-badge-count={blockedOptions.length}
      data-movement-blocked-options-badge-types={movementOptionBlockedTypesAttribute(
        blockedOptions,
      )}
      data-movement-blocked-options-badge-reasons={movementOptionBlockedReasonsAttribute(
        blockedOptions,
      )}
      data-movement-blocked-options-badge-invalid-reasons={movementOptionInvalidReasonsAttribute(
        blockedOptions,
      )}
      data-movement-blocked-options-badge-invalid-details={movementOptionInvalidDetailsAttribute(
        blockedOptions,
      )}
      data-movement-blocked-options-badge-altitude-controls={movementOptionAltitudeControlsAttribute(
        blockedOptions,
      )}
      data-movement-blocked-options-badge-source-refs={
        movementSourceRefsAttribute
      }
      data-movement-blocked-options-badge-rule-refs={movementRuleRefsAttribute}
      data-movement-blocked-options-badge-projection-explanation={
        projectionExplanation
      }
    >
      <title>{formatBlockedMovementOptionsTitle(blockedOptions)}</title>
      <rect
        x={left}
        y={y + 7}
        width={width}
        height="13"
        rx="2"
        fill="#7f1d1d"
        stroke="#fecaca"
        strokeWidth="1"
        opacity="0.92"
      />
      <text
        x={left + width / 2}
        y={y + 17}
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill="#fff7ed"
      >
        {label}
      </text>
    </g>
  );
}
