import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS } from './CombatSpecialWeaponSourceRefs';

export const SPECIAL_WEAPON_PLASMA_COMBAT_SUPPORT = {
  'plasma-cannon-battlemech-target-heat': integrated(
    'plasma-cannon-battlemech-target-heat',
    'Runner plasma-cannon hits against BattleMechs emit zero BattleMech damage, queue source-backed 2d6 external target heat in a Heat Phase pending bucket, adjust heat for reflective or heat-dissipating armor including PLAYTEST_3 behavior, preserve turn-boundary cap reset, and consume source-backed plasma ammo despite MegaMek energy flags',
    MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS,
  ),
  'plasma-cannon-battlemech-heat-phase-pending-bucket': integrated(
    'plasma-cannon-battlemech-heat-phase-pending-bucket',
    'Runner plasma-cannon BattleMech target heat is stored on pendingExternalHeat during Weapon Attack, applies as external HeatGenerated in Heat Phase, clears the pending bucket, and enforces the existing 15-point external heat per-turn cap through externalHeatThisTurn',
    MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
