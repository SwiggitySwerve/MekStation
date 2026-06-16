import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_MOVEMENT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekMovementRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  };
}

export const MEGAMEK_TORSO_TWIST_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek TorsoTwistAction carries the requested secondary facing for a torso-twist action.',
    'megamek/src/megamek/common/actions/TorsoTwistAction.java#L39-L53',
  ),
  megamekMovementRef(
    'MegaMek TWGameManager resolves TorsoTwistAction by setting secondary facing when the entity can change secondary facing.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L10335-L10338',
  ),
  megamekMovementRef(
    'MegaMek Entity.setSecondaryFacing persists secondary facing, enforces already-twisted phase gates, and emits entity-change events.',
    'megamek/src/megamek/common/units/Entity.java#L2935-L2953',
  ),
  megamekMovementRef(
    'MegaMek Mek.canChangeSecondaryFacing rejects no-twist quirks, prone state, bracing, and already-twisted BattleMechs.',
    'megamek/src/megamek/common/units/Mek.java#L1706-L1710',
  ),
  megamekMovementRef(
    'MegaMek Mek.isValidSecondaryFacing allows normal one-hexside torso twist and extended torso twist quirk ranges.',
    'megamek/src/megamek/common/units/Mek.java#L1717-L1728',
  ),
  megamekMovementRef(
    'MegaMek ComputeArc uses secondary facing for secondary-arc weapons and Mek turret-mounted weapons.',
    'megamek/src/megamek/common/compute/ComputeArc.java#L186-L194',
  ),
  megamekMovementRef(
    'MegaMek OptionsConstants defines extended torso twist and no-twist quirk ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L61-L131',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_WALK_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek Entity.getWalkMP returns walking MP after heat, cargo, weather, and gravity adjustments.',
    'megamek/src/megamek/common/units/Entity.java#L3306-L3327',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_RUN_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek Entity.getRunMP derives standard run MP as ceil(adjusted walk MP * 1.5).',
    'megamek/src/megamek/common/units/Entity.java#L3376-L3383',
  ),
  megamekMovementRef(
    'MegaMek Mek.getRunMP delegates to armed MASC/Supercharger boosters when active, otherwise using the standard adjusted run MP.',
    'megamek/src/megamek/common/units/Mek.java#L993-L1007',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_JUMP_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek Mek.getJumpMP counts operable jump jets, applies submerged jump-jet limits, and only applies Partial Wing bonuses when jump MP is positive.',
    'megamek/src/megamek/common/units/Mek.java#L1081-L1123',
  ),
  megamekMovementRef(
    'MegaMek MovePath marks illegal jump steps when a jumping path exceeds legal straight-line jump movement.',
    'megamek/src/megamek/common/moves/MovePath.java#L468-L490',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_STAND_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek Entity.checkGetUp detects GET_UP/CAREFUL_STAND movement steps and returns the corresponding piloting roll target.',
    'megamek/src/megamek/common/units/Entity.java#L7803-L7831',
  ),
  megamekMovementRef(
    'MegaMek MovePathHandler resolves get-up piloting checks while processing movement.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L2023-L2032',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek MovePath allows GO_PRONE while restricting follow-up moves after leaving and returning to an enemy-occupied start hex.',
    'megamek/src/megamek/common/moves/MovePath.java#L663-L704',
  ),
  megamekMovementRef(
    'MegaMek GoProneStep assigns 1 MP when the entity is not hull-down, leaving hull-down go-prone as a zero-MP transition.',
    'megamek/src/megamek/common/moves/GoProneStep.java#L50-L63',
  ),
  megamekMovementRef(
    'MegaMek MoveStep marks GO_PRONE illegal for already-prone units, non-Meks, or stuck entities.',
    'megamek/src/megamek/common/moves/MoveStep.java#L2379-L2381',
  ),
  megamekMovementRef(
    'MegaMek MoveStep updates GO_PRONE posture by setting prone state and clearing hull-down state.',
    'megamek/src/megamek/common/moves/MoveStep.java#L2541-L2543',
  ),
  megamekMovementRef(
    'MegaMek MovePathHandler resolves GO_PRONE by setting the entity prone, with swarmer dislodge and inferno wash-off side paths.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L3572-L3590',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_FACING_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek Entity.setFacing persists primary facing and emits an entity-change event.',
    'megamek/src/megamek/common/units/Entity.java#L2914-L2920',
  ),
  megamekMovementRef(
    'MegaMek MovePathHandler commits the final movement facing after path processing.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L381-L436',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_OCCUPANCY_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek MoveStep calls Compute.stackingViolation and marks a movement step as a stacking violation when destination occupancy is illegal.',
    'megamek/src/megamek/common/moves/MoveStep.java#L776-L787',
  ),
  megamekMovementRef(
    'MegaMek MovePathHandler rechecks stacking violations during movement path resolution before committing occupied destinations.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L1361-L1382',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ELEVATION_MOVEMENT_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek Mek.getMaxElevationChange limits normal BattleMech level changes to two elevation levels.',
    'megamek/src/megamek/common/units/Mek.java#L3416-L3428',
  ),
  megamekMovementRef(
    'MegaMek ShortestPathFinder.getElevationDiff computes destination elevation changes for movement path costing.',
    'megamek/src/megamek/common/pathfinder/ShortestPathFinder.java#L248-L279',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS = [
  megamekMovementRef(
    'MegaMek Entity.getWalkMP subtracts getHeatMPReduction before deriving available movement points.',
    'megamek/src/megamek/common/units/Entity.java#L3310-L3320',
  ),
  megamekMovementRef(
    'MegaMek Entity.getHeatMPReduction implements the standard and optional TacOps heat movement penalties.',
    'megamek/src/megamek/common/units/Entity.java#L3332-L3351',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
