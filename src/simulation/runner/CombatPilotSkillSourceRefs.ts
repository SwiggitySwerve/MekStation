import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import {
  MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';
import { STANDING_UP_PSR_SOURCE_REFS } from './CombatPsrTriggerSourceRefs';
import {
  MEGAMEK_GUNNERY_TO_HIT_SOURCE_REFS,
  MEGAMEK_INDIRECT_FIRE_TO_HIT_SOURCE_REFS,
  MEGAMEK_PILOT_WOUNDS_TO_HIT_SOURCE_REFS,
} from './CombatToHitSourceRefs';

const MEGAMEK_PILOT_SKILL_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_SKILL_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_PILOT_SKILL_SOURCE_VERSION,
  };
}

function mekstationRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: pathWithLines,
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  };
}

const MEGAMEK_BASE_PILOTING_ROLL_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.getBasePilotingRoll creates the base piloting roll from crew piloting skill and then applies entity and condition modifiers.',
    'megamek/src/megamek/common/units/Entity.java#L7581-L7677',
  ),
  megamekRef(
    'MegaMek PilotingRollData can add the supplied crew piloting value as the target-number modifier for automatic-fall save handling.',
    'megamek/src/megamek/common/rolls/PilotingRollData.java#L63-L66',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_PSR_ROLL_RESOLUTION_SOURCE_REFS = [
  ...MEGAMEK_BASE_PILOTING_ROLL_SOURCE_REFS,
  megamekRef(
    'MegaMek resolvePilotingRolls consumes pending piloting rolls, rolls against the cumulative target, applies fall handling on failure, and clears the pending queue.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16289-L16636',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_PHYSICAL_PILOTING_TO_HIT_SOURCE_REFS = [
  megamekRef(
    'MegaMek PunchAttackAction starts punch to-hit from the attacker crew piloting skill.',
    'megamek/src/megamek/common/actions/PunchAttackAction.java#L248-L269',
  ),
  megamekRef(
    'MegaMek KickAttackAction starts kick to-hit from the attacker crew piloting skill.',
    'megamek/src/megamek/common/actions/KickAttackAction.java#L282-L318',
  ),
  megamekRef(
    'MegaMek PushAttackAction starts push to-hit from the attacker crew piloting skill.',
    'megamek/src/megamek/common/actions/PushAttackAction.java#L289-L314',
  ),
  megamekRef(
    'MegaMek ChargeAttackAction starts charge to-hit from attacker piloting and applies attacker-minus-target piloting differential.',
    'megamek/src/megamek/common/actions/ChargeAttackAction.java#L277-L305',
  ),
  megamekRef(
    'MegaMek DfaAttackAction starts death-from-above to-hit from attacker piloting and applies attacker-minus-target piloting differential.',
    'megamek/src/megamek/common/actions/DfaAttackAction.java#L333-L360',
  ),
  megamekRef(
    'MegaMek ClubAttackAction starts physical weapon to-hit from the attacker crew piloting skill.',
    'megamek/src/megamek/common/actions/ClubAttackAction.java#L512-L538',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_RANGED_GUNNERY_SOURCE_REFS = [
  mekstationRef(
    'MekStation runAttackPhase hydrates attacker gunnery into the ranged to-hit attacker state before calling calculateToHit or calculateToHitWithC3.',
    'src/simulation/runner/phases/weaponAttack.ts#L818-L939',
  ),
  mekstationRef(
    'MekStation calculateToHit appends the attacker gunnery value as the base ranged attack modifier.',
    'src/utils/gameplay/toHit/calculate.ts#L72-L84',
  ),
  mekstationRef(
    'MekStation declareAttack passes the interactive attacker gunnery value into the same ranged to-hit state builder.',
    'src/utils/gameplay/gameSessionCore.ts#L504-L528',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_INDIRECT_SPOTTER_GUNNERY_SOURCE_REFS = [
  mekstationRef(
    'MekStation validateLineOfSightForAttack routes no-LOS attacks through computeIndirectFireContext before accepting an indirect-fire declaration.',
    'src/simulation/runner/phases/weaponAttackLineOfSight.ts#L53-L71',
  ),
  mekstationRef(
    'MekStation computeIndirectFireContext derives the spotter gunnery modifier from effective spotter gunnery with Java-style truncation.',
    'src/utils/gameplay/indirectFire.ts#L381-L385',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_PHYSICAL_PILOTING_SOURCE_REFS = [
  mekstationRef(
    'MekStation runPhysicalAttackPhase passes unit.piloting into physical attack declarations and resolution inputs.',
    'src/simulation/runner/phases/physicalAttack.ts#L256-L420',
  ),
  mekstationRef(
    'MekStation physical to-hit helpers use input.pilotingSkill as the base target number across punch, kick, charge, DFA, push, and melee weapon attacks.',
    'src/utils/gameplay/physicalAttacks/toHit.ts#L53-L533',
  ),
  mekstationRef(
    'MekStation interactive physical attack declarations thread context.pilotingSkill through calculatePhysicalToHit and resolvePhysicalAttack.',
    'src/utils/gameplay/gameSessionPhysical.ts#L431-L770',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_PSR_PILOTING_SOURCE_REFS = [
  mekstationRef(
    'MekStation runPSRPhase resolves each unit pending PSRs with the unit piloting skill before emitting PSRResolved and fall aftermath events.',
    'src/simulation/runner/phases/postCombat.ts#L52-L110',
  ),
  mekstationRef(
    'MekStation resolvePSR and resolveAllPSRs compute PSR target numbers from pilotingSkill plus accumulated modifiers.',
    'src/utils/gameplay/pilotingSkillRolls/resolution.ts#L46-L158',
  ),
  mekstationRef(
    'MekStation resolvePendingPSRs mirrors interactive PSR resolution through resolveAllPSRs with the unit piloting skill.',
    'src/utils/gameplay/gameSessionPSR.ts#L181-L185',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_PSR_EVENT_STAMPING_SOURCE_REFS = [
  mekstationRef(
    'MekStation weaponAttackPsrTriggers stamps target base piloting skill onto crit-origin PSRTriggered events for replay and audit visibility.',
    'src/simulation/runner/phases/weaponAttackPsrTriggers.ts#L56-L57',
  ),
  mekstationRef(
    'MekStation heatCriticalDamage stamps basePilotingSkill when translating heat-critical PSR trigger events.',
    'src/simulation/runner/phases/heatCriticalDamage.ts#L159-L160',
  ),
  mekstationRef(
    'MekStation movementEnhancementFailureEvents stamps basePilotingSkill for MASC/Supercharger failure PSR trigger events.',
    'src/simulation/runner/phases/movementEnhancementFailureEvents.ts#L126-L127',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_STAND_UP_PILOTING_SOURCE_REFS = [
  mekstationRef(
    'MekStation resolveRunnerStandUpAttempt resolves prone stand-up attempts with unit piloting, component damage, pilot wounds, quirks, and abilities.',
    'src/simulation/runner/phases/movementStandUp.ts#L19-L99',
  ),
  mekstationRef(
    'MekStation attemptStandUp computes the interactive stand-up target number from piloting plus gyro, wound, trigger, quirk, and SPA modifiers.',
    'src/utils/gameplay/gameSessionPSR.ts#L322-L353',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_INITIATIVE_SKILL_SOURCE_REFS = [
  mekstationRef(
    'MekStation rollInitiative consumes initiative modifiers and optional Tactical Genius reroll requests from active units before emitting InitiativeRolled.',
    'src/utils/gameplay/gameSessionCore.ts#L295-L369',
  ),
  mekstationRef(
    'MekStation initiativeModifiers filters active conscious units, applies quirk/HQ/command bonuses, and detects Tactical Genius reroll eligibility.',
    'src/utils/gameplay/initiativeModifiers.ts#L5-L50',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_RANGED_WOUND_SOURCE_REFS = [
  mekstationRef(
    'MekStation to-hit state hydration copies unit pilotWounds into the ranged attacker to-hit state.',
    'src/utils/gameplay/toHit/stateHydration.ts#L38-L55',
  ),
  mekstationRef(
    'MekStation calculateToHit applies pilotWounds through calculatePilotWoundModifier after Pain Resistance effective-wound adjustment.',
    'src/utils/gameplay/toHit/calculate.ts#L148-L154',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_PSR_WOUND_SOURCE_REFS = [
  mekstationRef(
    'MekStation runPSRPhase threads current unit pilotWounds into runner PSR resolution.',
    'src/simulation/runner/phases/psrEdgeRerolls.ts#L88-L111',
  ),
  mekstationRef(
    'MekStation calculatePSRModifiers adds one PSR target-number modifier per pilot wound.',
    'src/utils/gameplay/pilotingSkillRolls/resolution.ts#L168-L207',
  ),
  mekstationRef(
    'MekStation resolvePendingPSRs threads interactive unit pilotWounds into resolveAllPSRs.',
    'src/utils/gameplay/gameSessionPSR.ts#L181-L185',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_STAND_UP_WOUND_SOURCE_REFS = [
  mekstationRef(
    'MekStation runner stand-up resolution passes unit pilotWounds into resolvePSR before deciding whether the unit stands.',
    'src/simulation/runner/phases/movementStandUp.ts#L48-L57',
  ),
  mekstationRef(
    'MekStation interactive stand-up resolution adds unitState.pilotWounds directly to the stand-up target number.',
    'src/utils/gameplay/gameSessionPSR.ts#L345-L353',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const PILOT_SKILL_SOURCE_REFS = {
  'ranged-gunnery-to-hit': [
    ...MEGAMEK_GUNNERY_TO_HIT_SOURCE_REFS,
    ...MEKSTATION_RANGED_GUNNERY_SOURCE_REFS,
  ],
  'indirect-fire-spotter-gunnery': [
    ...MEGAMEK_INDIRECT_FIRE_TO_HIT_SOURCE_REFS,
    ...MEKSTATION_INDIRECT_SPOTTER_GUNNERY_SOURCE_REFS,
  ],
  'physical-piloting-to-hit': [
    ...MEGAMEK_PHYSICAL_PILOTING_TO_HIT_SOURCE_REFS,
    ...MEKSTATION_PHYSICAL_PILOTING_SOURCE_REFS,
  ],
  'psr-piloting-resolution': [
    ...MEGAMEK_PSR_ROLL_RESOLUTION_SOURCE_REFS,
    ...MEKSTATION_PSR_PILOTING_SOURCE_REFS,
  ],
  'psr-base-skill-event-stamping': MEKSTATION_PSR_EVENT_STAMPING_SOURCE_REFS,
  'stand-up-piloting': [
    ...STANDING_UP_PSR_SOURCE_REFS,
    ...MEKSTATION_STAND_UP_PILOTING_SOURCE_REFS,
  ],
  'initiative-skill-modifiers': [
    ...MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
    ...MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
    ...MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
    ...MEKSTATION_INITIATIVE_SKILL_SOURCE_REFS,
  ],
  'pilot-wound-ranged-penalty': [
    ...MEGAMEK_PILOT_WOUNDS_TO_HIT_SOURCE_REFS,
    ...MEKSTATION_RANGED_WOUND_SOURCE_REFS,
  ],
  'pending-psr-wound-penalty': MEKSTATION_PSR_WOUND_SOURCE_REFS,
  'stand-up-wound-psr-penalty': [
    ...STANDING_UP_PSR_SOURCE_REFS,
    ...MEKSTATION_STAND_UP_WOUND_SOURCE_REFS,
  ],
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;
