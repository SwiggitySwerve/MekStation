import type { ICombatRequirementSupportEntry } from './CombatValidationRequirementSupport.types';

import {
  integrated,
  outOfScope,
} from './CombatValidationRequirementSupport.builders';
import {
  PILOT_SKILL_SUPPORT_REFS,
  PILOT_ABILITY_SUPPORT_REFS,
  CANONICAL_SPA_SUPPORT_REFS,
  MECH_QUIRK_SUPPORT_REFS,
  PILOT_MODIFIER_RESOLVER_SUPPORT_REFS,
  DAMAGE_RESOLUTION_SUPPORT_REFS,
  DESTRUCTION_CAUSE_SUPPORT_REFS,
  CRITICAL_COMPONENT_SUPPORT_REFS,
  CRITICAL_SLOT_EFFECT_SUPPORT_REFS,
  PILOT_DAMAGE_SUPPORT_REFS,
  PSR_RESOLUTION_SUPPORT_REFS,
  PSR_TRIGGER_SUPPORT_REFS,
  CRITICAL_SLOT_HYDRATION_SUPPORT_REFS,
  RUNNER_INTERACTIVE_PARITY_SUPPORT_REFS,
  BATTLEMECH_EVENT_SUPPORT_REFS,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT_REFS,
} from './CombatValidationRequirementSupport.supportRefLists';
import { MEGAMEK_EJECTION_LIFECYCLE_SOURCE_REFS } from './CombatValidationRequirementSupport.types';

export const BATTLEMECH_VALIDATION_REQUIREMENT_PILOT_LIFECYCLE_SUPPORT = {
  'pilot-skills': integrated(
    'pilot-skills',
    'Pilot skill support covers gunnery, piloting, indirect-fire spotter gunnery, wound penalties, PSR resolution, source-backed Command Mech/Battle Computer force initiative bonuses, explicit HQ/command equipment initiative bonuses, represented HQ/command-console initiative equipment gates, exact official command-console producer id hydration, represented Triple-Core Processor initiative components, represented Triple-Core Processor called-shot Targeting Computer -1 aimed-shot relief, represented Heavy Lifter carry-object capacity checks, represented Heavy Lifter ground-object weight gates, represented Heavy Lifter pickup/drop lifecycle, represented Heavy Lifter throw-release action resolution, and Tactical Genius reroll requests; name-only command-console or communications-equipment prose intentionally fails closed without represented eligibility gates, and full thrown-object attack range, damage, displacement, target interaction, and UI targeting parity remain outside this represented action-resolution slice',
    [
      ...PILOT_SKILL_SUPPORT_REFS,
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-object-action-application',
    ],
  ),
  'spa-quirk-catalog': integrated(
    'spa-quirk-catalog',
    'SPA and quirk support maps cover the combat SPA helper catalog, the canonical SPA catalog boundary, Maneuvering Ace skidding relief, Animal Mimicry quad-Mek PSR relief, represented Environmental Specialist Fog/Snow/Rain/Wind/Light ranged and Light physical to-hit behavior, represented Comm Implant and Boosted Comm Implant indirect-fire LOS spotter relief, represented Boosted Comm Implant C3i network state, represented BattleMech neural-interface and processor implant slices, and every mech or weapon quirk in the local catalogs. Edge support is integrated for generic point state plus represented BattleMech trigger behavior, non-LRM artillery spotting is split to artillery scope, Infantry-only minefield relief is split outside the BattleMech SPA resolver scope, and no mech-quirk or combat-active BattleMech SPA row is currently an unresolved objective blocker',
    [
      ...PILOT_ABILITY_SUPPORT_REFS,
      ...CANONICAL_SPA_SUPPORT_REFS,
      ...MECH_QUIRK_SUPPORT_REFS,
    ],
  ),
  'spa-quirk-resolver-application': integrated(
    'spa-quirk-resolver-application',
    'Pilot modifier resolver support maps every SPA and quirk to the combat resolver family that applies or should apply it, with ranged to-hit state, physical to-hit helper state, weapon to-hit quirks, represented Environmental Specialist Fog/Snow/Rain/Wind/Light ranged and Light physical to-hit behavior, represented PSR target-number rows for Maneuvering Ace skidding, Animal Mimicry quad-Mek relief, Terrain Master Frogman/Mountaineer/Swamp Beast relief, V.D.N.I. piloting relief, represented Triple-Core Processor initiative components, represented Triple-Core Processor called-shot Targeting Computer -1 aimed-shot relief, represented active-probe ECM-counter range slice and represented minefield detonation target-number relief for Eagle Eyes, Maneuvering Ace BattleMech lateral movement, Nightwalker represented low-light movement, Heavy Lifter lift-capacity, carry-object capacity-check helper math, ground-object weight gates, pickup/drop lifecycle, and bounded throw-object action resolution through throw-release lifecycle, represented initiativeEquipment gates, and exact official command-console producer ids now hydrated by attack, movement, PSR, or initiative paths; full thrown-object attack range, damage, displacement, target interaction, and UI targeting parity remain outside this represented action-resolution slice',
    PILOT_MODIFIER_RESOLVER_SUPPORT_REFS,
  ),
  'campaign-quirk-behavior': outOfScope(
    'campaign-quirk-behavior',
    'Rugged quirk support exposes MekHQ-style maintenance-cycle multipliers and keeps that behavior separate from combat critical-hit prevention',
    'Campaign maintenance-cycle behavior is source-pinned audit evidence outside BattleMech combat runner validation scope',
    [
      'featureSupport.mechQuirks.rugged_1',
      'featureSupport.mechQuirks.rugged_2',
      'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
    ],
  ),
  'damage-resolution': integrated(
    'damage-resolution',
    'Damage support covers armor, internal structure, rear armor, transfer, location destruction, heat/crit ammo explosion cascades, CASE containment, 20+ damage PSRs, and the canonical destruction-cause taxonomy; shutdown remains modeled by lifecycle support rather than UnitDestroyed',
    [...DAMAGE_RESOLUTION_SUPPORT_REFS, ...DESTRUCTION_CAUSE_SUPPORT_REFS],
  ),
  'critical-effects': integrated(
    'critical-effects',
    'Critical component support covers engine, gyro, cockpit, sensors, life support, actuators, ammo, heat sinks, jump jets, weapons, represented empty tracked ammo-bin no-explosion handling, shield preserved-function replay, SCM six-slot critical lifecycle replay, Emergency Coolant System damaged-state plus 5-point explosion replay, PLAYTEST_3 autocannon first-hit and follow-up critical replay including official RAC/HVAC names, represented HarJel, represented explicit explosion-damage equipment replay, represented hot-loaded weapon replay including source HotLoad mode-state hydration with explicit explosionDamage, represented RISC Laser Pulse Module linked-laser and ambiguous-link no-fallback replay, represented PPC Capacitor, Prototype Improved Jump Jet, and Extended Fuel Tank explosion replay, represented Artemis FCS critical-damage guidance removal replay, represented active-probe critical replay, and generic equipment-destroyed replay through row-backed sibling slices; LAM/non-BattleMech fuel equipment, bomb bays, Blue Shield non-critical special rules, and incendiary ammo lifecycle branches remain explicit out-of-scope rows rather than BattleMech equipment-critical blockers',
    [...CRITICAL_COMPONENT_SUPPORT_REFS, ...CRITICAL_SLOT_EFFECT_SUPPORT_REFS],
  ),
  'pilot-damage-death': integrated(
    'pilot-damage-death',
    'Pilot damage support covers head hits, cockpit crit death, heat pilot damage, fall pilot damage, ammo-explosion pilot damage, unconsciousness, lethal wound destruction, and source-backed Pain Resistance / Iron Man ammo-explosion damage reduction',
    PILOT_DAMAGE_SUPPORT_REFS,
  ),
  'psr-resolution': integrated(
    'psr-resolution',
    'PSR support covers pending PSR resolution, reason-code preservation, falls, pilot wounds, pilot death, and pending clear',
    [
      ...PSR_RESOLUTION_SUPPORT_REFS,
      'parityAndIntegration.representativeScenarios.phase-psr-queue-lifecycle',
    ],
  ),
  'psr-trigger-catalog': integrated(
    'psr-trigger-catalog',
    'PSR trigger support catalogs damage, leg/actuator/gyro/engine, kicked, charged, DFA, pushed, shutdown, standing, terrain, skid, source-backed explicit-load building collapse, swamp bog-down stuck outcomes, MASC, and Supercharger triggers, including named active run/sprint trigger stamping, source-backed standard, alternate_masc, and alternate_masc_enhanced MASC/Supercharger fixed failure target numbers plus automatic prior-use counter advance/decay at runner turn reset',
    [
      ...PSR_TRIGGER_SUPPORT_REFS,
      'ruleSupport.movementEnhancements.masc-side-paths',
      'ruleSupport.movementEnhancements.supercharger-side-paths',
    ],
  ),
  'turn-rotation-removal': integrated(
    'turn-rotation-removal',
    'Integration support and behavior tests cover destroyed, shutdown, unconscious, retreated, and ejected actors leaving normal turn queues',
    [
      'lifecycleAndPsr.actionEligibility.destroyed',
      'lifecycleAndPsr.actionEligibility.shutdown',
      'lifecycleAndPsr.actionEligibility.unconscious',
      'lifecycleAndPsr.actionEligibility.retreated',
      'lifecycleAndPsr.actionEligibility.ejected',
      'parityAndIntegration.representativeScenarios.turn-rotation-lifecycle-removal',
      'parityAndIntegration.representativeScenarios.interactive-actor-lifecycle-removal',
    ],
  ),
  'targetability-lifecycle': integrated(
    'targetability-lifecycle',
    'Lifecycle support tracks which terminal states remain targetable or are removed from target filters',
    [
      'lifecycleAndPsr.actionEligibility.shutdown-targetability',
      'lifecycleAndPsr.actionEligibility.retreated-targetability',
      'lifecycleAndPsr.actionEligibility.ejected-targetability',
      'parityAndIntegration.representativeScenarios.targetability-lifecycle-filter',
    ],
  ),
  'ejection-lifecycle': integrated(
    'ejection-lifecycle',
    'MegaMek backs original-unit removal on manual ejection; MekStation covers command/intent/wire routing, UnitEjected state, damage preservation, targetability removal, and terminal survivor counts',
    [
      'actions.tacticalCommands.utility.eject',
      'actions.gameIntents.eject',
      'actions.wireIntents.Eject',
      'actions.p2pIntents.eject',
      'eventStream.battleMechCombatEvents.unit_ejected',
      'lifecycleAndPsr.actionEligibility.ejection-damage-preservation',
      'parityAndIntegration.representativeScenarios.ejection-damage-preservation',
      'parityAndIntegration.representativeScenarios.ejection-command-intent-outcome',
    ],
    MEGAMEK_EJECTION_LIFECYCLE_SOURCE_REFS,
  ),
  'retreat-withdrawal': integrated(
    'retreat-withdrawal',
    'Retreat lifecycle support removes retreated units from actions, targets, survivor counts, and objectives; player withdrawal is integrated through the edge-selecting WithdrawControl plus game intent, wire payload, server dispatch, and P2P translation',
    [
      'actions.directUiActions.utility.withdraw-control',
      'actions.gameIntents.withdraw',
      'actions.wireIntents.Withdraw',
      'actions.p2pIntents.withdraw',
      'lifecycleAndPsr.actionEligibility.retreated',
      'lifecycleAndPsr.actionEligibility.retreated-targetability',
    ],
  ),
  'objective-terminal-state': integrated(
    'objective-terminal-state',
    'Integration support covers objective eligibility, survivor filters, terminal summary, and interactive plus runner terminal GameEnded events',
    [
      'parityAndIntegration.representativeScenarios.objective-control-lifecycle-filter',
      'parityAndIntegration.representativeScenarios.objective-outcome-precedence',
      'parityAndIntegration.representativeScenarios.terminal-survivor-filter',
      'parityAndIntegration.representativeScenarios.runner-terminal-summary',
      'parityAndIntegration.representativeScenarios.interactive-terminal-event',
      'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
      'lifecycleAndPsr.actionEligibility.force-survivor-counts',
    ],
  ),
  'runner-interactive-parity': integrated(
    'runner-interactive-parity',
    'Parity support covers movement, attack, physical, PSR, heat, objective, targetability, and terminal-state comparisons with matching terminal and heat-dissipation event semantics',
    [
      ...RUNNER_INTERACTIVE_PARITY_SUPPORT_REFS,
      'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
    ],
  ),
  'event-stream': integrated(
    'event-stream',
    'Event stream support catalogs integrated BattleMech combat events, including runner-backed TurnStarted turn-boundary production',
    BATTLEMECH_EVENT_SUPPORT_REFS,
  ),
  'critical-slot-hydration': integrated(
    'critical-slot-hydration',
    'Critical-slot hydration support maps catalog BattleMech system, ammo, weapon, heat sink, jump jet, and generic equipment slots into runner manifests with MegaMek source refs',
    CRITICAL_SLOT_HYDRATION_SUPPORT_REFS,
  ),
  'known-limitation-audit': integrated(
    'known-limitation-audit',
    'Validation scope support bypasses broad known-limitation filters, audits which broad pattern would have matched, forbids catalog filter gates, pins official BattleMech catalog scope, and exports unresolved catalog rows as machine-readable completion blockers',
    [
      'validationScope.knownLimitationsAndScope.known-limitation-bypass',
      'validationScope.knownLimitationsAndScope.known-limitation-pattern-audit',
      'validationScope.knownLimitationsAndScope.catalog-filter-gate-ban',
      'validationScope.knownLimitationsAndScope.battlemech-official-catalog-scope',
      'validationScope.knownLimitationsAndScope.unresolved-completion-blocker-inventory',
    ],
  ),
  'non-battlemech-scope': outOfScope(
    'non-battlemech-scope',
    'Validation scope support splits aerospace, vehicle, battle armor, infantry, protomech, and motive-system responsibilities out of this BattleMech suite',
    'Non-BattleMech systems need their own validation matrices rather than being treated as BattleMech coverage',
    [
      'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
      'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
      ...NON_BATTLEMECH_EVENT_SCOPE_SUPPORT_REFS,
    ],
  ),
} satisfies Record<string, ICombatRequirementSupportEntry>;
