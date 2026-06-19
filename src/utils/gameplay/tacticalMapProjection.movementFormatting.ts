import type {
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

export function movementOptionsForProjection(
  movement: IMovementRangeHex | undefined,
): readonly IMovementRangeModeOption[] {
  if (!movement) return [];
  if (movement.movementModeOptions?.length) return movement.movementModeOptions;
  return [
    {
      movementType: movement.movementType,
      movementMode: movement.movementMode,
      reachable: movement.reachable,
      mpCost: movement.mpCost,
      terrainCost: movement.terrainCost,
      elevationDelta: movement.elevationDelta,
      elevationCost: movement.elevationCost,
      heatGenerated: movement.heatGenerated,
      conversionStepCount: movement.conversionStepCount,
      conversionMpCost: movement.conversionMpCost,
      altitudeControlStepCount: movement.altitudeControlStepCount,
      altitudeControlMpCost: movement.altitudeControlMpCost,
      altitudeControlRequired: movement.altitudeControlRequired,
      altitudeControlMode: movement.altitudeControlMode,
      altitudeControlAltitude: movement.altitudeControlAltitude,
      automaticLandingRequired: movement.automaticLandingRequired,
      automaticLandingReason: movement.automaticLandingReason,
      automaticLandingMode: movement.automaticLandingMode,
      automaticLandingDistance: movement.automaticLandingDistance,
      automaticLandingMinimumDistance: movement.automaticLandingMinimumDistance,
      hullDownExitRequired: movement.hullDownExitRequired,
      hullDownExitCost: movement.hullDownExitCost,
      blockedReason: movement.blockedReason,
      movementInvalidReason: movement.movementInvalidReason,
      movementInvalidDetails: movement.movementInvalidDetails,
    },
  ];
}

export function movementHasReachableOption(
  movement: IMovementRangeHex | undefined,
): boolean {
  return movementOptionsForProjection(movement).some(
    (option) => option.reachable,
  );
}

export function movementHasBlockedOption(
  movement: IMovementRangeHex | undefined,
): boolean {
  return movementOptionsForProjection(movement).some(
    (option) => !option.reachable,
  );
}

export function formatMovementType(movementType: string): string {
  if (movementType.length === 0) return movementType;
  return `${movementType[0].toUpperCase()}${movementType.slice(1)}`;
}

export function formatSignedCost(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function hasPositiveCost(value: number | undefined): value is number {
  return value !== undefined && value > 0;
}

export function formatMovementOption(option: IMovementRangeModeOption): string {
  const blockedDetail = movementOptionBlockedDetail(option);
  const blockedSuffix =
    option.reachable || !blockedDetail ? '' : `: ${blockedDetail}`;
  return `${formatMovementOptionBase(option)}${formatMovementOptionTerrainCost(option)}${formatMovementOptionElevationDetail(option)}${formatMovementOptionHeat(option)}${formatMovementOptionConversion(option)}${formatMovementOptionAltitudeControl(option)}${formatMovementOptionAutomaticLanding(option)}${formatMovementOptionHullDownExit(option)}${blockedSuffix}`;
}

function formatMovementOptionBase(option: IMovementRangeModeOption): string {
  return `${option.movementType}${formatMovementOptionMode(option)} ${
    option.reachable ? 'reachable' : 'blocked'
  } ${option.mpCost} MP`;
}

function formatMovementOptionMode(option: IMovementRangeModeOption): string {
  return option.movementMode && option.movementMode !== option.movementType
    ? ` via ${option.movementMode}`
    : '';
}

function formatMovementOptionTerrainCost(
  option: IMovementRangeModeOption,
): string {
  return option.terrainCost === undefined
    ? ''
    : ` terrain ${formatSignedCost(option.terrainCost)}`;
}

function formatMovementOptionElevationDetail(
  option: IMovementRangeModeOption,
): string {
  return option.elevationDelta === undefined &&
    option.elevationCost === undefined
    ? ''
    : ` elevation ${formatMovementOptionElevation(option)}`;
}

function formatMovementOptionHeat(option: IMovementRangeModeOption): string {
  return option.heatGenerated === undefined
    ? ''
    : ` heat ${formatSignedCost(option.heatGenerated)}`;
}

function formatMovementOptionConversion(
  option: IMovementRangeModeOption,
): string {
  return option.conversionStepCount === undefined &&
    option.conversionMpCost === undefined
    ? ''
    : ` conversion ${option.conversionStepCount ?? 0} steps ${
        option.conversionMpCost ?? 0
      } MP`;
}

function formatMovementOptionAltitudeControl(
  option: IMovementRangeModeOption,
): string {
  return option.altitudeControlStepCount === undefined &&
    option.altitudeControlMpCost === undefined
    ? ''
    : ` altitude control ${option.altitudeControlStepCount ?? 0} steps ${
        option.altitudeControlMpCost ?? 0
      } MP`;
}

function formatMovementOptionAutomaticLanding(
  option: IMovementRangeModeOption,
): string {
  return option.automaticLandingRequired
    ? ` automatic landing ${option.automaticLandingDistance ?? 0}/${
        option.automaticLandingMinimumDistance ?? 0
      } hexes`
    : '';
}

function formatMovementOptionHullDownExit(
  option: IMovementRangeModeOption,
): string {
  return option.hullDownExitRequired || hasPositiveCost(option.hullDownExitCost)
    ? ` hull-down exit ${option.hullDownExitCost ?? 0} MP`
    : '';
}

export function formatMovementOptionElevation(
  option: IMovementRangeModeOption,
): string {
  const parts: string[] = [];
  if (option.elevationDelta !== undefined) {
    parts.push(`delta ${formatSignedCost(option.elevationDelta)}`);
  }
  if (option.elevationCost !== undefined) {
    parts.push(`cost ${formatSignedCost(option.elevationCost)}`);
  }
  return parts.join(' ');
}

function movementOptionBlockedDetail(
  option: IMovementRangeModeOption,
): string | undefined {
  if (option.reachable) return undefined;
  return (
    option.movementInvalidDetails ??
    option.blockedReason ??
    option.movementInvalidReason
  );
}
