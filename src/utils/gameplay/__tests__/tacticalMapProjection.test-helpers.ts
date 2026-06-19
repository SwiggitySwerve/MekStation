import type {
  ICombatRangeHex,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';

import {
  CoverLevel,
  MovementType,
  RangeBracket,
  TerrainType,
} from '@/types/gameplay';
import {
  buildTacticalMapHexProjection,
  buildTacticalMapHexProjectionLookup,
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

export type { ICombatRangeHex, IHexTerrain, IMovementRangeHex };

export {
  CoverLevel,
  MovementType,
  RangeBracket,
  TerrainType,
  buildTacticalMapHexProjection,
  buildTacticalMapHexProjectionLookup,
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
};

export const TERRAIN_RULE_REFERENCES = [
  'MekStation terrain/elevation grid state; movement and combat channels own legality',
] as const;

export const MOVEMENT_RULE_REFERENCES = [
  'MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
  'MegaMek common/moves/MoveStep.java:3135-3156 elevation change legality',
  'MegaMek common/moves/MovePath.java:1214-1218 MP-used accounting',
] as const;

export const REPRESENTED_MINEFIELD_RULE_REFERENCES = [
  'MekStation src/simulation/runner/phases/movementMines.ts: represented TerrainType.Mines entry applies BattleMech leg damage and queues PSRs',
  'MekStation src/simulation/runner/__tests__/movementPhase.behavior.test.ts: represented minefield damage and PSR behavior',
] as const;

export const COMBAT_RULE_REFERENCES = [
  'MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
  'MegaMek RangeType.java:95-151 range bracket classification',
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
] as const;

export const WATER_ENVIRONMENT_RULE_REFERENCES = [
  'MegaMek common/actions/compute/ComputeToHit.java:340-346 torpedoes/SRT/LRT count as underwater attacks',
  'MegaMek common/actions/compute/ComputeToHitIsImpossible.java:543-555 torpedo LOS must stay in water',
  'MegaMek common/actions/compute/ComputeTerrainMods.java:167-188 target water and partial-underwater handling',
  'MegaMek client/ui/clientGUI/boardview/spriteHandler/FiringArcSpriteHandler.java:570-575 water-only ranges display as underwater weapons',
] as const;

export const LOS_BLOCKER_RULE_REFERENCES = [
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
  'MegaMek LosEffects.java:1322-1483 elevation/building blockers and cover',
] as const;

export function terrain(elevation = 0, type = TerrainType.Clear): IHexTerrain {
  return {
    coordinate: { q: 1, r: 0 },
    elevation,
    features: [{ type, level: type === TerrainType.Clear ? 0 : 1 }],
  };
}

export function movement(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: { q: 1, r: 0 },
    mpCost: 2,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 1,
    reachable: true,
    movementType: MovementType.Walk,
    movementMode: 'walk',
    ...overrides,
  };
}

export function combat(
  overrides: Partial<ICombatRangeHex> = {},
): ICombatRangeHex {
  return {
    hex: { q: 1, r: 0 },
    distance: 1,
    rangeBracket: RangeBracket.Short,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: CoverLevel.None,
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['enemy'],
    obscuredTargetUnitIds: [],
    attackable: true,
    weaponIdsInRange: ['medium-laser'],
    weaponIdsInArc: ['medium-laser'],
    weaponIdsAvailable: ['medium-laser'],
    weaponRangeOptions: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
        rangeBracket: RangeBracket.Short,
        inRange: true,
        inArc: true,
        environmentLegal: true,
        available: true,
      },
    ],
    availableWeaponImpacts: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
      },
    ],
    availableWeaponHeat: 3,
    availableWeaponDamage: 5,
    expectedDamage: 2.1,
    targetUnitIds: ['enemy'],
    validTargetUnitIds: ['enemy'],
    ...overrides,
  };
}
