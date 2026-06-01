import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from './CombatIntegrationSupport';

const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

function mekstationDeviationSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineRange}`,
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  };
}

function sourceRefsFrom(
  entry: ICombatFeatureSupportEntry,
): readonly ICombatFeatureSourceReference[] {
  return entry.sourceRefs ?? [];
}

function integrated(
  id: string,
  evidence: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence, sourceRefs };
}

const MOVEMENT_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation GameEngine.runMovementPhase validates bot movement through validateMovement before MovementDeclared emission.',
    'src/engine/GameEngine.phases.ts',
    'L156-L235',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession movement actions use the same validateMovement, event-path, declareMovement, and lockMovement flow.',
    'src/engine/InteractiveSession.actions.ts',
    'L80-L132',
  ),
  mekstationDeviationSourceRef(
    'MekStation movement phase behavior tests prove invalid movement rejection and authoritative movement heat/path emission.',
    'src/simulation/runner/__tests__/movementPhase.behavior.test.ts',
    'L145-L260',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const WEAPON_TARGET_PARITY_SOURCE_REFS = [
  ...sourceRefsFrom(
    COMBAT_INTEGRATION_SCENARIO_SUPPORT['targetability-lifecycle-filter'],
  ),
  mekstationDeviationSourceRef(
    'MekStation runner weapon target validation rejects missing, destroyed, retreated, ejected, and same-side targets before attack side effects.',
    'src/simulation/runner/phases/weaponAttackTargetValidation.ts',
    'L11-L65',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced attack declaration validation emits AttackInvalid for the same invalid target lifecycle states.',
    'src/utils/gameplay/gameSessionAttackResolutionValidation.ts',
    'L36-L85',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const WEAPON_TO_HIT_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner weapon phase routes ranged attacks through calculateToHit or calculateToHitWithC3 with range and modifier context.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L880-L940',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced attack declaration computes AttackDeclared to-hit values through calculateToHit.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L494-L545',
  ),
  mekstationDeviationSourceRef(
    'MekStation calculateToHit accumulates gunnery, range, minimum range, movement, heat, cover, wounds, damage, and other modifier inputs.',
    'src/utils/gameplay/toHit/calculate.ts',
    'L72-L170',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const WEAPON_INDIRECT_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation GameEngine.runAttackPhase precomputes computeIndirectFireContext before bot AttackDeclared emission.',
    'src/engine/GameEngine.phases.ts',
    'L338-L365',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession attack actions precompute computeIndirectFireContext before declareAttack.',
    'src/engine/InteractiveSession.actions.ts',
    'L192-L235',
  ),
  mekstationDeviationSourceRef(
    'MekStation computeIndirectFireContext resolves indirect capability, direct LOS pass-through, spotter candidates, and target beacon context.',
    'src/engine/InteractiveSession.indirectFire.ts',
    'L60-L130',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const WEAPON_DAMAGE_CRITICAL_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner weapon hit resolution routes damage through resolveDamage and forwards critical-hit events.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts',
    'L346-L500',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced attack resolution routes hits through resolveDamagePipeline and critical-hit event helpers.',
    'src/utils/gameplay/gameSessionAttackResolution.ts',
    'L226-L357',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const PHYSICAL_ATTACK_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation GameEngine.runPhysicalAttackPhase declares physical attacks with piloting, movement, TSM, underwater, quirk, and ability context before shared resolution.',
    'src/engine/GameEngine.phases.ts',
    'L388-L479',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession resolves PhysicalAttackDeclared events through resolveAllPhysicalAttacks before advancing phases.',
    'src/engine/InteractiveSession.phases.ts',
    'L188-L204',
  ),
  mekstationDeviationSourceRef(
    'MekStation resolveAllPhysicalAttacks consumes shared physical context, lifecycle target filters, physical modifiers, displacement, damage, and PSR outputs.',
    'src/utils/gameplay/gameSessionPhysical.ts',
    'L607-L825',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const PHYSICAL_DISPLACEMENT_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner physical phase computes displacement outcomes and mirrors resulting unit movement back into the local grid occupancy view.',
    'src/simulation/runner/phases/physicalAttack.ts',
    'L421-L545',
  ),
  mekstationDeviationSourceRef(
    'MekStation physical runner behavior test proves same-phase displacement refreshes grid occupancy before later physical attacks resolve.',
    'src/simulation/runner/__tests__/physicalAttackRunner.behavior.test.ts',
    'L1746-L1798',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const HEAT_CORE_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner heat phase processes weapon, movement, engine, terrain/environment heat, heat-sink dissipation, shutdown/startup, ammo explosion, pilot heat damage, and MaxTech heat criticals.',
    'src/simulation/runner/phases/postCombat.ts',
    'L285-L565',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced resolveHeatPhase processes heat from movement, AttackDeclared weapon payloads, engine hits, environment, dissipation, startup, shutdown, ammo explosion, and heat effects.',
    'src/utils/gameplay/gameSessionHeat.ts',
    'L657-L940',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession heat phase calls resolveHeatPhase with water-depth and environmental heat providers.',
    'src/engine/InteractiveSession.phases.ts',
    'L205-L218',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const HEAT_DISSIPATION_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner heat phase emits HeatDissipated with negative amount and base/water/environment/generated-heat breakdown.',
    'src/simulation/runner/phases/postCombat.ts',
    'L405-L424',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced resolveHeatPhase emits HeatDissipated with the same dissipation breakdown payload shape.',
    'src/utils/gameplay/gameSessionHeat.ts',
    'L892-L909',
  ),
  mekstationDeviationSourceRef(
    'MekStation heat environment parity tests assert runner and interactive dissipation payload parity.',
    'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.test.ts',
    'L263-L343',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const HEAT_ENVIRONMENT_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner heat phase consumes terrain heat effects plus environmental heat modifiers in the heat budget.',
    'src/simulation/runner/phases/postCombat.ts',
    'L342-L350',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced resolveHeatPhase consumes water-depth cooling and environmental heat modifiers from its providers.',
    'src/utils/gameplay/gameSessionHeat.ts',
    'L858-L886',
  ),
  mekstationDeviationSourceRef(
    'MekStation heat environment parity tests prove water, fire, atmosphere, and temperature effects through both heat resolvers.',
    'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.test.ts',
    'L559-L589',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const HEAT_PILOT_DAMAGE_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner heat phase applies heat-sourced PilotHit and optional MaxTech heat-scale pilot damage.',
    'src/simulation/runner/phases/postCombat.ts',
    'L510-L521',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced resolveHeatPhase emits heat-sourced PilotHit, persists wounds, and applies optional MaxTech heat-scale damage.',
    'src/utils/gameplay/gameSessionHeat.ts',
    'L1082-L1148',
  ),
  mekstationDeviationSourceRef(
    'MekStation heat environment parity tests prove default and optional MaxTech heat pilot wounds in runner and interactive heat resolvers.',
    'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.test.ts',
    'L604-L775',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const PSR_PARITY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner PSR phase resolves queued PSRs with per-unit piloting, emits PSRResolved, and applies first-failure fallout.',
    'src/simulation/runner/phases/postCombat.ts',
    'L52-L170',
  ),
  mekstationDeviationSourceRef(
    'MekStation event-sourced End phase resolves pending PSRs with per-unit piloting, component damage, wounds, quirks, abilities, and unit type.',
    'src/utils/gameplay/gameSessionPSR.ts',
    'L63-L205',
  ),
  mekstationDeviationSourceRef(
    'MekStation resolveAllPSRs applies the shared first-failure batch contract for queued piloting skill rolls.',
    'src/utils/gameplay/pilotingSkillRolls/resolution.ts',
    'L103-L158',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const OBJECTIVE_OUTCOME_SOURCE_REFS = sourceRefsFrom(
  COMBAT_INTEGRATION_SCENARIO_SUPPORT['objective-outcome-precedence'],
);

const TERMINAL_GAME_ENDED_SOURCE_REFS = [
  ...sourceRefsFrom(
    COMBAT_INTEGRATION_SCENARIO_SUPPORT['interactive-terminal-event'],
  ),
  ...sourceRefsFrom(
    COMBAT_INTEGRATION_SCENARIO_SUPPORT['runner-terminal-game-ended-event'],
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const RUNNER_INTERACTIVE_PARITY_SUPPORT = {
  'movement-action-eligibility': integrated(
    'movement-action-eligibility',
    'runner movement, interactive action queries, and turn-rotation predicates remove destroyed/retreated/ejected/shutdown/unconscious actors',
    [
      ...sourceRefsFrom(
        COMBAT_INTEGRATION_SCENARIO_SUPPORT['turn-rotation-lifecycle-removal'],
      ),
      ...sourceRefsFrom(
        COMBAT_INTEGRATION_SCENARIO_SUPPORT[
          'interactive-actor-lifecycle-removal'
        ],
      ),
    ],
  ),
  'movement-validation': integrated(
    'movement-validation',
    'quick-sim runMovementPhase, GameEngine, and InteractiveSession movement paths all reject movement through validateMovement',
    MOVEMENT_PARITY_SOURCE_REFS,
  ),
  'movement-heat-and-event-path': integrated(
    'movement-heat-and-event-path',
    'quick-sim runMovementPhase emits validated MP/heat and builds MovementDeclared path/decomposition through shared event-path helpers',
    MOVEMENT_PARITY_SOURCE_REFS,
  ),
  'weapon-target-validation': integrated(
    'weapon-target-validation',
    'quick-sim validateDeclaredAttackTarget and session declareAttack reject invalid targets before AttackDeclared or damage side effects',
    WEAPON_TARGET_PARITY_SOURCE_REFS,
  ),
  'weapon-range-and-to-hit': integrated(
    'weapon-range-and-to-hit',
    'quick-sim runAttackPhase and session attack resolution both consume calculateToHit range/modifier helpers',
    WEAPON_TO_HIT_PARITY_SOURCE_REFS,
  ),
  'weapon-indirect-fire': integrated(
    'weapon-indirect-fire',
    'quick-sim runAttackPhase and InteractiveSession attack declaration both use computeIndirectFireContext',
    WEAPON_INDIRECT_PARITY_SOURCE_REFS,
  ),
  'weapon-damage-critical-events': integrated(
    'weapon-damage-critical-events',
    'quick-sim runner and session attack resolution both route through resolveDamage and critical-hit event helpers',
    WEAPON_DAMAGE_CRITICAL_SOURCE_REFS,
  ),
  'physical-attack-resolution': integrated(
    'physical-attack-resolution',
    'quick-sim runPhysicalAttackPhase and session physical resolution consume shared resolvePhysicalAttack helpers with movement-derived physical to-hit modifiers and active TSM damage context',
    PHYSICAL_ATTACK_PARITY_SOURCE_REFS,
  ),
  'physical-displacement-grid-occupancy': integrated(
    'physical-displacement-grid-occupancy',
    'quick-sim runPhysicalAttackPhase mirrors emitted physical displacements back into its local grid occupancy view before later same-phase displacement checks',
    PHYSICAL_DISPLACEMENT_PARITY_SOURCE_REFS,
  ),
  'heat-core-resolution': integrated(
    'heat-core-resolution',
    'quick-sim runHeatPhase and session resolveHeatPhase both process weapon heat, heat sink count/type dissipation, startup attempts, shutdown checks, and ammo explosion risk',
    HEAT_CORE_PARITY_SOURCE_REFS,
  ),
  'heat-dissipation-event-payload': integrated(
    'heat-dissipation-event-payload',
    'quick-sim runHeatPhase and session resolveHeatPhase both emit negative HeatDissipated.amount values with dissipation breakdowns',
    HEAT_DISSIPATION_PARITY_SOURCE_REFS,
  ),
  'heat-environment-and-water': integrated(
    'heat-environment-and-water',
    'quick-sim runHeatPhase and session resolveHeatPhase both consume water/fire heat effects plus shared atmosphere/temperature environmental dissipation modifiers',
    HEAT_ENVIRONMENT_PARITY_SOURCE_REFS,
  ),
  'heat-pilot-damage': integrated(
    'heat-pilot-damage',
    'quick-sim runHeatPhase and session resolveHeatPhase both emit heat-sourced PilotHit events and persist pilot wounds for default life-support heat damage plus opt-in MaxTech heat-scale pilot damage',
    HEAT_PILOT_DAMAGE_PARITY_SOURCE_REFS,
  ),
  'psr-resolution': integrated(
    'psr-resolution',
    'quick-sim runPSRPhase and session End phase both resolve pending PSRs through resolveAllPSRs',
    PSR_PARITY_SOURCE_REFS,
  ),
  'psr-piloting-skill': integrated(
    'psr-piloting-skill',
    'quick-sim runPSRPhase and session End phase both pass per-unit piloting into resolveAllPSRs',
    PSR_PARITY_SOURCE_REFS,
  ),
  'objective-outcome': integrated(
    'objective-outcome',
    'SimulationRunnerState and GameOutcomeCalculator both evaluate wins through evaluateObjectiveOutcome',
    OBJECTIVE_OUTCOME_SOURCE_REFS,
  ),
  'terminal-game-ended-event': integrated(
    'terminal-game-ended-event',
    'InteractiveSession finalization appends GameEnded through endGame and SimulationRunner.run appends GameEnded with winner, reason, and turn count',
    TERMINAL_GAME_ENDED_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
