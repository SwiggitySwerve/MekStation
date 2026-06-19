export const PHYSICAL_ATTACK_ACTION_LINES =
  'MegaMek PhysicalAttackAction.toHitIsImpossible, PhysicalAttackAction.java:76-167';
export const PUNCH_ACTION_LINES =
  'MegaMek PunchAttackAction.toHitIsImpossible rejects a bad punching arm as Arm missing, PunchAttackAction.java:151-178';
export const KICK_ACTION_LINES =
  'MegaMek KickAttackAction.toHit rejects missing left/right leg locations as Leg missing, KickAttackAction.java:197-216';
export const TARGETABILITY_LIFECYCLE_LINES =
  'MegaMek Game.getValidTargets filters Entity.isTargetable, Game.java:701-718; Entity.isTargetable excludes destroyed units, Entity.java:1967-1976';
export const PUSH_ACTION_LINES =
  'MegaMek PushAttackAction.toHit, PushAttackAction.java:112-286';
export const CHARGE_ACTION_LINES =
  'MegaMek ChargeAttackAction.toHit, ChargeAttackAction.java:116-274';
export const CHARGE_MOVEMENT_PATH_LINES =
  'MegaMek ChargeAttackAction.toHit movement-path validation rejects jumping, backward charge steps, and prone charge endings, ChargeAttackAction.java:404-439';
export const DFA_ACTION_LINES =
  'MegaMek DfaAttackAction movement validation and toHit, DfaAttackAction.java:140-329';
export const STUCK_CHARGE_DFA_LINES =
  'MegaMek Entity.canCharge and Entity.canDFA reject stuck entities before charge or death-from-above declarations, Entity.java:10245-10253';
export const GUN_EMPLACEMENT_AUTOMATIC_HIT_LINES =
  'MegaMek PunchAttackAction, KickAttackAction, ClubAttackAction, and DfaAttackAction return AUTOMATIC_SUCCESS for adjacent GunEmplacement targets after impossibility checks';
export const DISPLACEMENT_ELEVATION_LINES =
  'MegaMek Compute.isValidDisplacement rejects displacement climbs above Entity.getMaxElevationChange; Mek.getMaxElevationChange returns 2 for normal BattleMechs';
export const DISPLACEMENT_PROHIBITED_TERRAIN_LINES =
  'MegaMek Compute.isValidDisplacement rejects entity.isLocationProhibited destinations; Mek.isLocationProhibited rejects IMPASSABLE terrain for normal BattleMechs';
export const DISPLACEMENT_OVERGROWN_TERRAIN_LINES =
  'MegaMek Compute.isValidDisplacement rejects entity.isLocationProhibited destinations; Mek.isLocationProhibited rejects WOODS and JUNGLE terrain levels above 2 for normal BattleMechs';
export const DISPLACEMENT_DOMINO_CHAIN_LINES =
  'MegaMek Compute.isValidDisplacement recursively validates stacking-violation displacement chains, and TWGameManager.doEntityDisplacement applies domino-effect displacement plus PSRs';
export const DISPLACEMENT_DOMINO_STEP_OUT_CFR_LINES =
  'MegaMek TWGameManager.doEntityDisplacement lets a side-entered, non-jumping blocking unit with a legal forward/backward move roll to step out, sends CFR_DOMINO_EFFECT after a successful roll, applies the returned MovePath, and recursively falls back to forced domino displacement on a failed roll, null action, or no response';
export const DISPLACEMENT_FRIENDLY_AVOIDANCE_LINES =
  'MegaMek Compute.getPreferredDisplacement first searches valid displacement destinations that do not contain friendly units before falling back to occupied/friendly hexes';
export const DISPLACEMENT_DROPSHIP_RADIUS_LINES =
  'MegaMek Compute.getValidDisplacement expands displacement search to radius two when the source hex contains a grounded DropShip';
export const CARRIED_CARGO_ARM_LOCKOUT_LINES =
  'MegaMek punch, push, and club physical action legality rejects carried-cargo arm use through Entity.canFireWeapon arm checks';

export const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS =
  [] as const;

export const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS = [
  'shared.displacement-domino-dropship-secondary-hex',
] as const;
