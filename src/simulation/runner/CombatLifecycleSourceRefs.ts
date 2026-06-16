import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import {
  MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS,
  MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS,
  MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS,
} from './CombatAttackInvalidationSourceRefs';

const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

function mekstationDeviationRef(
  citation: string,
  path: string,
  lineAnchor: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineAnchor}`,
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  };
}

const LOCAL_ACTION_ACTOR_REMOVAL_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation getActiveUnits, getUnitsAwaitingAction, and allUnitsLocked exclude destroyed, shutdown, retreated, ejected, and unconscious actors from turn rotation.',
    'src/utils/gameplay/gameState/gameStateReducer.ts',
    'L292-L330',
  ),
  mekstationDeviationRef(
    'MekStation getAvailableActionsForState returns no movement or attack actions for destroyed, shutdown, retreated, ejected, or unconscious actors.',
    'src/engine/InteractiveSession.queries.ts',
    'L6-L20',
  ),
  mekstationDeviationRef(
    'MekStation runner movement phase skips destroyed, retreated, ejected, shutdown, and unconscious actors before movement planning.',
    'src/simulation/runner/phases/movement.ts',
    'L78-L88',
  ),
  mekstationDeviationRef(
    'MekStation runner weapon phase skips destroyed, retreated, ejected, shutdown, and unconscious attackers before target selection.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L581-L590',
  ),
  mekstationDeviationRef(
    'MekStation runner physical phase skips destroyed, retreated, ejected, shutdown, unconscious, and prone attackers before melee target selection.',
    'src/simulation/runner/phases/physicalAttack.ts',
    'L212-L223',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const LOCAL_ACTION_TARGETABILITY_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation interactive target filtering rejects destroyed, retreated, and ejected enemies while leaving shutdown enemies targetable.',
    'src/engine/InteractiveSession.queries.ts',
    'L26-L40',
  ),
  mekstationDeviationRef(
    'MekStation runner ranged target validation rejects destroyed, retreated, and ejected targets before declaring a ranged attack.',
    'src/simulation/runner/phases/weaponAttackTargetValidation.ts',
    'L11-L24',
  ),
  mekstationDeviationRef(
    'MekStation session ranged target validation rejects destroyed, retreated, and ejected targets without making shutdown a target-invalid state.',
    'src/utils/gameplay/gameSessionAttackResolutionValidation.ts',
    'L36-L49',
  ),
  mekstationDeviationRef(
    'MekStation physical eligibility returns no melee options when the target is destroyed, retreated, or ejected.',
    'src/utils/gameplay/physicalAttacks/eligibility.ts',
    'L221-L233',
  ),
  mekstationDeviationRef(
    'MekStation event-sourced physical resolution rejects stale retreated or ejected targets before physical damage resolution.',
    'src/utils/gameplay/gameSessionPhysical.ts',
    'L643-L662',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const LOCAL_RETREATED_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation applyUnitRetreated latches hasRetreated without marking the unit destroyed.',
    'src/utils/gameplay/gameState/extendedCombat.ts',
    'L385-L413',
  ),
  mekstationDeviationRef(
    'MekStation GameEngine movement phase emits UnitRetreated once a withdrawing unit reaches its retreat edge.',
    'src/engine/GameEngine.phases.ts',
    'L236-L274',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const LOCAL_EJECTION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation InteractiveSession.ejectUnit emits UnitEjected only for active, non-destroyed, non-retreated, non-ejected units.',
    'src/engine/InteractiveSession.ts',
    'L453-L471',
  ),
  mekstationDeviationRef(
    'MekStation applyUnitEjected latches hasEjected, resolves the action, and preserves the existing armor, structure, destroyed, and pilotConscious state.',
    'src/utils/gameplay/gameState/extendedCombat.ts',
    'L416-L445',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const LOCAL_SURVIVOR_COUNT_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation victory predicates exclude destroyed, retreated, and ejected units from surviving force counts and turn-limit winner selection.',
    'src/utils/gameplay/gameState/gameStateReducer.ts',
    'L345-L421',
  ),
  mekstationDeviationRef(
    'MekStation objective control and destroy-objective predicates count only units that are alive and not retreated or ejected.',
    'src/utils/gameplay/objectives/objectiveEngine.ts',
    'L40-L47',
  ),
  mekstationDeviationRef(
    'MekStation objective destroy evaluation uses countParticipating, which excludes destroyed, retreated, and ejected units.',
    'src/utils/gameplay/objectives/objectiveEngine.ts',
    'L186-L212',
  ),
  mekstationDeviationRef(
    'MekStation runner isUnitOperable and isGameOver exclude destroyed, retreated, ejected, and unconscious units from terminal survivor checks.',
    'src/simulation/runner/SimulationRunnerState.ts',
    'L579-L631',
  ),
  mekstationDeviationRef(
    'MekStation terminal GameEnded event survivor checks exclude destroyed, retreated, ejected, and unconscious units.',
    'src/simulation/runner/SimulationRunnerTerminalEvent.ts',
    'L21-L30',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const ACTION_REMOVAL_SOURCE_REFS = [
  ...LOCAL_ACTION_ACTOR_REMOVAL_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const RETREATED_ACTION_SOURCE_REFS = [
  ...LOCAL_RETREATED_SOURCE_REFS,
  ...LOCAL_ACTION_ACTOR_REMOVAL_SOURCE_REFS,
  ...LOCAL_ACTION_TARGETABILITY_SOURCE_REFS,
  ...MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const EJECTED_ACTION_SOURCE_REFS = [
  ...LOCAL_EJECTION_SOURCE_REFS,
  ...LOCAL_ACTION_ACTOR_REMOVAL_SOURCE_REFS,
  ...LOCAL_ACTION_TARGETABILITY_SOURCE_REFS,
  ...MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const SHUTDOWN_TARGETABILITY_SOURCE_REFS = [
  ...LOCAL_ACTION_TARGETABILITY_SOURCE_REFS,
  ...MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const RETREATED_TARGETABILITY_SOURCE_REFS = [
  ...LOCAL_ACTION_TARGETABILITY_SOURCE_REFS,
  ...MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const EJECTED_TARGETABILITY_SOURCE_REFS = [
  ...LOCAL_EJECTION_SOURCE_REFS,
  ...LOCAL_ACTION_TARGETABILITY_SOURCE_REFS,
  ...MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
