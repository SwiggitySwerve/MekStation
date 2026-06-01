import type { ReactElement } from 'react';

import type { useScreenShake } from '@/hooks/useScreenShake';
import type {
  ICombatRangeHex,
  IGameEvent,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';
import type { UiFiringArc } from '@/utils/overlays/arcClassifier';

import type { buildIsometricSceneItems } from './HexMapDisplay.isometric';
import type {
  useHexGrid,
  useCombatProjectionValidTargetUnitIds,
  useIsometricOcclusionIds,
  useIsometricOcclusionInfo,
  useIsometricOcclusionInfosByUnit,
  useMovementAnimationsByUnit,
  useOrderedTokens,
  useTerrainLookup,
} from './HexMapDisplay.stateHooks';
import type { IsometricTerrainOccluderInfo } from './projection';
import type { useMapInteraction } from './useMapInteraction';

export interface HexMapDisplayState {
  readonly mapId: string;
  readonly tokens: readonly IUnitToken[];
  readonly events: readonly IGameEvent[];
  readonly screenShake: ReturnType<typeof useScreenShake>;
  readonly interaction: ReturnType<typeof useMapInteraction>;
  readonly projectionTransform: string | undefined;
  readonly isIsometricView: boolean;
  readonly hexes: readonly IHexCoordinate[];
  readonly renderedHexes: readonly IHexCoordinate[];
  readonly terrainLookup: ReturnType<typeof useTerrainLookup>;
  readonly hexGrid: ReturnType<typeof useHexGrid>;
  readonly selectedToken: IUnitToken | null;
  readonly selectedUnitPosition: IHexCoordinate | null;
  readonly movementAnimationsByUnit: ReturnType<
    typeof useMovementAnimationsByUnit
  >;
  readonly orderedTokens: ReturnType<typeof useOrderedTokens>;
  readonly hasActiveMovementAnimation: boolean;
  readonly isometricTerrainOcclusionInfoByUnit: ReturnType<
    typeof useIsometricOcclusionInfo
  >;
  readonly isometricTerrainOcclusionInfosByUnit: ReturnType<
    typeof useIsometricOcclusionInfosByUnit
  >;
  readonly isometricOcclusionUnitIds: ReturnType<
    typeof useIsometricOcclusionIds
  >;
  readonly combatProjectionValidTargetUnitIds: ReturnType<
    typeof useCombatProjectionValidTargetUnitIds
  >;
  readonly combatRangeLookup: ReadonlyMap<string, ICombatRangeHex>;
  readonly isometricSceneItems: ReturnType<typeof buildIsometricSceneItems>;
  readonly selectedWeaponMaxRange: number;
  readonly visibleFiringArcs: readonly UiFiringArc[] | undefined;
  readonly hoveredHex: IHexCoordinate | null;
  readonly hoverUnreachableReason: string | undefined;
  readonly hoverMovementInfo: IMovementRangeHex | undefined;
  readonly hoverCombatInfo: ICombatRangeHex | undefined;
  readonly hoverTerrainInfo: IHexTerrain | undefined;
  readonly hoverProjectionInfo: ITacticalMapHexProjection | undefined;
  readonly hoverIsometricOccluderInfo: IsometricTerrainOccluderInfo | undefined;
  readonly tacticalMapProjectionLookup: ReadonlyMap<
    string,
    ITacticalMapHexProjection
  >;
  readonly renderHexCell: (hex: IHexCoordinate) => ReactElement;
  readonly handleTokenClick: (unitId: string) => void;
  readonly handleTokenDoubleClick: (unitId: string) => void;
}
