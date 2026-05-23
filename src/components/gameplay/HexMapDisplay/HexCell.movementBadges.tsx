import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

function formatMovementTypeLabel(type: MovementType): string {
  switch (type) {
    case MovementType.Walk:
      return 'W';
    case MovementType.Run:
      return 'R';
    case MovementType.Jump:
      return 'J';
    case MovementType.Stationary:
      return 'S';
  }
}

function formatMovementModeLabel(mode: string | undefined): string | null {
  switch (mode) {
    case 'tracked':
      return 'TRK';
    case 'wheeled':
      return 'WHL';
    case 'hover':
      return 'HOV';
    case 'vtol':
      return 'VTOL';
    case 'naval':
      return 'NAV';
    case 'hydrofoil':
      return 'HYD';
    case 'submarine':
      return 'SUB';
    case 'wige':
      return 'WiGE';
    case 'rail':
      return 'RAIL';
    case 'maglev':
      return 'MAG';
    default:
      return null;
  }
}

function formatMovementReachBadgeLabel(
  movementInfo: IMovementRangeHex,
): string {
  const typeLabel = formatMovementTypeLabel(movementInfo.movementType);
  const motiveLabel = formatMovementModeLabel(movementInfo.movementMode);
  const modeLabel = motiveLabel ? `${typeLabel}/${motiveLabel}` : typeLabel;
  const mpLabel = Number.isFinite(movementInfo.mpCost)
    ? `${movementInfo.mpCost}MP`
    : 'XMP';
  return `${modeLabel} ${mpLabel}`;
}

function formatMovementModeTitle(movementInfo: IMovementRangeHex): string {
  if (
    movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
  ) {
    return `${movementInfo.movementType} via ${movementInfo.movementMode}`;
  }
  return movementInfo.movementType;
}

function formatElevationDeltaLabel(elevationDelta: number): string {
  if (elevationDelta > 0) return `UP${elevationDelta}`;
  return `DN${Math.abs(elevationDelta)}`;
}

function formatMovementStepCostLabel(
  movementInfo: IMovementRangeHex,
): string | null {
  const labels: string[] = [];
  if (movementInfo.terrainCost && movementInfo.terrainCost > 0) {
    labels.push(`T+${movementInfo.terrainCost}`);
  }
  if (movementInfo.elevationCost && movementInfo.elevationCost > 0) {
    labels.push(`E+${movementInfo.elevationCost}`);
  }
  if (
    movementInfo.elevationDelta !== undefined &&
    movementInfo.elevationDelta !== 0
  ) {
    labels.push(formatElevationDeltaLabel(movementInfo.elevationDelta));
  }
  return labels.length > 0 ? labels.join(' ') : null;
}

function formatMovementStepCostTitle(movementInfo: IMovementRangeHex): string {
  const labels: string[] = [];
  if (movementInfo.terrainCost && movementInfo.terrainCost > 0) {
    labels.push(`terrain +${movementInfo.terrainCost}`);
  }
  if (movementInfo.elevationCost && movementInfo.elevationCost > 0) {
    labels.push(`elevation cost +${movementInfo.elevationCost}`);
  }
  if (
    movementInfo.elevationDelta !== undefined &&
    movementInfo.elevationDelta !== 0
  ) {
    labels.push(
      `elevation delta ${movementInfo.elevationDelta > 0 ? '+' : ''}${movementInfo.elevationDelta}`,
    );
  }
  return `Movement step cost: ${labels.join('; ')}`;
}

function formatStandUpBadgeLabel(movementInfo: IMovementRangeHex): string {
  if (movementInfo.standUpPsrImpossibleReason) return 'STAND IMP';
  const cost =
    movementInfo.standUpCost === undefined
      ? 'STAND'
      : `STAND ${movementInfo.standUpCost}MP`;
  if (!movementInfo.standUpPsrRequired) return cost;
  if (movementInfo.standUpPsrTargetNumber === undefined) return `${cost} PSR`;
  return `${cost} PSR${movementInfo.standUpPsrTargetNumber}`;
}

function formatStandUpBadgeTitle(movementInfo: IMovementRangeHex): string {
  const details: string[] = [];
  if (movementInfo.standUpPsrImpossibleReason) {
    details.push(movementInfo.standUpPsrImpossibleReason);
  }
  if (movementInfo.standUpCost !== undefined) {
    details.push(`stand-up cost ${movementInfo.standUpCost} MP`);
  }
  if (movementInfo.standUpPsrRequired) {
    if (movementInfo.standUpPsrImpossibleReason) {
      details.push('PSR impossible');
    } else {
      details.push(
        movementInfo.standUpPsrTargetNumber === undefined
          ? 'PSR required'
          : `PSR required TN ${movementInfo.standUpPsrTargetNumber}`,
      );
    }
  }
  if (
    movementInfo.standUpPsrModifier !== undefined &&
    movementInfo.standUpPsrModifier !== 0
  ) {
    details.push(
      `stand-up modifier ${movementInfo.standUpPsrModifier >= 0 ? '+' : ''}${movementInfo.standUpPsrModifier}`,
    );
  }
  if (movementInfo.standUpPsrModifierDetails?.length) {
    details.push(movementInfo.standUpPsrModifierDetails.join('; '));
  }
  return movementInfo.standUpPsrImpossibleReason
    ? `Cannot stand before moving: ${details.join('; ')}`
    : `Must stand before moving: ${details.join('; ')}`;
}

export function MovementReachBadge({
  x,
  y,
  hex,
  movementInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly movementInfo?: IMovementRangeHex;
}): React.ReactElement | null {
  if (!movementInfo?.reachable) return null;
  const label = formatMovementReachBadgeLabel(movementInfo);
  const title = `${formatMovementModeTitle(movementInfo)} reachable: ${movementInfo.mpCost} MP`;
  const width = Math.max(34, label.length * 5.6 + 10);

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-movement-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-movement-badge-type={movementInfo.movementType}
      data-movement-badge-mode={movementInfo.movementMode}
      data-movement-badge-mp-cost={movementInfo.mpCost}
      data-movement-badge-heat-generated={movementInfo.heatGenerated}
    >
      <title>{title}</title>
      <rect
        x={x - width / 2}
        y={y + 7}
        width={width}
        height={12}
        rx={3}
        fill="#14532d"
        opacity={0.9}
      />
      <text
        x={x}
        y={y + 16}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#ecfdf5"
      >
        {label}
      </text>
    </g>
  );
}

export function MovementStepCostBadge({
  x,
  y,
  hex,
  movementInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly movementInfo?: IMovementRangeHex;
}): React.ReactElement | null {
  if (!movementInfo?.reachable) return null;
  const label = formatMovementStepCostLabel(movementInfo);
  if (!label) return null;

  const title = formatMovementStepCostTitle(movementInfo);
  const width = Math.max(28, label.length * 5.4 + 8);
  return (
    <g
      pointerEvents="none"
      data-testid={`hex-movement-cost-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-movement-step-terrain-cost={movementInfo.terrainCost}
      data-movement-step-elevation-cost={movementInfo.elevationCost}
      data-movement-step-elevation-delta={movementInfo.elevationDelta}
    >
      <title>{title}</title>
      <rect
        x={x - width - 3}
        y={y + 20}
        width={width}
        height={12}
        rx={3}
        fill="#365314"
        opacity={0.9}
      />
      <text
        x={x - width / 2 - 3}
        y={y + 29}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#f7fee7"
      >
        {label}
      </text>
    </g>
  );
}

export function MovementStandUpBadge({
  x,
  y,
  hex,
  movementInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly movementInfo?: IMovementRangeHex;
}): React.ReactElement | null {
  if (!movementInfo?.standUpRequired) return null;

  const label = formatStandUpBadgeLabel(movementInfo);
  const title = formatStandUpBadgeTitle(movementInfo);
  const width = Math.max(42, label.length * 5.2 + 10);
  return (
    <g
      pointerEvents="none"
      data-testid={`hex-stand-up-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-stand-up-cost={movementInfo.standUpCost}
      data-stand-up-psr-required={
        movementInfo.standUpPsrRequired ? 'true' : 'false'
      }
      data-stand-up-psr-target={movementInfo.standUpPsrTargetNumber}
      data-stand-up-psr-modifier={movementInfo.standUpPsrModifier}
      data-stand-up-psr-modifier-details={movementInfo.standUpPsrModifierDetails?.join(
        '|',
      )}
      data-stand-up-psr-impossible-reason={
        movementInfo.standUpPsrImpossibleReason
      }
    >
      <title>{title}</title>
      <rect
        x={x - width / 2}
        y={y + 33}
        width={width}
        height={12}
        rx={3}
        fill="#854d0e"
        opacity={0.92}
      />
      <text
        x={x}
        y={y + 42}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fefce8"
      >
        {label}
      </text>
    </g>
  );
}

function formatMovementPathStepLabel(pathIndex: number): string {
  return pathIndex === 0 ? 'S' : `#${pathIndex}`;
}

function formatMovementPathStepTitle(pathIndex: number): string {
  return pathIndex === 0
    ? 'Movement path start'
    : `Movement path step ${pathIndex}`;
}

export function MovementPathStepBadge({
  x,
  y,
  hex,
  pathIndex,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly pathIndex?: number;
}): React.ReactElement | null {
  if (pathIndex === undefined) return null;

  const label = formatMovementPathStepLabel(pathIndex);
  const title = formatMovementPathStepTitle(pathIndex);
  const width = Math.max(20, label.length * 6 + 8);

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-path-step-badge-${hex.q}-${hex.r}`}
      data-path-index={pathIndex}
      data-path-step={pathIndex === 0 ? 'start' : pathIndex}
      aria-label={title}
    >
      <title>{title}</title>
      <rect
        x={x + 14}
        y={y - 21}
        width={width}
        height={14}
        rx={3}
        fill="#1d4ed8"
        opacity={0.94}
        stroke="#dbeafe"
        strokeOpacity={0.7}
        strokeWidth={0.75}
      />
      <text
        x={x + 14 + width / 2}
        y={y - 11}
        textAnchor="middle"
        fontSize={9}
        fontWeight="bold"
        fill="#eff6ff"
      >
        {label}
      </text>
    </g>
  );
}
