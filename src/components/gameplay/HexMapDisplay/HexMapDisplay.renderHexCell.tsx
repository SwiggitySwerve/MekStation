import React from 'react';

import type {
  IHexCoordinate,
  IHexTerrain,
  MapProjectionMode,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import { coordToKey, hexEquals } from '@/utils/gameplay/hexMath';

import type { IsometricTerrainOccluderInfo } from './projection';

import { HexCell } from './HexCell';

export interface RenderHexCellInput {
  readonly handleHexClick: (hex: IHexCoordinate) => void;
  readonly handleHexHover: (hex: IHexCoordinate | null) => void;
  readonly handleHexLeave: () => void;
  readonly hoverMpCost: number | undefined;
  readonly hoverUnreachable: boolean;
  readonly hoveredHex: IHexCoordinate | null;
  readonly isometricTerrainOccluderInfoByHex: ReadonlyMap<
    string,
    IsometricTerrainOccluderInfo
  >;
  readonly projectionMode: MapProjectionMode;
  readonly selectedHex: IHexCoordinate | null;
  readonly showCoordinates: boolean;
  readonly showElevationBadges: boolean;
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
    hoveredHex,
    isometricTerrainOccluderInfoByHex,
    projectionMode,
    selectedHex,
    showCoordinates,
    showElevationBadges,
    tacticalMapProjectionLookup,
    terrainLookup,
  }: RenderHexCellInput,
): React.ReactElement {
  const key = coordToKey(hex);
  const projection = tacticalMapProjectionLookup.get(key);
  const movementInfo = projection?.movement;
  const pathIndex = projection?.pathIndex;
  const isometricOccluderInfo = isometricTerrainOccluderInfoByHex.get(key);
  const isSelected = selectedHex ? hexEquals(hex, selectedHex) : false;
  const isHovered = hoveredHex ? hexEquals(hex, hoveredHex) : false;
  const tacticalProjectionIntent = isSelected ? 'selected' : projection?.intent;

  return (
    <HexCell
      key={`hex-cell-${key}`}
      hex={hex}
      terrain={projection?.terrain}
      terrainLookup={terrainLookup}
      isSelected={isSelected}
      isHovered={isHovered}
      movementInfo={movementInfo}
      combatInfo={projection?.combat}
      combatLosBlockerFor={projection?.combatLosBlockerFor}
      isInAttackRange={projection?.inAttackRange ?? false}
      isInPath={pathIndex !== undefined}
      pathIndex={pathIndex}
      tacticalProjectionIntent={tacticalProjectionIntent}
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
      showElevationBadge={showElevationBadges}
      projectionMode={projectionMode}
      hoverMpCost={
        isHovered && hoverMpCost !== undefined && movementInfo?.reachable
          ? hoverMpCost
          : undefined
      }
      isUnreachableHover={
        isHovered && hoverUnreachable && !movementInfo?.reachable
      }
      onClick={handleHexClick}
      onMouseEnter={handleHexHover}
      onMouseLeave={handleHexLeave}
    />
  );
}
