import React from 'react';

import type {
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatMovementOptionTitle,
  movementOptionAltitudeControlMpCostsAttribute,
  movementOptionAltitudeControlStepCountsAttribute,
  movementOptionAutomaticLandingsAttribute,
  movementOptionBlockedDetail,
  movementOptionBlockedReasonsAttribute,
  movementOptionConversionMpCostsAttribute,
  movementOptionConversionStepCountsAttribute,
  movementOptionCostsAttribute,
  movementOptionElevationCostsAttribute,
  movementOptionElevationDeltasAttribute,
  movementOptionHeatGeneratedAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionsForBadge,
  movementOptionStatesAttribute,
  movementOptionTerrainCostsAttribute,
  movementOptionTurningCostsAttribute,
  movementOptionTypesAttribute,
} from './HexCell.movementOptionSummaries';
import {
  movementProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

function optionTestIdSuffix(
  option: IMovementRangeModeOption,
  index: number,
): string {
  const mode = option.movementMode ? `-${option.movementMode}` : '';
  return `${option.movementType}${mode}-${index}`;
}

export function MovementModeOptionRows({
  movementInfo,
  projection,
  testId,
}: {
  readonly movementInfo: IMovementRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const options = movementOptionsForBadge(movementInfo);
  if (options.length <= 1) return null;

  const source = movementProjectionSourceMetadata(projection?.sourceReferences);
  const projectionAttributes = tacticalProjectionDataAttributes(source);

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      {...projectionAttributes}
      data-movement-option-count={options.length}
      data-movement-option-types={movementOptionTypesAttribute(movementInfo)}
      data-movement-option-costs={movementOptionCostsAttribute(movementInfo)}
      data-movement-option-states={movementOptionStatesAttribute(movementInfo)}
      data-movement-option-terrain-costs={movementOptionTerrainCostsAttribute(
        options,
      )}
      data-movement-option-turning-costs={movementOptionTurningCostsAttribute(
        options,
      )}
      data-movement-option-elevation-deltas={movementOptionElevationDeltasAttribute(
        options,
      )}
      data-movement-option-elevation-costs={movementOptionElevationCostsAttribute(
        options,
      )}
      data-movement-option-heats={movementOptionHeatGeneratedAttribute(options)}
      data-movement-option-conversion-step-counts={movementOptionConversionStepCountsAttribute(
        options,
      )}
      data-movement-option-conversion-mp-costs={movementOptionConversionMpCostsAttribute(
        options,
      )}
      data-movement-option-altitude-control-step-counts={movementOptionAltitudeControlStepCountsAttribute(
        options,
      )}
      data-movement-option-altitude-control-mp-costs={movementOptionAltitudeControlMpCostsAttribute(
        options,
      )}
      data-movement-option-automatic-landings={movementOptionAutomaticLandingsAttribute(
        options,
      )}
      data-movement-option-blocked-reasons={movementOptionBlockedReasonsAttribute(
        options,
      )}
      data-movement-option-invalid-reasons={movementOptionInvalidReasonsAttribute(
        options,
      )}
      data-movement-option-invalid-details={movementOptionInvalidDetailsAttribute(
        options,
      )}
      data-movement-option-source-refs={source.sourceRefs}
      data-movement-option-rule-refs={source.ruleRefs}
    >
      <div data-testid={`${testId}-title`}>Movement options:</div>
      {options.map((option, index) => {
        const blockedDetail = movementOptionBlockedDetail(option);
        return (
          <div
            key={`${option.movementType}-${option.movementMode ?? 'mode'}-${index}`}
            data-testid={`${testId}-option-${optionTestIdSuffix(option, index)}`}
            {...projectionAttributes}
            data-movement-option-type={option.movementType}
            data-movement-option-mode={option.movementMode}
            data-movement-option-state={
              option.reachable ? 'reachable' : 'blocked'
            }
            data-movement-option-cost={option.mpCost}
            data-movement-option-terrain-cost={option.terrainCost}
            data-movement-option-turning-cost={option.turningCost}
            data-movement-option-elevation-delta={option.elevationDelta}
            data-movement-option-elevation-cost={option.elevationCost}
            data-movement-option-heat={option.heatGenerated}
            data-movement-option-conversion-step-count={
              option.conversionStepCount
            }
            data-movement-option-conversion-mp-cost={option.conversionMpCost}
            data-movement-option-altitude-control-step-count={
              option.altitudeControlStepCount
            }
            data-movement-option-altitude-control-mp-cost={
              option.altitudeControlMpCost
            }
            data-movement-option-automatic-landing-required={
              option.automaticLandingRequired ? 'true' : undefined
            }
            data-movement-option-automatic-landing-mode={
              option.automaticLandingMode
            }
            data-movement-option-automatic-landing-distance={
              option.automaticLandingDistance
            }
            data-movement-option-automatic-landing-minimum-distance={
              option.automaticLandingMinimumDistance
            }
            data-movement-option-automatic-landing-reason={
              option.automaticLandingReason
            }
            data-movement-option-blocked-reason={blockedDetail}
            data-movement-option-invalid-reason={option.movementInvalidReason}
            data-movement-option-invalid-details={option.movementInvalidDetails}
            data-movement-option-source-refs={source.sourceRefs}
            data-movement-option-rule-refs={source.ruleRefs}
          >
            {formatMovementOptionTitle(option)}
          </div>
        );
      })}
    </div>
  );
}
