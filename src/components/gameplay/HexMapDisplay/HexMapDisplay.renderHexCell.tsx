import React from 'react';

import type {
  IHexCoordinate,
  IHexTerrain,
  MapProjectionMode,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import { coordToKey } from '@/utils/gameplay/hexMath';

import type { IsometricTerrainOccluderInfo } from './projection';

import { HexCell } from './HexCell';

export interface RenderHexCellInput {
  readonly handleHexClick: (hex: IHexCoordinate) => void;
  readonly handleHexHover: (hex: IHexCoordinate | null) => void;
  readonly handleHexLeave: () => void;
  readonly hoverMpCost: number | undefined;
  readonly hoverUnreachable: boolean;
  readonly isometricTerrainOccluderInfoByHex: ReadonlyMap<
    string,
    IsometricTerrainOccluderInfo
  >;
  readonly projectionMode: MapProjectionMode;
  readonly showCoordinates: boolean;
  readonly tacticalMapProjectionLookup: ReadonlyMap<
    string,
    ITacticalMapHexProjection
  >;
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
}

export function renderHexCell(
  hex: IHexCoordinate,
  {
    handleHexClick,
    handleHexHover,
    handleHexLeave,
    hoverMpCost,
    hoverUnreachable,
    isometricTerrainOccluderInfoByHex,
    projectionMode,
    showCoordinates,
    tacticalMapProjectionLookup,
    terrainLookup,
  }: RenderHexCellInput,
): React.ReactElement {
  const key = coordToKey(hex);
  const projection = tacticalMapProjectionLookup.get(key);
  const movementInfo = projection?.movement;
  const pathIndex = projection?.pathIndex;
  const isometricOccluderInfo = isometricTerrainOccluderInfoByHex.get(key);

  return (
    <HexCell
      key={`hex-cell-${key}`}
      hex={hex}
      terrain={projection?.terrain}
      terrainLookup={terrainLookup}
      isSelected={projection?.isSelected ?? false}
      isHovered={projection?.isHovered ?? false}
      movementInfo={movementInfo}
      combatInfo={projection?.combat}
      combatLosBlockerFor={projection?.combatLosBlockerFor}
      isInAttackRange={projection?.inAttackRange ?? false}
      isInPath={pathIndex !== undefined}
      pathIndex={pathIndex}
      tacticalProjectionIntent={projection?.intent}
      tacticalProjectionStatus={projection?.status}
      tacticalProjectionMovementStatus={projection?.movementStatus}
      tacticalProjectionMovementCostStatus={projection?.movementCostStatus}
      tacticalProjectionMovementCostReasons={projection?.movementCostReasons}
      tacticalProjectionMovementHazardStatus={projection?.movementHazardStatus}
      tacticalProjectionMovementHazardReasons={
        projection?.movementHazardReasons
      }
      tacticalProjectionCombatStatus={projection?.combatStatus}
      tacticalProjectionBlockedReasons={projection?.blockedReasons}
      tacticalProjectionSourceReferences={projection?.sourceReferences}
      tacticalProjectionExplanation={projection?.explanation}
      isometricOccluderInfo={isometricOccluderInfo || undefined}
      showCoordinate={showCoordinates}
      projectionMode={projectionMode}
      hoverMpCost={
        projection?.isHovered &&
        hoverMpCost !== undefined &&
        movementInfo?.reachable
          ? hoverMpCost
          : undefined
      }
      isUnreachableHover={
        projection?.isHovered && hoverUnreachable && !movementInfo?.reachable
      }
      onClick={handleHexClick}
      onMouseEnter={handleHexHover}
      onMouseLeave={handleHexLeave}
    />
  );
}
