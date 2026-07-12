import type { IPhysicalLegalityGateSupportEntry } from './CombatPhysicalLegalityGateSupport.types';

import * as physicalAuthority from './CombatPhysicalLegalityGateSupport.authorities';
import { integrated } from './CombatPhysicalLegalityGateSupport.builders';

export const CHARGE_DFA_PHYSICAL_LEGALITY_GATE_SUPPORT = {
  'charge.requires-run': integrated(
    'charge.requires-run',
    'charge',
    'canCharge rejects declarations when attackerRanThisTurn is false',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'charge.no-jump-movement': integrated(
    'charge.no-jump-movement',
    'charge',
    'canCharge consumes attackerJumpedThisTurn and rejects ChargeJumpMovement through helper, eligibility, event-sourced declaration/resolution, and runner resolution before the run/backward/prone movement-path gates',
    physicalAuthority.CHARGE_MOVEMENT_PATH_LINES,
  ),
  'charge.no-backward-movement': integrated(
    'charge.no-backward-movement',
    'charge',
    'MovementDeclared step chains hydrate movedBackwardThisTurn; canCharge rejects ChargeBackwardMovement through helper, eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection before prone-state validation',
    physicalAuthority.CHARGE_MOVEMENT_PATH_LINES,
  ),
  'charge.attacker-not-prone': integrated(
    'charge.attacker-not-prone',
    'charge',
    'canCharge rejects attackerProne after the source-backed run gate passes; event-sourced declarations emit AttackerProne before scheduling and runner physical phase skips prone attackers before bot/automatic charge declarations',
    physicalAuthority.CHARGE_MOVEMENT_PATH_LINES,
  ),
  'charge.attacker-not-stuck': integrated(
    'charge.attacker-not-stuck',
    'charge',
    'canCharge consumes attackerStuck and rejects stuck attackers before charge movement-path gates; eligibility, event-sourced declarations, and runner resolution thread isStuck from swamp bog-down state',
    physicalAuthority.STUCK_CHARGE_DFA_LINES,
  ),
  'charge.target-entity': integrated(
    'charge.target-entity',
    'charge',
    'canCharge consumes targetObjectType and rejects explicit building or fuel-tank charge targets as InvalidPhysicalTarget, matching MegaMek source order where non-entity targets return Invalid Target before later physical target branches; event-sourced declarations and stale declared resolution consume explicit non-unit targetObjectType context',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'charge.target-mek-standing': integrated(
    'charge.target-mek-standing',
    'charge',
    'canCharge consumes attackerUnitType, targetUnitType, targetObjectType, and targetProne; BattleMech-compatible attackers reject explicit non-Mek or gun-emplacement targets as TargetNotMek and prone targets as TargetProne through eligibility, event-sourced declaration, and runner resolution inputs',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'charge.no-infantry-protomek': integrated(
    'charge.no-infantry-protomek',
    'charge',
    'canCharge consumes attackerUnitType and targetUnitType to reject explicit non-Mek charges against Infantry, Battle Armor, or ProtoMech targets as TargetInfantryOrProtoMek; eligibility, event-sourced declaration, and runner resolution thread the same target-class gate',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'charge.elevation-overlap': integrated(
    'charge.elevation-overlap',
    'charge',
    'canCharge consumes elevationDifference plus default standing-Mek heights to reject non-overlapping attacker/target elevation bands as ElevationMismatch; eligibility, event-sourced declaration, and runner resolution thread the same elevation delta',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'charge.target-moved-or-immobile': integrated(
    'charge.target-moved-or-immobile',
    'charge',
    'canCharge consumes targetMovementComplete and targetImmobile to reject targets that have not completed movement unless they are immobile; eligibility, event-sourced declaration/resolution, and runner resolution thread the post-movement charge gate',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'charge.displacement-state-conflicts': integrated(
    'charge.displacement-state-conflicts',
    'charge',
    'canCharge consumes targetIsMakingDisplacementAttack and targetedByDisplacementAttackerId to reject targets already making a charge/DFA or already owned by another displacement attacker; eligibility, event-sourced declaration/resolution, runner resolution, and automatic selection thread the same optional displacement state',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'charge.building-auto-hit': integrated(
    'charge.building-auto-hit',
    'charge',
    'canCharge rejects explicit building and fuel-tank targetObjectType values as InvalidPhysicalTarget because MegaMek ChargeAttackAction returns Invalid Target for non-entity targets before its later adjacent-building branch; event-sourced declarations and stale declared resolution now preserve that rejection instead of reporting TargetMissing',
    physicalAuthority.CHARGE_ACTION_LINES,
  ),
  'dfa.requires-jump': integrated(
    'dfa.requires-jump',
    'dfa',
    'canDFA rejects declarations when attackerJumpedThisTurn is false',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.no-mechanical-jump-booster': integrated(
    'dfa.no-mechanical-jump-booster',
    'dfa',
    'MovementDeclared step chains hydrate usedMechanicalJumpBoosterThisTurn; canDFA consumes attackerUsedMechanicalJumpBooster and rejects MechanicalJumpBooster through helper, eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-infantry': integrated(
    'dfa.attacker-not-infantry',
    'dfa',
    'canDFA consumes attackerUnitType and rejects explicit Infantry/Battle Armor attackers as AttackerInfantry; eligibility, event-sourced declaration, and runner resolution thread the same attacker unit-type gate',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.vtol-elevation-reachable': integrated(
    'dfa.vtol-elevation-reachable',
    'dfa',
    'canDFA distinguishes targetIsAirborneVTOLorWIGE from generic airborne targets and rejects unreachable VTOL/WIGE targets when target elevation above attacker height exceeds attackerJumpMP; eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection hydrate explicit airborne VTOL targets from unit type and WIGE targets from combat motion type when attacker jump MP and elevation context are present',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.target-moved-or-immobile': integrated(
    'dfa.target-moved-or-immobile',
    'dfa',
    'canDFA consumes targetMovementComplete and targetImmobile to reject targets that have not completed movement unless they are immobile; eligibility and event-sourced declaration/resolution thread the same post-movement gate, while runner physical resolution is already post-movement complete',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.target-not-dropship': integrated(
    'dfa.target-not-dropship',
    'dfa',
    'canDFA consumes targetUnitType and rejects explicit DropShip targets as TargetDropShip; eligibility, event-sourced declaration/resolution, and runner resolution thread target unit type into DFA validation',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-prone': integrated(
    'dfa.attacker-not-prone',
    'dfa',
    'canDFA rejects attackerProne even when attackerJumpedThisTurn is true',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-stuck': integrated(
    'dfa.attacker-not-stuck',
    'dfa',
    'canDFA consumes attackerStuck and rejects stuck attackers before DFA jump/prone gates; eligibility, event-sourced declarations, and runner resolution thread isStuck from swamp bog-down state',
    physicalAuthority.STUCK_CHARGE_DFA_LINES,
  ),
  'dfa.displacement-state-conflicts': integrated(
    'dfa.displacement-state-conflicts',
    'dfa',
    'canDFA consumes targetIsMakingDisplacementAttack and targetedByDisplacementAttackerId to reject targets already making a charge/DFA or already owned by another displacement attacker; eligibility, event-sourced declaration/resolution, runner resolution, and automatic selection thread the same optional displacement state',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.target-not-inside-building': integrated(
    'dfa.target-not-inside-building',
    'dfa',
    'canDFA consumes the shared targetOccupiedBuildingId gate and rejects entity targets inside another building as TargetInsideBuilding through eligibility, event-sourced declaration/resolution, and runner resolution inputs',
    physicalAuthority.DFA_ACTION_LINES,
  ),
  'dfa.building-auto-hit': integrated(
    'dfa.building-auto-hit',
    'dfa',
    'canDFA rejects explicit building and fuel-tank targetObjectType values as InvalidPhysicalTarget because MegaMek DfaAttackAction returns Invalid Target for non-entity targets before its later adjacent-building branch; event-sourced declarations now preserve that rejection instead of reporting TargetMissing',
    physicalAuthority.DFA_ACTION_LINES,
  ),
} satisfies Record<string, IPhysicalLegalityGateSupportEntry>;
