/**
 * Infantry Weapon Table
 *
 * Canonical list of infantry personal weapons per TechManual.
 * Each entry captures the stats needed for construction validation
 * and combat damage calculation (handled in add-infantry-combat-behavior).
 *
 * Heavy weapons may only be the primary weapon for Mechanized or Motorized
 * motive platoons (VAL-INF-WEAPON).
 *
 * Each entry carries `infantryDamage` — the canonical damage-per-trooper
 * value consumed by MegaMek's `Infantry.getDamagePerTrooper()` formula
 * (`InfantryWeapon.getInfantryDamage()`). Values are sourced from the
 * representative MegaMek infantry-weapon classes for each generic
 * category (e.g. Auto-Rifle = `InfantryRifleAutoRifleWeapon` 0.52,
 * Support Laser = `InfantrySupportLaserWeapon` 0.84). This is the
 * OUTGOING per-trooper damage figure — distinct from `damageDivisor`,
 * which governs INCOMING-damage division.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/infantry-unit-system/spec.md
 *   (Requirement: Primary Weapon Types — infantryDamage field)
 */

import { IInfantryWeaponEntry } from '@/types/unit/InfantryInterfaces';

// ============================================================================
// Weapon Table
// ============================================================================

/**
 * All infantry weapons available for primary and secondary selection.
 * Sorted: light/common first, heavy support last.
 */
export const INFANTRY_WEAPON_TABLE: readonly IInfantryWeaponEntry[] = [
  // --- Standard personal weapons ---
  {
    id: 'inf-rifle',
    name: 'Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.28,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: '',
    special: [],
    secondaryRatio: 4,
  },
  {
    id: 'inf-auto-rifle',
    name: 'Auto-Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.52,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'auto-rifle',
    special: ['ballistic'],
    secondaryRatio: 3,
  },
  {
    id: 'inf-laser-rifle',
    name: 'Laser Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.28,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: '',
    special: ['energy'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-needler',
    name: 'Needler',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.11,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'needler',
    special: ['anti-infantry'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-gyrojet',
    name: 'Gyrojet Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.14,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'gyrojet',
    special: ['vacuum-capable'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-flamer',
    name: 'Flamer',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.35,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 0,
    heat: 1,
    ammoType: 'flamer',
    special: ['heat', 'incendiary'],
    secondaryRatio: 4,
  },
  // --- Missile launchers (secondary-typical) ---
  {
    id: 'inf-srm2',
    name: 'SRM Launcher',
    isHeavy: false,
    damageDivisor: 6,
    infantryDamage: 0.57,
    rangeShort: 3,
    rangeMedium: 6,
    rangeLong: 9,
    heat: 0,
    ammoType: 'srm',
    special: ['missile'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-lrm5',
    name: 'LRM Launcher',
    isHeavy: false,
    damageDivisor: 6,
    infantryDamage: 0.19,
    rangeShort: 6,
    rangeMedium: 12,
    rangeLong: 21,
    heat: 0,
    ammoType: 'lrm',
    special: ['missile', 'indirect'],
    secondaryRatio: 4,
  },
  // --- Heavy support weapons (Mechanized / Motorized only) ---
  {
    id: 'inf-mg',
    name: 'Machine Gun',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.49,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'mg',
    special: ['ballistic'],
    secondaryRatio: 2,
  },
  {
    id: 'inf-support-heavy-mg',
    name: 'Support Heavy MG',
    isHeavy: true,
    damageDivisor: 5,
    infantryDamage: 0.65,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'mg-heavy',
    special: ['ballistic', 'support'],
    secondaryRatio: 2,
  },
  {
    id: 'inf-support-laser',
    name: 'Support Laser',
    isHeavy: true,
    damageDivisor: 5,
    infantryDamage: 0.84,
    rangeShort: 1,
    rangeMedium: 3,
    rangeLong: 5,
    heat: 2,
    ammoType: '',
    special: ['energy', 'support'],
    secondaryRatio: 3,
  },
  {
    id: 'inf-support-ppc',
    name: 'Support PPC',
    isHeavy: true,
    damageDivisor: 3,
    infantryDamage: 1.58,
    rangeShort: 3,
    rangeMedium: 6,
    rangeLong: 12,
    heat: 5,
    ammoType: '',
    special: ['energy', 'support'],
    secondaryRatio: 3,
  },
] as const;

// ============================================================================
// Lookup helpers
// ============================================================================

/**
 * Fast lookup by weapon ID.
 * Returns undefined if the ID is not in the table.
 */
export function findWeaponById(id: string): IInfantryWeaponEntry | undefined {
  return INFANTRY_WEAPON_TABLE.find((w) => w.id === id);
}

/**
 * Return all weapons that are legal as a primary weapon for a given
 * isHeavy constraint. Foot/Jump platoons may not use heavy primaries.
 */
export function getPrimaryWeaponOptions(
  allowHeavy: boolean,
): readonly IInfantryWeaponEntry[] {
  return allowHeavy
    ? INFANTRY_WEAPON_TABLE
    : INFANTRY_WEAPON_TABLE.filter((w) => !w.isHeavy);
}

// Pinned 48fcb2f64 weapon BV/flags absent from the equipment catalog. These are
// BV facts, not a second infantryDamage table. Each row cites its Java owner.
type WeaponBV = { bv: number; support: boolean; archaic: boolean };
const SOURCE_BV = new Map<string, WeaponBV>();
for (const row of [
  'AA Weapon (Mk. 1, Light)|0.7|s', // InfantrySupportMk1LightAAWeapon.java:71
  'AA Weapon (Mk. 2, Man-Portable)|4.14|s', // InfantrySupportMk2PortableAAWeapon.java:71
  'Auto-Pistol|0.19|', // InfantryPistolAutoPistolWeapon.java:70
  'Auto-Pistol (M&G)|0.16|', // InfantryPistolMauserAutoPistolWeapon.java:71
  'Auto-Pistol (Magnum)|0.19|', // InfantryPistolMagnumAutoPistolWeapon.java:70
  'Auto-Pistol (Nambu)|0.19|', // InfantryPistolNambuAutoPistolWeapon.java:71
  'Auto-Pistol (Serrek 7875D)|0.15|', // InfantryPistolSerrekAutoPistolWeapon.java:71
  'Auto-Shotgun|0.21|', // InfantryShotgunAutomaticWeapon.java:70
  'Autocannon (Bearhunter Superheavy)|2.13|s', // InfantrySupportClanBearhunterAutocannonWeapon.java:72
  'Autocannon (Semi-Portable)|2.35|s', // InfantrySupportPortableAutocannonWeapon.java:72
  'Blade (Dagger/Knife/Bayonet)|0.02|a', // InfantryArchaicDaggerWeapon.java:72
  'Blade (Vibro-blade)|0.19|a', // InfantryArchaicVibroBladeWeapon.java:71
  'Blade (Vibro-katana)|0.29|a', // InfantryArchaicVibroKatanaWeapon.java:71
  'Ceres Arms Crowdbuster|0.1|', // InfantryShotgunCeresCrowdbusterWeapon.java:70
  'Elephant Gun|0.34|', // InfantryRifleElephantGunWeapon.java:69
  'Flamer (Heavy)|0.72|s', // InfantrySupportHeavyFlamerWeapon.java:70
  'Flamer (Man-Portable)|0.5|s', // InfantrySupportPortableFlamerWeapon.java:72
  'Gauss Cannon (Grand Mauler)|3.22|s', // InfantrySupportGrandMaulerGaussCannonWeapon.java:72
  'Gauss Rifle (Gungnir Heavy Support)|0.0|s', // InfantrySupportGungnirHeavyGaussWeapon.java:65
  'Gauss Rifle (Thunderstroke II)|2.71|', // InfantryRifleThunderstrokeIIWeapon.java:73
  'Gauss Rifle (Thunderstroke)|0.79|', // InfantryRifleThunderstrokeWeapon.java:71
  'Gauss Rifle (Tsunami Heavy)|3.22|s', // InfantrySupportTsunamiHeavyGaussRifleWeapon.java:72
  'Gauss Rifle, Light (David)|4.01|s', // InfantrySupportDavidLightGaussRifleWeapon.java:70
  'Gauss Rifle, Light (King David)|4.87|s', // InfantrySupportKingDavidLightGaussRifleWeapon.java:72
  'Gauss Submachine Gun|1.38|', // InfantrySMGClanGaussWeapon.java:72
  'Grenade Launcher|2.48|s', // InfantrySupportGrenadeLauncherWeapon.java:70
  'Grenade Launcher (Compact)|0.49|s', // InfantrySupportGrenadeLauncherCompactWeapon.java:71
  'Gyrojet Rifle|1.07|', // InfantryRifleGyrojetRifleWeapon.java:70
  'Gyroslug Rifle|1.07|', // InfantryRifleGyroslugRifleWeapon.java:70
  'InfantryAssaultRifle|1.59|', // InfantryRifleAutoRifleWeapon.java:75
  'InfantryAutoGL|4.55|s', // InfantrySupportGrenadeLauncherAutoWeapon.java:70
  'InfantryAutoGLInferno|1.25|s', // InfantrySupportGrenadeLauncherAutoInfernoWeapon.java:71
  'InfantryFederatedBarrettM42B|3.12|', // InfantryRifleFederatedBarrettM42BWeapon.java:64
  'InfantryFederatedBarrettM61A|3.83|', // InfantryRifleFederatedBarrettM61ALaserWeapon.java:64
  'InfantryHRR|2.91|s', // InfantrySupportRecoillessRifleHeavyWeapon.java:71
  'InfantryHeavyGrenadeLauncherInferno|2.11|s', // InfantrySupportHeavyGrenadeLauncherInfernoWeapon.java:72
  'InfantryHeavyMortar|4.09|s', // InfantrySupportMortarHeavyWeapon.java:73
  'InfantryHeavySRM|2.91|s', // InfantrySupportSRMHeavyWeapon.java:79
  'InfantryLRM|3.44|s', // InfantrySupportLRMWeapon.java:74
  'InfantryLRR|2.45|s', // InfantrySupportRecoillessRifleLightWeapon.java:71
  'InfantryLightMortar|1.62|s', // InfantrySupportMortarLightWeapon.java:73
  'InfantryMRR|2.71|s', // InfantrySupportRecoillessRifleMediumWeapon.java:71
  'InfantryMiniGrenadeInferno|0.1|s', // InfantryGrenadeMiniInfernoWeapon.java:72
  'InfantryOneShotMRM|2.71|s', // InfantrySupportOneShotMRMWeapon.java:72
  'InfantrySRMLight|2.91|s', // InfantrySupportSRMLightWeapon.java:79
  'InfantryStandardSRM|5.83|s', // InfantrySupportSRMStandardWeapon.java:79
  'InfantryTAG|0|s', // InfantrySupportTAGWeapon.java:65
  'Laser (Hellbore Assault)|3.22|s', // InfantrySupportHellboreAssaultLaserWeapon.java:72
  'Laser Pistol (Blazer)|0.79|', // InfantryPistolBlazerPistolWeapon.java:70
  'Laser Pistol (Sunbeam)|0.86|', // InfantryPistolSunbeamLaserPistolWeapon.java:71
  'Laser Rifle|1.43|', // InfantryRifleLaserWeapon.java:63
  'Laser Rifle (Blazer)|1.79|', // InfantryRifleBlazerRifleWeapon.java:71
  'Laser Rifle (ER [Sunbeam Starfire])|2.01|', // InfantryRifleSunbeamStarfireERLaserWeapon.java:71
  'Laser Rifle (ER)|2.01|', // InfantryRifleClanERLaserWeapon.java:71
  'Laser Rifle (Ebony Assault)|1.07|', // InfantryRifleEbonyAssaultLaserWeapon.java:71
  'Laser Rifle (Intek)|1.51|', // InfantryRifleIntekLaserWeapon.java:71
  'Laser Rifle (Magna)|1.33|', // InfantryRifleMagnaLaserWeapon.java:64
  'Laser Rifle (Marx XX)|1.86|', // InfantryRifleMarxXXLaserWeapon.java:71
  'Laser Rifle (Mauser 1200 LSS)|5.32|', // InfantryRifleMauser1200LSSWeapon.java:64
  'Laser Rifle (Mauser 960)|4.75|', // InfantryRifleMauser960LaserWeapon.java:64
  'Laser Rifle (Mauser IIC IAS)|9.82|', // InfantryRifleClanMauserIICIASWeapon.java:72
  'Laser Rifle (Maxell PL-10)|1.33|', // InfantryRifleMaxellPL10LaserWeapon.java:71
  'Machine Gun (Portable)|1.99|s', // InfantrySupportMGPortableWeapon.java:71
  'Machine Gun (Semi-Portable)|2.29|s', // InfantrySupportMGSemiPortableWeapon.java:71
  'Machine Gun (Support)|4.8|s', // InfantrySupportMGSupportWeapon.java:71
  'Needler Pistol|0.21|', // InfantryPistolNeedlerPistolWeapon.java:69
  'Needler Rifle|0.21|', // InfantryRifleNeedlerWeapon.java:69
  'Needler Rifle (M&G Flechette)|0.1|', // InfantryRifleMGFlechetteNeedlerWeapon.java:64
  'Needler Rifle (Shredder Heavy)|0.31|', // InfantryRifleShredderHeavyNeedlerWeapon.java:71
  'Needler, Support (Firedrake)|6.13|s', // InfantrySupportFiredrakeNeedlerWeapon.java:72
  'Particle Cannon (Semi-Portable)|3.68|s', // InfantrySupportSemiPortablePPCWeapon.java:72
  'Particle Cannon (Support)|11.32|s', // InfantrySupportHeavyPPCWeapon.java:72
  'Pistol (Sternsnacht Heavy [Claymore])|0.08|', // InfantryPistolSternsnachtPistolWeapon.java:72
  'Plasma Rifle (Man-Portable)|8.08|s', // InfantrySupportPortablePlasmaWeapon.java:73
  'Pulse Laser Rifle (Inner Sphere)|0.76|', // InfantryRiflePulseLaserWeapon.java:71
  'Rifle (Bolt-Action)|0.43|', // InfantryRifleBoltActionWeapon.java:70
  'Rifle (Federated Long)|1.07|', // InfantryRifleFederatedLongWeapon.java:71
  'Rifle (Imperator AX-22 Assault)|1.59|', // InfantryRifleImperatorAX22AssaultWeapon.java:71
  'Rifle (M&G G-150)|1.64|', // InfantryRifleMauserG150Weapon.java:71
  'Rifle (Makeshift)|0.09|', // InfantryRifleMakeshiftWeapon.java:70
  'Rifle (Striker Carbine)|0.29|', // InfantryRifleStrikerCarbineRifleWeapon.java:69
  'Rifle (TK Assault)|1.34|', // InfantryRifleTKAssaultWeapon.java:71
  'Rifle (Zeus Heavy)|0.67|', // InfantryRifleZeusHeavyWeapon.java:71
  'Rocket Launcher (V-LAW)|1.47|s', // InfantrySupportRocketLauncherVLAWWeapon.java:71
  'SMG (Gunther MP-20)|0.3|', // InfantrySMGGuntherMP20Weapon.java:71
  'Shotgun (Avenger CCW)|0.3|', // InfantryShotgunAvengerCCWWeapon.java:71
  'Shotgun (Combat)|0.25|', // InfantryShotgunCombatWeapon.java:70
  'Sniper Rifle (Bolt Action)|0.92|', // InfantrySniperRifleSniperWeapon.java:71
  'Sniper Rifle (Hammel Marksman)|0.28|', // InfantrySniperRifleHammelMarksman.java:67
  'Sniper Rifle (Minolta 9000 Advanced Sniper System)|1.79|', // InfantrySniperRifleMinolta9000Weapon.java:72
  'Sonic Stunner|0.06|', // InfantryPistolSonicStunnerWeapon.java:70
  'Stunstick|0.06|a', // InfantryArchaicStunstickWeapon.java:70
  'Submachine Gun|0.23|', // InfantrySMGWeapon.java:70
  'Support Laser|6.02|s', // InfantrySupportLaserWeapon.java:72
  'Support Laser (ER Heavy, Clan)|18.52|s', // InfantrySupportClanERHeavyLaserWeapon.java:72
  'Support Laser (ER, IS)|8.21|s', // InfantrySupportERLaserWeapon.java:72
  'Support Laser (ER, Semi-Portable)|5.02|s', // InfantrySupportClanSemiPortableERLaserWeapon.java:72
  'Support Laser (Heavy)|17.35|s', // InfantrySupportHeavyLaserWeapon.java:72
  'Support Laser (Semi-Portable)|4.37|s', // InfantrySupportSemiPortableLaserWeapon.java:71
  'Support PPC (Snub-Nose)|0.0|s', // InfantrySupportSnubNoseSupportPPCWeapon.java:64
  'Support Pulse Laser|5.81|s', // InfantrySupportPulseLaserWeapon.java:72
  'Tranq Gun|0.13|', // InfantryPistolTranqGunWeapon.java:69
]) {
  const [name, bv, flags] = row.split('|');
  SOURCE_BV.set(name.toLowerCase(), {
    bv: Number(bv),
    support: flags.includes('s'),
    archaic: flags.includes('a'),
  });
}
export function getInfantryBVWeapon(name: string): WeaponBV {
  const weapon = SOURCE_BV.get(name.toLowerCase());
  if (!weapon) throw new Error(`Unresolved infantry BV weapon: ${name}`);
  return weapon;
}
