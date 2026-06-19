import type {
  IMovementRangeHex,
  IMovementRangeModeOption,
  MovementTravelMode,
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

const MOVEMENT_TYPE_LABELS = {
  [MovementType.Walk]: 'W',
  [MovementType.Run]: 'R',
  [MovementType.Sprint]: 'SPR',
  [MovementType.Evade]: 'EVD',
  [MovementType.Jump]: 'J',
  [MovementType.Stationary]: 'S',
} satisfies Record<MovementType, string>;

const MOVEMENT_MODE_BADGE_LABELS = {
  tracked: 'TRK',
  wheeled: 'WHL',
  hover: 'HOV',
  vtol: 'VTOL',
  naval: 'NAV',
  hydrofoil: 'HYD',
  submarine: 'SUB',
  umu: 'UMU',
  biped_swim: 'BSW',
  quad_swim: 'QSW',
  wige: 'WiGE',
  rail: 'RAIL',
  maglev: 'MAG',
} satisfies Partial<Record<MovementTravelMode, string>>;

const MOVEMENT_MODE_TITLE_LABELS = {
  vtol: 'VTOL',
  wige: 'WiGE',
  umu: 'UMU',
  biped_swim: 'biped swim',
  quad_swim: 'quad swim',
} satisfies Partial<Record<MovementTravelMode, string>>;

function movementModeLookupLabel(
  labels: Partial<Record<MovementTravelMode, string>>,
  mode: string | undefined,
): string | null {
  if (!mode || !(mode in labels)) return null;
  return labels[mode as MovementTravelMode] ?? null;
}

export function formatMovementTypeLabel(type: MovementType): string {
  return MOVEMENT_TYPE_LABELS[type];
}

export function formatMovementModeLabel(
  mode: string | undefined,
): string | null {
  return movementModeLookupLabel(MOVEMENT_MODE_BADGE_LABELS, mode);
}

export function formatMovementModeTitleLabel(mode: string): string {
  return (
    movementModeLookupLabel(MOVEMENT_MODE_TITLE_LABELS, mode) ??
    mode.replace(/_/g, ' ')
  );
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
  return movementOptionAttribute(options, movementOptionBlockedDetail);
}

export function movementOptionInvalidReasonsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(
    options,
    (option) => option.movementInvalidReason,
  );
}

export function movementOptionInvalidDetailsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(
    options,
    (option) => option.movementInvalidDetails,
  );
}

export function movementOptionTerrainCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(options, (option) => option.terrainCost);
}

export function movementOptionElevationDeltasAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(options, (option) => option.elevationDelta);
}

export function movementOptionElevationCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(options, (option) => option.elevationCost);
}

export function movementOptionHeatGeneratedAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(options, (option) => option.heatGenerated);
}

export function movementOptionConversionStepCountsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(
    options,
    (option) => option.conversionStepCount,
  );
}

export function movementOptionConversionMpCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(options, (option) => option.conversionMpCost);
}

export function movementOptionAltitudeControlStepCountsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(
    options,
    (option) => option.altitudeControlStepCount,
  );
}

export function movementOptionAltitudeControlMpCostsAttribute(
  options: readonly IMovementRangeModeOption[],
): string | undefined {
  return movementOptionAttribute(
    options,
    (option) => option.altitudeControlMpCost,
  );
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

type MovementOptionAttributeValue = string | number;

function movementOptionAttribute(
  options: readonly IMovementRangeModeOption[],
  resolveValue: (
    option: IMovementRangeModeOption,
  ) => MovementOptionAttributeValue | undefined,
): string | undefined {
  const entries = options.flatMap((option) => {
    const value = resolveValue(option);
    if (value === undefined || value === '') return [];
    return `${option.movementType}:${value}`;
  });
  return entries.length > 0 ? entries.join('|') : undefined;
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
