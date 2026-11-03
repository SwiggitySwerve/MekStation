/** Native lookup names and converter spellings with exact BV catalog identities. */
export const SOURCE_LOOKUP_ALIASES: Readonly<Record<string, string>> = {
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
  'is streak srm 2 ammo': 'streak-srm-ammo',
};

/** Native identity precedes fuzzy aliases and unit-tech preferences. */
export function nativeIdentityId(name: string): string | undefined {
  const key = name.toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(NATIVE_IDENTITY_CORRECTIONS, key)
    ? NATIVE_IDENTITY_CORRECTIONS[key]
    : undefined;
}
