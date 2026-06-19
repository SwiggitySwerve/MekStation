export const TERRAIN_ELEVATION_RULE_REFERENCES = [
  'MekStation terrain/elevation grid state; movement and combat channels own legality',
] as const;

export const MOVEMENT_RULE_REFERENCES = [
  'MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
  'MegaMek common/moves/MoveStep.java:3135-3156 elevation change legality',
  'MegaMek common/moves/MovePath.java:1214-1218 MP-used accounting',
] as const;

export const STAND_UP_MOVEMENT_RULE_REFERENCES = [
  'MegaMek common/moves/GetUpStep.java:62 stand-up MP cost',
  'MegaMek server/totalWarfare/MovePathHandler.java:2027-2058 stand-up PSR resolution',
  'MegaMek QuadMek.java:452-453 intact quads do not roll to stand',
  'MegaMek Entity.java:7824-7828 all-four-legs stand-up automatic success',
] as const;

export const REPRESENTED_MINEFIELD_MOVEMENT_RULE_REFERENCES = [
  'MekStation src/simulation/runner/phases/movementMines.ts: represented TerrainType.Mines entry applies BattleMech leg damage and queues PSRs',
  'MekStation src/simulation/runner/__tests__/movementPhase.behavior.test.ts: represented minefield damage and PSR behavior',
] as const;

export const COMBAT_RULE_REFERENCES = [
  'MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
  'MegaMek RangeType.java:95-151 range bracket classification',
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
] as const;

export const REPRESENTED_WATER_ENVIRONMENT_RULE_REFERENCES = [
  'MegaMek common/actions/compute/ComputeToHit.java:340-346 torpedoes/SRT/LRT count as underwater attacks',
  'MegaMek common/actions/compute/ComputeToHitIsImpossible.java:543-555 torpedo LOS must stay in water',
  'MegaMek common/actions/compute/ComputeTerrainMods.java:167-188 target water and partial-underwater handling',
  'MegaMek client/ui/clientGUI/boardview/spriteHandler/FiringArcSpriteHandler.java:570-575 water-only ranges display as underwater weapons',
] as const;

export const LOS_BLOCKER_RULE_REFERENCES = [
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
  'MegaMek LosEffects.java:1322-1483 elevation/building blockers and cover',
] as const;

export const LEGACY_ATTACK_RANGE_RULE_REFERENCES = [
  'MekStation caller-provided compatibility range; not a rules-backed attack option',
] as const;
