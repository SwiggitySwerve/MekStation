import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../src/utils/construction/equipmentBVResolver';

const FALLBACK_WEAPON_BV: Record<string, { bv: number; heat: number }> = {
  'plasma-rifle': { bv: 210, heat: 10 },
  isplasmarifle: { bv: 210, heat: 10 },
  'plasma-cannon': { bv: 170, heat: 7 },
  clplasmacannon: { bv: 170, heat: 7 },
  'clan-plasma-cannon': { bv: 170, heat: 7 },
  'particle-cannon': { bv: 176, heat: 10 },
  'tsemp-cannon': { bv: 488, heat: 10 },
  'tsemp-one-shot': { bv: 98, heat: 10 },
  'tsemp-repeating-cannon': { bv: 600, heat: 10 },
  'fluid-gun': { bv: 6, heat: 0 },
  isfluidgun: { bv: 6, heat: 0 },
  'binary-laser-blazer-cannon': { bv: 222, heat: 16 },
  'blazer-cannon': { bv: 222, heat: 16 },
  'silver-bullet-gauss-rifle': { bv: 198, heat: 1 },
  'risc-hyper-laser': { bv: 596, heat: 24 },
  'medium-vsp': { bv: 56, heat: 7 },
  ismediumvsplaser: { bv: 56, heat: 7 },
  islargevsplaser: { bv: 123, heat: 10 },
  'large-vsp': { bv: 123, heat: 10 },
  'small-vsp': { bv: 22, heat: 3 },
  issmallvsplaser: { bv: 22, heat: 3 },
  'medium-chem-laser': { bv: 37, heat: 2 },
  'small-chem-laser': { bv: 7, heat: 1 },
  'large-chem-laser': { bv: 99, heat: 4 },
  'clan-medium-chemical-laser': { bv: 37, heat: 2 },
  clmediumchemlaser: { bv: 37, heat: 2 },
  'bombast-laser': { bv: 137, heat: 12 },
  isbombastlaser: { bv: 137, heat: 12 },
  'improved-large-laser': { bv: 123, heat: 8 },
  'improved-medium-laser': { bv: 60, heat: 3 },
  'improved-small-laser': { bv: 12, heat: 1 },
  'enhanced-ppc': { bv: 329, heat: 15 },
  'flamer-vehicle': { bv: 5, heat: 3 },
  iserflamer: { bv: 16, heat: 4 },
  clerflamer: { bv: 16, heat: 4 },
  islightmg: { bv: 5, heat: 0 },
  clmg: { bv: 5, heat: 0 },
  clheavysmalllaser: { bv: 15, heat: 3 },
  isarrowivsystem: { bv: 240, heat: 10 },
  'arrow-iv-system': { bv: 240, heat: 10 },
  'arrow-iv': { bv: 240, heat: 10 },
  clarrowiv: { bv: 240, heat: 10 },
  'clan-arrow-iv': { bv: 240, heat: 10 },
  sniper: { bv: 85, heat: 10 },
  thumper: { bv: 43, heat: 5 },
  'long-tom-cannon': { bv: 329, heat: 20 },
  'sniper-cannon': { bv: 77, heat: 10 },
  'thumper-cannon': { bv: 41, heat: 5 },
  'nail-rivet-gun': { bv: 1, heat: 0 },
  'nail-gun': { bv: 1, heat: 0 },
  'battlemech-taser': { bv: 40, heat: 6 },
  'mech-taser': { bv: 40, heat: 6 },
  ismektaser: { bv: 40, heat: 6 },
  taser: { bv: 40, heat: 6 },
  'light-blazer': { bv: 65, heat: 6 },
  islaserantimissilesystem: { bv: 45, heat: 7 },
  'laser-ams': { bv: 45, heat: 7 },
  'clan-laser-ams': { bv: 45, heat: 7 },
  cllaserantimissilesystem: { bv: 45, heat: 7 },
  'risc-advanced-point-defense-system': { bv: 64, heat: 2 },
  issmallxpulselaser: { bv: 21, heat: 3 },
  ismediumxpulselaser: { bv: 71, heat: 6 },
  islargexpulselaser: { bv: 178, heat: 14 },
  // MOVED to CATALOG_BV_OVERRIDES (normalizeEquipmentId maps 'ppcp' → 'ppc', resolving with wrong heat=10)
  'heavy-rifle': { bv: 91, heat: 4 },
  isheavyrifle: { bv: 91, heat: 4 },
  'medium-rifle': { bv: 35, heat: 2 },
  'light-rifle': { bv: 21, heat: 1 },
  'rifle-cannon': { bv: 35, heat: 2 },
  'mortar-1': { bv: 10, heat: 1 },
  'mortar-2': { bv: 14, heat: 2 },
  'mortar-4': { bv: 26, heat: 5 },
  'mortar-8': { bv: 50, heat: 10 },
  'streak-srm-2-os': { bv: 30, heat: 2 },
  'streak-srm-4-os': { bv: 59, heat: 3 },
  'streak-srm-2-i-os': { bv: 30, heat: 2 },
  'streak-srm-4-i-os': { bv: 59, heat: 3 },
  'srm-2-os': { bv: 21, heat: 2 },
  'srm-6-os': { bv: 59, heat: 4 },
  'narc-i-os': { bv: 30, heat: 0 },
  // Prototype Rocket Launchers (not in catalog, remain as fallbacks)
  'prototype-rocket-launcher-20': { bv: 19, heat: 5 },
  rocketlauncher20prototype: { bv: 19, heat: 5 },
  'rocket-launcher-10-pp': { bv: 15, heat: 3 },
  clrocketlauncher10prototype: { bv: 15, heat: 3 },
  clrocketlauncher15prototype: { bv: 18, heat: 4 },
  'ac-10p': { bv: 123, heat: 3 },
  'c3-boosted-system-master': { bv: 0, heat: 0 },
  'c3-computer-[master]': { bv: 0, heat: 0 },
  islppc: { bv: 88, heat: 5 },
  isblazer: { bv: 222, heat: 16 },
  iseherppc: { bv: 329, heat: 15 },
  clmicropulselaser: { bv: 12, heat: 1 },
  issniperartcannon: { bv: 77, heat: 10 },
  // ER Pulse Lasers (Clan-only, but sometimes appear without clan- prefix on mixed-tech units)
  'er-medium-pulse-laser': { bv: 117, heat: 6 },
  'er-small-pulse-laser': { bv: 36, heat: 3 },
  'er-large-pulse-laser': { bv: 272, heat: 13 },
  // ISRemoteSensorDispenser - not a weapon, 0 BV
  isremotesensordispenser: { bv: 0, heat: 0 },
  'remote-sensor-dispenser': { bv: 0, heat: 0 },
  // C3 Remote Sensor Launcher IS a weapon (extends MissileWeapon) per MegaMek ISC3RemoteSensorLauncher.java
  'c3-remote-sensor-launcher': { bv: 30, heat: 0 },
  isc3remotesensorlauncher: { bv: 30, heat: 0 },
  c3remotesensorlauncher: { bv: 30, heat: 0 },
  // IS SRM-4 One-Shot (missing variant)
  'issrm4-os': { bv: 39, heat: 3 },
  // Clan Heavy Lasers (alternate IDs)
  clheavymediumlaser: { bv: 76, heat: 7 },
  clheavylargelaser: { bv: 244, heat: 18 },
  clflamer: { bv: 6, heat: 3 },
  // Mech Mortars (alternate IDs) — BV/heat per MegaMek ISMekMortar/CLMekMortar sources
  'mech-mortar-4': { bv: 26, heat: 5 },
  'mech-mortar-8': { bv: 50, heat: 10 },
  // Improved SRM-6
  'improved-srm-6': { bv: 59, heat: 4 },
  // iATM (improved ATM)
  'iatm-3': { bv: 52, heat: 2 },
  'iatm-6': { bv: 104, heat: 4 },
  'iatm-9': { bv: 156, heat: 6 },
  'iatm-12': { bv: 208, heat: 8 },
  // ProtoMech ACs
  protomechac2: { bv: 34, heat: 1 },
  protomechac4: { bv: 49, heat: 1 },
  protomechac8: { bv: 66, heat: 2 },
  // Streak LRM (Clan-only)
  streaklrm5: { bv: 69, heat: 2 },
  streaklrm10: { bv: 138, heat: 4 },
  streaklrm15: { bv: 207, heat: 5 },
  streaklrm20: { bv: 276, heat: 6 },
  clstreaklrm10: { bv: 138, heat: 4 },
  clstreaklrm15: { bv: 207, heat: 5 },
  clstreaklrm20: { bv: 276, heat: 6 },
  // HAG (Hyper-Assault Gauss) - alternate IDs
  clhag20: { bv: 267, heat: 4 },
  clhag30: { bv: 401, heat: 6 },
  clhag40: { bv: 535, heat: 8 },
  hag20: { bv: 267, heat: 4 },
  hag30: { bv: 401, heat: 6 },
  hag40: { bv: 535, heat: 8 },
  // ATM (alternate IDs without hyphen)
  clatm3: { bv: 52, heat: 2 },
  clatm6: { bv: 104, heat: 4 },
  clatm9: { bv: 156, heat: 6 },
  clatm12: { bv: 208, heat: 8 },
  // Clan Small Pulse Laser (alternate ID)
  clsmallpulselaser: { bv: 24, heat: 2 },
  cllargepulselaser: { bv: 265, heat: 10 },
  // Clan Anti-Missile System (alternate IDs)
  clantimissilesystem: { bv: 32, heat: 1 },
  // Heavy/Light Machine Guns (Clan)
  'light-machine-gun': { bv: 5, heat: 0 },
  'heavy-machine-gun': { bv: 6, heat: 0 },
  // Heavy Flamer
  'heavy-flamer': { bv: 15, heat: 5 },
  // Improved Heavy Lasers (Clan - alternate IDs)
  'improved-heavy-large-laser': { bv: 296, heat: 18 },
  'improved-heavy-medium-laser': { bv: 93, heat: 7 },
  'improved-heavy-small-laser': { bv: 19, heat: 3 },
  'large-heavy-laser': { bv: 244, heat: 18 },
  'medium-heavy-laser': { bv: 76, heat: 7 },
  'small-heavy-laser': { bv: 15, heat: 3 },
  'heavy-large-laser': { bv: 244, heat: 18 },
  'heavy-medium-laser': { bv: 76, heat: 7 },
  'heavy-small-laser': { bv: 15, heat: 3 },
  // AP Gauss Rifle
  'ap-gauss-rifle': { bv: 21, heat: 1 },
};

// BV overrides for weapons that exist in the catalog but have WRONG BV values.
// These take priority over catalog values. Values from MegaMek source.
const CATALOG_BV_OVERRIDES: Record<string, { bv: number; heat: number }> = {
  'heavy-ppc': { bv: 317, heat: 15 },
  isheavyppc: { bv: 317, heat: 15 },
  'er-flamer': { bv: 16, heat: 4 },
  erflamer: { bv: 16, heat: 4 },
  iserflamer: { bv: 16, heat: 4 },
  // Clan ER Flamer has BV 15 (different from IS BV 16)
  clerflamer: { bv: 15, heat: 4 },
  'clan-er-flamer': { bv: 15, heat: 4 },
  clanerflamer: { bv: 15, heat: 4 },
  'small-re-engineered-laser': { bv: 14, heat: 4 },
  smallreengineeredlaser: { bv: 14, heat: 4 },
  issmallreengineeredlaser: { bv: 14, heat: 4 },
  'medium-re-engineered-laser': { bv: 65, heat: 6 },
  mediumreengineeredlaser: { bv: 65, heat: 6 },
  ismediumreengineeredlaser: { bv: 65, heat: 6 },
  'large-re-engineered-laser': { bv: 161, heat: 9 },
  largereengineeredlaser: { bv: 161, heat: 9 },
  islargereengineeredlaser: { bv: 161, heat: 9 },
  // M-Pod: one-shot anti-infantry weapon, BV=5, heat=0 per MegaMek
  'm-pod': { bv: 5, heat: 0 },
  mpod: { bv: 5, heat: 0 },
  ismpod: { bv: 5, heat: 0 },
  clmpod: { bv: 5, heat: 0 },
  // Thunderbolt missiles: catalog has heat=0, correct values per MegaMek
  'thunderbolt-5': { bv: 64, heat: 3 },
  'thunderbolt-10': { bv: 127, heat: 5 },
  'thunderbolt-15': { bv: 229, heat: 7 },
  'thunderbolt-20': { bv: 305, heat: 8 },
  isthunderbolt5: { bv: 64, heat: 3 },
  isthunderbolt10: { bv: 127, heat: 5 },
  isthunderbolt15: { bv: 229, heat: 7 },
  isthunderbolt20: { bv: 305, heat: 8 },
  // One-shot Thunderbolts: heat / 4 per MegaMek one-shot rule
  'thunderbolt-5-os': { bv: 13, heat: 0.75 },
  'thunderbolt-10-os': { bv: 25, heat: 1.25 },
  'thunderbolt-15-os': { bv: 46, heat: 1.75 },
  'thunderbolt-20-os': { bv: 61, heat: 2 },
  'thunderbolt-5-i-os': { bv: 13, heat: 0.75 },
  'thunderbolt-10-i-os': { bv: 25, heat: 1.25 },
  'thunderbolt-15-i-os': { bv: 46, heat: 1.75 },
  'thunderbolt-20-i-os': { bv: 61, heat: 2 },
  // Mech Mortars: BV/heat per MegaMek ISMekMortar/CLMekMortar source files
  'mech-mortar-1': { bv: 10, heat: 1 },
  'mech-mortar-2': { bv: 14, heat: 2 },
  'mech-mortar-4': { bv: 26, heat: 5 },
  'mech-mortar-8': { bv: 50, heat: 10 },
  ismekmortar1: { bv: 10, heat: 1 },
  ismekmortar2: { bv: 14, heat: 2 },
  ismekmortar4: { bv: 26, heat: 5 },
  ismekmortar8: { bv: 50, heat: 10 },
  clmekmortar1: { bv: 10, heat: 1 },
  clmekmortar2: { bv: 14, heat: 2 },
  clmekmortar4: { bv: 26, heat: 5 },
  clmekmortar8: { bv: 50, heat: 10 },
  'clan-mech-mortar-1': { bv: 10, heat: 1 },
  'clan-mech-mortar-2': { bv: 14, heat: 2 },
  'clan-mech-mortar-4': { bv: 26, heat: 5 },
  'clan-mech-mortar-8': { bv: 50, heat: 10 },
  // Primitive Prototype PPC: normalizeEquipmentId maps 'ppcp' → 'ppc' (heat=10), must override
  'primitive-prototype-ppc': { bv: 176, heat: 15 },
  ppcp: { bv: 176, heat: 15 },
  // === PROTOTYPE WEAPON OVERRIDES ===
  // Prototype weapons normalize to standard versions via normalizeEquipmentId
  // but have different (typically lower) BV and sometimes extra heat.
  // Must override BEFORE catalog resolution. Values from MegaMek source.
  // IS Prototype Lasers (+3 heat for ER/Pulse Large, MPL; +2 for SPL)
  'er-large-laser-prototype': { bv: 136, heat: 15 },
  iserlargelaserprototype: { bv: 136, heat: 15 },
  iserlaselargeprototype: { bv: 136, heat: 15 },
  'large-pulse-laser-prototype': { bv: 108, heat: 13 },
  ispulselaserlargprototype: { bv: 108, heat: 13 },
  ispulselaselargeprototype: { bv: 108, heat: 13 },
  'medium-pulse-laser-prototype': { bv: 43, heat: 7 },
  ismediumpulselaserprototype: { bv: 43, heat: 7 },
  'small-pulse-laser-prototype': { bv: 11, heat: 4 },
  ispulselasersmallprototype: { bv: 11, heat: 4 },
  'medium-pulse-laser-recovered': { bv: 48, heat: 7 },
  ispulselasermediumrecovered: { bv: 48, heat: 7 },
  // IS Prototype Ballistics/Missiles
  'gauss-rifle-prototype': { bv: 320, heat: 1 },
  isgaussrifleprototype: { bv: 320, heat: 1 },
  'narc-prototype': { bv: 15, heat: 0 },
  isnarcprototype: { bv: 15, heat: 0 },
  'ultra-ac-5-prototype': { bv: 112, heat: 1 },
  isuac5prototype: { bv: 112, heat: 1 },
  'lb-10-x-ac-prototype': { bv: 148, heat: 2 },
  islbxac10prototype: { bv: 148, heat: 2 },
  // Clan Prototype Lasers
  'prototype-er-medium-laser': { bv: 62, heat: 5 },
  clerlasermediumprototype: { bv: 62, heat: 5 },
  'prototype-er-small-laser': { bv: 17, heat: 2 },
  clerlasesmallprototype: { bv: 17, heat: 2 },
  clersmalllaserprototype: { bv: 17, heat: 2 },
  // Clan Prototype Streak SRM
  'prototype-streak-srm-4': { bv: 59, heat: 3 },
  clstreaksrm4prototype: { bv: 59, heat: 3 },
  'prototype-streak-srm-6': { bv: 89, heat: 4 },
  clstreaksrm6prototype: { bv: 89, heat: 4 },
  // Clan Prototype UAC (+1 heat for UAC/10 and UAC/20)
  'prototype-ultra-autocannon-2': { bv: 56, heat: 1 },
  cluac2prototype: { bv: 56, heat: 1 },
  'prototype-ultra-autocannon-10': { bv: 210, heat: 4 },
  cluac10prototype: { bv: 210, heat: 4 },
  'prototype-ultra-autocannon-20': { bv: 281, heat: 8 },
  cluac20prototype: { bv: 281, heat: 8 },
  // Clan Prototype LB-X AC
  'prototype-lb-10-x-autocannon': { bv: 148, heat: 2 },
  'prototype-lb-2-x-autocannon': { bv: 42, heat: 1 },
  cllb2xacprototype: { bv: 42, heat: 1 },
  'prototype-lb-5-x-autocannon': { bv: 83, heat: 1 },
  cllb5xacprototype: { bv: 83, heat: 1 },
  'prototype-lb-20-x-autocannon': { bv: 237, heat: 6 },
  cllb20xacprototype: { bv: 237, heat: 6 },
};

export function resolveWeaponForUnit(
  id: string,
  techBase: string,
  isClanEquip?: boolean,
): { battleValue: number; heat: number; resolved: boolean } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const normId = normalizeEquipmentId(lo);
  const override =
    CATALOG_BV_OVERRIDES[lo] ||
    CATALOG_BV_OVERRIDES[normId] ||
    CATALOG_BV_OVERRIDES[lo.replace(/^(is|cl|clan)/, '')];
  if (override)
    return { battleValue: override.bv, heat: override.heat, resolved: true };
  const isResult = resolveEquipmentBV(id);
  if (
    techBase === 'CLAN' ||
    isClanEquip ||
    (techBase === 'MIXED' &&
      (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')))
  ) {
    // normalizeEquipmentId strips 'cl' prefix and may resolve to IS weapon (e.g., clultraac10 → uac-10).
    // For Clan units, try 'clan-' + normalized IS form to get correct Clan BV/heat values.
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) {
      candidates.push('clan-' + normalizedIS);
    }
    if (!lo.startsWith('clan-') && lo !== normalizedIS) {
      candidates.push('clan-' + lo);
    }
    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue)
          return cr;
        if (isResult.battleValue === cr.battleValue) return cr;
      }
    }
  }
  if (isResult.resolved && isResult.battleValue > 0) return isResult;
  const stripped = id.replace(/^\d+-/, '');
  if (stripped !== id) {
    const sr = resolveEquipmentBV(stripped);
    if (sr.resolved && sr.battleValue > 0) return sr;
  }
  // For MIXED units: if IS resolution failed, try Clan resolution as fallback
  // (handles Clan-exclusive weapons like ER Pulse Lasers on mixed-tech units)
  if (
    techBase === 'MIXED' &&
    (!isResult.resolved || isResult.battleValue === 0)
  ) {
    const normalizedMixed = normalizeEquipmentId(lo);
    const clanCandidates: string[] = [];
    if (!normalizedMixed.startsWith('clan-'))
      clanCandidates.push('clan-' + normalizedMixed);
    if (!lo.startsWith('clan-') && lo !== normalizedMixed)
      clanCandidates.push('clan-' + lo);
    for (const cid of clanCandidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) return cr;
    }
  }
  // Fallback: check hardcoded weapon BV map for catalog gaps
  const norm = normalizeEquipmentId(lo);
  const fb =
    FALLBACK_WEAPON_BV[lo] ||
    FALLBACK_WEAPON_BV[norm] ||
    FALLBACK_WEAPON_BV[lo.replace(/^(is|cl|clan)/, '')];
  if (fb) return { battleValue: fb.bv, heat: fb.heat, resolved: true };
  return isResult;
}

// === WEAPON CLASSIFICATION ===
export function isWeaponEquip(id: string): boolean {
  const lo = id.toLowerCase();
  if (lo.includes('ammo')) return false;
  // C3 Remote Sensor Launcher IS a weapon (BV=30, extends MissileWeapon in MegaMek)
  // despite containing 'c3' and 'remote-sensor' which would be caught by the exclusion list
  if (
    lo.includes('c3remotesensorlauncher') ||
    lo.includes('c3-remote-sensor-launcher') ||
    lo.includes('c3 remote sensor launcher')
  )
    return true;
  const nw = [
    'heatsink',
    'heat-sink',
    'endo',
    'ferro',
    'case',
    'artemis',
    'targeting-computer',
    'targeting computer',
    'ecm',
    'bap',
    'probe',
    'c3',
    'masc',
    'tsm',
    'jump-jet',
    'jump jet',
    'harjel',
    'umu',
    'shield',
    'sword',
    'hatchet',
    'mace',
    'a-pod',
    'b-pod',
    'apod',
    'bpod',
    'blue-shield',
    'null-signature',
    'chameleon',
    'coolant-pod',
    'coolantpod',
    'supercharger',
    'drone',
    'improved-sensors',
    'beagle',
    'angel-ecm',
    'guardian-ecm',
    'light-active-probe',
    'bloodhound',
    'apollo',
    'tag',
    'machine-gun-array',
    'light-machine-gun-array',
    'heavy-machine-gun-array',
    'mga',
    'lmga',
    'hmga',
    'lift-hoist',
    'lifthoist',
    'retractable-blade',
    'remote-sensor',
    'partial-wing',
    'partialwing',
    'searchlight',
    'tracks',
    'cargo',
    'spikes',
    'minesweeper',
    'viral jammer',
    'viraljammer',
    'bridgelayer',
    'bridge-layer',
    'salvage-arm',
    'salvagearm',
    'environmental-seal',
    'environmentalsealing',
    'ejection-seat',
    'ejection seat',
    'dumper',
    'fluid-suction',
    'fluidsuction',
    'mechsprayer',
    'mech-sprayer',
    // Physical weapons — BV counted via physicalWeaponBV, not weaponBV
    'chainsaw',
    'backhoe',
    'vibroblade',
    'mining-drill',
    'miningdrill',
    'buzzsaw',
    'dual-saw',
    'dual saw',
    'combine',
    'spot-welder',
    'spot welder',
    'spotwelder',
    'rock-cutter',
    'rock cutter',
    'rockcutter',
    'pile-driver',
    'pile driver',
    'piledriver',
    'flail',
    'wrecking-ball',
    'wrecking ball',
    'wreckingball',
    'chain-whip',
    'chain whip',
    'lance',
    'claw',
    'talon',
  ];
  for (const n of nw) if (lo.includes(n)) return false;
  // Check IS resolution first, then try Clan resolution for Clan-exclusive weapons
  if (resolveWeaponForUnit(id, 'IS').resolved) return true;
  return resolveWeaponForUnit(id, 'CLAN').resolved;
}

export function isDefEquip(id: string): boolean {
  const lo = id.toLowerCase();
  return (
    lo.includes('anti-missile') ||
    lo.includes('antimissile') ||
    lo.includes('ams') ||
    lo.includes('ecm') ||
    lo.includes('guardian') ||
    lo.includes('angel') ||
    lo.includes('bap') ||
    lo.includes('beagle') ||
    lo.includes('probe') ||
    lo.includes('bloodhound') ||
    lo.includes('light-active-probe') ||
    lo.includes('null-signature') ||
    (lo.includes('shield') && !lo.includes('blue-shield')) ||
    lo.includes('apds') ||
    lo.includes('advanced-point-defense') ||
    lo.includes('point-defense-system') ||
    lo.includes('chaff-pod') ||
    lo.includes('chaffpod')
  );
}
