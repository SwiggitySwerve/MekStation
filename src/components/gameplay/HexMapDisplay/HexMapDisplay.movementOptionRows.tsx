import React from 'react';

import type {
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

import {
  formatMovementOptionTitle,
  movementOptionBlockedDetail,
  movementOptionBlockedReasonsAttribute,
  movementOptionCostsAttribute,
  movementOptionElevationCostsAttribute,
  movementOptionElevationDeltasAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionsForBadge,
  movementOptionStatesAttribute,
  movementOptionTerrainCostsAttribute,
  movementOptionTypesAttribute,
} from './HexCell.movementOptionSummaries';

function optionTestIdSuffix(
  option: IMovementRangeModeOption,
  index: number,
): string {
  const mode = option.movementMode ? `-${option.movementMode}` : '';
  return `${option.movementType}${mode}-${index}`;
}

export function MovementModeOptionRows({
  movementInfo,
  testId,
}: {
  readonly movementInfo: IMovementRangeHex;
  readonly testId: string;
}): React.ReactElement | null {
  const options = movementOptionsForBadge(movementInfo);
  if (options.length <= 1) return null;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-movement-option-count={options.length}
      data-movement-option-types={movementOptionTypesAttribute(movementInfo)}
      data-movement-option-costs={movementOptionCostsAttribute(movementInfo)}
      data-movement-option-states={movementOptionStatesAttribute(movementInfo)}
      data-movement-option-terrain-costs={movementOptionTerrainCostsAttribute(
        options,
      )}
      data-movement-option-elevation-deltas={movementOptionElevationDeltasAttribute(
        options,
      )}
      data-movement-option-elevation-costs={movementOptionElevationCostsAttribute(
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
    >
      <div data-testid={`${testId}-title`}>Movement options:</div>
      {options.map((option, index) => {
        const blockedDetail = movementOptionBlockedDetail(option);
        return (
          <div
            key={`${option.movementType}-${option.movementMode ?? 'mode'}-${index}`}
            data-testid={`${testId}-option-${optionTestIdSuffix(option, index)}`}
            data-movement-option-type={option.movementType}
            data-movement-option-mode={option.movementMode}
            data-movement-option-state={
              option.reachable ? 'reachable' : 'blocked'
            }
            data-movement-option-cost={option.mpCost}
            data-movement-option-terrain-cost={option.terrainCost}
            data-movement-option-elevation-delta={option.elevationDelta}
            data-movement-option-elevation-cost={option.elevationCost}
            data-movement-option-heat={option.heatGenerated}
            data-movement-option-blocked-reason={blockedDetail}
          >
            {formatMovementOptionTitle(option)}
          </div>
        );
      })}
    </div>
  );
}
