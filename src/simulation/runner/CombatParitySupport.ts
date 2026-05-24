import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

export const RUNNER_INTERACTIVE_PARITY_SUPPORT = {
  'movement-action-eligibility': integrated(
    'movement-action-eligibility',
    'runner movement, interactive action queries, and turn-rotation predicates remove destroyed/retreated/ejected/shutdown/unconscious actors',
  ),
  'movement-validation': integrated(
    'movement-validation',
    'quick-sim runMovementPhase, GameEngine, and InteractiveSession movement paths all reject movement through validateMovement',
  ),
  'movement-heat-and-event-path': integrated(
    'movement-heat-and-event-path',
    'quick-sim runMovementPhase emits validated MP/heat and builds MovementDeclared path/decomposition through shared event-path helpers',
  ),
  'weapon-target-validation': integrated(
    'weapon-target-validation',
    'quick-sim validateDeclaredAttackTarget and session declareAttack reject invalid targets before AttackDeclared or damage side effects',
  ),
  'weapon-range-and-to-hit': integrated(
    'weapon-range-and-to-hit',
    'quick-sim runAttackPhase and session attack resolution both consume calculateToHit range/modifier helpers',
  ),
  'weapon-indirect-fire': integrated(
    'weapon-indirect-fire',
    'quick-sim runAttackPhase and InteractiveSession attack declaration both use computeIndirectFireContext',
  ),
  'weapon-damage-critical-events': integrated(
    'weapon-damage-critical-events',
    'quick-sim runner and session attack resolution both route through resolveDamage and critical-hit event helpers',
  ),
  'physical-attack-resolution': integrated(
    'physical-attack-resolution',
    'quick-sim runPhysicalAttackPhase and session physical resolution consume shared resolvePhysicalAttack helpers with movement-derived physical to-hit modifiers and active TSM damage context',
  ),
  'physical-displacement-grid-occupancy': integrated(
    'physical-displacement-grid-occupancy',
    'quick-sim runPhysicalAttackPhase mirrors emitted physical displacements back into its local grid occupancy view before later same-phase displacement checks',
  ),
  'heat-core-resolution': integrated(
    'heat-core-resolution',
    'quick-sim runHeatPhase and session resolveHeatPhase both process weapon heat, heat sink count/type dissipation, startup attempts, shutdown checks, and ammo explosion risk',
  ),
  'heat-dissipation-event-payload': integrated(
    'heat-dissipation-event-payload',
    'quick-sim runHeatPhase and session resolveHeatPhase both emit negative HeatDissipated.amount values with dissipation breakdowns',
  ),
  'heat-environment-and-water': integrated(
    'heat-environment-and-water',
    'quick-sim runHeatPhase and session resolveHeatPhase both consume water/fire heat effects plus shared atmosphere/temperature environmental dissipation modifiers',
  ),
  'heat-pilot-damage': integrated(
    'heat-pilot-damage',
    'quick-sim runHeatPhase and session resolveHeatPhase both emit heat-sourced PilotHit events and persist pilot wounds for default life-support heat damage plus opt-in MaxTech heat-scale pilot damage',
  ),
  'psr-resolution': integrated(
    'psr-resolution',
    'quick-sim runPSRPhase and session End phase both resolve pending PSRs through resolveAllPSRs',
  ),
  'psr-piloting-skill': integrated(
    'psr-piloting-skill',
    'quick-sim runPSRPhase and session End phase both pass per-unit piloting into resolveAllPSRs',
  ),
  'objective-outcome': integrated(
    'objective-outcome',
    'SimulationRunnerState and GameOutcomeCalculator both evaluate wins through evaluateObjectiveOutcome',
  ),
  'terminal-game-ended-event': integrated(
    'terminal-game-ended-event',
    'InteractiveSession finalization appends GameEnded through endGame and SimulationRunner.run appends GameEnded with winner, reason, and turn count',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
