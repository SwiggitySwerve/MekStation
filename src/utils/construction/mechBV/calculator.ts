/** Shared BattleMech BV owner. Rules: openspec/specs/battle-value-system/spec.md.
 * Gate rules retained for numerical parity; pure scan helpers
 * remain at their compatibility paths until a separate relocation can fit the lane budget.
 */
import type {
  UnitData,
  ValidationResult,
} from '../../../../scripts/validate-bv-types';

import {
  deriveDefensiveMovementInputs,
  deriveUnitBvCalculatorSetup,
} from '../../../../scripts/validate-bv-calculator-setup';
import { hasClanChassis } from '../../../../scripts/validate-bv-chassis';
import { scanCrits } from '../../../../scripts/validate-bv-crit-scan';
import { deriveBvHeatAndMovement } from '../../../../scripts/validate-bv-movement-derived';
import { toMechLoc } from '../../../../scripts/validate-bv-normalizers';
import { calculatePhysicalBVTotal } from '../../../../scripts/validate-bv-physical-weapons';
import {
  calcTotalArmor,
  getArmorBAR,
  mapArmorType,
} from '../../../../scripts/validate-bv-unit-derived';
import {
  KNOWN_HD_GYRO_UNITS,
  KNOWN_RISC_OVERRIDE_KIT_UNITS,
} from '../../../../scripts/validate-bv-unit-overrides';
import { resolveWeaponForUnit } from '../../../../scripts/validate-bv-weapon-resolution';
import {
  EngineType,
  getEngineDefinition,
} from '../../../types/construction/EngineType';
import { isBimodalLAM } from '../../../types/construction/lamConfig';
import {
  getArmorBVMultiplier,
  GYRO_BV_MULTIPLIERS,
} from '../../../types/validation/BattleValue';
import {
  calculateDefensiveBV,
  calculateOffensiveBVWithHeatTracking,
  calculateExplosivePenalties,
  getCockpitModifier,
  type MechLocation,
} from '../../../utils/construction/battleValueCalculations';
import { resolveEquipmentBV } from '../../../utils/construction/equipmentBVResolver';
import { normalizeMechBVSourceName } from '../battleValueAmmo';
import {
  getModularArmorBVPoints,
  getNativeArmorBVMultiplier,
  getAmsBVWeaponKind,
} from '../battleValueDefensive';
import { calculateOffensiveSpeedFactor } from '../battleValueMovement';
import { deriveMechArmorSections } from './armorInputs';
import { buildMechBVOffensiveInputs } from './weaponInputs';

// === MAIN BV CALCULATION ===
export function calculateUnitBV(
  unit: UnitData,
  unitId?: string,
): { bv: number; breakdown: ValidationResult['breakdown']; issues: string[] } {
  const issues: string[] = [];
  const setup = deriveUnitBvCalculatorSetup(unit);
  const {
    engineType,
    structureType,
    cockpitType,
    cockpitUpper,
    engineBVOverride,
    totalStructure,
    effectiveConfig,
  } = setup;
  let { gyroType, totalArmor } = setup;
  const cs = scanCrits(unit, unitId);

  // Modular Armor: each slot adds 10 armor points for BV calculation
  if (cs.modularArmorSlots > 0)
    totalArmor += getModularArmorBVPoints(cs.modularArmorSlots);

  // Interface Cockpit: no gyro, so gyro BV = 0
  if (cs.detectedInterfaceCockpit) gyroType = 'none';

  // Override gyro type from crit-based detection and known HD gyro unit list
  if (gyroType !== 'none') {
    if (unitId && KNOWN_HD_GYRO_UNITS.has(unitId)) gyroType = 'heavy-duty';
    else if (cs.detectedGyroType) gyroType = cs.detectedGyroType;
  }

  const armorType = cs.detectedArmorType || mapArmorType(unit.armor.type);
  const { effectiveHSCount, heatDiss, bvWalk, runMP, jumpMP, jumpHeatMP } =
    deriveBvHeatAndMovement(unit, cs, armorType);
  const hasStealth = armorType === 'stealth';
  const patchworkTypes =
    unit.armor.type.toUpperCase() === 'PATCHWORK'
      ? unit.armor.typeByLocation
      : undefined;
  // Pinned LandAirMek.getAirMekFlankMP and MekBVCalculator.offensiveSpeedFactorMP.
  // Bimodal LAMs retain ordinary Mek movement; standard LAMs use airborne AirMek MP.
  const airMekFlankMP =
    unit.configuration?.toLowerCase() === 'lam' && !isBimodalLAM(unit.lamType)
      ? Math.ceil(jumpMP * 3 * 1.5)
      : undefined;

  const weaponInputs = buildMechBVOffensiveInputs(unit, cs, issues);
  const defEquipIds: string[] = [...cs.defEquipIds];

  const ammoForCalc = cs.ammo.map((a) => ({
    id: a.id,
    bv: a.bv,
    weaponType: a.weaponType,
  }));

  let defEquipBV = 0;
  let amsWeaponBV = 0;
  for (const did of defEquipIds) {
    // Strip "(armored)" and rear-mount "(R)" suffixes so variants resolve to base equipment BV
    const didClean = normalizeMechBVSourceName(did);
    const resolvedBV = resolveEquipmentBV(didClean).battleValue;
    defEquipBV += resolvedBV;
    if (getAmsBVWeaponKind(didClean)) amsWeaponBV += resolvedBV;
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
    const isClan = hasClanChassis(unit, unitId);
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
    for (const [locName, armorVal] of Object.entries(unit.armor.allocation)) {
      const armorMult = patchworkTypes
        ? getNativeArmorBVMultiplier(patchworkTypes[locName] ?? 0)
        : getArmorBVMultiplier(hasStealth ? 'standard' : armorType);
      const ml = toMechLoc(locName);
      if (!ml) continue;
      const locArmor = calcTotalArmor({ [locName]: armorVal });
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
  const { correctMaxTMM, defRunMP } = deriveDefensiveMovementInputs(
    airMekFlankMP === undefined ? runMP : 0,
    airMekFlankMP ?? jumpMP,
    cs.umuMP,
  );

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
      const locSlots = unit.criticalSlots[capLoc];
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
      const ppcName = normalizeMechBVSourceName(ppcSlotName);
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
    // MekBVCalculator.getRunningTMM uses airborne flank MP (+1), like jumping TMM.
    jumpMP: airMekFlankMP ?? 0,
    umuMP: 0,
    armorType: hasStealth ? 'standard' : armorType,
    structureType,
    gyroType,
    engineType,
    // Commercial armor uses BAR 5; other types use 10 (Mek.getBARRating).
    bar: getArmorBAR(armorType),
    defensiveEquipmentBV: defEquipBV + harjelArmorBonus + correctedArmoredBV,
    explosivePenalties: totalExplosivePenalty,
    hasStealthArmor: hasStealth,
    hasChameleonLPS: cs.hasChameleon,
    hasNullSig: cs.hasNullSig,
    hasVoidSig: cs.hasVoidSig,
    hasBlueShield: cs.hasBlueShield,
  };
  if (patchworkTypes)
    defCfg.armorSections = deriveMechArmorSections(unit, setup.totalArmor);
  if (engineBVOverride !== undefined) {
    defCfg.engineMultiplier = engineBVOverride;
    defCfg.engineType = undefined;
  }
  const defResult = calculateDefensiveBV(defCfg);

  const physicalWeaponBV = calculatePhysicalBVTotal(cs, unit.tonnage);

  // Mine Dispensers: BV=8 each, offensive equipment per MegaMek
  // Misc equipment with offensive BV (Bridge Layers, etc.)
  let offensiveEquipBV = cs.mineDispenserCount * 8 + cs.miscEquipBV;
  if (cs.hasRamPlate) {
    const ramDamage = Math.floor(unit.tonnage * runMP * 0.1) / 2;
    const torsoSpikeBonus = cs.spikeLocations.filter((location) =>
      ['CT', 'LT', 'RT'].includes(location),
    ).length;
    const ramPlateBV = (Math.floor(ramDamage) + torsoSpikeBonus) * 1.1;
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
  // Heat uses jet movement; mechanical boosters only contribute to BV speed/TMM.
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
  const offResult = calculateOffensiveBVWithHeatTracking(
    {
      ...weaponInputs,
      ammo: ammoForCalc,
      tonnage: unit.tonnage,
      walkMP: bvWalk,
      runMP,
      jumpMP,
      umuMP: cs.umuMP,
      // Pinned MekBVCalculator.heatEfficiency grants standard LAMs +3 BV heat efficiency.
      heatDissipation: heatDiss + (airMekFlankMP === undefined ? 0 : 3),
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
      isXXLEngine: engineType === EngineType.XXL,
      engineType,
      coolantPods: cs.coolantPods,
      heatSinkCount: effectiveHSCount,
      jumpHeatMP: jumpHeatMP,
      aesArms: armAES,
      aesLegs: hasLegAES ? (isQuad ? 4 : 2) : 0,
      isIndustrialMech,
      hasIndustrialStructure: structureType === 'industrial',
      hasSCM: cs.hasSCM,
    },
    airMekFlankMP === undefined
      ? undefined
      : {
          speedFactor: calculateOffensiveSpeedFactor(runMP, airMekFlankMP),
          // Pinned MekBVCalculator.heatEfficiency: standard LAM movement heat.
          heat: Math.round(airMekFlankMP / 3),
        },
  );

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
    ? getCockpitModifier(effectiveCockpit)
    : cs.detectedDroneOS
      ? 0.95
      : getCockpitModifier(effectiveCockpit);
  // RISC Heat Sink Override Kit: 1.01x multiplier to base BV
  // Per MekBVCalculator.processSummarize() lines 479-501
  const riscKitMod =
    unitId && KNOWN_RISC_OVERRIDE_KIT_UNITS.has(unitId) ? 1.01 : 1.0;
  const totalBV = Math.round(baseBV * finalCockpitMod * riscKitMod);

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
      cockpitModifier: finalCockpitMod,
      offensiveTypeModifier: offResult.offensiveTypeModifier,
      summaryModifier: finalCockpitMod * riscKitMod,
      totalExplosivePenalty,
      cockpitType: effectiveCockpit,
      // Context
      techBase: unit.techBase,
      walkMP: bvWalk,
      runMP,
      jumpMP,
      weaponCount: offResult.weaponCount ?? weaponInputs.weapons.length,
      halvedWeaponCount: offResult.halvedWeaponCount ?? 0,
      weaponMountBV: offResult.weaponMountBV,
      ammoPools: offResult.ammoPools,
      ...weaponInputs.ammoProjection,
      // Legacy alias
      defensiveEquipBV: totalDefEquipBV,
    },
    issues,
  };
}
