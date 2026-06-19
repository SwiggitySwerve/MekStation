import {
  megamekSourceRefWithLineAnchor as megaMekSourceRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import { remappedMekStationDeviationSourceRef as mekstationDeviationSourceRef } from './CombatRemappedSourceReference';

export const MEGAMEK_REQUEST_SPOT_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek SpotAction carries the spotting entity id and target id as the authoritative spotting declaration.',
    'megamek/src/megamek/common/actions/SpotAction.java',
    'L44-L79',
  ),
  megaMekSourceRef(
    'MegaMek TWGameManager applies SpotAction by setting the unit spotting flag and selected spot target id.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L9632-L9633',
  ),
  megaMekSourceRef(
    'MegaMek applies +1 to-hit when an attacker is spotting and lacks an active command console.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java',
    'L173-L176',
  ),
  megaMekSourceRef(
    'MegaMek physical attacks also apply the attacker-is-spotting +1 penalty.',
    'megamek/src/megamek/common/actions/PhysicalAttackAction.java',
    'L230-L232',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_SPOTTING_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create SpottingDeclared with the spotting unit, target, and turn payload.',
    'src/utils/gameplay/gameEvents/status.ts',
    'L39-L60',
  ),
  mekstationDeviationSourceRef(
    'MekStation requestSpot appends SpottingDeclared after phase, actor, target, and terminal-state validation.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L642-L742',
  ),
  mekstationDeviationSourceRef(
    'MekStation reducer applies SpottingDeclared by latching isSpotting, spotTargetId, and a locked action state.',
    'src/utils/gameplay/gameState/statusReplay.ts',
    'L156-L166',
  ),
  MEGAMEK_REQUEST_SPOT_SOURCE_REFS[1],
] satisfies readonly ICombatFeatureSourceReference[];
