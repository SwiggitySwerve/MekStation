import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import * as physicalAuthority from './CombatPhysicalLegalityGateSupport.authorities';

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

const SOURCE_REFS_BY_AUTHORITY: Readonly<
  Record<string, readonly ICombatFeatureSourceReference[]>
> = {
  [physicalAuthority.PUNCH_ACTION_LINES]: [PUNCH_ACTION_SOURCE_REF],
  [physicalAuthority.KICK_ACTION_LINES]: [KICK_ACTION_SOURCE_REF],
  [physicalAuthority.TARGETABILITY_LIFECYCLE_LINES]: [
    TARGETABILITY_GAME_SOURCE_REF,
    TARGETABILITY_ENTITY_SOURCE_REF,
  ],
  [physicalAuthority.PUSH_ACTION_LINES]: [PUSH_ACTION_SOURCE_REF],
  [physicalAuthority.CHARGE_ACTION_LINES]: [CHARGE_ACTION_SOURCE_REF],
  [physicalAuthority.CHARGE_MOVEMENT_PATH_LINES]: [
    CHARGE_MOVEMENT_PATH_SOURCE_REF,
  ],
  [physicalAuthority.DFA_ACTION_LINES]: [DFA_ACTION_SOURCE_REF],
  [physicalAuthority.STUCK_CHARGE_DFA_LINES]: [STUCK_CHARGE_DFA_SOURCE_REF],
  [physicalAuthority.GUN_EMPLACEMENT_AUTOMATIC_HIT_LINES]: [
    PUNCH_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
    KICK_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
    CLUB_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
    DFA_GUN_EMPLACEMENT_AUTO_HIT_SOURCE_REF,
  ],
  [physicalAuthority.DISPLACEMENT_ELEVATION_LINES]: [
    COMPUTE_DISPLACEMENT_ELEVATION_SOURCE_REF,
    MEK_MAX_ELEVATION_CHANGE_SOURCE_REF,
  ],
  [physicalAuthority.DISPLACEMENT_PROHIBITED_TERRAIN_LINES]: [
    COMPUTE_DISPLACEMENT_PROHIBITED_TERRAIN_SOURCE_REF,
    MEK_PROHIBITED_TERRAIN_SOURCE_REF,
  ],
  [physicalAuthority.DISPLACEMENT_OVERGROWN_TERRAIN_LINES]: [
    COMPUTE_DISPLACEMENT_PROHIBITED_TERRAIN_SOURCE_REF,
    MEK_OVERGROWN_TERRAIN_SOURCE_REF,
  ],
  [physicalAuthority.DISPLACEMENT_DOMINO_CHAIN_LINES]: [
    COMPUTE_DISPLACEMENT_DOMINO_VALIDITY_SOURCE_REF,
    TWGAME_DISPLACEMENT_DOMINO_EFFECT_SOURCE_REF,
  ],
  [physicalAuthority.DISPLACEMENT_DOMINO_STEP_OUT_CFR_LINES]: [
    TWGAME_DISPLACEMENT_DOMINO_STEP_OUT_CFR_SOURCE_REF,
  ],
  [physicalAuthority.DISPLACEMENT_FRIENDLY_AVOIDANCE_LINES]: [
    COMPUTE_DISPLACEMENT_FRIENDLY_AVOIDANCE_SOURCE_REF,
  ],
  [physicalAuthority.DISPLACEMENT_DROPSHIP_RADIUS_LINES]: [
    COMPUTE_DISPLACEMENT_DROPSHIP_RADIUS_SOURCE_REF,
  ],
  [physicalAuthority.CARRIED_CARGO_ARM_LOCKOUT_LINES]: [
    PUNCH_CARRIED_CARGO_SOURCE_REF,
    PUSH_CARRIED_CARGO_SOURCE_REF,
    CLUB_CARRIED_CARGO_SOURCE_REF,
  ],
  [physicalAuthority.PHYSICAL_ATTACK_ACTION_LINES]: [
    PHYSICAL_ATTACK_ACTION_SOURCE_REF,
  ],
};

export function sourceRefsForAuthority(
  authority: string,
): readonly ICombatFeatureSourceReference[] {
  const sourceRefs = SOURCE_REFS_BY_AUTHORITY[authority] ?? [
    PHYSICAL_ATTACK_ACTION_SOURCE_REF,
  ];

  return [...sourceRefs];
}
