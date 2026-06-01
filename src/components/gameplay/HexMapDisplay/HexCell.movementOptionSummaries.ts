import type {
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

const MOVEMENT_TYPE_PRIORITY: Record<MovementType, number> = {
  [MovementType.Stationary]: 0,
  [MovementType.Walk]: 1,
  [MovementType.Run]: 2,
  [MovementType.Sprint]: 3,
  [MovementType.Evade]: 3,
  [MovementType.Jump]: 3,
};

export function formatMovementTypeLabel(type: MovementType): string {
  switch (type) {
    case MovementType.Walk:
      return 'W';
    case MovementType.Run:
      return 'R';
    case MovementType.Sprint:
      return 'SPR';
    case MovementType.Evade:
      return 'EVD';
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
    conversionStepCount: movementInfo.conversionStepCount,
    conversionMpCost: movementInfo.conversionMpCost,
    altitudeControlStepCount: movementInfo.altitudeControlStepCount,
    altitudeControlMpCost: movementInfo.altitudeControlMpCost,
    altitudeControlRequired: movementInfo.altitudeControlRequired,
    altitudeControlMode: movementInfo.altitudeControlMode,
    altitudeControlAltitude: movementInfo.altitudeControlAltitude,
    automaticLandingRequired: movementInfo.automaticLandingRequired,
    automaticLandingReason: movementInfo.automaticLandingReason,
    automaticLandingMode: movementInfo.automaticLandingMode,
    automaticLandingDistance: movementInfo.automaticLandingDistance,
    automaticLandingMinimumDistance:
      movementInfo.automaticLandingMinimumDistance,
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

export function formatMovementOptionCostBadgeLabel(
  options: readonly IMovementRangeModeOption[],
): string {
  const reachableOptions = options.filter((option) => option.reachable);
  const displayOptions =
    reachableOptions.length > 0 ? reachableOptions : options;
  const labels = displayOptions.map((option) => {
    const typeLabel = formatMovementTypeLabel(option.movementType);
    const costLabel = Number.isFinite(option.mpCost) ? option.mpCost : 'X';
    return `${typeLabel}${costLabel}`;
  });

  return `${Array.from(new Set(labels)).join('/')} MP`;
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

export function movementOptionHeatGeneratedAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const heatOptions = options
    .filter((option) => option.heatGenerated !== undefined)
    .map((option) => `${option.movementType}:${option.heatGenerated}`);
  return heatOptions.length > 0 ? heatOptions.join('|') : undefined;
}

export function movementOptionConversionStepCountsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const conversionOptions = options
    .filter((option) => option.conversionStepCount !== undefined)
    .map((option) => `${option.movementType}:${option.conversionStepCount}`);
  return conversionOptions.length > 0 ? conversionOptions.join('|') : undefined;
}

export function movementOptionConversionMpCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const conversionOptions = options
    .filter((option) => option.conversionMpCost !== undefined)
    .map((option) => `${option.movementType}:${option.conversionMpCost}`);
  return conversionOptions.length > 0 ? conversionOptions.join('|') : undefined;
}

export function movementOptionAltitudeControlStepCountsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const altitudeOptions = options
    .filter((option) => option.altitudeControlStepCount !== undefined)
    .map(
      (option) => `${option.movementType}:${option.altitudeControlStepCount}`,
    );
  return altitudeOptions.length > 0 ? altitudeOptions.join('|') : undefined;
}

export function movementOptionAltitudeControlMpCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const altitudeOptions = options
    .filter((option) => option.altitudeControlMpCost !== undefined)
    .map((option) => `${option.movementType}:${option.altitudeControlMpCost}`);
  return altitudeOptions.length > 0 ? altitudeOptions.join('|') : undefined;
}

export function movementOptionAltitudeControlsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const altitudeOptions = options
    .filter((option) => option.altitudeControlRequired)
    .map(
      (option) =>
        `${option.movementType}:${option.altitudeControlMode ?? 'unknown'}:${
          option.altitudeControlAltitude ?? '?'
        }`,
    );
  return altitudeOptions.length > 0 ? altitudeOptions.join('|') : undefined;
}

export function movementOptionAutomaticLandingsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  const automaticLandingOptions = options
    .filter((option) => option.automaticLandingRequired)
    .map(
      (option) =>
        `${option.movementType}:${option.automaticLandingMode ?? 'wige'}:${
          option.automaticLandingDistance ?? '?'
        }/${option.automaticLandingMinimumDistance ?? '?'}`,
    );
  return automaticLandingOptions.length > 0
    ? automaticLandingOptions.join('|')
    : undefined;
}

export function movementOptionMaxReachableHeatGenerated(
  movementInfo?: IMovementRangeHex,
): number | undefined {
  if (!movementInfo) return undefined;
  const reachableHeatValues = movementOptionsForBadge(movementInfo)
    .filter((option) => option.reachable)
    .map((option) => option.heatGenerated)
    .filter((heat): heat is number => heat !== undefined);
  if (reachableHeatValues.length === 0) return movementInfo.heatGenerated;
  return Math.max(...reachableHeatValues);
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

function formatMovementOptionConversionDetail(
  option: IMovementRangeModeOption,
): string {
  if (
    option.conversionStepCount === undefined &&
    option.conversionMpCost === undefined
  ) {
    return '';
  }
  const stepCount = option.conversionStepCount ?? 0;
  const stepLabel = stepCount === 1 ? '1 step' : `${stepCount} steps`;
  return `, conversion ${stepLabel} ${option.conversionMpCost ?? 0} MP`;
}

function formatMovementOptionAltitudeControlDetail(
  option: IMovementRangeModeOption,
): string {
  const parts: string[] = [];
  if (
    option.altitudeControlStepCount !== undefined ||
    option.altitudeControlMpCost !== undefined
  ) {
    const stepCount = option.altitudeControlStepCount ?? 0;
    const stepLabel = stepCount === 1 ? '1 step' : `${stepCount} steps`;
    parts.push(
      `altitude control ${stepLabel} ${option.altitudeControlMpCost ?? 0} MP`,
    );
  }
  if (option.altitudeControlRequired) {
    const mode = option.altitudeControlMode
      ? formatMovementModeTitleLabel(option.altitudeControlMode)
      : 'altitude';
    const altitude =
      option.altitudeControlAltitude === undefined
        ? ''
        : ` altitude ${option.altitudeControlAltitude}`;
    parts.push(`${mode}${altitude} uses altitude controls`);
  }
  return parts.length > 0 ? `, ${parts.join(', ')}` : '';
}

function formatMovementOptionAutomaticLandingDetail(
  option: IMovementRangeModeOption,
): string {
  if (!option.automaticLandingRequired) return '';
  const mode = option.automaticLandingMode
    ? formatMovementModeTitleLabel(option.automaticLandingMode)
    : 'WiGE';
  const distance = option.automaticLandingDistance ?? 0;
  const minimumDistance = option.automaticLandingMinimumDistance ?? 0;
  const reason = option.automaticLandingReason
    ? `: ${option.automaticLandingReason}`
    : '';
  return `, automatic ${mode} landing ${distance}/${minimumDistance} hexes${reason}`;
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
  const conversion = formatMovementOptionConversionDetail(option);
  const altitudeControl = formatMovementOptionAltitudeControlDetail(option);
  const automaticLanding = formatMovementOptionAutomaticLandingDetail(option);
  const heat =
    option.heatGenerated === undefined ? '' : `, heat +${option.heatGenerated}`;
  const blockedDetail = movementOptionBlockedDetail(option);
  const blocked = option.reachable
    ? ''
    : `, blocked${blockedDetail ? `: ${blockedDetail}` : ''}`;
  return `${option.movementType}${movementMode} ${option.reachable ? 'reachable' : 'blocked'} ${cost}${costBreakdown}${conversion}${altitudeControl}${automaticLanding}${heat}${blocked}`;
}
