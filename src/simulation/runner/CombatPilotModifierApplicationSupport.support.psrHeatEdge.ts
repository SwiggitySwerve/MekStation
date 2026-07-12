import {
  MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
  MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
  MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
} from './CombatConsciousnessSourceRefs';
import {
  MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
  MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  MEKSTATION_EDGE_KO_SOURCE_REFS,
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS,
  MEKSTATION_EDGE_TAC_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS,
  MEGAMEK_EASY_TO_PILOT_SOURCE_REFS,
  MEGAMEK_HARD_TO_PILOT_SOURCE_REFS,
  MEGAMEK_NO_ARMS_SOURCE_REFS,
  MEGAMEK_STABLE_PSR_SOURCE_REFS,
  MEGAMEK_UNBALANCED_SOURCE_REFS,
  MEKHQ_RUGGED_SOURCE_REFS,
} from './CombatLegacyQuirkSourceRefs';
import { MEKSTATION_TRIPLE_CORE_PROCESSOR_AIMED_SHOT_SOURCE_REFS } from './CombatPilotModifierApplicationSupport.sourceRefs.eagleEyes';
import {
  MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
  MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_PSR_SPA_SOURCE_REFS,
  MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
  MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
  MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

const CRITICAL_PREVENTION_EDGE_EXPLOSION_SOURCE_REFS = [
  ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  ...MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PILOT_MODIFIER_RESOLVER_PSR_HEAT_EDGE_SUPPORT = {
  'psr-application': integrated(
    'psr-application',
    'calculatePSRModifiers consumes unit quirks through calculatePilotingQuirkPSRModifier; runPSRPhase, resolvePendingPSRs, and attemptStandUp pass unit quirk and pilot ability state into PSR target-number calculation, with Stable scoped to Kick/Push PSRs, Easy Pilot scoped to the MegaMek piloting-skill gate plus BattleMech terrain/20+ damage PSRs, Cramped Cockpit suppressed for Small Pilot, and No Arms scoped to stand-up PSRs',
    [
      ...MEGAMEK_EASY_TO_PILOT_SOURCE_REFS,
      ...MEGAMEK_STABLE_PSR_SOURCE_REFS,
      ...MEGAMEK_HARD_TO_PILOT_SOURCE_REFS,
      ...MEGAMEK_UNBALANCED_SOURCE_REFS,
      ...MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS,
      ...MEGAMEK_NO_ARMS_SOURCE_REFS,
    ],
  ),
  'psr-spa-application': integrated(
    'psr-spa-application',
    'calculatePSRModifiers, runPSRPhase, resolvePendingPSRs, and stand-up PSR paths apply source-backed Maneuvering Ace skidding relief, Animal Mimicry quad-Mek relief, Terrain Master: Frogman water-entry relief, Terrain Master: Mountaineer rubble-entry relief, and Swamp Beast bog-down relief to PSR target numbers',
    MEGAMEK_PSR_SPA_SOURCE_REFS,
  ),
  'psr-spa-target-number-application': integrated(
    'psr-spa-target-number-application',
    'calculatePSRModifiers, runPSRPhase, resolvePendingPSRs, and stand-up PSR paths apply source-backed Maneuvering Ace skidding relief, Animal Mimicry quad-Mek relief, Terrain Master: Frogman water-entry relief, Terrain Master: Mountaineer rubble-entry relief, and Swamp Beast bog-down relief to PSR target numbers',
    MEGAMEK_PSR_SPA_SOURCE_REFS,
  ),
  'initiative-application': integrated(
    'initiative-application',
    'rollInitiative consumes source-backed Command Mech/Battle Computer force-level quirk bonuses, explicit HQ/command equipment initiative bonuses, represented HQ/command-console initiativeEquipment gates, represented Triple-Core Processor initiative components, and Tactical Genius reroll requests while preserving raw 2d6 payload fields',
    [
      ...MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
      ...MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
      ...MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
    ],
  ),
  'triple-core-processor-initiative-application': integrated(
    'triple-core-processor-initiative-application',
    'calculateSideInitiativeModifier consumes canonical triple_core_processor only when the pilot also has active VDNI or Buffered VDNI state, applies represented BattleMech +2 base and +1 C3/communications/command-console equipment uplift, applies represented shutdown, hostile ECM-without-own-ECM, and battle-wide EMI reductions, and suppresses the bonus when neuralInterfaceActive is explicitly false',
    MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
  ),
  'triple-core-processor-aimed-shot-application': integrated(
    'triple-core-processor-aimed-shot-application',
    'buildWeaponAttackAttackerToHitState consumes canonical triple_core_processor only for called-shot attacks when the pilot also has active VDNI or Buffered VDNI state, and calculateToHit applies represented Targeting Computer -1 aimed-shot relief across runner, interactive, and projection to-hit paths while suppressing relief when neuralInterfaceActive is explicitly false; actual targetingComputerEquipment state is represented separately and does not double-count TCP-backed relief',
    MEKSTATION_TRIPLE_CORE_PROCESSOR_AIMED_SHOT_SOURCE_REFS,
  ),
  'initiative-hq-equipment-hydration': integrated(
    'initiative-hq-equipment-hydration',
    'createInitialUnitState hydrates IGameUnit.initiativeEquipment into combat state and calculateSideInitiativeModifier derives +1/+2 HQ initiative only from represented working communications tonnage in Default communications mode',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'initiative-command-console-hydration': integrated(
    'initiative-command-console-hydration',
    'createInitialUnitState hydrates IGameUnit.initiativeEquipment into combat state and calculateSideInitiativeModifier derives +2 command-console initiative only from represented command-console cockpit, active crew, heavy-or-larger mass, and IndustrialMek advanced-fire-control eligibility',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'initiative-equipment-producer-hydration': integrated(
    'initiative-equipment-producer-hydration',
    'The session engine consumes represented initiativeEquipment gates, and unit hydration/adapters now source-back official communications-equipment:size:N, communications-equipment-N-ton, communications-equipment-N-ton:omni, BattleMech cockpit COMMAND_CONSOLE shapes, and exact command-console producer ids (istankcockpitcommandconsole/tankcockpitcommandconsole/ISRemoteDroneCommandConsole/remotedronecommandconsole) while keeping producer ids separate from command-console cockpit eligibility',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'heat-application': integrated(
    'heat-application',
    'runHeatPhase and resolveHeatPhase consume source-backed Hot Dog startup/shutdown plus heat-induced ammo-explosion, opt-in MaxTech pilot heat-damage, opt-in MaxTech critical-damage avoid-number relief, and weapon cooling quirks; calculateToHit consumes source-backed Some Like It Hot heat to-hit relief while leaving local Cool Under Fire unconsumed',
    [
      ...MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
      ...MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
    ],
  ),
  'consciousness-application': integrated(
    'consciousness-application',
    'applyPilotDamage consumes source-backed Pain Resistance ids and explicit numeric RPG Toughness state for head-hit consciousness checks, runHeatPhase applies Pain Resistance wake-up relief during heat recovery, and runPSRPhase, resolvePendingPSRs, resolveHeatPhase, physical self-damage, and ammo-explosion pilot damage consume the same represented state for fall, heat, physical, and explosion consciousness checks without treating Iron Man, Iron Will, or legacy toughness ability strings as target-number relief',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'rpg-toughness-consciousness-application': integrated(
    'rpg-toughness-consciousness-application',
    'resolvePilotConsciousnessCheck and resolvePilotWakeUpCheck consume explicit numeric pilotToughness state as target-number relief, pre-battle builders hydrate only explicit assigned-pilot rpgToughness/RPG Toughness snapshots, and legacy toughness ability aliases do not imply numeric RPG Toughness',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'edge-application': integrated(
    'edge-application',
    'deriveEdgePointCountFromPilotAbilities, createEdgeState, canUseEdge, useEdge, and resolveEdgeBattleMechTrigger model source-backed Edge point and trigger-id consumption without treating the generic edge SPA alias as a trigger; UnitHydration and GameCreated synthesis seed hydrated fullUnit abilities plus generic Edge points into combat and replay state; represented BattleMech and out-of-scope aerospace trigger ids are partitioned in EDGE_TRIGGERS; hit-location resolution consumes edge_when_headhit and edge_when_tac, runPSRPhase consumes edge_when_masc_fails, resolvePilotConsciousnessCheck consumes edge_when_ko, and criticalHitResolution consumes edge_when_explosion for their proven BattleMech trigger paths',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  'edge-head-hit-reroll-application': integrated(
    'edge-head-hit-reroll-application',
    'BattleMech hit-location resolution consumes edge_when_headhit only for represented head-hit locations, spends target Edge, preserves the superseded head-hit metadata, returns the replacement location, and persists remaining Edge points through runner and interactive weapon-hit paths',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
    ],
  ),
  'edge-tac-reroll-application': integrated(
    'edge-tac-reroll-application',
    'BattleMech hit-location resolution consumes edge_when_tac only for represented TAC hit-location results, spends target Edge, replaces the location before TAC critical processing, carries superseded/final metadata, and persists remaining Edge points through runner and interactive weapon-hit paths',
    [...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS, ...MEKSTATION_EDGE_TAC_SOURCE_REFS],
  ),
  'edge-ko-consciousness-reroll-application': integrated(
    'edge-ko-consciousness-reroll-application',
    'resolvePilotConsciousnessCheck consumes edge_when_ko only after a failed BattleMech consciousness check, spends represented Edge, returns superseded/final roll metadata, and refuses to spend generic edge without the KO trigger-specific ability',
    [...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS, ...MEKSTATION_EDGE_KO_SOURCE_REFS],
  ),
  'edge-masc-supercharger-reroll-application': integrated(
    'edge-masc-supercharger-reroll-application',
    'runPSRPhase consumes source-backed edge_when_masc_fails for represented BattleMech MASCFailure and SuperchargerFailure PSRs, spends one Edge point, emits superseded/reroll PSRResolved metadata, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS,
    ],
  ),
  'critical-prevention-application': outOfScope(
    'critical-prevention-application',
    'MegaMek exposes Edge TAC/head-hit/explosion triggers; MekStation hit-location resolution consumes TAC/head-hit Edge and critical-hit resolution consumes explosion Edge for the source-backed trigger-specific rerolls',
    'Generic critical-hit negation is not a source-backed BattleMech resolver and no broad critical-prevention mechanic is claimed; this aggregate label is excluded from blockers while the row-specific TAC, head-hit, and explosion Edge triggers stay integrated',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  'critical-prevention-edge-explosion-application': integrated(
    'critical-prevention-edge-explosion-application',
    'criticalHitResolution consumes edge_when_explosion to spend represented Edge and redirect avoidable explosive ammo critical-slot hits to a non-explosive slot; resolveWeaponHit carries the remaining Edge state and runner critical-hit coverage proves the crit-induced ammo explosion is avoided',
    CRITICAL_PREVENTION_EDGE_EXPLOSION_SOURCE_REFS,
  ),
  'anti-mek-actuator-application': outOfScope(
    'anti-mek-actuator-application',
    'getAntiMekActuatorTargetModifier exposes Protected/Exposed Actuators as anti-Mek Leg/Swarm attack target-number modifiers for the separate infantry and battle-armor combat matrix',
    'Anti-Mek Leg/Swarm attack paths are non-BattleMech attacker actions and are excluded from BattleMech runner validation until the battle-armor/infantry matrix consumes them',
    MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  ),
  'campaign-maintenance-application': outOfScope(
    'campaign-maintenance-application',
    'getRuggedMaintenanceMultiplier exposes MekHQ-style Rugged maintenance-cycle multipliers',
    'Campaign maintenance-cycle application belongs to MekHQ campaign scope, not BattleMech combat runner modifier scope',
    MEKHQ_RUGGED_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
