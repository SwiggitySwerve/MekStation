import type { UnitData, ValidationResult } from './validate-bv-types';

import {
  EngineType,
  getEngineDefinition,
} from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  getArmorBVMultiplier,
  GYRO_BV_MULTIPLIERS,
} from '../src/types/validation/BattleValue';
import {
  calculateDefensiveBV,
  calculateOffensiveBVWithHeatTracking,
  calculateExplosivePenalties,
  getCockpitModifier,
  type CockpitType,
} from '../src/utils/construction/battleValueCalculations';
import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../src/utils/construction/equipmentBVResolver';
import { normalizeWeaponKey } from './validate-bv-ammo-resolution';
import { scanCrits } from './validate-bv-crit-scan';
import { CLAN_CHASSIS_MIXED_UNITS } from './validate-bv-known-units';
import {
  isRearLoc,
  normalizeCritName,
  normalizeEquipId,
  toMechLoc,
} from './validate-bv-normalizers';
import { calculatePhysicalWeaponBV } from './validate-bv-physical-weapons';
import {
  isDefEquip,
  isWeaponEquip,
  resolveWeaponForUnit,
} from './validate-bv-weapon-resolution';

function mapEngineType(s: string, tb: string): EngineType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE')
    return tb === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS;
  if (u === 'CLANXL' || u === 'CLAN_XL' || u === 'XLCLAN')
    return EngineType.XL_CLAN;
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return EngineType.LIGHT;
  if (u === 'XXL' || u === 'XXLENGINE') return EngineType.XXL;
  if (u === 'COMPACT' || u === 'COMPACTENGINE') return EngineType.COMPACT;
  if (u === 'ICE' || u === 'INTERNALCOMBUSTION') return EngineType.ICE;
  if (u === 'FUELCELL' || u === 'FUEL_CELL') return EngineType.FUEL_CELL;
  if (u === 'FISSION') return EngineType.FISSION;
  return EngineType.STANDARD;
}
function mapArmorType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('COMMERCIAL')) return 'commercial';
  if (u.includes('HARDENED')) return 'hardened';
  if (u.includes('REACTIVE')) return 'reactive';
  if (u.includes('REFLECTIVE') || u.includes('LASERREFLECTIVE'))
    return 'reflective';
  if (u.includes('BALLISTICREINFORCED')) return 'ballistic-reinforced';
  if (u.includes('FERROLAMELLOR')) return 'ferro-lamellor';
  if (u.includes('STEALTH')) return 'stealth';
  if (u.includes('ANTIPENETRATIVE') || u.includes('ABLATION'))
    return 'anti-penetrative';
  if (u.includes('HEATDISSIPATING')) return 'heat-dissipating';
  if (u.includes('IMPACTRESISTANT')) return 'impact-resistant';
  // Industrial/Heavy Industrial armor: distinct types for correct BAR ratings
  if (u.includes('HEAVYINDUSTRIAL')) return 'heavy-industrial';
  if (u.includes('INDUSTRIAL')) return 'industrial';
  return 'standard';
}

/**
 * Get BAR (Barrier Armor Rating) for armor type.
 * Per MegaMek Mek.getBARRating() (Mek.java:5341):
 *   Commercial = BAR 5, ALL other armor types = BAR 10 for BattleMechs.
 *   Industrial and Heavy Industrial armor still use BAR 10 in MegaMek's BV calculation.
 * BAR is applied as barRating / 10.0 to armor BV.
 */
function getArmorBAR(armorType: string): number {
  return armorType === 'commercial' ? 5 : 10;
}
function mapStructureType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('INDUSTRIAL')) return 'industrial';
  if (u.includes('ENDOCOMPOSITE')) return 'endo-composite';
  if (u.includes('COMPOSITE')) return 'composite';
  if (u.includes('REINFORCED')) return 'reinforced';
  return 'standard';
}
function mapGyroType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('SUPERHEAVY')) return 'superheavy';
  if (u.includes('HEAVYDUTY') || u.includes('HEAVY')) return 'heavy-duty';
  if (u.includes('XL')) return 'xl';
  if (u.includes('COMPACT')) return 'compact';
  return 'standard';
}
function mapCockpitType(s: string): CockpitType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('SMALL') && u.includes('COMMAND'))
    return 'small-command-console';
  if (u.includes('SMALL')) return 'small';
  if (u.includes('TORSOMOUNTED') || u.includes('TORSO')) return 'torso-mounted';
  if (u.includes('COMMANDCONSOLE') || u.includes('COMMAND'))
    return 'command-console';
  if (u.includes('INTERFACE')) return 'interface';
  if (u.includes('DRONE')) return 'drone-operating-system';
  return 'standard';
}

// === STRUCTURE/ARMOR ===
function calcTotalStructure(ton: number, config?: string): number {
  const cfgLower = config?.toLowerCase() ?? '';
  const isQuad = cfgLower === 'quad' || cfgLower === 'quadvee';
  const isTripod = cfgLower === 'tripod';
  // Biped: 2 arms + 2 legs; Quad/QuadVee: 4 legs; Tripod: 2 arms + 3 legs
  const limbIS = (t: { arm: number; leg: number }) =>
    isQuad
      ? t.leg * 4
      : isTripod
        ? t.arm * 2 + t.leg * 3
        : t.arm * 2 + t.leg * 2;
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) {
    const k = Object.keys(STRUCTURE_POINTS_TABLE)
      .map(Number)
      .sort((a, b) => a - b)
      .filter((x) => x <= ton)
      .pop();
    if (k) {
      const t2 = STRUCTURE_POINTS_TABLE[k] as {
        head: number;
        centerTorso: number;
        sideTorso: number;
        arm: number;
        leg: number;
      };
      return t2.head + t2.centerTorso + t2.sideTorso * 2 + limbIS(t2);
    }
    return 0;
  }
  const st = t as {
    head: number;
    centerTorso: number;
    sideTorso: number;
    arm: number;
    leg: number;
  };
  return st.head + st.centerTorso + st.sideTorso * 2 + limbIS(st);
}
function calcTotalArmor(a: ArmorAllocation): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}
function calcHeatDissipation(hs: { type: string; count: number }): number {
  const t = hs.type.toUpperCase();
  return hs.count * (t.includes('DOUBLE') || t.includes('LASER') ? 2 : 1);
}

// === LOCATION HELPERS ===

function isWeaponRearMounted(
  equipId: string,
  locSlots: (string | null)[],
): boolean {
  const eqNorm = normalizeEquipId(equipId);
  const eqCanonical = normalizeEquipmentId(equipId);
  for (const slot of locSlots) {
    if (!slot || typeof slot !== 'string' || !/\(R\)/i.test(slot)) continue;
    const slotNorm = normalizeCritName(slot);
    if (slotNorm === eqNorm) return true;
    if (slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)) return true;
    if (normalizeEquipmentId(slotNorm) === eqCanonical) return true;
  }
  return false;
}
function isArmLoc(l: string): boolean {
  const lo = l.toLowerCase();
  return lo.includes('left_arm') || lo.includes('right_arm');
}

/**
 * Detect if equipment at a given location is Clan-tech by checking critical slot names.
 * MegaMek crit names use 'CL' prefix for Clan equipment (e.g., CLERMediumLaser, CLStreakSRM6).
 * For MIXED tech units, this disambiguates IS vs Clan variants that share generic equipment IDs.
 */
function isClanEquipAtLocation(
  equipId: string,
  location: string,
  criticalSlots?: Record<string, (string | null)[]>,
): boolean {
  if (!criticalSlots) return false;
  const locKey = location.split(',')[0].toUpperCase();
  // Also check the raw location key as-is (e.g., "LEFT_ARM")
  const locVariants = [locKey, location];
  const eqNorm = normalizeEquipId(equipId);

  // If the equipment ID explicitly starts with "is" prefix (e.g., "isermediumlaser"),
  // it is definitively Inner Sphere tech and should NEVER match Clan crit slots.
  // This prevents false positives where "isermediumlaser".includes("ermediumlaser")
  // caused IS ER Medium Lasers to be resolved as Clan (BV 108 instead of 62).
  const strippedId = equipId.replace(/^\d+-/, '').toLowerCase();
  if (/^is[a-z]/.test(strippedId)) return false;

  for (const lk of locVariants) {
    const slots = criticalSlots[lk];
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const clean = slot
        .replace(/\s*\(omnipod\)/gi, '')
        .replace(/\s*\(R\)/g, '')
        .trim();
      // Check if this crit slot starts with CL or "Clan " (Clan equipment marker)
      if (!/^CL/i.test(clean) && !/^Clan\s/i.test(clean)) continue;
      // Normalize after stripping CL prefix to compare with equipment ID
      const slotNorm = clean
        .toLowerCase()
        .replace(/^(cl|clan)\s*/i, '')
        .replace(/[^a-z0-9]/g, '');
      if (
        slotNorm === eqNorm ||
        slotNorm.includes(eqNorm) ||
        eqNorm.includes(slotNorm)
      )
        return true;
      // LBX/Ultra/Rotary AC canonicalization: normalize number position
      // Equipment ID: lb-5-x-ac → lb5xac, Crit: CLLBXAC5 → lbxac5
      // Canonicalize by extracting weapon type letters and appending number at end
      const canonicalize = (s: string) =>
        s.replace(/(\d+)/g, '').replace(/[^a-z]/g, '') +
        (s.match(/\d+/)?.[0] ?? '');
      if (canonicalize(slotNorm) === canonicalize(eqNorm)) return true;
    }
  }
  return false;
}

// Hardcoded BV/heat for weapons missing from the equipment catalog.
// Values from MegaMek data files and TechManual.

// === CRIT SLOT SCANNER ===

// === RISC HEAT SINK OVERRIDE KIT UNITS (from MegaMek mm-data MTF files) ===
// The RISC Heat Sink Override Kit applies a 1.01x multiplier to base BV.
// It's stored as "heat sink kit:RISC Heat Sink Override Kit" in MTF files,
// which is not exported to our JSON data format.
// Per MekBVCalculator.processSummarize() lines 479-501.
const KNOWN_RISC_OVERRIDE_KIT_UNITS = new Set([
  'battleaxe-bkx-risc',
  'emperor-emp-6x',
  'mad-cat-mk-iv-pr-risc',
  'malice-mal-y-sh-risc',
]);

// === KNOWN HEAVY DUTY GYRO UNITS (from MegaMek mm-data MTF files) ===
// HD gyro has 4 crit slots (same as Standard), so it can't be detected by crit count.
// These units have "Gyro:Heavy Duty Gyro" in their MTF source files.
const KNOWN_HD_GYRO_UNITS = new Set([
  'albatross-alb-5u',
  'albatross-alb-5w',
  'albatross-alb-5w-dantalion',
  'atlas-as8-k',
  'atlas-as8-ke',
  'atlas-ii-as7-d-h-devlin',
  'battlemaster-blr-10s',
  'battlemaster-blr-10s2',
  'battlemaster-blr-k4',
  'cougar-x-3',
  'deva-c-dva-o-achilleus',
  'deva-c-dva-o-invictus',
  'deva-c-dva-oa-dominus',
  'deva-c-dva-ob-infernus',
  'deva-c-dva-oc-comminus',
  'deva-c-dva-od-luminos',
  'deva-c-dva-oe-eminus',
  'deva-c-dva-os-caelestis',
  'deva-c-dva-ou-exanimus',
  'grand-titan-t-it-n13m',
  'griffin-grf-4n',
  'griffin-grf-5k',
  'hunchback-hbk-5ss',
  'jade-hawk-jhk-04',
  'king-crab-kgc-008',
  'king-crab-kgc-008b',
  'king-crab-kgc-009',
  'king-crab-kgc-009c',
  'marauder-mad-9w',
  'marauder-mad-9w2',
  'ostroc-osr-4k',
  'ostsol-otl-9r',
  'patriot-pkm-2c',
  'patriot-pkm-2d',
  'patriot-pkm-2e',
  'phoenix-hawk-pxh-4w',
  'phoenix-hawk-pxh-99',
  'scourge-scg-wx1',
  'sentry-snt-w5',
  'tai-sho-tsh-8s',
  'templar-iii-tlr2-j-arthur',
  'templar-iii-tlr2-o',
  'templar-iii-tlr2-oa',
  'templar-iii-tlr2-ob',
  'templar-iii-tlr2-oc',
  'templar-iii-tlr2-od',
  'thunderbolt-iic-2',
  'thunderbolt-tdr-11s',
  'thunderbolt-tdr-17s',
  'thunderbolt-tdr-7s',
  'vanquisher-vqr-5v',
  'vanquisher-vqr-7v',
  'victor-vtr-12d',
  'warhammer-whd-10ct',
  'warhammer-whm-x7-the-lich',
  'white-flame-whf-3c',
  'xanthos-xnt-4o',
]);

// === MAIN BV CALCULATION ===
export function calculateUnitBV(
  unit: UnitData,
  unitId?: string,
): { bv: number; breakdown: ValidationResult['breakdown']; issues: string[] } {
  const issues: string[] = [];
  const engineType = mapEngineType(unit.engine.type, unit.techBase);
  const structureType = mapStructureType(unit.structure.type);
  let gyroType = mapGyroType(unit.gyro.type);
  const cockpitType = mapCockpitType(unit.cockpit || 'STANDARD');

  const unitIsSuperheavy = unit.tonnage > 100;

  let engineBVOverride: number | undefined;
  // Superheavy mechs have different engine BV multipliers because they have fewer
  // side-torso engine critical slots (e.g., IS XL = 2 ST slots -> 0.75 multiplier)
  if (unitIsSuperheavy) {
    switch (engineType) {
      case EngineType.XL_IS:
        engineBVOverride = 0.75;
        break;
      case EngineType.XXL:
        // Superheavy XXL: IS has 3 ST slots (0.5), Clan has 2 ST slots (0.75)
        if (unit.techBase === 'CLAN') {
          engineBVOverride = 0.75;
        } else if (unit.techBase !== 'MIXED') {
          engineBVOverride = 0.5;
        }
        // MIXED: leave undefined so crit-based detection below handles it
        break;
      case EngineType.LIGHT:
        engineBVOverride = 1.0;
        break;
      case EngineType.XL_CLAN:
        engineBVOverride = 1.0;
        break;
      // Standard, Compact, ICE, Fuel Cell all stay at 1.0 (default)
    }
  }
  if (
    engineType === EngineType.XXL &&
    unit.techBase === 'CLAN' &&
    !unitIsSuperheavy
  )
    engineBVOverride = 0.5;
  // For MIXED tech XXL engines, detect Clan vs IS via side-torso engine crit count:
  // Clan XXL = 4 engine slots per ST, IS XXL = 6 engine slots per ST
  if (
    engineType === EngineType.XXL &&
    unit.techBase === 'MIXED' &&
    engineBVOverride === undefined &&
    unit.criticalSlots
  ) {
    const stLocs = ['LEFT_TORSO', 'LT', 'RIGHT_TORSO', 'RT'];
    let maxSTEngineSlots = 0;
    for (const loc of stLocs) {
      const slots = unit.criticalSlots[loc];
      if (!Array.isArray(slots)) continue;
      const engSlots = slots.filter(
        (s): s is string =>
          typeof s === 'string' && s.toLowerCase().includes('engine'),
      ).length;
      maxSTEngineSlots = Math.max(maxSTEngineSlots, engSlots);
    }
    if (maxSTEngineSlots > 0 && maxSTEngineSlots <= 4) {
      // Map ST engine slot count to BV multiplier:
      // 2 slots = 0.75 (Clan XXL superheavy), 3-4 slots = 0.5 (Clan XXL / IS XXL superheavy)
      // > 4 slots (IS XXL non-superheavy) = leave undefined → standard 0.25
      engineBVOverride = maxSTEngineSlots <= 2 ? 0.75 : 0.5;
    }
  }

  let totalArmor = calcTotalArmor(unit.armor.allocation);
  // Torso-mounted cockpit: MegaMek doubles CT armor in BV via addTorsoMountedCockpit()
  // (CT front + rear armor is added again to total armor points)
  if (cockpitType === 'torso-mounted') {
    const ctAlloc =
      unit.armor?.allocation?.CENTER_TORSO ?? unit.armor?.allocation?.CT;
    let ctFront = 0,
      ctRear = 0;
    if (typeof ctAlloc === 'number') {
      ctFront = ctAlloc;
    } else if (ctAlloc) {
      ctFront = ctAlloc.front ?? 0;
      ctRear = ctAlloc.rear ?? 0;
    }
    totalArmor += ctFront + ctRear;
  }
  // Detect quad from armor locations if configuration field is wrong (e.g., Boreas/Notos marked as "Biped")
  const armorLocKeys = Object.keys(unit.armor?.allocation || {}).map(
    (k: string) => k.toUpperCase(),
  );
  const hasQuadArmorLocs = armorLocKeys.some((k: string) =>
    [
      'FLL',
      'FRL',
      'RLL',
      'RRL',
      'FRONT_LEFT_LEG',
      'FRONT_RIGHT_LEG',
      'REAR_LEFT_LEG',
      'REAR_RIGHT_LEG',
    ].includes(k),
  );
  // Detect effective configuration from cockpit type when configuration field is wrong
  // e.g., Ares superheavy tripods have configuration="Biped" but cockpit="SUPERHEAVY_TRIPOD"
  const cockpitUpper = (
    typeof unit.cockpit === 'string' ? unit.cockpit : ''
  ).toUpperCase();
  const isTripodCockpit =
    cockpitUpper.includes('TRIPOD') || cockpitUpper === 'SUPERHEAVY_TRIPOD';
  const effectiveConfig =
    hasQuadArmorLocs && unit.configuration?.toLowerCase() !== 'quad'
      ? 'Quad'
      : isTripodCockpit && unit.configuration?.toLowerCase() !== 'tripod'
        ? 'Tripod'
        : unit.configuration;
  const totalStructure = calcTotalStructure(unit.tonnage, effectiveConfig);
  const cs = scanCrits(unit, unitId);

  // Modular Armor: each slot adds 10 armor points for BV calculation
  if (cs.modularArmorSlots > 0) totalArmor += cs.modularArmorSlots * 10;

  // Interface Cockpit: no gyro, so gyro BV = 0
  if (cs.detectedInterfaceCockpit) gyroType = 'none';

  // Override gyro type from crit-based detection and known HD gyro unit list
  if (gyroType !== 'none') {
    if (unitId && KNOWN_HD_GYRO_UNITS.has(unitId)) gyroType = 'heavy-duty';
    else if (cs.detectedGyroType) gyroType = cs.detectedGyroType;
  }

  const engineIntegratedHS = Math.min(10, Math.floor(unit.engine.rating / 25));
  const critBasedHSCount = engineIntegratedHS + cs.critDHSCount;
  const effectiveHSCount = Math.max(unit.heatSinks.count, critBasedHSCount);
  const isDHS =
    unit.heatSinks.type.toUpperCase().includes('DOUBLE') ||
    unit.heatSinks.type.toUpperCase().includes('LASER');
  // Prototype DHS and Laser HS dissipate 2 heat each (F_DOUBLE_HEAT_SINK in MegaMek).
  // When unit.heatSinks.type is "SINGLE" but crits contain double-dissipation HS,
  // we need mixed calculation: (totalHS - doubleHS) * 1 + doubleHS * 2
  let heatDiss: number;
  if (isDHS) {
    heatDiss = effectiveHSCount * 2;
  } else if (cs.critLaserHSCount > 0 || cs.critProtoDHSCount > 0) {
    const doubleHSCount = cs.critLaserHSCount + cs.critProtoDHSCount;
    const singleHS = effectiveHSCount - doubleHSCount;
    heatDiss = singleHS * 1 + doubleHSCount * 2;
  } else {
    heatDiss = effectiveHSCount * 1;
  }

  if (cs.hasRadicalHS) heatDiss += Math.ceil(effectiveHSCount * 0.4);
  if (cs.hasPartialWing) heatDiss += 3;

  const armorType = cs.detectedArmorType || mapArmorType(unit.armor.type);

  const walkMP = unit.movement.walk;

  let bvWalk = walkMP;
  if (cs.hasTSM) bvWalk = walkMP + 1;
  // Medium/Large Shield: -1 walk MP per TechManual (applied before run calculation)
  if (cs.hasMediumShield || cs.hasLargeShield) bvWalk = Math.max(0, bvWalk - 1);

  let runMP =
    cs.hasMASC && cs.hasSupercharger
      ? Math.ceil(bvWalk * 2.5)
      : cs.hasMASC || cs.hasSupercharger
        ? bvWalk * 2
        : Math.ceil(bvWalk * 1.5);
  if (armorType === 'hardened') runMP = Math.max(0, runMP - 1);
  // Compute effective jump MP matching MegaMek's Mek.getJumpMP():
  // getJumpMP() = count(F_JUMP_JET mounts) + partial_wing_bonus
  //
  // movement.jump from MTF stores the base JJ count for most units (no PW bonus),
  // but some IJJ+PW units have movement.jump that already includes PW bonus.
  // We detect this by comparing with crit-counted JJ mounts.
  const baseJumpMP = unit.movement.jump || 0;
  const jjMountsFromCrits =
    cs.standardJJCrits +
    Math.floor(cs.improvedJJCrits / 2) +
    cs.prototypeIJJCrits;
  const partialWingJumpBonus =
    cs.hasPartialWing && baseJumpMP > 0 ? (unit.tonnage <= 55 ? 2 : 1) : 0;
  // If crit count is reliable (matches or exceeds stored value), use it.
  // Otherwise fall back to movement.jump + PW bonus.
  // Detect PW double-counting: if movement.jump already equals crits+PW, don't add PW again.
  let jumpMP: number;
  if (jjMountsFromCrits > 0 && jjMountsFromCrits >= baseJumpMP) {
    // Crit data is complete; use crit count + PW
    jumpMP = jjMountsFromCrits + partialWingJumpBonus;
  } else if (
    cs.hasPartialWing &&
    jjMountsFromCrits > 0 &&
    baseJumpMP === jjMountsFromCrits + partialWingJumpBonus
  ) {
    // movement.jump already includes PW bonus (matches crits+PW exactly)
    jumpMP = baseJumpMP;
  } else {
    // Incomplete crit data or no JJ in crits; use movement.jump + PW bonus
    jumpMP = baseJumpMP + partialWingJumpBonus;
  }
  const hasStealth = armorType === 'stealth';

  // Weapons
  type WeaponEntry = {
    id: string;
    name: string;
    heat: number;
    bv: number;
    rear?: boolean;
    isTurret?: boolean;
    hasAES?: boolean;
    isDirectFire?: boolean;
    location: string;
    artemisType?: 'iv' | 'v';
    riscLPMApplied?: boolean;
  };
  const weapons: WeaponEntry[] = [];
  const unresolvedWeapons: string[] = [];
  let hasTC = cs.hasTC;
  const defEquipIds: string[] = [...cs.defEquipIds];

  // Pre-consume rearWeaponCountByLoc for equipment entries with explicit rear locations.
  // This prevents the secondary crit check from incorrectly marking front weapons as rear
  // when a matching rear weapon exists at the same location (e.g., ML front + ML (R) both at LT).
  for (const eq of unit.equipment) {
    if (!isRearLoc(eq.location)) continue;
    // Strip rear marker to get the base location (e.g., "LEFT_TORSO_(R)" → "LEFT_TORSO")
    const rawLoc = eq.location
      .split(',')[0]
      .toUpperCase()
      .replace(/[_(]R[)]/gi, '')
      .replace(/_$/, '')
      .replace(/\s*REAR\s*/i, '')
      .trim();
    const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
    if (!locRearMap) continue;
    const eqNorm = normalizeEquipId(eq.id);
    for (const [critName, count] of Array.from(locRearMap.entries())) {
      if (
        count > 0 &&
        (critName === eqNorm ||
          critName.includes(eqNorm) ||
          eqNorm.includes(critName))
      ) {
        locRearMap.set(critName, count - 1);
        break;
      }
    }
  }

  for (const eq of unit.equipment) {
    // Strip numeric prefix from equipment ID (e.g., "1-iseherppc" → "iseherppc")
    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty =
      qtyMatch && parseInt(qtyMatch[1], 10) > 1 ? parseInt(qtyMatch[1], 10) : 1;
    const resolveId = qtyMatch ? eq.id.replace(/^\d+-/, '') : eq.id;

    const lo = resolveId.toLowerCase();
    if (
      lo.includes('targeting-computer') ||
      lo.includes('targeting computer')
    ) {
      hasTC = true;
      continue;
    }
    if (lo.includes('tsm') || lo.includes('triple-strength-myomer')) continue;
    if (isDefEquip(resolveId)) continue;
    if (!isWeaponEquip(resolveId)) continue;

    let clanDetected =
      unit.techBase === 'MIXED' &&
      isClanEquipAtLocation(resolveId, eq.location, unit.criticalSlots);
    // Fallback: if crit data is missing for this location (e.g., quad leg weapons),
    // scan ALL crit locations for a matching CL-prefixed entry of this weapon.
    if (!clanDetected && unit.techBase === 'MIXED' && unit.criticalSlots) {
      const locKey = eq.location.split(',')[0].toUpperCase();
      const hasLocCrits =
        !!unit.criticalSlots[locKey] || !!unit.criticalSlots[eq.location];
      if (!hasLocCrits) {
        // Location crits missing — check all locations globally
        for (const loc of Object.keys(unit.criticalSlots)) {
          if (isClanEquipAtLocation(resolveId, loc, unit.criticalSlots)) {
            clanDetected = true;
            break;
          }
        }
      }
    }
    const res = resolveWeaponForUnit(resolveId, unit.techBase, clanDetected);
    if (!res.resolved || res.battleValue === 0) unresolvedWeapons.push(eq.id);

    const wid = eq.id.toLowerCase();
    const widStripped = wid.replace(/^\d+-/, '');
    const isRocketLauncher =
      wid.includes('rocket-launcher') ||
      wid.includes('rl-') ||
      /^rl\d+$/.test(wid) ||
      widStripped.includes('rocketlauncher') ||
      /^(?:is|cl)rocketlauncher\d+$/.test(widStripped) ||
      /^rl\d+$/.test(widStripped);
    // I-OS (Improved One-Shot), OS (One-Shot), and "one-shot" suffix weapons
    const isIOS =
      /[- ]i-?os$/i.test(widStripped) ||
      /[- ]os$/i.test(widStripped) ||
      widStripped.includes('one-shot');
    const isOneShot = isRocketLauncher || isIOS;
    const effectiveHeat = isOneShot ? res.heat / 4 : res.heat;
    // IOS weapons use 1/5 of base weapon BV (aliases must point to BASE weapon entries)
    const effectiveBV = isIOS
      ? Math.round(res.battleValue / 5.0)
      : res.battleValue;

    let isRear = isRearLoc(eq.location);

    for (let i = 0; i < qty; i++) {
      let thisRear = isRear;
      if (!thisRear && unit.criticalSlots) {
        const rawLoc = eq.location.split(',')[0].toUpperCase();
        const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
        if (locRearMap) {
          const eqNorm = normalizeEquipId(eq.id);
          const eqCanonical = normalizeEquipmentId(eq.id);
          // Sort-insensitive token match: handles word-order mismatches like
          // equipment "improved-heavy-medium-laser" vs crit "CLImprovedMediumHeavyLaser"
          // which normalize to "improvedheavymediumlaser" vs "improvedmediumheavylaser".
          const sortedEqNorm = eqNorm.split('').sort().join('');
          for (const [critName, count] of Array.from(locRearMap.entries())) {
            if (
              count > 0 &&
              (critName === eqNorm ||
                critName.includes(eqNorm) ||
                eqNorm.includes(critName) ||
                normalizeEquipmentId(critName) === eqCanonical ||
                critName.split('').sort().join('') === sortedEqNorm)
            ) {
              thisRear = true;
              locRearMap.set(critName, count - 1);
              break;
            }
          }
        }
      }
      // Turret-mounted detection: (T) suffix in crits — excluded from determineFront
      let thisTurret = false;
      if (unit.criticalSlots) {
        const rawLoc = eq.location.split(',')[0].toUpperCase();
        const locTurretMap = cs.turretWeaponCountByLoc.get(rawLoc);
        if (locTurretMap) {
          const eqNorm = normalizeEquipId(eq.id);
          const eqCanonical = normalizeEquipmentId(eq.id);
          const sortedEqNorm = eqNorm.split('').sort().join('');
          for (const [critName, count] of Array.from(locTurretMap.entries())) {
            if (
              count > 0 &&
              (critName === eqNorm ||
                critName.includes(eqNorm) ||
                eqNorm.includes(critName) ||
                normalizeEquipmentId(critName) === eqCanonical ||
                critName.split('').sort().join('') === sortedEqNorm)
            ) {
              thisTurret = true;
              thisRear = false; // turret weapons are never rear
              locTurretMap.set(critName, count - 1);
              break;
            }
          }
        }
      }

      const weaponLocUpper = eq.location.split(',')[0].toUpperCase();
      const weaponHasAES = cs.aesLocs.some(
        (aLoc) => aLoc.toUpperCase() === weaponLocUpper,
      );
      weapons.push({
        id: normalizeWeaponKey(eq.id),
        name: wid,
        heat: effectiveHeat,
        bv: effectiveBV,
        rear: thisRear,
        isTurret: thisTurret,
        hasAES: weaponHasAES,
        isDirectFire:
          !wid.includes('lrm') &&
          !wid.includes('srm') &&
          !wid.includes('mrm') &&
          !wid.includes('atm') &&
          !wid.includes('mml') &&
          !wid.includes('narc') &&
          !wid.includes('inarc') &&
          !wid.includes('lrt') &&
          !wid.includes('srt') &&
          !wid.includes('thunderbolt') &&
          !wid.includes('rocket') &&
          !wid.includes('arrow') &&
          !wid.includes('mortar') &&
          !wid.includes('sniper') &&
          !wid.includes('thumper') &&
          !wid.includes('long-tom') &&
          // Per MegaMek: MGs, Flamers, AMS and TAG do NOT have F_DIRECT_FIRE
          !wid.includes('machine-gun') &&
          !wid.includes('flamer') &&
          !wid.includes('anti-missile') &&
          !wid.includes('ams') &&
          wid !== 'tag' &&
          !wid.includes('light-tag') &&
          !wid.includes('clan-tag'),
        location: eq.location,
      });
    }
  }
  if (unresolvedWeapons.length > 0)
    issues.push(`Unresolved weapons (0 BV): ${unresolvedWeapons.join(', ')}`);

  // Machine Gun Array (MGA): MegaMek counts individual MGs at full BV, then adds
  // MGA bonus = sum(linked MG BVs) × 0.67 as a separate weapon entry with heat=0.
  // MGA links to up to 4 MGs of matching type at the same location.
  // Track consumed MGs so each MG is only linked to one MGA.
  const mgaConsumed = new Set<number>(); // indices of weapons already linked to an MGA
  for (const eq of unit.equipment) {
    // Strip quantity prefix (e.g., "1-islmga" → "islmga")
    const rawId = eq.id.toLowerCase().replace(/^\d+-/, '');
    let mgType: string | null = null;
    if (
      rawId === 'machine-gun-array' ||
      rawId === 'ismga' ||
      rawId === 'clmga' ||
      rawId.endsWith('-mga')
    )
      mgType = 'machine-gun';
    else if (
      rawId === 'light-machine-gun-array' ||
      rawId === 'islmga' ||
      rawId === 'cllmga' ||
      rawId.endsWith('-lmga') ||
      rawId === 'islightmga' ||
      rawId === 'cllightmga'
    )
      mgType = 'light-machine-gun';
    else if (
      rawId === 'heavy-machine-gun-array' ||
      rawId === 'ishmga' ||
      rawId === 'clhmga' ||
      rawId.endsWith('-hmga') ||
      rawId === 'isheavymga' ||
      rawId === 'clheavymga'
    )
      mgType = 'heavy-machine-gun';
    if (!mgType) continue;

    const mgLoc = eq.location.split(',')[0].toUpperCase();
    // Link up to 4 unconsumed MGs of matching type at the same location
    let linkedMGBV = 0;
    let linkedCount = 0;
    for (let wi = 0; wi < weapons.length; wi++) {
      if (linkedCount >= 4) break;
      if (mgaConsumed.has(wi)) continue;
      const w = weapons[wi];
      const wLoc = w.location.split(',')[0].toUpperCase();
      if (wLoc !== mgLoc) continue;
      const wid = w.name.replace(/^\d+-/, '');
      const isMatch =
        (mgType === 'machine-gun' &&
          (wid === 'machine-gun' ||
            wid === 'clmg' ||
            wid === 'ismg' ||
            wid === 'ismachine-gun' ||
            wid === 'clmachine-gun')) ||
        (mgType === 'light-machine-gun' &&
          (wid === 'light-machine-gun' ||
            wid === 'islightmg' ||
            wid === 'cllightmg' ||
            wid === 'islmg' ||
            wid === 'islightmachine-gun' ||
            wid === 'cllightmachine-gun')) ||
        (mgType === 'heavy-machine-gun' &&
          (wid === 'heavy-machine-gun' ||
            wid === 'isheavymg' ||
            wid === 'clheavymg' ||
            wid === 'clhmg' ||
            wid === 'isheavymachine-gun' ||
            wid === 'clheavymachine-gun'));
      if (isMatch) {
        linkedMGBV += w.bv;
        linkedCount++;
        mgaConsumed.add(wi);
      }
    }
    if (linkedMGBV > 0) {
      const mgaBV = linkedMGBV * 0.67;
      weapons.push({
        id: 'mga-bonus',
        name: rawId,
        heat: 0,
        bv: mgaBV,
        rear: false,
        hasAES: false,
        isDirectFire: false,
        location: eq.location,
      });
    }
  }

  // Drone Operating System: all weapon BVs × 0.8 (MegaMek processWeapons dBV *= 0.8)
  if (cs.detectedDroneOS) {
    for (const w of weapons) {
      w.bv *= 0.8;
    }
  }

  // Note: Shields do NOT halve weapon BV in MegaMek's BVCalculator.
  // Shield arm tracking (cs.shieldArms) is kept for potential future use, but
  // weapons in shield arms are counted at full BV per the MegaMek source code.

  // Artemis IV/V — location-aware assignment (Artemis links to missile weapon in same location)
  if (cs.artemisIVLocs.length > 0 || cs.artemisVLocs.length > 0) {
    const ivLocs = [...cs.artemisIVLocs];
    const vLocs = [...cs.artemisVLocs];
    for (const w of weapons) {
      const isMsl =
        w.name.includes('lrm') ||
        w.name.includes('srm') ||
        w.name.includes('mml') ||
        w.name.includes('atm') ||
        w.name.includes('lrt') ||
        w.name.includes('srt');
      if (!isMsl) continue;
      const wLoc = toMechLoc(w.location.split(',')[0]);
      if (!wLoc) continue;
      const vIdx = vLocs.indexOf(wLoc);
      if (vIdx >= 0) {
        w.artemisType = 'v';
        vLocs.splice(vIdx, 1);
      } else {
        const ivIdx = ivLocs.indexOf(wLoc);
        if (ivIdx >= 0) {
          w.artemisType = 'iv';
          ivLocs.splice(ivIdx, 1);
        }
      }
    }
  }

  if (cs.apollo > 0) {
    let a = cs.apollo;
    for (const w of weapons) {
      if (a <= 0) break;
      if (w.name.includes('mrm')) {
        w.bv = Math.round(w.bv * 1.15);
        a--;
      }
    }
  }

  if (cs.ppcCapLocs.length > 0) {
    // Track which weapon indices have already been matched by a capacitor.
    // Without this, weapons.find() always returns the FIRST match, so two caps
    // in the same location (e.g., two Light PPCs + two caps in LEFT_ARM) would
    // both augment the same weapon instead of one each.
    const capConsumed = new Set<number>();
    for (const capLoc of cs.ppcCapLocs) {
      // Find the NEXT unconsumed PPC weapon in the same location as the capacitor
      const ppcIdx = weapons.findIndex(
        (w, i) =>
          !capConsumed.has(i) &&
          w.name.includes('ppc') &&
          w.location.toUpperCase().replace(/[_\s-]+/g, '') ===
            capLoc.toUpperCase().replace(/[_\s-]+/g, ''),
      );
      if (ppcIdx < 0) continue;
      capConsumed.add(ppcIdx);
      const ppcInLoc = weapons[ppcIdx];
      const wlo = ppcInLoc.name.replace(/^\d+-/, '');
      // Check if the PPC in this location is Clan by examining crit slot names
      const locSlots = unit.criticalSlots?.[capLoc] || [];
      const hasClanPPC = (locSlots as string[]).some(
        (s: string) =>
          s &&
          typeof s === 'string' &&
          s.toUpperCase().startsWith('CL') &&
          s.toUpperCase().includes('PPC'),
      );
      let capBV = 44;
      if (wlo.includes('erppc') || wlo.includes('er-ppc')) {
        capBV =
          unit.techBase === 'CLAN' ||
          wlo.startsWith('cl') ||
          wlo.startsWith('clan') ||
          hasClanPPC
            ? 136
            : 114;
      } else if (wlo.includes('heavy') || wlo.includes('hppc')) {
        capBV = 53;
      } else if (wlo.includes('snub') || wlo.includes('snppc')) {
        capBV = 87;
      } else if (wlo.includes('light') || wlo.includes('lppc')) {
        capBV = 44;
      } else if (wlo.includes('ppc')) {
        capBV = 88;
      }
      // MegaMek processWeapon(): AES ×1.25 applies to BASE weapon BV, then cap BV
      // is added AFTER. Since applyWeaponBVModifiers applies AES later, pre-divide
      // capBV by 1.25 so that (baseBV + capBV/1.25) × 1.25 = baseBV×1.25 + capBV.
      ppcInLoc.bv += ppcInLoc.hasAES ? capBV / 1.25 : capBV;
      ppcInLoc.heat += 5;
    }
  }

  // RISC Laser Pulse Module: linked lasers get BV × 1.15 and heat + 2
  // per MegaMek BVCalculator.processWeapon() — same pattern as Apollo for missiles
  if (cs.riscLPMLocs.length > 0) {
    for (const lpmLoc of cs.riscLPMLocs) {
      // Find a laser weapon in the same location that hasn't already been boosted
      const laserInLoc = weapons.find(
        (w) =>
          !w.riscLPMApplied &&
          (w.name.toLowerCase().includes('laser') ||
            w.name.toLowerCase().includes('pulse')) &&
          w.location.toUpperCase().replace(/[_\s-]+/g, '') ===
            lpmLoc.toUpperCase().replace(/[_\s-]+/g, ''),
      );
      if (!laserInLoc) continue;
      laserInLoc.bv = laserInLoc.bv * 1.15;
      laserInLoc.heat += 2;
      laserInLoc.riscLPMApplied = true;
    }
  }

  // MGA: MegaMek documentation says MGA replaces individual MGs with sum(BV) × 0.67, but
  // MUL reference BVs do NOT apply this reduction — they use full individual MG BV.
  // Applying ×0.67 causes massive regression (units drop 5-10% further below reference).
  // Keep individual MGs at full BV with no MGA reduction to match MUL reference values.

  // determineFront — use fully-modified BV (with TC, rear ×0.5) per MegaMek
  // Turret-mounted weapons are excluded from front/rear comparison per MegaMek
  let fBV = 0,
    rBV = 0;
  for (const w of weapons) {
    if (isArmLoc(w.location) || w.isTurret) continue;
    let modBV = w.bv;
    if (w.hasAES) modBV *= 1.25;
    if (hasTC && w.isDirectFire) modBV *= 1.25;
    if (w.rear) {
      rBV += modBV * 0.5;
    } else {
      fBV += modBV;
    }
  }
  if (rBV > fBV) {
    for (const w of weapons) {
      if (!isArmLoc(w.location) && !w.isTurret) w.rear = !w.rear;
    }
  }

  const ammoForCalc = cs.ammo.map((a) => ({
    id: a.id,
    bv: a.bv,
    weaponType: a.weaponType,
  }));
  if (process.env.DEBUG_AMMO && ammoForCalc.length > 0) {
    console.error(
      `AMMO: ${ammoForCalc.map((a) => `${a.id}(bv=${a.bv},wt=${a.weaponType})`).join(', ')}`,
    );
    console.error(
      `WEAPONS: ${weapons.map((w) => `${w.id}(bv=${w.bv})`).join(', ')}`,
    );
  }

  let defEquipBV = 0;
  let amsWeaponBV = 0;
  for (const did of defEquipIds) {
    // Strip "(armored)" and rear-mount "(R)" suffixes so variants resolve to base equipment BV
    const didClean = did
      .replace(/\s*\(armored\)/gi, '')
      .replace(/\s*\(r\)/gi, '')
      .trim();
    const resolvedBV = resolveEquipmentBV(didClean).battleValue;
    defEquipBV += resolvedBV;
    const dlo = did.toLowerCase();
    const isAmsWeapon =
      (dlo.includes('anti-missile') ||
        dlo.includes('antimissile') ||
        dlo === 'isams' ||
        dlo === 'clams' ||
        dlo.includes('apds')) &&
      !dlo.includes('ammo');
    if (isAmsWeapon) amsWeaponBV += resolvedBV;
  }
  if (cs.amsAmmoBV > 0 && amsWeaponBV > 0) {
    defEquipBV += Math.min(amsWeaponBV, cs.amsAmmoBV);
  }
  // Spikes: 4 BV per location (defensive equipment per MegaMek)
  defEquipBV += cs.spikeCount * 4;
  // RISC Viral Jammer (Decoy/Homing): 284 BV each (defensive equipment per MegaMek MiscType)
  defEquipBV += cs.riscViralJammerCount * 284;

  const explResult = calculateExplosivePenalties({
    equipment: cs.explosive,
    caseLocations: cs.caseLocs,
    caseIILocations: cs.caseIILocs,
    engineType,
    isQuad: effectiveConfig?.toLowerCase() === 'quad',
  });

  // Blue Shield Particle Field Damper: explosive penalty of -1 BV per unprotected location
  // Per MekBVCalculator.processExplosiveEquipment() lines 143-180:
  // Counts locations (CT through LL) that are NOT protected, subtracts 1 BV per unprotected loc.
  let blueShieldExplosivePenalty = 0;
  if (cs.hasBlueShield) {
    const isClan =
      unit.techBase === 'CLAN' ||
      (unit.techBase === 'MIXED' &&
        unitId !== undefined &&
        CLAN_CHASSIS_MIXED_UNITS.has(unitId));
    const engineDef = getEngineDefinition(engineType);
    const sideTorsoSlots = engineDef?.sideTorsoSlots ?? 0;
    const bodyLocs: MechLocation[] = ['CT', 'RT', 'LT', 'RA', 'LA', 'RL', 'LL'];
    for (const loc of bodyLocs) {
      // CASE II protects fully
      if (cs.caseIILocs.includes(loc)) continue;
      if (isClan) {
        // Clan: CT, RL, LL always unprotected; arms always protected;
        // side torsos protected unless engine has >2 side torso slots
        if (loc === 'RA' || loc === 'LA') continue; // arms protected by built-in Clan CASE
        if ((loc === 'RT' || loc === 'LT') && sideTorsoSlots <= 2) continue;
      } else {
        // IS: if engine has ≤2 side torso slots, CASE can protect locations
        if (sideTorsoSlots <= 2) {
          if ((loc === 'RT' || loc === 'LT') && cs.caseLocs.includes(loc))
            continue;
          if (
            loc === 'LA' &&
            (cs.caseLocs.includes('LA') || cs.caseLocs.includes('LT'))
          )
            continue;
          if (
            loc === 'RA' &&
            (cs.caseLocs.includes('RA') || cs.caseLocs.includes('RT'))
          )
            continue;
        }
      }
      blueShieldExplosivePenalty += 1;
    }
  }
  const totalExplosivePenalty =
    explResult.totalPenalty + blueShieldExplosivePenalty;

  // HarJel II/III: per-location armor BV multiplier (1.1x / 1.2x)
  // MegaMek calculates armor BV per-location when HarJel is present
  let harjelArmorBonus = 0;
  if (cs.harjelIILocs.length > 0 || cs.harjelIIILocs.length > 0) {
    const armorMult = getArmorBVMultiplier(hasStealth ? 'standard' : armorType);
    for (const [locName, armorVal] of Object.entries(unit.armor.allocation)) {
      const ml = toMechLoc(locName);
      if (!ml) continue;
      let locArmor: number;
      if (typeof armorVal === 'number') {
        locArmor = armorVal;
      } else {
        locArmor = (armorVal.front || 0) + (armorVal.rear || 0);
      }
      let locMult = 1.0;
      if (cs.harjelIIILocs.includes(ml)) locMult = 1.2;
      else if (cs.harjelIILocs.includes(ml)) locMult = 1.1;
      if (locMult !== 1.0) {
        // Bonus = armor * 2.5 * armorMult * (locMult - 1.0) — the extra portion beyond base
        harjelArmorBonus += locArmor * 2.5 * armorMult * (locMult - 1.0);
      }
    }
  }

  // Defensive BV
  // Fix: jump TMM gets +1 per MegaMek getTargetMovementModifier(jumpMP, isJump=true)
  // Since calculateDefensiveBV uses calculateTMM(max(runMP, jumpMP)) which misses +1,
  // we pre-compute the correct TMM and convert to an equivalent MP for the function.
  function tmmFromMP(mp: number): number {
    if (mp <= 2) return 0;
    if (mp <= 4) return 1;
    if (mp <= 6) return 2;
    if (mp <= 9) return 3;
    if (mp <= 17) return 4;
    if (mp <= 24) return 5;
    return 6;
  }
  // TMM → minimum MP that produces that TMM: [0,3,5,7,10,18,25]
  const tmmToMinMP = [0, 3, 5, 7, 10, 18, 25];
  const runTMM = tmmFromMP(runMP);
  const effectiveJump = Math.max(jumpMP, cs.umuMP);
  const jumpTMM = effectiveJump > 0 ? tmmFromMP(effectiveJump) + 1 : 0;
  const correctMaxTMM = Math.max(runTMM, jumpTMM);
  // Convert to an equivalent runMP that calculateTMM will map to correctMaxTMM
  const defRunMP = correctMaxTMM <= 6 ? tmmToMinMP[correctMaxTMM] : 25;

  // BAR (Barrier Armor Rating): Commercial armor = BAR 5, all others = BAR 10
  // Per MegaMek Mek.getBARRating() and BVCalculator.processArmor()
  const bar = getArmorBAR(armorType);

  // Armored gyro correction: MegaMek uses weight × gyroMultiplier × 0.05 per slot
  // instead of flat 5 per slot. Apply the difference as a correction.
  let correctedArmoredBV = cs.armoredComponentBV;
  if (cs.armoredGyroSlots > 0) {
    const gyroMult =
      GYRO_BV_MULTIPLIERS[gyroType?.toLowerCase() ?? 'standard'] ?? 0.5;
    const correctPerSlot = unit.tonnage * gyroMult * 0.05;
    correctedArmoredBV += cs.armoredGyroSlots * (correctPerSlot - 5);
  }

  // Armored PPC + Capacitor correction: per MegaMek Mek.getArmoredComponentBV(),
  // PPC Capacitor is SKIPPED from direct counting. Instead, when a PPC weapon has
  // a linked cap, both BVs are combined: (ppcBV + capBV) × 0.05 × (ppcSlots + 1).
  // Our per-slot scanning already counted armored PPC slots as ppcBV × 0.05 each.
  // This correction adds the missing capBV contribution and the +1 slot bonus.
  if (cs.armoredPPCCapLocs.length > 0 && unit.criticalSlots) {
    for (const capLoc of cs.armoredPPCCapLocs) {
      // Find armored PPC crit slots in the same location
      const locSlots = (unit.criticalSlots as Record<string, unknown[]>)[
        capLoc
      ];
      if (!locSlots) continue;
      const armoredPPCSlots = locSlots.filter(
        (s) =>
          typeof s === 'string' &&
          s.toLowerCase().includes('ppc') &&
          !s.toLowerCase().includes('capacitor') &&
          (s.toLowerCase().includes('(armored)') ||
            (s.toLowerCase().endsWith('armored') &&
              !s.toLowerCase().includes('armor'))),
      ).length;
      if (armoredPPCSlots === 0) continue;
      // Determine PPC BV (check if Clan PPC from crit names)
      const hasClanPPC = locSlots.some(
        (s) =>
          typeof s === 'string' &&
          s.toUpperCase().startsWith('CL') &&
          s.toUpperCase().includes('PPC'),
      );
      // Determine PPC variant and cap BV
      const ppcSlotName =
        locSlots
          .find(
            (s) =>
              typeof s === 'string' &&
              s.toLowerCase().includes('ppc') &&
              !s.toLowerCase().includes('capacitor'),
          )
          ?.toString()
          .toLowerCase() ?? '';
      let capBV = 88; // standard PPC cap
      if (ppcSlotName.includes('erppc') || ppcSlotName.includes('er ppc')) {
        capBV = hasClanPPC ? 136 : 114;
      } else if (
        ppcSlotName.includes('heavy') ||
        ppcSlotName.includes('hppc')
      ) {
        capBV = 53;
      } else if (
        ppcSlotName.includes('snub') ||
        ppcSlotName.includes('snppc')
      ) {
        capBV = 87;
      } else if (
        ppcSlotName.includes('light') ||
        ppcSlotName.includes('lppc')
      ) {
        capBV = 44;
      }
      // Resolve PPC weapon BV
      const ppcName = ppcSlotName
        .replace(/\s*\(armored\)/gi, '')
        .replace(/\s*\(r\)/gi, '')
        .trim();
      const ppcResult = resolveWeaponForUnit(
        ppcName,
        unit.techBase || 'INNER_SPHERE',
      );
      const ppcBV = ppcResult.resolved ? ppcResult.battleValue : 0;
      if (ppcBV > 0) {
        // MegaMek formula: (ppcBV + capBV) × 0.05 × (ppcSlots + 1)
        // Already counted: ppcBV × 0.05 × ppcSlots (from per-slot scanning)
        // Difference: capBV × 0.05 × (ppcSlots + 1) + ppcBV × 0.05
        const correction = capBV * 0.05 * (armoredPPCSlots + 1) + ppcBV * 0.05;
        correctedArmoredBV += correction;
      }
    }
  }

  const defCfg: Parameters<typeof calculateDefensiveBV>[0] = {
    totalArmorPoints: totalArmor,
    totalStructurePoints: totalStructure,
    tonnage: unit.tonnage,
    runMP: defRunMP,
    jumpMP: 0,
    umuMP: 0,
    armorType: hasStealth ? 'standard' : armorType,
    structureType,
    gyroType,
    engineType,
    bar,
    defensiveEquipmentBV: defEquipBV + harjelArmorBonus + correctedArmoredBV,
    explosivePenalties: totalExplosivePenalty,
    hasStealthArmor: hasStealth,
    hasChameleonLPS: cs.hasChameleon,
    hasNullSig: cs.hasNullSig,
    hasVoidSig: cs.hasVoidSig,
    hasBlueShield: cs.hasBlueShield,
  };
  if (engineBVOverride !== undefined) {
    defCfg.engineMultiplier = engineBVOverride;
    defCfg.engineType = undefined;
  }
  const defResult = calculateDefensiveBV(defCfg);

  let physicalWeaponBV = 0;
  for (const pw of cs.physicalWeapons) {
    let bv = calculatePhysicalWeaponBV(pw.type, unit.tonnage, cs.hasTSM);
    bv = Math.round(bv * 1000.0) / 1000.0;
    const pwLocUpper = pw.location.toUpperCase();
    if (cs.aesLocs.some((aLoc) => aLoc.toUpperCase() === pwLocUpper))
      bv *= 1.25;
    physicalWeaponBV += bv;
  }

  const isXXLEngine = engineType === EngineType.XXL;
  let offensiveEquipBV = 0;
  // Mine Dispensers: BV=8 each, offensive equipment per MegaMek
  offensiveEquipBV += cs.mineDispenserCount * 8;
  // Misc equipment with offensive BV (Bridge Layers, etc.)
  offensiveEquipBV += cs.miscEquipBV;
  if (cs.hasRamPlate) {
    const ramDamage = Math.floor(unit.tonnage * runMP * 0.1) / 2;
    const ramPlateBV = Math.floor(ramDamage) * 1.1;
    offensiveEquipBV += Math.round(ramPlateBV * 1000.0) / 1000.0;
  }
  // Note: Watchdog CEWS is NOT counted as offensive equipment in MegaMek
  // (the bv=7 code is unreachable due to F_BAP skip in processOffensiveEquipment)
  // AES weight bonus: arm AES (+0.1 each), leg AES (+0.2 biped, +0.4 quad)
  // per MekBVCalculator.processWeight() lines 428-441
  const armAES = cs.aesLocs.filter((loc) =>
    loc.toUpperCase().includes('ARM'),
  ).length;
  const hasLegAES = cs.aesLocs.some((loc) => loc.toUpperCase().includes('LEG'));
  const isQuad = effectiveConfig?.toLowerCase() === 'quad';
  // For jump heat calculation, MegaMek's getJumpHeat() subtracts partial wing bonus
  // from movedMP before computing heat (Mek.java lines 1281-1291).
  // So jump heat uses jumpMP minus the PW bonus.
  const jumpHeatMP = Math.max(0, jumpMP - partialWingJumpBonus);
  // EC-52: Industrial mech fire control modifier
  // MegaMek Mek.hasAdvancedFireControl() returns false for industrial cockpit types:
  // COCKPIT_INDUSTRIAL, COCKPIT_PRIMITIVE_INDUSTRIAL, COCKPIT_SUPERHEAVY_INDUSTRIAL,
  // COCKPIT_TRIPOD_INDUSTRIAL, COCKPIT_SUPERHEAVY_TRIPOD_INDUSTRIAL
  // When false, offensive BV is multiplied by 0.9
  const isIndustrialMech =
    cockpitUpper === 'INDUSTRIAL' ||
    cockpitUpper === 'PRIMITIVE_INDUSTRIAL' ||
    cockpitUpper === 'SUPERHEAVY_INDUSTRIAL' ||
    cockpitUpper === 'TRIPOD_INDUSTRIAL' ||
    cockpitUpper === 'SUPERHEAVY_TRIPOD_INDUSTRIAL';
  const offResult = calculateOffensiveBVWithHeatTracking({
    weapons,
    ammo: ammoForCalc,
    tonnage: unit.tonnage,
    walkMP: bvWalk,
    runMP,
    jumpMP,
    umuMP: cs.umuMP,
    heatDissipation: heatDiss,
    hasTargetingComputer: hasTC,
    hasTSM: cs.hasTSM,
    hasIndustrialTSM: cs.hasIndustrialTSM,
    hasStealthArmor: hasStealth,
    hasNullSig: cs.hasNullSig,
    hasVoidSig: cs.hasVoidSig,
    hasChameleonShield: cs.hasChameleon,
    physicalWeaponBV,
    offensiveEquipmentBV: offensiveEquipBV,
    hasImprovedJJ: cs.hasImprovedJJ,
    hasPrototypeIJJ: cs.hasPrototypeIJJ,
    isXXLEngine,
    engineType,
    coolantPods: cs.coolantPods,
    heatSinkCount: effectiveHSCount,
    jumpHeatMP: jumpHeatMP,
    aesArms: armAES,
    aesLegs: hasLegAES ? (isQuad ? 4 : 2) : 0,
    isIndustrialMech,
    hasSCM: cs.hasSCM,
  });

  const baseBV = defResult.totalDefensiveBV + offResult.totalOffensiveBV;
  // Cockpit type comes directly from unit data (now properly parsed from MTF source).
  // Heuristic fallbacks only needed if data still says 'standard' but crits disagree.
  const effectiveCockpit =
    cockpitType !== 'standard'
      ? cockpitType
      : cs.detectedInterfaceCockpit
        ? 'interface'
        : cs.detectedSmallCockpit
          ? 'small'
          : cockpitType;
  // MegaMek processSummarize(): cockpit modifiers are else-if chained — only ONE applies.
  // Drone OS 0.95 only applies if cockpit type doesn't already have its own modifier.
  // Torso-mounted cockpit: MegaMek applies 0.95 (same as small cockpit).
  const cockpitHasModifier =
    effectiveCockpit === 'small' ||
    effectiveCockpit === 'torso-mounted' ||
    effectiveCockpit === 'small-command-console' ||
    effectiveCockpit === 'interface';
  const finalCockpitMod = cockpitHasModifier
    ? getCockpitModifier(effectiveCockpit as CockpitType)
    : cs.detectedDroneOS
      ? 0.95
      : getCockpitModifier(effectiveCockpit as CockpitType);
  // RISC Heat Sink Override Kit: 1.01x multiplier to base BV
  // Per MekBVCalculator.processSummarize() lines 479-501
  const riscKitMod =
    unitId && KNOWN_RISC_OVERRIDE_KIT_UNITS.has(unitId) ? 1.01 : 1.0;
  let totalBV = Math.round(baseBV * finalCockpitMod * riscKitMod);

  const cockpitMod = finalCockpitMod;
  const totalDefEquipBV = defEquipBV + harjelArmorBonus + correctedArmoredBV;
  return {
    bv: totalBV,
    breakdown: {
      // Defensive sub-components
      armorBV: defResult.armorBV,
      structureBV: defResult.structureBV,
      gyroBV: defResult.gyroBV,
      defEquipBV,
      amsAmmoBV: cs.amsAmmoBV,
      armoredComponentBV: correctedArmoredBV,
      harjelBonus: harjelArmorBonus,
      explosivePenalty: explResult.totalPenalty,
      defensiveFactor: defResult.defensiveFactor,
      maxTMM: correctMaxTMM,
      defensiveBV: defResult.totalDefensiveBV,
      // Offensive sub-components
      weaponBV: offResult.weaponBV,
      rawWeaponBV: offResult.rawWeaponBV ?? offResult.weaponBV,
      halvedWeaponBV: offResult.halvedWeaponBV ?? 0,
      ammoBV: offResult.ammoBV,
      weightBonus: offResult.weightBonus,
      physicalWeaponBV,
      offEquipBV: offensiveEquipBV,
      heatEfficiency: offResult.heatEfficiency ?? 0,
      heatDissipation: heatDiss,
      moveHeat: offResult.moveHeat ?? 0,
      speedFactor: offResult.speedFactor,
      offensiveBV: offResult.totalOffensiveBV,
      // Modifiers
      cockpitModifier: cockpitMod,
      cockpitType: effectiveCockpit,
      // Context
      techBase: unit.techBase,
      walkMP: bvWalk,
      runMP,
      jumpMP,
      weaponCount: offResult.weaponCount ?? weapons.length,
      halvedWeaponCount: offResult.halvedWeaponCount ?? 0,
      // Legacy alias
      defensiveEquipBV: totalDefEquipBV,
    },
    issues,
  };
}
