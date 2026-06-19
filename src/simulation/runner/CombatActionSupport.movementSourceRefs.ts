import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import { mekstationDeviationSourceRef } from './CombatActionSupport.entries';
import { MEGAMEK_TORSO_TWIST_SOURCE_REFS } from './CombatMovementSourceRefs';

const MEGAMEK_SOURCE_VERSION = '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekSourceRef(
  citation: string,
  url: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    ...{ url, sourceVersion: MEGAMEK_SOURCE_VERSION },
  };
}

export const MEGAMEK_GO_PRONE_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek MoveStepType defines GO_PRONE as the Prone movement step.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/enums/MoveStepType.java#L46',
  ),
  megamekSourceRef(
    'MegaMek GoProneStep.preCompilation assigns 1 MP when the entity is not hull-down.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/GoProneStep.java#L50-L63',
  ),
  megamekSourceRef(
    'MegaMek MoveStep marks GO_PRONE illegal for already-prone units, non-Meks, or stuck entities.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L2379-L2381',
  ),
  megamekSourceRef(
    'MegaMek MovePathHandler resolves GO_PRONE by using step MP and setting entity prone.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L3572-L3592',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek MovePath derives active MASC/Supercharger use from movement steps marked as using those boosters.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MovePath.java#L859-L879',
  ),
  megamekSourceRef(
    'MegaMek MoveStep tags either or both boosters on qualifying boosted movement steps and stores their target numbers.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L2581-L2610',
  ),
  megamekSourceRef(
    'MegaMek MovePathHandler checks active MASC/Supercharger on the first movement step and invokes the failure checks.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L1507-L1519',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TAC_OPS_SPRINT_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek MoveStep.canUseSprint gates sprinting on the TacOps sprint option and BattleMech unit scope.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L3908-L3922',
  ),
  megamekSourceRef(
    'MegaMek Mek.getSprintMP calculates BattleMech sprint MP as 2x walk MP, or boosted through armed MASC/Supercharger sprint formulas.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L1041-L1055',
  ),
  megamekSourceRef(
    'MegaMek MPBoosters.calculateSprintMP uses ceil(walk MP * 2.5) for one active booster and 3x walk MP for MASC plus Supercharger.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/enums/MPBoosters.java#L89-L97',
  ),
  megamekSourceRef(
    'MegaMek Mek.getSprintHeat delegates sprint heat to the engine sprint heat calculation plus damaged-coolant-system heat.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L1075-L1078',
  ),
  megamekSourceRef(
    'MegaMek Engine.getSprintHeat returns 3 heat for standard BattleMech engines without working supercooling myomer.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/Engine.java#L705-L713',
  ),
  megamekSourceRef(
    'MegaMek ranged to-hit calculation makes attacks by sprinting attackers automatic failures.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2678-L2680',
  ),
  megamekSourceRef(
    'MegaMek ranged to-hit calculation applies a -1 modifier when the target sprinted.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2847-L2850',
  ),
  megamekSourceRef(
    'MegaMek Entity.canSpot rejects sprinting entities before they can spot LRM indirect fire.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L9812-L9818',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_FACING_ROTATE_LEFT_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildFacingCommands exposes facing.rotate-left as a Movement-phase facing command that commits the local facing-left action id.',
    'src/components/gameplay/TacticalActionDock/commands/facingCommands.ts',
    'L28-L38',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_FACING_ROTATE_RIGHT_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildFacingCommands exposes facing.rotate-right as a Movement-phase facing command that commits the local facing-right action id.',
    'src/components/gameplay/TacticalActionDock/commands/facingCommands.ts',
    'L40-L50',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_FACING_TORSO_TWIST_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildFacingCommands exposes facing.torso-twist as a WeaponAttack-phase torso twist command that commits the local torso-twist action id with a direction payload.',
    'src/components/gameplay/TacticalActionDock/commands/facingCommands.ts',
    'L52-L66',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const FACING_TORSO_TWIST_ACTION_SOURCE_REFS = [
  ...MEGAMEK_TORSO_TWIST_SOURCE_REFS,
  ...MEKSTATION_FACING_TORSO_TWIST_COMMAND_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

function mekstationMovementCommandSourceRefs(
  id: string,
  commitDescription: string,
  sourceFile: string,
  lineRange: string,
) {
  return [
    mekstationDeviationSourceRef(
      `MekStation buildMovementCommands exposes ${id} as a Movement-phase command that commits ${commitDescription}.`,
      `src/components/gameplay/TacticalActionDock/commands/${sourceFile}`,
      lineRange,
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];
}

export const MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS = {
  'movement.walk': mekstationMovementCommandSourceRefs(
    'movement.walk',
    'the local lock action id with a walk movement mode payload',
    'movementTraversalCommands.ts',
    'L31-L122',
  ),
  'movement.run': mekstationMovementCommandSourceRefs(
    'movement.run',
    'the local lock action id with a run movement mode payload',
    'movementTraversalCommands.ts',
    'L31-L122',
  ),
  'movement.sprint': mekstationMovementCommandSourceRefs(
    'movement.sprint',
    'the local lock action id with a sprint movement mode payload',
    'movementTraversalCommands.ts',
    'L31-L122',
  ),
  'movement.evade': mekstationMovementCommandSourceRefs(
    'movement.evade',
    'the local lock action id with an evade movement mode payload',
    'movementTraversalCommands.ts',
    'L31-L122',
  ),
  'movement.jump': mekstationMovementCommandSourceRefs(
    'movement.jump',
    'the local lock action id with a jump movement mode payload',
    'movementTraversalCommands.ts',
    'L31-L122',
  ),
  'movement.stand': mekstationMovementCommandSourceRefs(
    'movement.stand',
    'the local stand action id',
    'movementPostureCommands.ts',
    'L18-L77',
  ),
  'movement.carefulStand': mekstationMovementCommandSourceRefs(
    'movement.carefulStand',
    'the local careful stand action id',
    'movementPostureCommands.ts',
    'L79-L116',
  ),
  'movement.hullDown': mekstationMovementCommandSourceRefs(
    'movement.hullDown',
    'the local hull-down action id',
    'movementPostureCommands.ts',
    'L118-L175',
  ),
  'movement.goProne': mekstationMovementCommandSourceRefs(
    'movement.goProne',
    'the local go-prone action id',
    'movementPostureCommands.ts',
    'L177-L206',
  ),
  'movement.activate-masc': mekstationMovementCommandSourceRefs(
    'movement.activate-masc',
    'the local activate-masc action id',
    'movementCommands.ts',
    'L54-L74',
  ),
  'movement.activate-supercharger': mekstationMovementCommandSourceRefs(
    'movement.activate-supercharger',
    'the local activate-supercharger action id',
    'movementCommands.ts',
    'L76-L90',
  ),
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;

export const MOVEMENT_GO_PRONE_ACTION_SOURCE_REFS = [
  ...MEGAMEK_GO_PRONE_SOURCE_REFS,
  ...MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.goProne'],
] satisfies readonly ICombatFeatureSourceReference[];

export const MOVEMENT_ACTIVATE_MASC_ACTION_SOURCE_REFS = [
  ...MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
  ...MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.activate-masc'],
] satisfies readonly ICombatFeatureSourceReference[];

export const MOVEMENT_ACTIVATE_SUPERCHARGER_ACTION_SOURCE_REFS = [
  ...MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
  ...MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.activate-supercharger'],
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_STABILIZE_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildMovementCommands exposes movement.stabilize as a product-visible tactical command that commits the local stabilize action id.',
    'src/components/gameplay/TacticalActionDock/commands/movementCommands.ts',
    'L92-L106',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_MOVEMENT_CANCEL_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildMovementCommands exposes movement.cancel as a local movement-preview reset command that commits the undo action id.',
    'src/components/gameplay/TacticalActionDock/commands/movementCommands.ts',
    'L108-L128',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
