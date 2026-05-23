import type {
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

const MOVEMENT_TYPE_PRIORITY: Record<MovementType, number> = {
  [MovementType.Stationary]: 0,
  [MovementType.Walk]: 1,
  [MovementType.Run]: 2,
  [MovementType.Jump]: 3,
};

export function formatMovementTypeLabel(type: MovementType): string {
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

export function formatMovementModeLabel(
  mode: string | undefined,
): string | null {
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
    case 'umu':
      return 'UMU';
    case 'biped_swim':
      return 'BSW';
    case 'quad_swim':
      return 'QSW';
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

export function formatMovementModeTitleLabel(mode: string): string {
  switch (mode) {
    case 'vtol':
      return 'VTOL';
    case 'wige':
      return 'WiGE';
    case 'umu':
      return 'UMU';
    case 'biped_swim':
      return 'biped swim';
    case 'quad_swim':
      return 'quad swim';
    default:
      return mode.replace(/_/g, ' ');
  }
}

function compareMovementRangePrimary(
  a: IMovementRangeHex,
  b: IMovementRangeHex,
): number {
  if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
  const typeDelta =
    MOVEMENT_TYPE_PRIORITY[a.movementType] -
    MOVEMENT_TYPE_PRIORITY[b.movementType];
  if (typeDelta !== 0) return typeDelta;
  if (a.mpCost === b.mpCost) return 0;
  if (!Number.isFinite(a.mpCost)) return 1;
  if (!Number.isFinite(b.mpCost)) return -1;
  return a.mpCost - b.mpCost;
}

function movementRangeOptionFor(
  movementInfo: IMovementRangeHex,
): IMovementRangeModeOption {
  return {
    movementType: movementInfo.movementType,
    movementMode: movementInfo.movementMode,
    reachable: movementInfo.reachable,
    mpCost: movementInfo.mpCost,
    terrainCost: movementInfo.terrainCost,
    elevationDelta: movementInfo.elevationDelta,
    elevationCost: movementInfo.elevationCost,
    heatGenerated: movementInfo.heatGenerated,
    blockedReason: movementInfo.blockedReason,
    movementInvalidReason: movementInfo.movementInvalidReason,
    movementInvalidDetails: movementInfo.movementInvalidDetails,
  };
}

export function withSameHexMovementOptions(
  candidates: readonly IMovementRangeHex[],
): IMovementRangeHex {
  const sorted = [...candidates].sort(compareMovementRangePrimary);
  const primary = sorted[0];
  if (sorted.length === 1) return primary;
  return {
    ...primary,
    movementModeOptions: sorted.map(movementRangeOptionFor),
  };
}

export function movementOptionsForBadge(
  movementInfo: IMovementRangeHex,
): readonly IMovementRangeModeOption[] {
  const options = movementInfo.movementModeOptions ?? [];
  return options.length > 1 ? options : [movementRangeOptionFor(movementInfo)];
}

export function movementOptionTypesAttribute(
  movementInfo?: IMovementRangeHex,
): string | undefined {
  const options = movementInfo?.movementModeOptions;
  if (!options || options.length <= 1) return undefined;
  return options.map((option) => option.movementType).join(',');
}

export function movementOptionCostsAttribute(
  movementInfo?: IMovementRangeHex,
): string | undefined {
  const options = movementInfo?.movementModeOptions;
  if (!options || options.length <= 1) return undefined;
  return options
    .map((option) => `${option.movementType}:${option.mpCost}`)
    .join('|');
}

export function movementOptionStatesAttribute(
  movementInfo?: IMovementRangeHex,
): string | undefined {
  const options = movementInfo?.movementModeOptions;
  if (!options || options.length <= 1) return undefined;
  return options
    .map(
      (option) =>
        `${option.movementType}:${option.reachable ? 'reachable' : 'blocked'}`,
    )
    .join('|');
}

export function uniqueMovementTypeLabels(
  options: readonly IMovementRangeModeOption[],
): string {
  const labels = options
    .filter((option) => option.reachable)
    .map((option) => formatMovementTypeLabel(option.movementType));
  const displayLabels =
    labels.length > 0
      ? labels
      : options.map((option) => formatMovementTypeLabel(option.movementType));
  return Array.from(new Set(displayLabels)).join('/');
}

export function movementOptionBlockedDetail(
  option: IMovementRangeModeOption,
): string | undefined {
  if (option.reachable) return undefined;
  return (
    option.movementInvalidDetails ??
    option.blockedReason ??
    option.movementInvalidReason
  );
}

export function movementOptionBlockedReasonsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const blockedOptions = options
    .map((option) => {
      const reason = movementOptionBlockedDetail(option);
      return reason ? `${option.movementType}:${reason}` : null;
    })
    .filter((entry): entry is string => entry !== null);
  return blockedOptions.length > 0 ? blockedOptions.join('|') : undefined;
}

export function movementOptionInvalidReasonsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const invalidOptions = options
    .filter((option) => option.movementInvalidReason)
    .map((option) => `${option.movementType}:${option.movementInvalidReason}`);
  return invalidOptions.length > 0 ? invalidOptions.join('|') : undefined;
}

export function movementOptionInvalidDetailsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const invalidOptions = options
    .filter((option) => option.movementInvalidDetails)
    .map((option) => `${option.movementType}:${option.movementInvalidDetails}`);
  return invalidOptions.length > 0 ? invalidOptions.join('|') : undefined;
}

export function movementOptionTerrainCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const costOptions = options
    .filter((option) => option.terrainCost !== undefined)
    .map((option) => `${option.movementType}:${option.terrainCost}`);
  return costOptions.length > 0 ? costOptions.join('|') : undefined;
}

export function movementOptionElevationDeltasAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const elevationOptions = options
    .filter((option) => option.elevationDelta !== undefined)
    .map((option) => `${option.movementType}:${option.elevationDelta}`);
  return elevationOptions.length > 0 ? elevationOptions.join('|') : undefined;
}

export function movementOptionElevationCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const costOptions = options
    .filter((option) => option.elevationCost !== undefined)
    .map((option) => `${option.movementType}:${option.elevationCost}`);
  return costOptions.length > 0 ? costOptions.join('|') : undefined;
}

function formatSignedCost(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function formatMovementOptionCostBreakdown(
  option: IMovementRangeModeOption,
): string {
  const parts: string[] = [];
  if (option.terrainCost !== undefined) {
    parts.push(`terrain ${formatSignedCost(option.terrainCost)}`);
  }
  if (
    option.elevationDelta !== undefined ||
    option.elevationCost !== undefined
  ) {
    const elevationParts: string[] = [];
    if (option.elevationDelta !== undefined) {
      elevationParts.push(`delta ${formatSignedCost(option.elevationDelta)}`);
    }
    if (option.elevationCost !== undefined) {
      elevationParts.push(`cost ${formatSignedCost(option.elevationCost)}`);
    }
    parts.push(`elevation ${elevationParts.join(' ')}`);
  }
  return parts.length > 0 ? `, ${parts.join(', ')}` : '';
}

export function formatMovementOptionTitle(
  option: IMovementRangeModeOption,
): string {
  const movementMode =
    option.movementMode && option.movementMode !== option.movementType
      ? ` via ${formatMovementModeTitleLabel(option.movementMode)}`
      : '';
  const cost = Number.isFinite(option.mpCost) ? `${option.mpCost} MP` : 'X MP';
  const costBreakdown = formatMovementOptionCostBreakdown(option);
  const heat =
    option.heatGenerated === undefined ? '' : `, heat +${option.heatGenerated}`;
  const blockedDetail = movementOptionBlockedDetail(option);
  const blocked = option.reachable
    ? ''
    : `, blocked${blockedDetail ? `: ${blockedDetail}` : ''}`;
  return `${option.movementType}${movementMode} ${option.reachable ? 'reachable' : 'blocked'} ${cost}${costBreakdown}${heat}${blocked}`;
}
