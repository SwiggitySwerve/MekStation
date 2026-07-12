import type { IPhysicalLegalityGateSupportEntry } from './CombatPhysicalLegalityGateSupport.types';

import * as physicalAuthority from './CombatPhysicalLegalityGateSupport.authorities';
import { integrated } from './CombatPhysicalLegalityGateSupport.builders';

export const PUSH_PHYSICAL_LEGALITY_GATE_SUPPORT = {
  'push.destination-open': integrated(
    'push.destination-open',
    'push',
    'canPush consumes pushDestinationValid, and runner/session displacement helpers reject blocked or off-map push destinations',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.attacker-is-mek': integrated(
    'push.attacker-is-mek',
    'push',
    'IUnitGameState carries explicit unitType, canPush rejects explicit non-Mek attackers as AttackerNotMek, and eligibility/session/runner inputs thread attackerUnitType into push validation',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.attacker-not-quad': integrated(
    'push.attacker-not-quad',
    'push',
    'canPush consumes attackerIsQuad, IUnitGameState exposes optional isQuad, and eligibility/session/runner inputs thread quad chassis state into push validation',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.attacker-grounded': integrated(
    'push.attacker-grounded',
    'push',
    'canPush consumes attackerIsAirborne, IUnitGameState exposes optional isAirborne, and eligibility/session/runner inputs thread airborne attacker state into push validation',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.target-is-mek': integrated(
    'push.target-is-mek',
    'push',
    'IUnitGameState carries explicit unitType, canPush rejects explicit non-Mek targets as TargetNotMek, and eligibility/session/runner inputs thread targetUnitType into push validation',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.arms-not-flipped': integrated(
    'push.arms-not-flipped',
    'push',
    'canPush consumes attackerArmsFlipped, IUnitGameState exposes optional armsFlipped, and eligibility/session/runner inputs thread rear-flipped arm state into push validation',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.both-arms-present': integrated(
    'push.both-arms-present',
    'push',
    'canPush consumes attackerDestroyedLocations, eligibility/session/runner inputs pass unit destroyedLocations, and push declarations reject missing left or right arm with LimbMissing',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.no-arms-quirk': integrated(
    'push.no-arms-quirk',
    'push',
    'canPush now rejects No Arms quirk through the shared physical restriction input',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.no-arm-weapons-fired': integrated(
    'push.no-arm-weapons-fired',
    'push',
    'canPush rejects supplied arm-fired weapon ids, event-sourced push declarations derive arm-fired ids from weaponLocationById when context is absent, and runner injected push declarations reject hydrated arm-mounted weapon fire while allowing hydrated torso-mounted weapon fire',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.same-elevation': integrated(
    'push.same-elevation',
    'push',
    'canPush consumes elevationDifference and rejects non-zero target elevation deltas',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.displacement-state-conflicts': integrated(
    'push.displacement-state-conflicts',
    'push',
    'canPush consumes targetIsMakingDisplacementAttack, targetIsPushing, targetDisplacementAttackTargetId, attackerTargetedByDisplacementAttackerId, and targetedByDisplacementAttackerId to reject non-push displacement targets, targets pushing another Mek, attackers already targeted by another displacement attacker, and targets already owned by another displacement attacker while preserving source-backed counter-push allowances',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.target-directly-ahead': integrated(
    'push.target-directly-ahead',
    'push',
    'runner, event-sourced session, and eligibility inputs derive pushTargetDirectlyAhead from attacker position/facing and target position; canPush rejects side-adjacent targets',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.attacker-not-prone': integrated(
    'push.attacker-not-prone',
    'push',
    'canPush rejects attackerProne before to-hit or displacement side effects',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.target-not-prone': integrated(
    'push.target-not-prone',
    'push',
    'canPush consumes targetProne and rejects push declarations against prone targets',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
  'push.not-building-target': integrated(
    'push.not-building-target',
    'push',
    'canPush consumes targetObjectType and rejects building or fuel-tank targets as TargetBuilding; event-sourced declarations and stale declared resolution consume explicit non-unit targetObjectType context before falling back to TargetMissing',
    physicalAuthority.PUSH_ACTION_LINES,
  ),
} satisfies Record<string, IPhysicalLegalityGateSupportEntry>;
