import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

const MEGAMEK_COMBAT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekSourceRef(
  citation: string,
  path: string,
  lineAnchor: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/${path}#${lineAnchor}`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  };
}

export const MEGAMEK_MISSING_TARGET_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible returns NoTarget before ranged to-hit resolution when the target is null.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L136-L142',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek Game.getValidTargets only returns visible enemy entities that are targetable, deployed, on-board, non-hidden, and not the attacker.',
    'megamek/src/megamek/common/game/Game.java',
    'L701-L715',
  ),
  megamekSourceRef(
    'MegaMek Entity.isTargetable excludes destroyed, doomed, off-board, transported, captured, undeployed, and positionless entities from attack targetability.',
    'megamek/src/megamek/common/units/Entity.java',
    'L1963-L1975',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_DESTROYED_TARGETABILITY_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek Entity.isTargetable requires the target entity to be non-destroyed before it can be selected as an attack target.',
    'megamek/src/megamek/common/units/Entity.java',
    'L1963-L1975',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_FRIENDLY_TARGET_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible rejects friendly direct attack targets when friendly-fire is disabled, except explicit coolant/special-case paths.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L365-L374',
  ),
  megamekSourceRef(
    'MegaMek Entity.isEnemyOf treats an entity as never being an enemy of itself and delegates side hostility through owner/team relationships.',
    'megamek/src/megamek/common/units/Entity.java',
    'L1734-L1746',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek TWGameManager marks a fleeing entity with its retreat direction and removes it from the active game with REMOVE_IN_RETREAT.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L5768-L5770',
  ),
  megamekSourceRef(
    'MegaMek Game.removeEntity removes the entity from active in-game objects, position lookup, and deployment processing before emitting a removal event.',
    'megamek/src/megamek/common/game/Game.java',
    'L1382-L1405',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek TWGameManager.ejectEntity short-circuits repeat ejection, marks the crew ejected, destroys the original entity, and removes manual ejections with REMOVE_EJECTED.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L27130-L27367',
  ),
  megamekSourceRef(
    'MegaMek Game.removeEntity removes the ejected original unit from active in-game objects and position lookup.',
    'megamek/src/megamek/common/game/Game.java',
    'L1382-L1405',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
