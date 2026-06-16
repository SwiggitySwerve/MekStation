import React from 'react';

import type { IHexCoordinate } from '@/types/gameplay';
import type {
  ITacticalMapProjectionSourceReference,
  TacticalMapCombatProjectionStatus,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
  TacticalMapMovementHazardProjectionStatus,
  TacticalMapMovementCostProjectionStatus,
  TacticalMapMovementProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceLabels,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

function formatProjectionStatusLabel(
  status: TacticalMapHexProjectionStatus | undefined,
  combatStatus: TacticalMapCombatProjectionStatus | undefined,
  movementCostStatus: TacticalMapMovementCostProjectionStatus | undefined,
  movementHazardStatus: TacticalMapMovementHazardProjectionStatus | undefined,
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): string | null {
  switch (status) {
    case 'legal':
      if (movementHazardStatus === 'represented-minefield') return 'HAZ';
      return movementCostStatus === 'costly' ? 'CST' : null;
    case 'mixed':
      return 'MIX';
    case 'blocked':
      return 'BLK';
    case 'neutral':
      return combatStatus === 'range-only' &&
        hasLegacyAttackRangeSource(sourceReferences)
        ? 'RNG'
        : null;
    default:
      return null;
  }
}

function hasLegacyAttackRangeSource(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): boolean {
  return (
    sourceReferences?.some(
      (reference) => reference.channel === 'legacy-attack-range',
    ) ?? false
  );
}

function formatProjectionStatusTitle({
  status,
  intent,
  movementStatus,
  movementCostStatus,
  movementCostReasons,
  movementHazardStatus,
  movementHazardReasons,
  combatStatus,
  blockedReasons,
  sourceReferences,
  explanation,
}: {
  readonly status: TacticalMapHexProjectionStatus;
  readonly intent: TacticalMapHexProjectionIntent | undefined;
  readonly movementStatus: TacticalMapMovementProjectionStatus | undefined;
  readonly movementCostStatus:
    | TacticalMapMovementCostProjectionStatus
    | undefined;
  readonly movementCostReasons: readonly string[] | undefined;
  readonly movementHazardStatus:
    | TacticalMapMovementHazardProjectionStatus
    | undefined;
  readonly movementHazardReasons: readonly string[] | undefined;
  readonly combatStatus: TacticalMapCombatProjectionStatus | undefined;
  readonly blockedReasons: readonly string[] | undefined;
  readonly sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined;
  readonly explanation: string | undefined;
}): string {
  const statusLabel =
    status === 'mixed'
      ? 'Mixed tactical projection'
      : status === 'blocked'
        ? 'Blocked tactical projection'
        : movementHazardStatus === 'represented-minefield'
          ? 'Hazard legal movement projection'
          : movementCostStatus === 'costly'
            ? 'Costly legal movement projection'
            : 'Range-only tactical projection';
  const parts = [statusLabel];
  if (intent) parts.push(`intent ${intent}`);
  if (movementStatus) parts.push(`movement ${movementStatus}`);
  if (movementCostStatus) parts.push(`movement cost ${movementCostStatus}`);
  if (movementCostReasons?.length)
    parts.push(`cost ${movementCostReasons.join('; ')}`);
  if (movementHazardStatus)
    parts.push(`movement hazard ${movementHazardStatus}`);
  if (movementHazardReasons?.length)
    parts.push(`hazard ${movementHazardReasons.join('; ')}`);
  if (combatStatus) parts.push(`combat ${combatStatus}`);
  if (blockedReasons?.length)
    parts.push(`blocked ${blockedReasons.join('; ')}`);
  if (sourceReferences?.length)
    parts.push(
      `sources ${formatTacticalProjectionSourceLabels(sourceReferences)}`,
    );
  if (explanation) parts.push(explanation);
  return parts.join('; ');
}

export function ProjectionStatusBadge({
  x,
  y,
  hex,
  status,
  intent,
  movementStatus,
  movementCostStatus,
  movementCostReasons,
  movementHazardStatus,
  movementHazardReasons,
  combatStatus,
  blockedReasons,
  sourceReferences,
  explanation,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly status?: TacticalMapHexProjectionStatus;
  readonly intent?: TacticalMapHexProjectionIntent;
  readonly movementStatus?: TacticalMapMovementProjectionStatus;
  readonly movementCostStatus?: TacticalMapMovementCostProjectionStatus;
  readonly movementCostReasons?: readonly string[];
  readonly movementHazardStatus?: TacticalMapMovementHazardProjectionStatus;
  readonly movementHazardReasons?: readonly string[];
  readonly combatStatus?: TacticalMapCombatProjectionStatus;
  readonly blockedReasons?: readonly string[];
  readonly sourceReferences?: readonly ITacticalMapProjectionSourceReference[];
  readonly explanation?: string;
}): React.ReactElement | null {
  const label = formatProjectionStatusLabel(
    status,
    combatStatus,
    movementCostStatus,
    movementHazardStatus,
    sourceReferences,
  );
  if (!label || !status) return null;

  const title = formatProjectionStatusTitle({
    status,
    intent,
    movementStatus,
    movementCostStatus,
    movementCostReasons,
    movementHazardStatus,
    movementHazardReasons,
    combatStatus,
    blockedReasons,
    sourceReferences,
    explanation,
  });
  const width = Math.max(28, label.length * 6 + 10);
  const fill =
    status === 'mixed'
      ? '#92400e'
      : status === 'blocked'
        ? '#7f1d1d'
        : '#334155';

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-projection-status-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-projection-status-badge-status={status}
      data-projection-status-badge-intent={intent}
      data-projection-status-badge-movement-status={movementStatus}
      data-projection-status-badge-movement-cost-status={movementCostStatus}
      data-projection-status-badge-movement-cost-reasons={
        movementCostReasons && movementCostReasons.length > 0
          ? movementCostReasons.join('|')
          : undefined
      }
      data-projection-status-badge-movement-hazard-status={movementHazardStatus}
      data-projection-status-badge-movement-hazard-reasons={
        movementHazardReasons && movementHazardReasons.length > 0
          ? movementHazardReasons.join('|')
          : undefined
      }
      data-projection-status-badge-combat-status={combatStatus}
      data-projection-status-badge-reasons={blockedReasons?.join('|')}
      data-projection-status-badge-sources={
        sourceReferences && sourceReferences.length > 0
          ? formatTacticalProjectionSourceReferences(sourceReferences)
          : undefined
      }
      data-projection-status-badge-rule-refs={
        sourceReferences && sourceReferences.length > 0
          ? formatTacticalProjectionRuleReferences(sourceReferences)
          : undefined
      }
      data-projection-status-badge-explanation={explanation}
    >
      <title>{title}</title>
      <rect
        x={x - 40}
        y={y - 21}
        width={width}
        height={12}
        rx={3}
        fill={fill}
        opacity={0.94}
        stroke="#f8fafc"
        strokeOpacity={0.55}
        strokeWidth={0.75}
      />
      <text
        x={x - 40 + width / 2}
        y={y - 12}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fff7ed"
      >
        {label}
      </text>
    </g>
  );
}
