import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

export const PILOT_SKILL_COMBAT_SUPPORT = {
  'ranged-gunnery-to-hit': integrated(
    'ranged-gunnery-to-hit',
    'runAttackPhase passes attacker.gunnery into calculateToHit and to-hit aggregation uses it as the base modifier',
  ),
  'indirect-fire-spotter-gunnery': integrated(
    'indirect-fire-spotter-gunnery',
    'computeIndirectFireContext derives spotter-assisted indirect-fire penalties with the spotter gunnery baseline',
  ),
  'physical-piloting-to-hit': integrated(
    'physical-piloting-to-hit',
    'runPhysicalAttackPhase passes unit.piloting into resolvePhysicalAttack and all physical to-hit helpers use pilotingSkill as their base TN',
  ),
  'psr-piloting-resolution': integrated(
    'psr-piloting-resolution',
    'runPSRPhase and gameSessionPSR resolve pending PSRs through resolveAllPSRs with each unit piloting skill',
  ),
  'psr-base-skill-event-stamping': integrated(
    'psr-base-skill-event-stamping',
    'weapon attack and heat PSR event helpers stamp targetPilotingSkill/basePilotingSkill for replay and audit visibility',
  ),
  'stand-up-piloting': integrated(
    'stand-up-piloting',
    'runner movement phase and gameSessionPSR resolve stand-up attempts with unit.piloting plus gyro, wound, and PSR modifiers',
  ),
  'initiative-skill-modifiers': helperOnly(
    'initiative-skill-modifiers',
    'rollInitiative applies source-backed Command Mech and Battle Computer force initiative bonuses from active conscious units',
    'Tactical Genius reroll requests, Combat Intuition first-round sequencing, and command-console/HQ initiative equipment bonuses are not wired',
  ),
  'pilot-wound-ranged-penalty': integrated(
    'pilot-wound-ranged-penalty',
    'runAttackPhase and declareAttack pass attacker pilotWounds into calculateToHit; calculatePilotWoundModifier applies the ranged attack penalty',
  ),
  'pending-psr-wound-penalty': integrated(
    'pending-psr-wound-penalty',
    'runPSRPhase and gameSessionPSR thread unit.pilotWounds into resolveAllPSRs, whose calculatePSRModifiers adds pilot wound penalties',
  ),
  'stand-up-wound-psr-penalty': integrated(
    'stand-up-wound-psr-penalty',
    'runner movement phase and gameSessionPSR include unit.pilotWounds in the stand-up target number',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
