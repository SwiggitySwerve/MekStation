import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

export type PhysicalLegalityAttackFamily = 'shared' | 'push' | 'charge' | 'dfa';

export interface IPhysicalLegalityGateSupportEntry extends ICombatFeatureSupportEntry {
  readonly attackFamily: PhysicalLegalityAttackFamily;
  readonly authority: string;
}

function integrated(
  id: string,
  attackFamily: PhysicalLegalityAttackFamily,
  evidence: string,
  authority: string,
): IPhysicalLegalityGateSupportEntry {
  return {
    id,
    attackFamily,
    authority,
    level: 'integrated',
    evidence,
    sourceRefs: sourceRefsForAuthority(authority),
  };
}

function unsupported(
  id: string,
  attackFamily: PhysicalLegalityAttackFamily,
  gap: string,
  authority: string,
): IPhysicalLegalityGateSupportEntry {
  return {
    id,
    attackFamily,
    authority,
    level: 'unsupported',
    evidence:
      'MegaMek legality gate is source-checked but not enforced by MekStation physical restriction helpers',
    gap,
    sourceRefs: sourceRefsForAuthority(authority),
  };
}

const MEGAMEK_PHYSICAL_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekPhysicalSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
  };
}

const PHYSICAL_ATTACK_ACTION_LINES =
  'MegaMek PhysicalAttackAction.toHitIsImpossible, PhysicalAttackAction.java:76-167';
const TARGETABILITY_LIFECYCLE_LINES =
  'MegaMek Game.getValidTargets filters Entity.isTargetable, Game.java:701-718; Entity.isTargetable excludes destroyed units, Entity.java:1967-1976';
const PUSH_ACTION_LINES =
  'MegaMek PushAttackAction.toHit, PushAttackAction.java:112-286';
const CHARGE_ACTION_LINES =
  'MegaMek ChargeAttackAction.toHit, ChargeAttackAction.java:116-274';
const DFA_ACTION_LINES =
  'MegaMek DfaAttackAction.toHit, DfaAttackAction.java:232-329';

const PHYSICAL_ATTACK_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek PhysicalAttackAction.toHitIsImpossible applies shared physical attack impossibility gates',
  'common/actions/PhysicalAttackAction.java',
  'L76-L167',
);

const TARGETABILITY_GAME_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek Game.getValidTargets filters physical target candidates through Entity.isTargetable',
  'common/game/Game.java',
  'L701-L728',
);

const TARGETABILITY_ENTITY_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek Entity.isTargetable excludes destroyed, doomed, off-board, undeployed, transported, captured, and positionless units',
  'common/units/Entity.java',
  'L1963-L1975',
);

const PUSH_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek PushAttackAction.toHit applies push-specific BattleMech legality gates',
  'common/actions/PushAttackAction.java',
  'L112-L286',
);

const CHARGE_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek ChargeAttackAction.toHit applies charge-specific BattleMech legality gates',
  'common/actions/ChargeAttackAction.java',
  'L116-L274',
);

const DFA_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek DfaAttackAction.toHit applies death-from-above-specific legality gates',
  'common/actions/DfaAttackAction.java',
  'L232-L329',
);

function sourceRefsForAuthority(
  authority: string,
): readonly ICombatFeatureSourceReference[] {
  switch (authority) {
    case TARGETABILITY_LIFECYCLE_LINES:
      return [TARGETABILITY_GAME_SOURCE_REF, TARGETABILITY_ENTITY_SOURCE_REF];
    case PUSH_ACTION_LINES:
      return [PUSH_ACTION_SOURCE_REF];
    case CHARGE_ACTION_LINES:
      return [CHARGE_ACTION_SOURCE_REF];
    case DFA_ACTION_LINES:
      return [DFA_ACTION_SOURCE_REF];
    case PHYSICAL_ATTACK_ACTION_LINES:
    default:
      return [PHYSICAL_ATTACK_ACTION_SOURCE_REF];
  }
}

export const PHYSICAL_LEGALITY_GATE_SUPPORT = {
  'shared.target-not-null': integrated(
    'shared.target-not-null',
    'shared',
    'shared restriction helpers reject targetExists=false, event-sourced declarations emit TargetMissing before scheduling, and stale declared events resolve to TargetMissing when the target unit no longer exists',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-destroyed': integrated(
    'shared.target-not-destroyed',
    'shared',
    'shared restriction helpers reject targetDestroyed, event-sourced declarations and stale declared resolution emit TargetDestroyed without damage side effects, and runner enemy selection excludes destroyed physical targets',
    TARGETABILITY_LIFECYCLE_LINES,
  ),
  'shared.friendly-fire': integrated(
    'shared.friendly-fire',
    'shared',
    'shared restriction helpers reject targetIsFriendly, event-sourced declarations emit FriendlyTarget before scheduling, and runner enemy selection excludes same-side physical targets',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.same-board': integrated(
    'shared.same-board',
    'shared',
    'IUnitGameState exposes optional boardId, shared restriction helpers reject explicit board mismatches, and eligibility/session/runner inputs thread attacker/target board identity into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.adjacent-range': integrated(
    'shared.adjacent-range',
    'shared',
    'shared restriction helpers reject explicit non-adjacent targetDistance, event-sourced declarations emit TargetNotAdjacent before scheduling, and runner enemy selection excludes non-adjacent physical targets',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.attacker-not-evading': integrated(
    'shared.attacker-not-evading',
    'shared',
    'IUnitGameState exposes optional isEvading, shared restriction helpers reject attackerEvading, and eligibility/session/runner inputs thread evasion state into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.not-loading-unloading-cargo': integrated(
    'shared.not-loading-unloading-cargo',
    'shared',
    'IUnitGameState exposes optional isLoadingOrUnloadingCargo, shared restriction helpers reject attackerLoadingOrUnloadingCargo, and eligibility/session/runner inputs thread cargo interaction state into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-passenger': integrated(
    'shared.target-not-passenger',
    'shared',
    'shared restriction helpers reject targetIsPassenger, IUnitGameState exposes optional isPassenger, and eligibility/session/runner inputs thread transported-passenger state into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.not-self-target': integrated(
    'shared.not-self-target',
    'shared',
    'shared restriction helpers reject targetIsSelf before adjacency checks, event-sourced declarations emit SelfTarget before scheduling, and runner enemy selection cannot select the acting unit',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-airborne': integrated(
    'shared.target-not-airborne',
    'shared',
    'shared restriction helpers reject targetIsAirborne, IUnitGameState exposes optional isAirborne, and eligibility/session/runner inputs thread airborne target state into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-swarming': integrated(
    'shared.target-not-swarming',
    'shared',
    'shared restriction helpers reject targetIsSwarming, IUnitGameState exposes optional isSwarming, and eligibility/session/runner inputs thread swarm-attack state into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.building-occupancy': integrated(
    'shared.building-occupancy',
    'shared',
    'shared restriction helpers reject targetOccupiedBuildingId unless attackerOccupiedBuildingId matches, IUnitGameState exposes optional occupiedBuildingId, and eligibility/session/runner inputs thread building occupancy state into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.target-not-making-dfa': integrated(
    'shared.target-not-making-dfa',
    'shared',
    'shared restriction helpers reject targetIsMakingDFA, IUnitGameState exposes optional isMakingDFA, and eligibility/session/runner inputs thread DFA-making target state into physical validation',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.invalid-hex-target': unsupported(
    'shared.invalid-hex-target',
    'shared',
    'physical target type does not represent woods clearing, building ignition, or hex ignition targets',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'push.destination-open': integrated(
    'push.destination-open',
    'push',
    'canPush consumes pushDestinationValid, and runner/session displacement helpers reject blocked or off-map push destinations',
    PUSH_ACTION_LINES,
  ),
  'push.attacker-is-mek': integrated(
    'push.attacker-is-mek',
    'push',
    'IUnitGameState carries explicit unitType, canPush rejects explicit non-Mek attackers as AttackerNotMek, and eligibility/session/runner inputs thread attackerUnitType into push validation',
    PUSH_ACTION_LINES,
  ),
  'push.attacker-not-quad': integrated(
    'push.attacker-not-quad',
    'push',
    'canPush consumes attackerIsQuad, IUnitGameState exposes optional isQuad, and eligibility/session/runner inputs thread quad chassis state into push validation',
    PUSH_ACTION_LINES,
  ),
  'push.attacker-grounded': integrated(
    'push.attacker-grounded',
    'push',
    'canPush consumes attackerIsAirborne, IUnitGameState exposes optional isAirborne, and eligibility/session/runner inputs thread airborne attacker state into push validation',
    PUSH_ACTION_LINES,
  ),
  'push.target-is-mek': integrated(
    'push.target-is-mek',
    'push',
    'IUnitGameState carries explicit unitType, canPush rejects explicit non-Mek targets as TargetNotMek, and eligibility/session/runner inputs thread targetUnitType into push validation',
    PUSH_ACTION_LINES,
  ),
  'push.arms-not-flipped': integrated(
    'push.arms-not-flipped',
    'push',
    'canPush consumes attackerArmsFlipped, IUnitGameState exposes optional armsFlipped, and eligibility/session/runner inputs thread rear-flipped arm state into push validation',
    PUSH_ACTION_LINES,
  ),
  'push.both-arms-present': integrated(
    'push.both-arms-present',
    'push',
    'canPush consumes attackerDestroyedLocations, eligibility/session/runner inputs pass unit destroyedLocations, and push declarations reject missing left or right arm with LimbMissing',
    PUSH_ACTION_LINES,
  ),
  'push.no-arms-quirk': integrated(
    'push.no-arms-quirk',
    'push',
    'canPush now rejects No Arms quirk through the shared physical restriction input',
    PUSH_ACTION_LINES,
  ),
  'push.no-arm-weapons-fired': integrated(
    'push.no-arm-weapons-fired',
    'push',
    'canPush rejects supplied arm-fired weapon ids, event-sourced push declarations derive arm-fired ids from weaponLocationById when context is absent, and runner injected push declarations reject hydrated arm-mounted weapon fire while allowing hydrated torso-mounted weapon fire',
    PUSH_ACTION_LINES,
  ),
  'push.same-elevation': integrated(
    'push.same-elevation',
    'push',
    'canPush consumes elevationDifference and rejects non-zero target elevation deltas',
    PUSH_ACTION_LINES,
  ),
  'push.displacement-state-conflicts': integrated(
    'push.displacement-state-conflicts',
    'push',
    'canPush consumes targetIsMakingDisplacementAttack, targetIsPushing, targetDisplacementAttackTargetId, attackerTargetedByDisplacementAttackerId, and targetedByDisplacementAttackerId to reject non-push displacement targets, targets pushing another Mek, attackers already targeted by another displacement attacker, and targets already owned by another displacement attacker while preserving source-backed counter-push allowances',
    PUSH_ACTION_LINES,
  ),
  'push.target-directly-ahead': integrated(
    'push.target-directly-ahead',
    'push',
    'runner, event-sourced session, and eligibility inputs derive pushTargetDirectlyAhead from attacker position/facing and target position; canPush rejects side-adjacent targets',
    PUSH_ACTION_LINES,
  ),
  'push.attacker-not-prone': integrated(
    'push.attacker-not-prone',
    'push',
    'canPush rejects attackerProne before to-hit or displacement side effects',
    PUSH_ACTION_LINES,
  ),
  'push.target-not-prone': integrated(
    'push.target-not-prone',
    'push',
    'canPush consumes targetProne and rejects push declarations against prone targets',
    PUSH_ACTION_LINES,
  ),
  'push.not-building-target': unsupported(
    'push.not-building-target',
    'push',
    'push restrictions do not model building/fuel-tank target rejection',
    PUSH_ACTION_LINES,
  ),
  'charge.requires-run': integrated(
    'charge.requires-run',
    'charge',
    'canCharge rejects declarations when attackerRanThisTurn is false',
    CHARGE_ACTION_LINES,
  ),
  'charge.target-entity': unsupported(
    'charge.target-entity',
    'charge',
    'charge restrictions do not distinguish entity, building, fuel-tank, gun-emplacement, or invalid hex targets',
    CHARGE_ACTION_LINES,
  ),
  'charge.target-mek-standing': integrated(
    'charge.target-mek-standing',
    'charge',
    'canCharge consumes attackerUnitType, targetUnitType, and targetProne; BattleMech-compatible attackers reject explicit non-Mek targets as TargetNotMek and prone targets as TargetProne through eligibility, event-sourced declaration, and runner resolution inputs',
    CHARGE_ACTION_LINES,
  ),
  'charge.no-infantry-protomek': integrated(
    'charge.no-infantry-protomek',
    'charge',
    'canCharge consumes attackerUnitType and targetUnitType to reject explicit non-Mek charges against Infantry, Battle Armor, or ProtoMech targets as TargetInfantryOrProtoMek; eligibility, event-sourced declaration, and runner resolution thread the same target-class gate',
    CHARGE_ACTION_LINES,
  ),
  'charge.elevation-overlap': integrated(
    'charge.elevation-overlap',
    'charge',
    'canCharge consumes elevationDifference plus default standing-Mek heights to reject non-overlapping attacker/target elevation bands as ElevationMismatch; eligibility, event-sourced declaration, and runner resolution thread the same elevation delta',
    CHARGE_ACTION_LINES,
  ),
  'charge.target-moved-or-immobile': integrated(
    'charge.target-moved-or-immobile',
    'charge',
    'canCharge consumes targetMovementComplete and targetImmobile to reject targets that have not completed movement unless they are immobile; eligibility, event-sourced declaration/resolution, and runner resolution thread the post-movement charge gate',
    CHARGE_ACTION_LINES,
  ),
  'charge.displacement-state-conflicts': integrated(
    'charge.displacement-state-conflicts',
    'charge',
    'canCharge consumes targetIsMakingDisplacementAttack and targetedByDisplacementAttackerId to reject targets already making a charge/DFA or already owned by another displacement attacker; eligibility, event-sourced declaration/resolution, runner resolution, and automatic selection thread the same optional displacement state',
    CHARGE_ACTION_LINES,
  ),
  'charge.building-auto-hit': unsupported(
    'charge.building-auto-hit',
    'charge',
    'charge restrictions do not model adjacent building, fuel-tank, or gun-emplacement automatic hit targets',
    CHARGE_ACTION_LINES,
  ),
  'dfa.requires-jump': integrated(
    'dfa.requires-jump',
    'dfa',
    'canDFA rejects declarations when attackerJumpedThisTurn is false',
    DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-infantry': integrated(
    'dfa.attacker-not-infantry',
    'dfa',
    'canDFA consumes attackerUnitType and rejects explicit Infantry/Battle Armor attackers as AttackerInfantry; eligibility, event-sourced declaration, and runner resolution thread the same attacker unit-type gate',
    DFA_ACTION_LINES,
  ),
  'dfa.vtol-elevation-reachable': unsupported(
    'dfa.vtol-elevation-reachable',
    'dfa',
    'DFA restrictions do not model airborne VTOL/WIGE elevation reach against jump MP',
    DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-prone': integrated(
    'dfa.attacker-not-prone',
    'dfa',
    'canDFA rejects attackerProne even when attackerJumpedThisTurn is true',
    DFA_ACTION_LINES,
  ),
  'dfa.displacement-state-conflicts': integrated(
    'dfa.displacement-state-conflicts',
    'dfa',
    'canDFA consumes targetIsMakingDisplacementAttack and targetedByDisplacementAttackerId to reject targets already making a charge/DFA or already owned by another displacement attacker; eligibility, event-sourced declaration/resolution, runner resolution, and automatic selection thread the same optional displacement state',
    DFA_ACTION_LINES,
  ),
  'dfa.target-not-inside-building': integrated(
    'dfa.target-not-inside-building',
    'dfa',
    'canDFA consumes the shared targetOccupiedBuildingId gate and rejects entity targets inside another building as TargetInsideBuilding through eligibility, event-sourced declaration/resolution, and runner resolution inputs',
    DFA_ACTION_LINES,
  ),
  'dfa.building-auto-hit': unsupported(
    'dfa.building-auto-hit',
    'dfa',
    'DFA restrictions do not model adjacent building, fuel-tank, or gun-emplacement automatic hit targets',
    DFA_ACTION_LINES,
  ),
} satisfies Record<string, IPhysicalLegalityGateSupportEntry>;
