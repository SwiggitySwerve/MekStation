import React from 'react';

import type {
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

import {
  HexCellSvgTextBadge,
  type MovementProjectionBadgeProps,
} from './HexCell.badgePrimitives';
import {
  formatMovementOptionTitle,
  formatMovementTypeLabel,
  movementOptionAltitudeControlsAttribute,
  movementOptionBlockedReasonsAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionsForBadge,
} from './HexCell.movementOptionSummaries';
import {
  movementProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

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

export function MovementBlockedOptionsBadge({
  x,
  y,
  hex,
  movementInfo,
  projectionExplanation,
  sourceReferences,
}: MovementProjectionBadgeProps): React.ReactElement | null {
  if (!movementInfo?.reachable) return null;

  const blockedOptions = blockedMovementOptionsFor(movementInfo);
  if (blockedOptions.length === 0) return null;

  const label = formatBlockedMovementOptionsLabel(blockedOptions);
  const width = Math.max(32, label.length * 5.6 + 10);
  const left = x - width - 36;
  const title = formatBlockedMovementOptionsTitle(blockedOptions);
  const source = movementProjectionSourceMetadata(sourceReferences);

  return (
    <HexCellSvgTextBadge
      label={label}
      title={title}
      testId={`hex-movement-blocked-options-badge-${hex.q}-${hex.r}`}
      dataAttributes={{
        ...tacticalProjectionDataAttributes(source),
        'data-movement-blocked-options-badge-count': blockedOptions.length,
        'data-movement-blocked-options-badge-types':
          movementOptionBlockedTypesAttribute(blockedOptions),
        'data-movement-blocked-options-badge-reasons':
          movementOptionBlockedReasonsAttribute(blockedOptions),
        'data-movement-blocked-options-badge-invalid-reasons':
          movementOptionInvalidReasonsAttribute(blockedOptions),
        'data-movement-blocked-options-badge-invalid-details':
          movementOptionInvalidDetailsAttribute(blockedOptions),
        'data-movement-blocked-options-badge-altitude-controls':
          movementOptionAltitudeControlsAttribute(blockedOptions),
        'data-movement-blocked-options-badge-source-refs': source.sourceRefs,
        'data-movement-blocked-options-badge-rule-refs': source.ruleRefs,
        'data-movement-blocked-options-badge-projection-explanation':
          projectionExplanation,
      }}
      rect={{
        x: left,
        y: y + 7,
        width,
        height: '13',
        rx: '2',
        fill: '#7f1d1d',
        stroke: '#fecaca',
        strokeWidth: '1',
        opacity: '0.92',
      }}
      text={{
        x: left + width / 2,
        y: y + 17,
        fontSize: '9',
        fontWeight: '800',
        fill: '#fff7ed',
      }}
    />
  );
}
