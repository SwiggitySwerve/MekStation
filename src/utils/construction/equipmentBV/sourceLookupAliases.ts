/** Native lookup names and converter spellings with exact BV catalog identities. */
export const SOURCE_LOOKUP_ALIASES: Readonly<Record<string, string>> = {
  // FU-101: the MTF crit token of ISFluidGun (48fcb2f6: 6 BV, 2 t, 2 slots).
  'is fluid gun': 'fluid-gun',
  // Pinned EquipmentType lookup names; preserve the registered variant.
  'clapgaussrifle-ammo': 'apgaussrifle',
  'autocannon/2': 'ac-2',
  'autocannon/5': 'ac-5',
  'autocannon/10': 'ac-10',
  'autocannon/20': 'ac-20',
  'light auto cannon/2': 'lac-2',
  'light auto cannon/5': 'lac-5',
  'hyper velocity auto cannon/2': 'hyper-velocity-auto-cannon-2',
  'hyper velocity auto cannon/5': 'hyper-velocity-auto-cannon-5',
  'hyper velocity auto cannon/10': 'hyper-velocity-auto-cannon-10',
  'binary laser (blazer) cannon': 'blazer-cannon',
  'tsemp cannon': 'tsemp-cannon',
  bajumpjet: 'jump-jet-ba',
  bajumpbooster: 'jump-booster-ba',
  bapartialwing: 'partial-wing-ba',
  baparafoil: 'parafoil',
  bavtol: 'vtol-ba',
  baumu: 'umu-ba',
  'armored chassis': 'armored-chassis',
  'fed-suns-infantry-kit-3067+': 'fed-suns-infantry-kit-3067',
  'free-worlds-league-infantry-kit-3035+':
    'free-worlds-league-infantry-kit-3035',
  'lyran-alliance-lyran-commonwealth-3060+-infantry-kit':
    'lyran-alliance-lyran-commonwealth-3060-infantry-kit',
  'clothing,-fatigues-civilian-non-armored':
    'clothing-fatigues-civilian-non-armored',
  'environment-suit,-hostile': 'environment-suit-hostile',
  'ballistic-plate,-standard': 'ballistic-plate-standard',
  'environment-suit,-marine': 'environment-suit-marine',
  'flak,-standard': 'flak-standard',
  'clothing,-leather-synthetic-hide': 'clothing-leather-synthetic-hide',
  'spacesuit,-combat': 'spacesuit-combat',
  'ablative-flak,-concealed': 'ablative-flak-concealed',
  'myomer,-vest': 'myomer-vest',
  'ba-compact-narc-ammo': 'compact-narc-ammo',
  // weapons/battleArmor/clan/CLBARecoillessRifle{Light,Medium,Heavy}.java:59-65
  'clbalight recoilless rifle': 'balight-recoilless-rifle',
  clbalightrecoillessrifle: 'balight-recoilless-rifle',
  isbalightrecoillessrifle: 'balight-recoilless-rifle',
  'islight recoilless rifle': 'balight-recoilless-rifle',
  'isbalight recoilless rifle': 'balight-recoilless-rifle',
  'clbamedium recoilless rifle': 'bamedium-recoilless-rifle',
  clbamediumrecoillessrifle: 'bamedium-recoilless-rifle',
  isbamediumrecoillessrifle: 'bamedium-recoilless-rifle',
  'is ba medium recoilless rifle': 'bamedium-recoilless-rifle',
  'isbamedium recoilless rifle': 'bamedium-recoilless-rifle',
  'clbaheavy recoilless rifle': 'baheavy-recoilless-rifle',
  clbaheavyrecoillessrifle: 'baheavy-recoilless-rifle',
  isbaheavyrecoillessrifle: 'baheavy-recoilless-rifle',
  'isheavy recoilless rifle': 'baheavy-recoilless-rifle',
  'isbaheavy recoilless rifle': 'baheavy-recoilless-rifle',
  // Converter slugs (enum_mappings.py:366) for ISRifle{Light,Medium,Heavy}.java
  // "Rifle (Cannon, ...)", 48fcb2f64.
  'light-rifle': 'rifle-cannon-light',
  'medium-rifle': 'rifle-cannon-medium',
  'heavy-rifle': 'rifle-cannon-heavy',
  // Converter slugs for AmmoType.java "IS Heavy Flamer Ammo" (:6043-6052) and
  // "Taser Ammo" (:12270-12278).
  'is-heavy-flamer-ammo': 'is-heavy-flamer-ammo-registry',
  'taser-ammo': 'taser-ammo-registry',
  // Converter slug (`pt:size:1.0` stripped) for the infantry
  // "Gauss Rifle, Light (King David)"
  // (InfantrySupportKingDavidLightGaussRifleWeapon.java:65-73, 4.87 BV).
  'gauss-rifle,-light-king-david': 'gauss-rifle-light-king-david-registry',
  // Converter slug for the infantry "Machine Gun (Light)"
  // (InfantrySupportMGLightWeapon.java:64-72, 1.5 BV); the native name itself
  // keeps the battle-armor balightmg its corpus mounts use.
  'machine-gun-light': 'machine-gun-light-registry',
  // FU-101: the MTF crit token of Clan Mech Mortar-4 (48fcb2f6), which the
  // general normalizer shortens to "clan mech mortar".
  'clan mech mortar-4': 'clan-mech-mortar-4',
  // Lookup name of ISMASS (MiscType.java:4947-4950, 48fcb2f6), which the
  // general normalizer leaves as "clan mass".
  'clan mass': 'mass',
  // FU-101 crit tokens with an existing record of Java's values (48fcb2f64):
  // CLERPulseLaserSmall.java:59 (36 BV, 1.5 t), ISMekTaser.java:70 (40 BV, 4 t),
  // AmmoType.java:13938 / :14120 / :10867.
  clersmallpulselaser: 'clan-er-small-pulse-laser',
  'mek taser': 'battlemech-taser',
  climpammoac5: 'impammoac5',
  climpgaussammo: 'impgaussammo',
  'isinarc explosive pods': 'inarc-explosive-pods',
};

/** Exact native identities at MegaMek 48fcb2f6; FU-79 IDENTITY-REVIEW.md. */
const NATIVE_IDENTITY_CORRECTIONS: Readonly<Record<string, string>> = {
  clerflamer: 'clan-er-flamer',
  'is heavy machine gun ammo': 'heavy-machine-gun-ammo-full',
  'is light machine gun ammo': 'light-machine-gun-ammo-full',
  'is machine gun ammo': 'ammo-mg-full',
  'is narc beacon': 'narc',
  iserflamer: 'er-flamer',
  isnarcbeacon: 'narc',
  novacews: 'nova-combined-electronic-warfare-system-cews',
  'small vsp laser': 'small-vsp-laser',
  'is lb 10-x ac ammo': 'lb-10-x-ammo',
  'is lb 2-x ac ammo': 'lb-2-x-ammo',
  'is lb 20-x ac ammo': 'lb-20-x-ammo',
  'is lb 5-x ac ammo': 'lb-5-x-ammo',
  // ISMekMortar8.java (10 t, 5 slots; 48fcb2f64). The general normalizer shortens
  // the name to "is mech mortar", and unit tech base would swap the legacy record
  // for the 5 t Clan one. IS Mech Mortar-4 has the same gap, but only
  // owner-excluded `ge` sources use it.
  'is mech mortar-8': 'mech-mortar-8',
  'is streak srm 2 ammo': 'streak-srm-ammo',
};

/** Native identity precedes fuzzy aliases and unit-tech preferences. */
export function nativeIdentityId(name: string): string | undefined {
  const key = name.toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(NATIVE_IDENTITY_CORRECTIONS, key)
    ? NATIVE_IDENTITY_CORRECTIONS[key]
    : undefined;
}
