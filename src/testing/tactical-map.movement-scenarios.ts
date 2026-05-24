import type { MapMovementPointLegendState } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { IMovementRangeHex, IUnitToken } from '@/types/gameplay';

import {
  MovementType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';

import {
  tacticalMapMovementRange,
  tacticalMapMpLegend,
  tacticalMapTokens,
} from './tactical-map.fixtures';

export const tacticalMapJumpElevationMovementRange: readonly IMovementRangeHex[] =
  tacticalMapMovementRange.filter(
    (movement) =>
      movement.hex.q === 0 &&
      movement.hex.r === 1 &&
      movement.movementType === MovementType.Jump &&
      movement.reachable,
  );

export const tacticalMapJumpElevationMpLegend: MapMovementPointLegendState = {
  ...tacticalMapMpLegend,
  active: 'jump',
  movementMode: 'jump',
};

export const tacticalMapVtolTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) =>
    token.unitId === 'attacker'
      ? {
          ...token,
          name: 'Karnov UR Transport',
          designation: 'KAR',
          unitType: TokenUnitType.Vehicle,
          vehicleMotionType: VehicleMotionType.VTOL,
        }
      : token,
  );

export const tacticalMapVtolElevationMovementRange: readonly IMovementRangeHex[] =
  [
    {
      hex: { q: 1, r: 0 },
      mpCost: 2,
      terrainCost: 0,
      elevationDelta: 4,
      elevationCost: 0,
      heatGenerated: 0,
      movementMode: 'vtol',
      reachable: true,
      movementType: MovementType.Run,
      path: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    },
  ];

export const tacticalMapVtolElevationMpLegend: MapMovementPointLegendState = {
  active: 'run',
  movementMode: 'vtol',
  walkMP: 4,
  runMP: 6,
  jumpAvailable: false,
};
