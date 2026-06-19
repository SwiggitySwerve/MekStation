import type { IPhysicalLegalityGateSupportEntry } from './CombatPhysicalLegalityGateSupport.types';

import * as physicalAuthority from './CombatPhysicalLegalityGateSupport.authorities';
import {
  integrated,
  outOfScope,
} from './CombatPhysicalLegalityGateSupport.builders';

export const SHARED_PHYSICAL_LEGALITY_GATE_SUPPORT = {
  'shared.target-not-null': integrated(
    'shared.target-not-null',
    'shared',
    'shared restriction helpers reject targetExists=false, event-sourced declarations emit TargetMissing before scheduling, and stale declared events resolve to TargetMissing when the target unit no longer exists',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-destroyed': integrated(
    'shared.target-not-destroyed',
    'shared',
    'shared restriction helpers reject targetDestroyed, event-sourced declarations and stale declared resolution emit TargetDestroyed without damage side effects, and runner enemy selection excludes destroyed physical targets',
    physicalAuthority.TARGETABILITY_LIFECYCLE_LINES,
  ),
  'shared.friendly-fire': integrated(
    'shared.friendly-fire',
    'shared',
    'shared restriction helpers reject targetIsFriendly, event-sourced declarations emit FriendlyTarget before scheduling, and runner enemy selection excludes same-side physical targets',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.same-board': integrated(
    'shared.same-board',
    'shared',
    'IUnitGameState exposes optional boardId, shared restriction helpers reject explicit board mismatches, and eligibility/session/runner inputs thread attacker/target board identity into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.adjacent-range': integrated(
    'shared.adjacent-range',
    'shared',
    'shared restriction helpers reject explicit non-adjacent targetDistance, event-sourced declarations emit TargetNotAdjacent before scheduling, and runner enemy selection excludes non-adjacent physical targets',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.attacker-not-evading': integrated(
    'shared.attacker-not-evading',
    'shared',
    'IUnitGameState exposes optional isEvading, shared restriction helpers reject attackerEvading, and eligibility/session/runner inputs thread evasion state into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.not-loading-unloading-cargo': integrated(
    'shared.not-loading-unloading-cargo',
    'shared',
    'IUnitGameState exposes optional isLoadingOrUnloadingCargo, shared restriction helpers reject attackerLoadingOrUnloadingCargo, and eligibility/session/runner inputs thread cargo interaction state into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.carried-cargo-arm-lockout': integrated(
    'shared.carried-cargo-arm-lockout',
    'shared',
    'IUnitGameState exposes optional per-arm carried-cargo state, and eligibility/session/runner physical inputs reject selected-arm punch, selected-arm brush-off, arm-mounted melee weapon, two-handed Zweihander, and both-arms-carrying push declarations with AttackerCargoInteraction while preserving one-free-arm push legality',
    physicalAuthority.CARRIED_CARGO_ARM_LOCKOUT_LINES,
  ),
  'shared.target-not-passenger': integrated(
    'shared.target-not-passenger',
    'shared',
    'shared restriction helpers reject targetIsPassenger, IUnitGameState exposes optional isPassenger, and eligibility/session/runner inputs thread transported-passenger state into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.not-self-target': integrated(
    'shared.not-self-target',
    'shared',
    'shared restriction helpers reject targetIsSelf before adjacency checks, event-sourced declarations emit SelfTarget before scheduling, and runner enemy selection cannot select the acting unit',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-airborne': integrated(
    'shared.target-not-airborne',
    'shared',
    'shared restriction helpers reject targetIsAirborne, IUnitGameState exposes optional isAirborne, and eligibility/session/runner inputs thread airborne target state into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-swarming': integrated(
    'shared.target-not-swarming',
    'shared',
    'shared restriction helpers reject targetIsSwarming, IUnitGameState exposes optional isSwarming, and eligibility/session/runner inputs thread swarm-attack state into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.building-occupancy': integrated(
    'shared.building-occupancy',
    'shared',
    'shared restriction helpers reject targetOccupiedBuildingId unless attackerOccupiedBuildingId matches, IUnitGameState exposes optional occupiedBuildingId, and eligibility/session/runner inputs thread building occupancy state into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-making-dfa': integrated(
    'shared.target-not-making-dfa',
    'shared',
    'shared restriction helpers reject targetIsMakingDFA, IUnitGameState exposes optional isMakingDFA, and eligibility/session/runner inputs thread DFA-making target state into physical validation',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.invalid-hex-target': integrated(
    'shared.invalid-hex-target',
    'shared',
    'shared restriction helpers consume targetObjectType and reject woods-clearing, building-ignition, and hex-ignition physical targets as InvalidPhysicalTarget; event-sourced declarations and stale declared resolution consume explicit non-unit targetObjectType context before falling back to TargetMissing',
    physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.gun-emplacement-automatic-hit': integrated(
    'shared.gun-emplacement-automatic-hit',
    'shared',
    'calculatePhysicalToHit marks explicit or hydrated gun-emplacement targets as automatic success for punch, kick, DFA, and supported club/melee attacks; resolvePhysicalAttack skips to-hit dice and PhysicalAttackResolved carries automaticHit metadata',
    physicalAuthority.GUN_EMPLACEMENT_AUTOMATIC_HIT_LINES,
  ),
  'shared.displacement-elevation-cap': integrated(
    'shared.displacement-elevation-cap',
    'shared',
    'isValidDisplacement now rejects BattleMech displacement destinations that climb more than two elevation levels from source, and push/charge/DFA session plus runner displacement helpers thread that cap before emitting displacement or PSR side effects',
    physicalAuthority.DISPLACEMENT_ELEVATION_LINES,
  ),
  'shared.displacement-prohibited-terrain': integrated(
    'shared.displacement-prohibited-terrain',
    'shared',
    'isValidDisplacement now rejects explicit impassable terrain destinations before push/charge/DFA position changes; helper, event-sourced, and runner charge coverage keep successful charge damage while suppressing displacement and charge PSRs',
    physicalAuthority.DISPLACEMENT_PROHIBITED_TERRAIN_LINES,
  ),
  'shared.displacement-overgrown-terrain': integrated(
    'shared.displacement-overgrown-terrain',
    'shared',
    'isValidDisplacement now rejects represented woods/jungle terrain levels above two before push/charge/DFA position changes; helper, event-sourced, and runner charge coverage keep successful charge damage while suppressing displacement and charge PSRs',
    physicalAuthority.DISPLACEMENT_OVERGROWN_TERRAIN_LINES,
  ),
  'shared.displacement-domino-positional-chain': integrated(
    'shared.displacement-domino-positional-chain',
    'shared',
    'isValidDisplacement recursively validates occupied destination blockers, and represented push/charge/DFA/charge-miss target-displacement helpers emit positional domino payload chains; runner charge coverage proves multi-blocker chain application to unit positions while queuing source-backed DominoEffect PSRs for each forced blocker',
    physicalAuthority.DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-minefield-fallout': integrated(
    'shared.displacement-domino-minefield-fallout',
    'shared',
    'Runner physical attack displacement applies represented TerrainType.Mines BattleMech leg damage plus resulting damage PSR side effects, represented conventional coordinate-state minefield damage plus density reduction/MinefieldChanged fallout, represented inferno coordinate-state pendingExternalHeat and infernoBurning fallout, already-detonated coordinate suppression, and non-conventional coordinate-state no-fallback guards, with GamePhase.PhysicalAttack when a push/charge/DFA/charge-miss domino displacement lands in an existing represented mine destination',
    physicalAuthority.DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-chain': integrated(
    'shared.displacement-domino-chain',
    'shared',
    'Represented push/charge/DFA/charge-miss displacement now covers the source-backed recursive occupied-hex domino chain: helper legality accepts recursively displaceable occupied destinations, target-displacement helpers emit ordered domino payloads, the runner applies the chain to unit positions, refreshes same-phase occupancy, queues DominoEffect PSRs for forced blockers, and applies represented mine destination fallout through shared.displacement-domino-minefield-fallout',
    physicalAuthority.DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-secondary-fallout': integrated(
    'shared.displacement-domino-secondary-fallout',
    'shared',
    'Broad domino secondary-fallout accounting is split: represented positional chains, forced-blocker DominoEffect PSRs, mine destination fallout, represented terrain/building destination PSR fallout, friendly avoidance, grounded-DropShip radius search, and the BattleMech-relevant TWGameManager.doEntityDisplacement voluntary blocker step-out branch are integrated sibling rows; full DropShip footprint/secondary-hex handling is tracked outside the BattleMech validation matrix',
    physicalAuthority.DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-step-out-cfr': integrated(
    'shared.displacement-domino-step-out-cfr',
    'shared',
    'Represented domino displacement now carries a replayable blockerStepOutDecision on PhysicalAttackDeclared payloads: helper, event-sourced session, and runner coverage accept successful side-entered/non-jumping/legal-forward-or-backward step-out decisions as domino_step_out displacements without forced DominoEffect PSRs, while invalid, declined, failed, or no-response decisions fall back to the source-backed forced domino chain',
    physicalAuthority.DISPLACEMENT_DOMINO_STEP_OUT_CFR_LINES,
  ),
  'shared.displacement-domino-terrain-building-environment-fallout': integrated(
    'shared.displacement-domino-terrain-building-environment-fallout',
    'shared',
    'Runner physical attack displacement now applies represented destination terrain/building PSR fallout for forced domino blockers in addition to represented mine fallout: water entry/exit, entering rubble, moving on ice, swamp bog-down, and overloaded explicit building constructionFactor PSRs are queued and emitted in GamePhase.PhysicalAttack. Broader non-PSR terrain mutation, building CF/collapse damage mutation, fire/smoke/environment side effects, and full MegaMek parity remain outside this bounded represented slice.',
    physicalAuthority.DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-dropship-secondary-hex': outOfScope(
    'shared.displacement-domino-dropship-secondary-hex',
    'shared',
    'The BattleMech runner hydrates grounded DropShip source context for represented DFA hit radius-two target displacement search; broader DropShip footprint and secondary-hex consequences after domino displacement require a separate non-BattleMech/large-unit validation matrix',
    'Out-of-scope for this BattleMech validation suite: full DropShip footprint and secondary-hex consequences after TWGameManager.doEntityDisplacement domino chains are not modeled by the BattleMech physical displacement helper',
    physicalAuthority.DISPLACEMENT_DROPSHIP_RADIUS_LINES,
  ),
  'shared.displacement-friendly-avoidance': integrated(
    'shared.displacement-friendly-avoidance',
    'shared',
    'computePreferredDisplacement accepts friendly occupant ids and first scans valid DFA-miss displacement destinations while skipping friendly occupied hexes before falling back; event-sourced and runner DFA miss resolution hydrate same-side target friendlies into that source-backed pass',
    physicalAuthority.DISPLACEMENT_FRIENDLY_AVOIDANCE_LINES,
  ),
  'shared.displacement-dropship-radius': integrated(
    'shared.displacement-dropship-radius',
    'shared',
    'computeValidDisplacement accepts explicit grounded DropShip source context and searches the radius-two ring in the MegaMek getValidDisplacement order; runner and event-sourced DFA hit displacement hydrate same-board grounded DropShip units sharing the target source hex into that radius-two search while broader DropShip footprint consequences remain outside this row',
    physicalAuthority.DISPLACEMENT_DROPSHIP_RADIUS_LINES,
  ),
} satisfies Record<string, IPhysicalLegalityGateSupportEntry>;
