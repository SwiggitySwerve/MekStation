import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import { PILOT_SKILL_SOURCE_REFS } from './CombatPilotSkillSourceRefs';

function integrated(
  id: string,
  evidence: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence, sourceRefs };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap, sourceRefs };
}

export const PILOT_SKILL_COMBAT_SUPPORT = {
  'ranged-gunnery-to-hit': integrated(
    'ranged-gunnery-to-hit',
    'runAttackPhase passes attacker.gunnery into calculateToHit and to-hit aggregation uses it as the base modifier',
    PILOT_SKILL_SOURCE_REFS['ranged-gunnery-to-hit'],
  ),
  'indirect-fire-spotter-gunnery': integrated(
    'indirect-fire-spotter-gunnery',
    'computeIndirectFireContext derives spotter-assisted indirect-fire penalties with the spotter gunnery baseline',
    PILOT_SKILL_SOURCE_REFS['indirect-fire-spotter-gunnery'],
  ),
  'physical-piloting-to-hit': integrated(
    'physical-piloting-to-hit',
    'runPhysicalAttackPhase passes unit.piloting into resolvePhysicalAttack and all physical to-hit helpers use pilotingSkill as their base TN',
    PILOT_SKILL_SOURCE_REFS['physical-piloting-to-hit'],
  ),
  'psr-piloting-resolution': integrated(
    'psr-piloting-resolution',
    'runPSRPhase and gameSessionPSR resolve pending PSRs through resolveAllPSRs with each unit piloting skill',
    PILOT_SKILL_SOURCE_REFS['psr-piloting-resolution'],
  ),
  'psr-base-skill-event-stamping': integrated(
    'psr-base-skill-event-stamping',
    'weapon attack and heat PSR event helpers stamp targetPilotingSkill/basePilotingSkill for replay and audit visibility',
    PILOT_SKILL_SOURCE_REFS['psr-base-skill-event-stamping'],
  ),
  'stand-up-piloting': integrated(
    'stand-up-piloting',
    'runner movement phase and gameSessionPSR resolve stand-up attempts with unit.piloting plus gyro, wound, and PSR modifiers',
    PILOT_SKILL_SOURCE_REFS['stand-up-piloting'],
  ),
  'initiative-skill-modifiers': helperOnly(
    'initiative-skill-modifiers',
    'rollInitiative applies source-backed Command Mech/Battle Computer force initiative bonuses, explicit HQ/command equipment initiative bonuses, and Tactical Genius reroll requests from active conscious units',
    'Automatic command-console/HQ initiative equipment hydration is not wired; name-only command-console or communications-equipment metadata intentionally fails closed without explicit initiative fields',
    PILOT_SKILL_SOURCE_REFS['initiative-skill-modifiers'],
  ),
  'pilot-wound-ranged-penalty': integrated(
    'pilot-wound-ranged-penalty',
    'runAttackPhase and declareAttack pass attacker pilotWounds into calculateToHit; calculatePilotWoundModifier applies the ranged attack penalty',
    PILOT_SKILL_SOURCE_REFS['pilot-wound-ranged-penalty'],
  ),
  'pending-psr-wound-penalty': integrated(
    'pending-psr-wound-penalty',
    'runPSRPhase and gameSessionPSR thread unit.pilotWounds into resolveAllPSRs, whose calculatePSRModifiers adds pilot wound penalties',
    PILOT_SKILL_SOURCE_REFS['pending-psr-wound-penalty'],
  ),
  'stand-up-wound-psr-penalty': integrated(
    'stand-up-wound-psr-penalty',
    'runner movement phase and gameSessionPSR include unit.pilotWounds in the stand-up target number',
    PILOT_SKILL_SOURCE_REFS['stand-up-wound-psr-penalty'],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
