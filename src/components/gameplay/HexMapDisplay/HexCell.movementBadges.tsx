import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapProjectionSourceReference } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatMovementModeLabel,
  formatMovementModeTitleLabel,
  formatMovementOptionCostBadgeLabel,
  formatMovementOptionTitle,
  formatMovementTypeLabel,
  movementOptionAltitudeControlsAttribute,
  movementOptionAltitudeControlMpCostsAttribute,
  movementOptionAltitudeControlStepCountsAttribute,
  movementOptionAutomaticLandingsAttribute,
  movementOptionBlockedReasonsAttribute,
  movementOptionConversionMpCostsAttribute,
  movementOptionConversionStepCountsAttribute,
  movementOptionElevationCostsAttribute,
  movementOptionElevationDeltasAttribute,
  movementOptionHeatGeneratedAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionTerrainCostsAttribute,
  movementOptionsForBadge,
} from './HexCell.movementOptionSummaries';

export function formatMovementReachBadgeLabel(
  movementInfo: IMovementRangeHex,
): string {
  const options = movementOptionsForBadge(movementInfo);
  const motiveLabel = formatMovementModeLabel(movementInfo.movementMode);

  if (options.length > 1) {
    return formatMovementOptionCostBadgeLabel(options);
  }

  const typeLabel = formatMovementTypeLabel(movementInfo.movementType);
  const modeLabel = motiveLabel ? `${typeLabel}/${motiveLabel}` : typeLabel;
  const mpLabel = Number.isFinite(movementInfo.mpCost)
    ? `${movementInfo.mpCost}MP`
    : 'XMP';
  return `${modeLabel} ${mpLabel}`;
}

export function formatMovementModeTitle(
  movementInfo: IMovementRangeHex,
): string {
  if (
    movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
  ) {
    return `${movementInfo.movementType} via ${formatMovementModeTitleLabel(
      movementInfo.movementMode,
    )}`;
  }
  return movementInfo.movementType;
}

export function formatMovementReachBadgeTitle(
  movementInfo: IMovementRangeHex,
): string {
  const conversion =
    movementInfo.conversionStepCount === undefined &&
    movementInfo.conversionMpCost === undefined
      ? ''
      : `; conversion ${movementInfo.conversionStepCount ?? 0} steps ${
          movementInfo.conversionMpCost ?? 0
        } MP`;
  const altitudeControl =
    movementInfo.altitudeControlStepCount === undefined &&
    movementInfo.altitudeControlMpCost === undefined
      ? ''
      : `; altitude control ${
          movementInfo.altitudeControlStepCount ?? 0
        } steps ${movementInfo.altitudeControlMpCost ?? 0} MP`;
  const automaticLanding = movementInfo.automaticLandingRequired
    ? `; automatic ${
        movementInfo.automaticLandingMode
          ? formatMovementModeTitleLabel(movementInfo.automaticLandingMode)
          : 'WiGE'
      } landing ${movementInfo.automaticLandingDistance ?? 0}/${
        movementInfo.automaticLandingMinimumDistance ?? 0
      } hexes`
    : '';
  const primary = `${formatMovementModeTitle(movementInfo)} reachable: ${movementInfo.mpCost} MP${conversion}${altitudeControl}${automaticLanding}`;
  const options = movementInfo.movementModeOptions ?? [];
  if (options.length <= 1) return primary;
  return `${primary}; options ${options.map(formatMovementOptionTitle).join('; ')}`;
}

const formatElevationDeltaLabel = (elevationDelta: number): string =>
  elevationDelta > 0 ? `UP${elevationDelta}` : `DN${Math.abs(elevationDelta)}`;

function formatMovementStepCostLabel(
  movementInfo: IMovementRangeHex,
): string | null {
  const labels: string[] = [];
  const { elevationCost, elevationDelta = 0, terrainCost } = movementInfo;
  const hasElevationDelta = elevationDelta !== 0;
  if (terrainCost && terrainCost > 0) labels.push(`T+${terrainCost}`);
  if (elevationCost !== undefined && (elevationCost > 0 || hasElevationDelta)) {
    labels.push(`E+${elevationCost}`);
  }
  if (hasElevationDelta) labels.push(formatElevationDeltaLabel(elevationDelta));
  return labels.length > 0 ? labels.join(' ') : null;
}

function formatMovementStepCostTitle(movementInfo: IMovementRangeHex): string {
  const labels: string[] = [];
  const { elevationCost, elevationDelta = 0, terrainCost } = movementInfo;
  const hasElevationDelta = elevationDelta !== 0;
  if (terrainCost && terrainCost > 0) labels.push(`terrain +${terrainCost}`);
  if (elevationCost !== undefined && (elevationCost > 0 || hasElevationDelta)) {
    labels.push(`elevation cost +${elevationCost}`);
  }
  if (hasElevationDelta) {
    labels.push(
      `elevation delta ${elevationDelta > 0 ? '+' : ''}${elevationDelta}`,
    );
  }
  return `Movement step cost: ${labels.join('; ')}`;
}

function formatStandUpBadgeLabel(movementInfo: IMovementRangeHex): string {
  const prefix = movementInfo.standUpMode === 'careful' ? 'C-STAND' : 'STAND';
  if (movementInfo.standUpPsrImpossibleReason) return `${prefix} IMP`;
  const cost =
    movementInfo.standUpCost === undefined
      ? prefix
      : `${prefix} ${movementInfo.standUpCost}MP`;
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
    details.push(
      `${movementInfo.standUpMode === 'careful' ? 'careful stand' : 'stand-up'} cost ${movementInfo.standUpCost} MP`,
    );
  }
  if (
    !movementInfo.standUpPsrRequired &&
    movementInfo.standUpPsrAutomaticSuccessReason
  ) {
    details.push(`${movementInfo.standUpPsrAutomaticSuccessReason}; no PSR`);
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
    : `${movementInfo.standUpMode === 'careful' ? 'Careful stand' : 'Must stand'} before moving: ${details.join('; ')}`;
}

function formatHullDownExitBadgeLabel(movementInfo: IMovementRangeHex): string {
  return movementInfo.hullDownExitCost === undefined
    ? 'HD-UP'
    : `HD-UP ${movementInfo.hullDownExitCost}MP`;
}

function formatHullDownExitBadgeTitle(movementInfo: IMovementRangeHex): string {
  return `Must exit hull-down before moving: posture exit cost ${movementInfo.hullDownExitCost ?? '?'} MP`;
}

export function MovementReachBadge({
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
  const label = formatMovementReachBadgeLabel(movementInfo);
  const title = formatMovementReachBadgeTitle(movementInfo);
  const movementOptions = movementInfo.movementModeOptions ?? [];
  const width = Math.max(34, label.length * 5.6 + 10);
  const movementSourceReferences =
    sourceReferences?.filter((source) => source.channel === 'movement') ?? [];
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
      data-testid={`hex-movement-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-tactical-projection-source={
        movementProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={movementProjectionChannel}
      data-tactical-rules-surface={movementProjectionChannel}
      data-movement-badge-type={movementInfo.movementType}
      data-movement-badge-mode={movementInfo.movementMode}
      data-movement-badge-mp-cost={movementInfo.mpCost}
      data-movement-badge-heat-generated={movementInfo.heatGenerated}
      data-movement-badge-conversion-step-count={
        movementInfo.conversionStepCount
      }
      data-movement-badge-conversion-mp-cost={movementInfo.conversionMpCost}
      data-movement-badge-altitude-control-step-count={
        movementInfo.altitudeControlStepCount
      }
      data-movement-badge-altitude-control-mp-cost={
        movementInfo.altitudeControlMpCost
      }
      data-movement-badge-altitude-control-required={
        movementInfo.altitudeControlRequired ? 'true' : undefined
      }
      data-movement-badge-altitude-control-mode={
        movementInfo.altitudeControlMode
      }
      data-movement-badge-altitude-control-altitude={
        movementInfo.altitudeControlAltitude
      }
      data-movement-badge-automatic-landing-required={
        movementInfo.automaticLandingRequired ? 'true' : undefined
      }
      data-movement-badge-automatic-landing-mode={
        movementInfo.automaticLandingMode
      }
      data-movement-badge-automatic-landing-distance={
        movementInfo.automaticLandingDistance
      }
      data-movement-badge-automatic-landing-minimum-distance={
        movementInfo.automaticLandingMinimumDistance
      }
      data-movement-badge-option-count={
        movementOptions.length > 1 ? movementOptions.length : undefined
      }
      data-movement-badge-option-types={
        movementOptions.length > 1
          ? movementOptions.map((option) => option.movementType).join(',')
          : undefined
      }
      data-movement-badge-option-costs={
        movementOptions.length > 1
          ? movementOptions
              .map((option) => `${option.movementType}:${option.mpCost}`)
              .join('|')
          : undefined
      }
      data-movement-badge-option-blocked-reasons={
        movementOptions.length > 1
          ? movementOptionBlockedReasonsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-invalid-reasons={
        movementOptions.length > 1
          ? movementOptionInvalidReasonsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-invalid-details={
        movementOptions.length > 1
          ? movementOptionInvalidDetailsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-terrain-costs={
        movementOptions.length > 1
          ? movementOptionTerrainCostsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-elevation-deltas={
        movementOptions.length > 1
          ? movementOptionElevationDeltasAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-elevation-costs={
        movementOptions.length > 1
          ? movementOptionElevationCostsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-heats={movementOptionHeatGeneratedAttribute(
        movementOptions,
      )}
      data-movement-badge-option-conversion-step-counts={
        movementOptions.length > 1
          ? movementOptionConversionStepCountsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-conversion-mp-costs={
        movementOptions.length > 1
          ? movementOptionConversionMpCostsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-altitude-control-step-counts={
        movementOptions.length > 1
          ? movementOptionAltitudeControlStepCountsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-altitude-control-mp-costs={
        movementOptions.length > 1
          ? movementOptionAltitudeControlMpCostsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-altitude-controls={
        movementOptions.length > 1
          ? movementOptionAltitudeControlsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-option-automatic-landings={
        movementOptions.length > 1
          ? movementOptionAutomaticLandingsAttribute(movementOptions)
          : undefined
      }
      data-movement-badge-source-refs={movementSourceRefsAttribute}
      data-movement-badge-rule-refs={movementRuleRefsAttribute}
      data-movement-badge-projection-explanation={projectionExplanation}
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

function formatAutomaticLandingBadgeTitle(
  movementInfo: IMovementRangeHex,
): string {
  const mode = movementInfo.automaticLandingMode
    ? formatMovementModeTitleLabel(movementInfo.automaticLandingMode)
    : 'WiGE';
  const reason = movementInfo.automaticLandingReason
    ? `: ${movementInfo.automaticLandingReason}`
    : '';
  return `Automatic ${mode} landing after ${
    movementInfo.automaticLandingDistance ?? 0
  }/${movementInfo.automaticLandingMinimumDistance ?? 0} hexes${reason}`;
}

export function MovementAutomaticLandingBadge({
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
  if (!movementInfo?.automaticLandingRequired) return null;
  const title = formatAutomaticLandingBadgeTitle(movementInfo);
  return (
    <g
      pointerEvents="none"
      data-testid={`hex-automatic-landing-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-automatic-landing-mode={movementInfo.automaticLandingMode}
      data-automatic-landing-distance={movementInfo.automaticLandingDistance}
      data-automatic-landing-minimum-distance={
        movementInfo.automaticLandingMinimumDistance
      }
      data-automatic-landing-reason={movementInfo.automaticLandingReason}
    >
      <title>{title}</title>
      <rect
        x={x - 19}
        y={y + 33}
        width={38}
        height={12}
        rx={3}
        fill="#7c2d12"
        opacity={0.92}
        stroke="#fed7aa"
        strokeOpacity={0.65}
        strokeWidth={0.7}
      />
      <text
        x={x}
        y={y + 42}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fff7ed"
      >
        LAND
      </text>
    </g>
  );
}

export function MovementStepCostBadge({
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
  const label = formatMovementStepCostLabel(movementInfo);
  if (!label) return null;

  const title = formatMovementStepCostTitle(movementInfo);
  const width = Math.max(28, label.length * 5.4 + 8);
  const movementSourceReferences =
    sourceReferences?.filter((source) => source.channel === 'movement') ?? [];
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
      data-testid={`hex-movement-cost-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-tactical-projection-source={
        movementProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={movementProjectionChannel}
      data-tactical-rules-surface={movementProjectionChannel}
      data-movement-step-terrain-cost={movementInfo.terrainCost}
      data-movement-step-elevation-cost={movementInfo.elevationCost}
      data-movement-step-elevation-delta={movementInfo.elevationDelta}
      data-movement-step-source-refs={movementSourceRefsAttribute}
      data-movement-step-rule-refs={movementRuleRefsAttribute}
      data-movement-step-projection-explanation={projectionExplanation}
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
  if (!movementInfo?.standUpRequired && !movementInfo?.hullDownExitRequired) {
    return null;
  }

  const label = movementInfo.hullDownExitRequired
    ? formatHullDownExitBadgeLabel(movementInfo)
    : formatStandUpBadgeLabel(movementInfo);
  const title = movementInfo.hullDownExitRequired
    ? formatHullDownExitBadgeTitle(movementInfo)
    : formatStandUpBadgeTitle(movementInfo);
  const width = Math.max(42, label.length * 5.2 + 10);
  return (
    <g
      pointerEvents="none"
      data-testid={`hex-stand-up-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-stand-up-mode={movementInfo.standUpMode}
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
      data-stand-up-psr-automatic-success-reason={
        movementInfo.standUpPsrAutomaticSuccessReason
      }
      data-hull-down-exit-required={
        movementInfo.hullDownExitRequired ? 'true' : undefined
      }
      data-hull-down-exit-cost={movementInfo.hullDownExitCost}
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
