import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

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
