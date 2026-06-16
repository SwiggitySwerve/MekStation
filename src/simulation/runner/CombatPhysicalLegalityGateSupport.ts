import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

export type PhysicalLegalityAttackFamily =
  | 'shared'
  | 'punch'
  | 'kick'
  | 'push'
  | 'charge'
  | 'dfa';

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

function outOfScope(
  id: string,
  attackFamily: PhysicalLegalityAttackFamily,
  evidence: string,
  gap: string,
  authority: string,
): IPhysicalLegalityGateSupportEntry {
  return {
    id,
    attackFamily,
    authority,
    level: 'out-of-scope',
    evidence,
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
const PUNCH_ACTION_LINES =
  'MegaMek PunchAttackAction.toHitIsImpossible rejects a bad punching arm as Arm missing, PunchAttackAction.java:151-178';
const KICK_ACTION_LINES =
  'MegaMek KickAttackAction.toHit rejects missing left/right leg locations as Leg missing, KickAttackAction.java:197-216';
const TARGETABILITY_LIFECYCLE_LINES =
  'MegaMek Game.getValidTargets filters Entity.isTargetable, Game.java:701-718; Entity.isTargetable excludes destroyed units, Entity.java:1967-1976';
const PUSH_ACTION_LINES =
  'MegaMek PushAttackAction.toHit, PushAttackAction.java:112-286';
const CHARGE_ACTION_LINES =
  'MegaMek ChargeAttackAction.toHit, ChargeAttackAction.java:116-274';
const CHARGE_MOVEMENT_PATH_LINES =
  'MegaMek ChargeAttackAction.toHit movement-path validation rejects jumping, backward charge steps, and prone charge endings, ChargeAttackAction.java:404-439';
const DFA_ACTION_LINES =
  'MegaMek DfaAttackAction movement validation and toHit, DfaAttackAction.java:140-329';
const STUCK_CHARGE_DFA_LINES =
  'MegaMek Entity.canCharge and Entity.canDFA reject stuck entities before charge or death-from-above declarations, Entity.java:10245-10253';
const GUN_EMPLACEMENT_AUTOMATIC_HIT_LINES =
  'MegaMek PunchAttackAction, KickAttackAction, ClubAttackAction, and DfaAttackAction return AUTOMATIC_SUCCESS for adjacent GunEmplacement targets after impossibility checks';
const DISPLACEMENT_ELEVATION_LINES =
  'MegaMek Compute.isValidDisplacement rejects displacement climbs above Entity.getMaxElevationChange; Mek.getMaxElevationChange returns 2 for normal BattleMechs';
const DISPLACEMENT_PROHIBITED_TERRAIN_LINES =
  'MegaMek Compute.isValidDisplacement rejects entity.isLocationProhibited destinations; Mek.isLocationProhibited rejects IMPASSABLE terrain for normal BattleMechs';
const DISPLACEMENT_OVERGROWN_TERRAIN_LINES =
  'MegaMek Compute.isValidDisplacement rejects entity.isLocationProhibited destinations; Mek.isLocationProhibited rejects WOODS and JUNGLE terrain levels above 2 for normal BattleMechs';
const DISPLACEMENT_DOMINO_CHAIN_LINES =
  'MegaMek Compute.isValidDisplacement recursively validates stacking-violation displacement chains, and TWGameManager.doEntityDisplacement applies domino-effect displacement plus PSRs';
const DISPLACEMENT_DOMINO_STEP_OUT_CFR_LINES =
  'MegaMek TWGameManager.doEntityDisplacement lets a side-entered, non-jumping blocking unit with a legal forward/backward move roll to step out, sends CFR_DOMINO_EFFECT after a successful roll, applies the returned MovePath, and recursively falls back to forced domino displacement on a failed roll, null action, or no response';
const DISPLACEMENT_FRIENDLY_AVOIDANCE_LINES =
  'MegaMek Compute.getPreferredDisplacement first searches valid displacement destinations that do not contain friendly units before falling back to occupied/friendly hexes';
const DISPLACEMENT_DROPSHIP_RADIUS_LINES =
  'MegaMek Compute.getValidDisplacement expands displacement search to radius two when the source hex contains a grounded DropShip';
const CARRIED_CARGO_ARM_LOCKOUT_LINES =
  'MegaMek punch, push, and club physical action legality rejects carried-cargo arm use through Entity.canFireWeapon arm checks';

export const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS =
  [] as const;

export const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS = [
  'shared.displacement-domino-dropship-secondary-hex',
] as const;

const PHYSICAL_ATTACK_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek PhysicalAttackAction.toHitIsImpossible applies shared physical attack impossibility gates',
  'common/actions/PhysicalAttackAction.java',
  'L76-L167',
);

const PUNCH_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek PunchAttackAction.toHitIsImpossible rejects the selected arm when ae.isLocationBad(armLoc)',
  'common/actions/PunchAttackAction.java',
  'L151-L178',
);

const KICK_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek KickAttackAction.toHit rejects kicks when left or right leg locations are bad',
  'common/actions/KickAttackAction.java',
  'L197-L216',
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

const CHARGE_MOVEMENT_PATH_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek ChargeAttackAction.toHit rejects charge movement paths that jump, move backward, or end prone',
  'common/actions/ChargeAttackAction.java',
  'L404-L439',
);

const DFA_ACTION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek DfaAttackAction applies movement-path and death-from-above-specific legality gates',
  'common/actions/DfaAttackAction.java',
  'L140-L329',
);

const STUCK_CHARGE_DFA_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek Entity.canCharge and Entity.canDFA reject stuck entities',
  'common/units/Entity.java',
  'L10245-L10253',
);

const PUNCH_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek PunchAttackAction returns AUTOMATIC_SUCCESS when targeting an adjacent GunEmplacement',
  'common/actions/PunchAttackAction.java',
  'L276-L281',
);

const KICK_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek KickAttackAction returns AUTOMATIC_SUCCESS when targeting an adjacent GunEmplacement',
  'common/actions/KickAttackAction.java',
  'L273-L278',
);

const CLUB_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek ClubAttackAction returns AUTOMATIC_SUCCESS when targeting an adjacent GunEmplacement',
  'common/actions/ClubAttackAction.java',
  'L503-L508',
);

const DFA_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek DfaAttackAction returns AUTOMATIC_SUCCESS when targeting an adjacent GunEmplacement',
  'common/actions/DfaAttackAction.java',
  'L318-L323',
);

const COMPUTE_DISPLACEMENT_ELEVATION_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek Compute.isValidDisplacement rejects displacement destinations above the unit max elevation change',
  'common/compute/Compute.java',
  'L951-L1017',
);

const COMPUTE_DISPLACEMENT_PROHIBITED_TERRAIN_SOURCE_REF =
  megamekPhysicalSourceRef(
    'MegaMek Compute.isValidDisplacement rejects destinations when entity.isLocationProhibited(dest) is true',
    'common/compute/Compute.java',
    'L977-L985',
  );

const MEK_MAX_ELEVATION_CHANGE_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek Mek.getMaxElevationChange returns 2 for normal BattleMechs',
  'common/units/Mek.java',
  'L3416-L3422',
);

const MEK_PROHIBITED_TERRAIN_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek Mek.isLocationProhibited rejects IMPASSABLE terrain for normal BattleMechs',
  'common/units/Mek.java',
  'L4144-L4152',
);

const MEK_OVERGROWN_TERRAIN_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek Mek.isLocationProhibited rejects WOODS and JUNGLE terrain levels above 2 for normal BattleMechs',
  'common/units/Mek.java',
  'L4220-L4221',
);

const COMPUTE_DISPLACEMENT_DOMINO_VALIDITY_SOURCE_REF =
  megamekPhysicalSourceRef(
    'MegaMek Compute.isValidDisplacement recursively validates the unit already in the destination hex instead of treating all occupied destinations as blocked',
    'common/compute/Compute.java',
    'L993-L1000',
  );

const TWGAME_DISPLACEMENT_DOMINO_EFFECT_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek TWGameManager.doEntityDisplacement resolves stacking violations as domino-effect displacement with an attached PilotingRollData',
  'server/totalWarfare/TWGameManager.java',
  'L9013-L9294',
);

const TWGAME_DISPLACEMENT_DOMINO_STEP_OUT_CFR_SOURCE_REF =
  megamekPhysicalSourceRef(
    'MegaMek TWGameManager.doEntityDisplacement checks side-entry, jumping, and forward/backward MovePath legality before a blocker step-out PSR; a success sends CFR_DOMINO_EFFECT and applies the returned MovePath, while failed rolls, null action, or no response recurse into forced displacement',
    'server/totalWarfare/TWGameManager.java',
    'L9190-L9280',
  );

const COMPUTE_DISPLACEMENT_FRIENDLY_AVOIDANCE_SOURCE_REF =
  megamekPhysicalSourceRef(
    'MegaMek Compute.getPreferredDisplacement first skips destinations containing friendly units before falling back to any valid destination',
    'common/compute/Compute.java',
    'L1056-L1114',
  );

const COMPUTE_DISPLACEMENT_DROPSHIP_RADIUS_SOURCE_REF =
  megamekPhysicalSourceRef(
    'MegaMek Compute.getValidDisplacement searches at radius two when the source hex contains a grounded DropShip',
    'common/compute/Compute.java',
    'L1019-L1046',
  );

const PUNCH_CARRIED_CARGO_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek PunchAttackAction rejects punching with an arm that cannot fire because it is carrying cargo',
  'common/actions/PunchAttackAction.java',
  'L200-L209',
);

const PUSH_CARRIED_CARGO_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek PushAttackAction rejects pushing when neither BattleMech arm can fire because both are carrying cargo',
  'common/actions/PushAttackAction.java',
  'L93-L101',
);

const CLUB_CARRIED_CARGO_SOURCE_REF = megamekPhysicalSourceRef(
  'MegaMek ClubAttackAction rejects club attacks when cargo occupies the required arm-use path',
  'common/actions/ClubAttackAction.java',
  'L312-L320',
);

function sourceRefsForAuthority(
  authority: string,
): readonly ICombatFeatureSourceReference[] {
  switch (authority) {
    case PUNCH_ACTION_LINES:
      return [PUNCH_ACTION_SOURCE_REF];
    case KICK_ACTION_LINES:
      return [KICK_ACTION_SOURCE_REF];
    case TARGETABILITY_LIFECYCLE_LINES:
      return [TARGETABILITY_GAME_SOURCE_REF, TARGETABILITY_ENTITY_SOURCE_REF];
    case PUSH_ACTION_LINES:
      return [PUSH_ACTION_SOURCE_REF];
    case CHARGE_ACTION_LINES:
      return [CHARGE_ACTION_SOURCE_REF];
    case CHARGE_MOVEMENT_PATH_LINES:
      return [CHARGE_MOVEMENT_PATH_SOURCE_REF];
    case DFA_ACTION_LINES:
      return [DFA_ACTION_SOURCE_REF];
    case STUCK_CHARGE_DFA_LINES:
      return [STUCK_CHARGE_DFA_SOURCE_REF];
    case GUN_EMPLACEMENT_AUTOMATIC_HIT_LINES:
      return [
        PUNCH_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
        KICK_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
        CLUB_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
        DFA_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
      ];
    case DISPLACEMENT_ELEVATION_LINES:
      return [
        COMPUTE_DISPLACEMENT_ELEVATION_SOURCE_REF,
        MEK_MAX_ELEVATION_CHANGE_SOURCE_REF,
      ];
    case DISPLACEMENT_PROHIBITED_TERRAIN_LINES:
      return [
        COMPUTE_DISPLACEMENT_PROHIBITED_TERRAIN_SOURCE_REF,
        MEK_PROHIBITED_TERRAIN_SOURCE_REF,
      ];
    case DISPLACEMENT_OVERGROWN_TERRAIN_LINES:
      return [
        COMPUTE_DISPLACEMENT_PROHIBITED_TERRAIN_SOURCE_REF,
        MEK_OVERGROWN_TERRAIN_SOURCE_REF,
      ];
    case DISPLACEMENT_DOMINO_CHAIN_LINES:
      return [
        COMPUTE_DISPLACEMENT_DOMINO_VALIDITY_SOURCE_REF,
        TWGAME_DISPLACEMENT_DOMINO_EFFECT_SOURCE_REF,
      ];
    case DISPLACEMENT_DOMINO_STEP_OUT_CFR_LINES:
      return [TWGAME_DISPLACEMENT_DOMINO_STEP_OUT_CFR_SOURCE_REF];
    case DISPLACEMENT_FRIENDLY_AVOIDANCE_LINES:
      return [COMPUTE_DISPLACEMENT_FRIENDLY_AVOIDANCE_SOURCE_REF];
    case DISPLACEMENT_DROPSHIP_RADIUS_LINES:
      return [COMPUTE_DISPLACEMENT_DROPSHIP_RADIUS_SOURCE_REF];
    case CARRIED_CARGO_ARM_LOCKOUT_LINES:
      return [
        PUNCH_CARRIED_CARGO_SOURCE_REF,
        PUSH_CARRIED_CARGO_SOURCE_REF,
        CLUB_CARRIED_CARGO_SOURCE_REF,
      ];
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
  'shared.carried-cargo-arm-lockout': integrated(
    'shared.carried-cargo-arm-lockout',
    'shared',
    'IUnitGameState exposes optional per-arm carried-cargo state, and eligibility/session/runner physical inputs reject selected-arm punch, selected-arm brush-off, arm-mounted melee weapon, two-handed Zweihander, and both-arms-carrying push declarations with AttackerCargoInteraction while preserving one-free-arm push legality',
    CARRIED_CARGO_ARM_LOCKOUT_LINES,
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
  'shared.invalid-hex-target': integrated(
    'shared.invalid-hex-target',
    'shared',
    'shared restriction helpers consume targetObjectType and reject woods-clearing, building-ignition, and hex-ignition physical targets as InvalidPhysicalTarget; event-sourced declarations and stale declared resolution consume explicit non-unit targetObjectType context before falling back to TargetMissing',
    PHYSICAL_ATTACK_ACTION_LINES,
  ),
  'shared.gun-emplacement-automatic-hit': integrated(
    'shared.gun-emplacement-automatic-hit',
    'shared',
    'calculatePhysicalToHit marks explicit or hydrated gun-emplacement targets as automatic success for punch, kick, DFA, and supported club/melee attacks; resolvePhysicalAttack skips to-hit dice and PhysicalAttackResolved carries automaticHit metadata',
    GUN_EMPLACEMENT_AUTOMATIC_HIT_LINES,
  ),
  'shared.displacement-elevation-cap': integrated(
    'shared.displacement-elevation-cap',
    'shared',
    'isValidDisplacement now rejects BattleMech displacement destinations that climb more than two elevation levels from source, and push/charge/DFA session plus runner displacement helpers thread that cap before emitting displacement or PSR side effects',
    DISPLACEMENT_ELEVATION_LINES,
  ),
  'shared.displacement-prohibited-terrain': integrated(
    'shared.displacement-prohibited-terrain',
    'shared',
    'isValidDisplacement now rejects explicit impassable terrain destinations before push/charge/DFA position changes; helper, event-sourced, and runner charge coverage keep successful charge damage while suppressing displacement and charge PSRs',
    DISPLACEMENT_PROHIBITED_TERRAIN_LINES,
  ),
  'shared.displacement-overgrown-terrain': integrated(
    'shared.displacement-overgrown-terrain',
    'shared',
    'isValidDisplacement now rejects represented woods/jungle terrain levels above two before push/charge/DFA position changes; helper, event-sourced, and runner charge coverage keep successful charge damage while suppressing displacement and charge PSRs',
    DISPLACEMENT_OVERGROWN_TERRAIN_LINES,
  ),
  'shared.displacement-domino-positional-chain': integrated(
    'shared.displacement-domino-positional-chain',
    'shared',
    'isValidDisplacement recursively validates occupied destination blockers, and represented push/charge/DFA/charge-miss target-displacement helpers emit positional domino payload chains; runner charge coverage proves multi-blocker chain application to unit positions while queuing source-backed DominoEffect PSRs for each forced blocker',
    DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-minefield-fallout': integrated(
    'shared.displacement-domino-minefield-fallout',
    'shared',
    'Runner physical attack displacement applies represented TerrainType.Mines BattleMech leg damage plus resulting damage PSR side effects, represented conventional coordinate-state minefield damage plus density reduction/MinefieldChanged fallout, represented inferno coordinate-state pendingExternalHeat and infernoBurning fallout, already-detonated coordinate suppression, and non-conventional coordinate-state no-fallback guards, with GamePhase.PhysicalAttack when a push/charge/DFA/charge-miss domino displacement lands in an existing represented mine destination',
    DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-chain': integrated(
    'shared.displacement-domino-chain',
    'shared',
    'Represented push/charge/DFA/charge-miss displacement now covers the source-backed recursive occupied-hex domino chain: helper legality accepts recursively displaceable occupied destinations, target-displacement helpers emit ordered domino payloads, the runner applies the chain to unit positions, refreshes same-phase occupancy, queues DominoEffect PSRs for forced blockers, and applies represented mine destination fallout through shared.displacement-domino-minefield-fallout',
    DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-secondary-fallout': integrated(
    'shared.displacement-domino-secondary-fallout',
    'shared',
    'Broad domino secondary-fallout accounting is split: represented positional chains, forced-blocker DominoEffect PSRs, mine destination fallout, represented terrain/building destination PSR fallout, friendly avoidance, grounded-DropShip radius search, and the BattleMech-relevant TWGameManager.doEntityDisplacement voluntary blocker step-out branch are integrated sibling rows; full DropShip footprint/secondary-hex handling is tracked outside the BattleMech validation matrix',
    DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-step-out-cfr': integrated(
    'shared.displacement-domino-step-out-cfr',
    'shared',
    'Represented domino displacement now carries a replayable blockerStepOutDecision on PhysicalAttackDeclared payloads: helper, event-sourced session, and runner coverage accept successful side-entered/non-jumping/legal-forward-or-backward step-out decisions as domino_step_out displacements without forced DominoEffect PSRs, while invalid, declined, failed, or no-response decisions fall back to the source-backed forced domino chain',
    DISPLACEMENT_DOMINO_STEP_OUT_CFR_LINES,
  ),
  'shared.displacement-domino-terrain-building-environment-fallout': integrated(
    'shared.displacement-domino-terrain-building-environment-fallout',
    'shared',
    'Runner physical attack displacement now applies represented destination terrain/building PSR fallout for forced domino blockers in addition to represented mine fallout: water entry/exit, entering rubble, moving on ice, swamp bog-down, and overloaded explicit building constructionFactor PSRs are queued and emitted in GamePhase.PhysicalAttack. Broader non-PSR terrain mutation, building CF/collapse damage mutation, fire/smoke/environment side effects, and full MegaMek parity remain outside this bounded represented slice.',
    DISPLACEMENT_DOMINO_CHAIN_LINES,
  ),
  'shared.displacement-domino-dropship-secondary-hex': outOfScope(
    'shared.displacement-domino-dropship-secondary-hex',
    'shared',
    'The BattleMech runner hydrates grounded DropShip source context for represented DFA hit radius-two target displacement search; broader DropShip footprint and secondary-hex consequences after domino displacement require a separate non-BattleMech/large-unit validation matrix',
    'Out-of-scope for this BattleMech validation suite: full DropShip footprint and secondary-hex consequences after TWGameManager.doEntityDisplacement domino chains are not modeled by the BattleMech physical displacement helper',
    DISPLACEMENT_DROPSHIP_RADIUS_LINES,
  ),
  'shared.displacement-friendly-avoidance': integrated(
    'shared.displacement-friendly-avoidance',
    'shared',
    'computePreferredDisplacement accepts friendly occupant ids and first scans valid DFA-miss displacement destinations while skipping friendly occupied hexes before falling back; event-sourced and runner DFA miss resolution hydrate same-side target friendlies into that source-backed pass',
    DISPLACEMENT_FRIENDLY_AVOIDANCE_LINES,
  ),
  'shared.displacement-dropship-radius': integrated(
    'shared.displacement-dropship-radius',
    'shared',
    'computeValidDisplacement accepts explicit grounded DropShip source context and searches the radius-two ring in the MegaMek getValidDisplacement order; runner and event-sourced DFA hit displacement hydrate same-board grounded DropShip units sharing the target source hex into that radius-two search while broader DropShip footprint consequences remain outside this row',
    DISPLACEMENT_DROPSHIP_RADIUS_LINES,
  ),
  'punch.selected-arm-present': integrated(
    'punch.selected-arm-present',
    'punch',
    'canPunch consumes attackerDestroyedLocations and rejects the selected punching arm as LimbMissing; eligibility, event-sourced declaration, and runner resolution thread unit destroyedLocations into the same helper',
    PUNCH_ACTION_LINES,
  ),
  'kick.both-legs-present': integrated(
    'kick.both-legs-present',
    'kick',
    'canKick consumes attackerDestroyedLocations and rejects missing left or right BattleMech legs as LimbMissing; eligibility, event-sourced declaration, and runner resolution thread unit destroyedLocations into the same helper',
    KICK_ACTION_LINES,
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
  'push.not-building-target': integrated(
    'push.not-building-target',
    'push',
    'canPush consumes targetObjectType and rejects building or fuel-tank targets as TargetBuilding; event-sourced declarations and stale declared resolution consume explicit non-unit targetObjectType context before falling back to TargetMissing',
    PUSH_ACTION_LINES,
  ),
  'charge.requires-run': integrated(
    'charge.requires-run',
    'charge',
    'canCharge rejects declarations when attackerRanThisTurn is false',
    CHARGE_ACTION_LINES,
  ),
  'charge.no-jump-movement': integrated(
    'charge.no-jump-movement',
    'charge',
    'canCharge consumes attackerJumpedThisTurn and rejects ChargeJumpMovement through helper, eligibility, event-sourced declaration/resolution, and runner resolution before the run/backward/prone movement-path gates',
    CHARGE_MOVEMENT_PATH_LINES,
  ),
  'charge.no-backward-movement': integrated(
    'charge.no-backward-movement',
    'charge',
    'MovementDeclared step chains hydrate movedBackwardThisTurn; canCharge rejects ChargeBackwardMovement through helper, eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection before prone-state validation',
    CHARGE_MOVEMENT_PATH_LINES,
  ),
  'charge.attacker-not-prone': integrated(
    'charge.attacker-not-prone',
    'charge',
    'canCharge rejects attackerProne after the source-backed run gate passes; event-sourced declarations emit AttackerProne before scheduling and runner physical phase skips prone attackers before bot/automatic charge declarations',
    CHARGE_MOVEMENT_PATH_LINES,
  ),
  'charge.attacker-not-stuck': integrated(
    'charge.attacker-not-stuck',
    'charge',
    'canCharge consumes attackerStuck and rejects stuck attackers before charge movement-path gates; eligibility, event-sourced declarations, and runner resolution thread isStuck from swamp bog-down state',
    STUCK_CHARGE_DFA_LINES,
  ),
  'charge.target-entity': integrated(
    'charge.target-entity',
    'charge',
    'canCharge consumes targetObjectType and rejects explicit building or fuel-tank charge targets as InvalidPhysicalTarget, matching MegaMek source order where non-entity targets return Invalid Target before later physical target branches; event-sourced declarations and stale declared resolution consume explicit non-unit targetObjectType context',
    CHARGE_ACTION_LINES,
  ),
  'charge.target-mek-standing': integrated(
    'charge.target-mek-standing',
    'charge',
    'canCharge consumes attackerUnitType, targetUnitType, targetObjectType, and targetProne; BattleMech-compatible attackers reject explicit non-Mek or gun-emplacement targets as TargetNotMek and prone targets as TargetProne through eligibility, event-sourced declaration, and runner resolution inputs',
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
  'charge.building-auto-hit': integrated(
    'charge.building-auto-hit',
    'charge',
    'canCharge rejects explicit building and fuel-tank targetObjectType values as InvalidPhysicalTarget because MegaMek ChargeAttackAction returns Invalid Target for non-entity targets before its later adjacent-building branch; event-sourced declarations and stale declared resolution now preserve that rejection instead of reporting TargetMissing',
    CHARGE_ACTION_LINES,
  ),
  'dfa.requires-jump': integrated(
    'dfa.requires-jump',
    'dfa',
    'canDFA rejects declarations when attackerJumpedThisTurn is false',
    DFA_ACTION_LINES,
  ),
  'dfa.no-mechanical-jump-booster': integrated(
    'dfa.no-mechanical-jump-booster',
    'dfa',
    'MovementDeclared step chains hydrate usedMechanicalJumpBoosterThisTurn; canDFA consumes attackerUsedMechanicalJumpBooster and rejects MechanicalJumpBooster through helper, eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection',
    DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-infantry': integrated(
    'dfa.attacker-not-infantry',
    'dfa',
    'canDFA consumes attackerUnitType and rejects explicit Infantry/Battle Armor attackers as AttackerInfantry; eligibility, event-sourced declaration, and runner resolution thread the same attacker unit-type gate',
    DFA_ACTION_LINES,
  ),
  'dfa.vtol-elevation-reachable': integrated(
    'dfa.vtol-elevation-reachable',
    'dfa',
    'canDFA distinguishes targetIsAirborneVTOLorWIGE from generic airborne targets and rejects unreachable VTOL/WIGE targets when target elevation above attacker height exceeds attackerJumpMP; eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection hydrate explicit airborne VTOL targets from unit type and WIGE targets from combat motion type when attacker jump MP and elevation context are present',
    DFA_ACTION_LINES,
  ),
  'dfa.target-moved-or-immobile': integrated(
    'dfa.target-moved-or-immobile',
    'dfa',
    'canDFA consumes targetMovementComplete and targetImmobile to reject targets that have not completed movement unless they are immobile; eligibility and event-sourced declaration/resolution thread the same post-movement gate, while runner physical resolution is already post-movement complete',
    DFA_ACTION_LINES,
  ),
  'dfa.target-not-dropship': integrated(
    'dfa.target-not-dropship',
    'dfa',
    'canDFA consumes targetUnitType and rejects explicit DropShip targets as TargetDropShip; eligibility, event-sourced declaration/resolution, and runner resolution thread target unit type into DFA validation',
    DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-prone': integrated(
    'dfa.attacker-not-prone',
    'dfa',
    'canDFA rejects attackerProne even when attackerJumpedThisTurn is true',
    DFA_ACTION_LINES,
  ),
  'dfa.attacker-not-stuck': integrated(
    'dfa.attacker-not-stuck',
    'dfa',
    'canDFA consumes attackerStuck and rejects stuck attackers before DFA jump/prone gates; eligibility, event-sourced declarations, and runner resolution thread isStuck from swamp bog-down state',
    STUCK_CHARGE_DFA_LINES,
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
  'dfa.building-auto-hit': integrated(
    'dfa.building-auto-hit',
    'dfa',
    'canDFA rejects explicit building and fuel-tank targetObjectType values as InvalidPhysicalTarget because MegaMek DfaAttackAction returns Invalid Target for non-entity targets before its later adjacent-building branch; event-sourced declarations now preserve that rejection instead of reporting TargetMissing',
    DFA_ACTION_LINES,
  ),
} satisfies Record<string, IPhysicalLegalityGateSupportEntry>;
