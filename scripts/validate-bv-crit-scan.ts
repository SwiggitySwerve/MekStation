import type { UnitData } from './validate-bv-types';

import {
  type ExplosiveEquipmentEntry,
  type MechLocation,
} from '../src/utils/construction/battleValueCalculations';
import { resolveAmmoBV } from '../src/utils/construction/equipmentBVResolver';
import {
  resolveAmmoByPattern,
  normalizeWeaponKey,
} from './validate-bv-ammo-resolution';
import {
  countCritHeatSinks,
  detectCritArmorType,
  detectCritGyroType,
} from './validate-bv-crit-derived';
import { countCritWeaponMounts } from './validate-bv-crit-weapon-mounts';
import { CLAN_CHASSIS_MIXED_UNITS } from './validate-bv-known-units';
import { toMechLoc } from './validate-bv-normalizers';
import { classifyPhysicalWeapon } from './validate-bv-physical-weapons';
import { resolveWeaponForUnit } from './validate-bv-weapon-resolution';

export interface CritScan {
  hasTC: boolean;
  hasTSM: boolean;
  /** Industrial Triple-Strength Myomer: weight ×1.15, no walk MP bonus, no physical TSM mod */
  hasIndustrialTSM: boolean;
  hasMASC: boolean;
  hasSupercharger: boolean;
  hasECM: boolean;
  hasAngelECM: boolean;
  hasActiveProbe: boolean;
  hasBloodhound: boolean;
  hasPartialWing: boolean;
  hasNullSig: boolean;
  hasVoidSig: boolean;
  hasChameleon: boolean;
  hasImprovedJJ: boolean;
  hasPrototypeIJJ: boolean;
  standardJJCrits: number;
  improvedJJCrits: number;
  prototypeIJJCrits: number;
  hasWatchdog: boolean;
  detectedSmallCockpit: boolean;
  detectedInterfaceCockpit: boolean;
  detectedDroneOS: boolean;
  coolantPods: number;
  heatSinkCount: number;
  hasRadicalHS: boolean;
  critDHSCount: number;
  critProtoDHSCount: number;
  hasLargeShield: boolean;
  hasMediumShield: boolean;
  shieldArms: string[];
  riscAPDS: number;
  aesLocs: string[];
  mgaLocs: Array<{ location: string; type: 'light' | 'standard' | 'heavy' }>;
  harjelIILocs: MechLocation[];
  harjelIIILocs: MechLocation[];
  caseLocs: MechLocation[];
  caseIILocs: MechLocation[];
  artemisIVLocs: string[];
  artemisVLocs: string[];
  apollo: number;
  ppcCapLocs: string[];
  armoredPPCCapLocs: string[];
  ammo: Array<{ id: string; bv: number; weaponType: string; location: string }>;
  explosive: ExplosiveEquipmentEntry[];
  defEquipIds: string[];
  detectedArmorType: string | null;
  physicalWeapons: Array<{ type: string; location: string }>;
  rearWeaponCountByLoc: Map<string, Map<string, number>>;
  turretWeaponCountByLoc: Map<string, Map<string, number>>;
  amsAmmoBV: number;
  armoredComponentBV: number;
  armoredGyroSlots: number;
  umuMP: number;
  detectedGyroType: string | null;
  modularArmorSlots: number;
  spikeCount: number;
  mineDispenserCount: number;
  /** RISC Viral Jammer (Decoy or Homing): BV=284 each, defensive equipment */
  riscViralJammerCount: number;
  /** Blue Shield Particle Field Damper: +0.2 to armor and structure multipliers */
  hasBlueShield: boolean;
  /** Accumulated BV from misc (non-weapon, non-physical) equipment with offensive BV
   *  (e.g., Bridge Layers: Light=5, Medium=10, Heavy=20) */
  miscEquipBV: number;
  hasRamPlate: boolean;
  critLaserHSCount: number;
  /** Super-Cooled Myomer: moveHeat = 0 per MegaMek MekBVCalculator heatEfficiency() */
  hasSCM: boolean;
  /** RISC Laser Pulse Module locations: linked lasers get BV × 1.15 and heat + 2 */
  riscLPMLocs: string[];
}

export function scanCrits(unit: UnitData, unitId?: string): CritScan {
  const r: CritScan = {
    hasTC: false,
    hasTSM: false,
    hasIndustrialTSM: false,
    hasMASC: false,
    hasSupercharger: false,
    hasECM: false,
    hasAngelECM: false,
    hasActiveProbe: false,
    hasBloodhound: false,
    hasPartialWing: false,
    hasNullSig: false,
    hasVoidSig: false,
    hasChameleon: false,
    hasImprovedJJ: false,
    hasPrototypeIJJ: false,
    standardJJCrits: 0,
    improvedJJCrits: 0,
    prototypeIJJCrits: 0,
    hasWatchdog: false,
    detectedSmallCockpit: false,
    detectedInterfaceCockpit: false,
    detectedDroneOS: false,
    coolantPods: 0,
    heatSinkCount: 0,
    hasRadicalHS: false,
    critDHSCount: 0,
    critProtoDHSCount: 0,
    aesLocs: [],
    mgaLocs: [],
    harjelIILocs: [],
    harjelIIILocs: [],
    caseLocs: [],
    caseIILocs: [],
    artemisIVLocs: [],
    artemisVLocs: [],
    apollo: 0,
    ppcCapLocs: [],
    armoredPPCCapLocs: [],
    ammo: [],
    explosive: [],
    defEquipIds: [],
    detectedArmorType: null,
    physicalWeapons: [],
    rearWeaponCountByLoc: new Map(),
    turretWeaponCountByLoc: new Map(),
    amsAmmoBV: 0,
    armoredComponentBV: 0,
    armoredGyroSlots: 0,
    umuMP: 0,
    detectedGyroType: null,
    modularArmorSlots: 0,
    hasLargeShield: false,
    hasMediumShield: false,
    shieldArms: [],
    riscAPDS: 0,
    spikeCount: 0,
    mineDispenserCount: 0,
    riscViralJammerCount: 0,
    hasBlueShield: false,
    miscEquipBV: 0,
    hasRamPlate: false,
    critLaserHSCount: 0,
    hasSCM: false,
    riscLPMLocs: [],
  };
  if (!unit.criticalSlots) return r;

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    const ml = toMechLoc(loc);
    if (!Array.isArray(slots)) continue;
    let prevSlotClean: string | null = null;
    for (const rawSlot of slots) {
      if (!rawSlot || typeof rawSlot !== 'string') {
        prevSlotClean = null;
        continue;
      }
      // Superheavy pipe-separated double-slots: "IS Gauss Ammo|IS Gauss Ammo"
      // Split and process each sub-item independently (each represents 1 ton)
      const subItems = rawSlot.includes('|')
        ? rawSlot.split('|').map((s) => s.trim())
        : [rawSlot];
      for (const slot of subItems) {
        if (!slot) continue;
        // Skip descriptive text that leaked into crit slots from MTF conversion
        // (deployment descriptions, manufacturer info, etc.)
        if (
          slot.startsWith('deployment:') ||
          slot.startsWith('systemmanufacturer:') ||
          slot.startsWith('systemmode:') ||
          slot.startsWith('overview:') ||
          slot.startsWith('capabilities:') ||
          slot.startsWith('history:') ||
          slot.startsWith('manufacturer:') ||
          slot.startsWith('primaryfactory:')
        )
          continue;
        const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
        const lo = clean.toLowerCase();

        // Armored components: per MegaMek Mek.getArmoredComponentBV():
        // - If equipment BV > 0: add equipmentBV * 0.05 per crit slot
        // - If equipment BV == 0: add 5 per crit slot (flat fallback for system crits)
        // - PPC Capacitor is SKIPPED (its BV folds into the PPC weapon's armored calc)
        if (lo.includes('(armored)') || lo.includes('armored')) {
          const isArmoredComponent =
            lo.includes('(armored)') ||
            (lo.endsWith('armored') && !lo.includes('armor'));
          if (isArmoredComponent) {
            // Strip (Armored) suffix and resolve equipment BV
            const armoredName = clean.replace(/\s*\(armored\)/gi, '').trim();
            const armoredLo = armoredName.toLowerCase();
            // PPC Capacitor (armored): skip per MegaMek — its BV is folded into
            // the linked PPC weapon's armored BV calc (handled in post-scan correction)
            if (
              armoredLo.includes('ppc capacitor') ||
              armoredLo.includes('ppccapacitor')
            ) {
              if (loc) r.armoredPPCCapLocs.push(loc);
              // Do NOT add to armoredComponentBV here — handled below
            }
            // System crits (gyro, engine, actuators, sensors, etc.) have BV=0 → flat 5
            else if (
              /^(gyro|fusion engine|engine|xl engine|light engine|compact engine|xxl engine|hip|shoulder|upper arm|lower arm|hand|upper leg|lower leg|foot|life support|sensors|cockpit|compact gyro|heavy.?duty gyro|xl gyro|superheavy gyro)$/i.test(
                armoredName,
              )
            ) {
              r.armoredComponentBV += 5;
              if (armoredLo.includes('gyro')) r.armoredGyroSlots++;
            } else {
              // Try to resolve equipment BV from catalog
              const eqResult = resolveWeaponForUnit(
                armoredName,
                unit.techBase || 'INNER_SPHERE',
              );
              if (eqResult.resolved && eqResult.battleValue > 0) {
                r.armoredComponentBV += eqResult.battleValue * 0.05;
              } else {
                // Fallback: flat 5 for unresolvable equipment
                r.armoredComponentBV += 5;
              }
            }
          }
        }

        // Modular Armor: each slot adds 10 armor points (MekBVCalculator uses entity.getTotalOArmor() which includes modular armor)
        if (lo.includes('modulararmor') || lo.includes('modular armor'))
          r.modularArmorSlots++;

        if (lo.includes('ram plate') || lo.includes('ramplate'))
          r.hasRamPlate = true;

        // CASE
        if (
          lo.includes('case ii') ||
          lo.includes('caseii') ||
          lo.includes('clcaseii') ||
          lo.includes('iscaseii')
        ) {
          if (ml && !r.caseIILocs.includes(ml)) r.caseIILocs.push(ml);
        } else if (lo.includes('case') && !lo.includes('case ii')) {
          if (ml && !r.caseLocs.includes(ml)) r.caseLocs.push(ml);
        }

        // Equipment flags
        if (
          lo.includes('targeting computer') ||
          lo.includes('targetingcomputer')
        )
          r.hasTC = true;
        else if (
          lo.includes('industrial triple strength') ||
          lo.includes('industrial triple-strength') ||
          lo.includes('industrialtriplestrength') ||
          lo === 'industrial tsm'
        )
          r.hasIndustrialTSM = true;
        else if (
          lo === 'tsm' ||
          lo.includes('triple strength') ||
          lo.includes('triplestrength')
        )
          r.hasTSM = true;
        else if (lo.includes('masc') && !lo.includes('ammo')) r.hasMASC = true;
        else if (lo.includes('supercharger') || lo.includes('super charger'))
          r.hasSupercharger = true;
        if (
          lo.includes('super-cooled myomer') ||
          lo.includes('supercooledmyomer') ||
          lo === 'issupercooledmyomer'
        )
          r.hasSCM = true;
        else if (lo.includes('novacews') || lo.includes('nova cews')) {
          r.hasAngelECM = true;
          r.hasActiveProbe = true;
          r.hasWatchdog = true;
        } else if (
          (lo.includes('angel') && lo.includes('ecm')) ||
          lo.includes('watchdog')
        ) {
          r.hasAngelECM = true;
          r.hasWatchdog = true;
        } else if (lo.includes('ecm') || lo.includes('guardian'))
          r.hasECM = true;
        else if (lo.includes('bloodhound')) r.hasBloodhound = true;
        else if (
          lo.includes('beagle') ||
          (lo.includes('active') && lo.includes('probe'))
        )
          r.hasActiveProbe = true;
        else if (lo.includes('null') && lo.includes('sig')) r.hasNullSig = true;
        else if (lo.includes('void') && lo.includes('sig')) r.hasVoidSig = true;
        else if (
          lo.includes('chameleon') &&
          (lo.includes('shield') ||
            lo.includes('polarization') ||
            lo.includes('lps'))
        )
          r.hasChameleon = true;
        else if (lo.includes('partial') && lo.includes('wing'))
          r.hasPartialWing = true;
        else if (
          lo.includes('umu') &&
          !lo.includes('ammo') &&
          !lo.includes('accumul') &&
          (lo === 'umu' ||
            lo === 'isumu' ||
            lo === 'clumu' ||
            lo.startsWith('umu ') ||
            lo.startsWith('umu(') ||
            /\bumu\b/.test(lo))
        )
          r.umuMP++;
        else if (
          lo.includes('aes') &&
          (lo.includes('actuator') ||
            lo === 'isaes' ||
            lo === 'claes' ||
            lo === 'is aes' ||
            lo === 'clan aes' ||
            lo === 'aes')
        ) {
          if (ml && !r.aesLocs.includes(loc)) r.aesLocs.push(loc);
        } else if (
          lo.includes('machine gun array') ||
          /^(?:is|cl)(?:l|h)?mga$/.test(lo)
        ) {
          const mgaType =
            lo.includes('light') || /^(?:is|cl)lmga$/.test(lo)
              ? 'light'
              : lo.includes('heavy') || /^(?:is|cl)hmga$/.test(lo)
                ? 'heavy'
                : 'standard';
          r.mgaLocs.push({ location: loc, type: mgaType });
        } else if (lo.includes('apollo')) r.apollo++;
        else if (lo.includes('ppc capacitor') || lo.includes('ppccapacitor')) {
          if (loc) r.ppcCapLocs.push(loc);
        } else if (
          lo === 'isapds' ||
          (lo.includes('risc') && lo.includes('apds')) ||
          lo.includes('advanced point defense')
        ) {
          if (clean !== prevSlotClean) {
            r.riscAPDS++;
            r.defEquipIds.push(clean);
          }
        }
        // RISC Viral Jammer (Decoy/Homing): defensive equipment, BV=284 each per MegaMek MiscType
        if (
          lo.includes('risc viral jammer') ||
          lo.includes('riscviraljammer')
        ) {
          if (clean !== prevSlotClean) {
            r.riscViralJammerCount++;
          }
        }

        // Prototype Improved Jump Jets are EXPLOSIVE (misc.explosive = true in MegaMek)
        // but have F_JUMP_JET flag, so penalty is REDUCED (1 BV per slot, not 15)
        // per MekBVCalculator.processExplosiveEquipment() line 236.
        // IMPORTANT: Must check prototype BEFORE standard IJJ, because
        // 'isprototypeimprovedjumpjet' contains 'improvedjumpjet'.
        // Prototype IJJ uses DOUBLED heat (max(6, jumpMP*2)), NOT halved heat like standard IJJ.
        const isPrototypeIJJ =
          lo === 'isprototypeimprovedjumpjet' ||
          lo.includes('prototype improved jump jet');
        if (isPrototypeIJJ) {
          r.hasPrototypeIJJ = true;
          r.prototypeIJJCrits++;
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // Improved Jump Jets — crit names vary: "Improved Jump Jet", "ImprovedJump Jet", "ISImprovedJump Jet"
        // Exclude prototype IJJ which has different heat rules.
        const isImprovedJJ =
          !isPrototypeIJJ &&
          (lo.includes('improved jump jet') ||
            lo.includes('improvedjump jet') ||
            lo === 'isimprovedjumpjet' ||
            lo === 'climprovedjumpjet' ||
            lo.replace(/\s+/g, '').includes('improvedjumpjet'));
        if (isImprovedJJ) {
          r.hasImprovedJJ = true;
          r.improvedJJCrits++;
        }

        // Standard Jump Jets — count crit entries for computing effective jump MP.
        // Standard JJ: 1 crit per jet. Names: "Jump Jet", "IS Jump Jet", "Clan Jump Jet", etc.
        // Exclude improved/prototype (already counted above) and partial wing (not a JJ).
        // Use strict matching to avoid false positives from descriptive text.
        if (
          !isPrototypeIJJ &&
          !isImprovedJJ &&
          !lo.includes('partialwing') &&
          !lo.includes('partial wing') &&
          lo.length < 30 && // Equipment names are short; descriptive text is long
          (lo === 'jump jet' ||
            lo === 'isjumpjet' ||
            lo === 'cljumpjet' ||
            lo === 'is jump jet' ||
            lo === 'clan jump jet' ||
            (lo.replace(/\s+/g, '').includes('jumpjet') &&
              !lo.includes('improved') &&
              !lo.includes('prototype') &&
              !lo.includes('mechanical')))
        ) {
          r.standardJJCrits++;
        }

        // Coolant Pods (count for heat efficiency bonus)
        if (
          lo.includes('coolant pod') ||
          lo === 'iscoolantpod' ||
          lo === 'clcoolantpod' ||
          lo === 'is-coolant-pod'
        )
          r.coolantPods++;

        // Radical Heat Sink System
        if (lo.includes('radical heat sink') || lo.includes('radicalheatsink'))
          r.hasRadicalHS = true;

        // Blue Shield Particle Field Damper: +0.2 to armor and structure multipliers
        if (
          lo.includes('blue shield') ||
          lo.includes('blue-shield') ||
          lo.includes('blueshield')
        ) {
          r.hasBlueShield = true;
        }

        // HarJel II/III (per-location armor BV multiplier)
        if (
          lo.includes('harjel iii') ||
          lo.includes('harjel3') ||
          lo === 'harjel iii self-repair system'
        ) {
          if (ml && !r.harjelIIILocs.includes(ml)) r.harjelIIILocs.push(ml);
        } else if (
          lo.includes('harjel ii') ||
          lo.includes('harjel2') ||
          lo === 'harjel ii self-repair system'
        ) {
          if (ml && !r.harjelIILocs.includes(ml)) r.harjelIILocs.push(ml);
        }

        // Artemis
        if (
          (lo.includes('artemisv') || lo.includes('artemis v')) &&
          !lo.includes('artemis iv') &&
          !lo.includes('ammo') &&
          !lo.includes('capable')
        ) {
          if (ml) r.artemisVLocs.push(ml);
        } else if (
          lo.includes('artemis') &&
          !lo.includes('ammo') &&
          !lo.includes('capable') &&
          !lo.includes('artemisv') &&
          !lo.includes('artemis v')
        ) {
          if (ml) r.artemisIVLocs.push(ml);
        }

        // Ammo
        if (lo.includes('ammo') && !lo.includes('ammo feed')) {
          // Per MegaMek AmmoType.java: Gauss-type ammo (including HAG) is non-explosive.
          // HAG crit names like "CLHAG20 Ammo" don't contain "gauss", so check 'hag' separately.
          // SB Gauss abbreviated crit name "ISSBGR Ammo" also lacks "gauss".
          const isNonExplosiveAmmo =
            lo.includes('gauss') ||
            lo.includes('hag') ||
            lo.includes('sbgr') ||
            lo.includes('magshot') ||
            lo.includes('plasma') ||
            lo.includes('fluid') ||
            lo.includes('nail') ||
            lo.includes('rivet') ||
            lo.includes('c3') ||
            lo.includes('sensor') ||
            lo.includes('rail gun');
          if (ml && !isNonExplosiveAmmo)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'standard',
            });
          // Half-ton ammo bins (crit names like "IS Machine Gun Ammo - Half") get half BV.
          // The lookup/pattern resolution returns the full-ton BV; we halve it here for half-ton bins.
          const isHalfTonAmmo = lo.includes('half');
          const pr = resolveAmmoByPattern(clean, unit.techBase);
          if (pr && pr.bv > 0) {
            r.ammo.push({
              id: clean,
              bv: isHalfTonAmmo ? pr.bv * 0.5 : pr.bv,
              weaponType: pr.weaponType,
              location: loc,
            });
          } else {
            const ar = resolveAmmoBV(clean);
            if (ar.resolved && ar.battleValue > 0) {
              r.ammo.push({
                id: clean,
                bv: isHalfTonAmmo ? ar.battleValue * 0.5 : ar.battleValue,
                weaponType: normalizeWeaponKey(ar.weaponType),
                location: loc,
              });
            } else if (pr) {
              r.ammo.push({
                id: clean,
                bv: isHalfTonAmmo ? pr.bv * 0.5 : pr.bv,
                weaponType: pr.weaponType,
                location: loc,
              });
            }
          }
          // AMS/APDS ammo — accumulate BV for defensive equipment (capped at AMS weapon BV)
          const isAmsAmmo =
            (lo.includes('ams') ||
              lo.includes('anti-missile') ||
              lo.includes('antimissile')) &&
            lo.includes('ammo');
          const isApdsAmmo = lo.includes('apds') && lo.includes('ammo');
          if (isAmsAmmo || isApdsAmmo) {
            // IS AMS ammo = 11 BV, Clan AMS ammo = 22 BV, APDS ammo = 22 BV
            let amsAmmoVal: number;
            if (isApdsAmmo) {
              amsAmmoVal = 22;
            } else if (lo.includes('cl') || unit.techBase === 'CLAN') {
              amsAmmoVal = 22;
            } else {
              amsAmmoVal = 11;
            }
            // Half-ton AMS/APDS ammo bins also get half BV
            if (isHalfTonAmmo) amsAmmoVal *= 0.5;
            r.amsAmmoBV += amsAmmoVal;
          }
        }

        // ISC3Sensors — ammo for C3 Remote Sensor Launcher (crit name "ISC3Sensors",
        // doesn't contain "ammo" keyword). BV=6 per slot, non-explosive.
        // Per MegaMek AmmoType.java createISC3RemoteSensorAmmo(): bv=6, explosive=false
        if (
          lo === 'isc3sensors' ||
          lo === 'c3 remote sensors' ||
          lo === 'c3remotesensors'
        ) {
          r.ammo.push({
            id: clean,
            bv: 6,
            weaponType: 'c3-remote-sensor-launcher',
            location: loc,
          });
        }

        // NARC/iNARC Pods — ammo named "Pods" not "Ammo"; treat as explosive
        if (
          (lo.includes('narc') || lo.includes('inarc')) &&
          lo.endsWith('pods') &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'standard',
            });
        }

        // Gauss explosive (includes HAG / Silver Bullet Gauss whose crit names
        // don't contain 'gauss': CLHAG20/30/40, ISSBGR, etc.)
        if (
          (lo.includes('gauss') ||
            /(?:cl|is)?hag\d/.test(lo) ||
            lo.includes('sbgr') ||
            lo.includes('sbg')) &&
          !lo.includes('ammo') &&
          !lo.includes('ap gauss')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'gauss',
            });
        }

        // Improved Heavy Lasers: 1 BV per slot (reduced penalty) per MekBVCalculator
        if (
          (lo.includes('improvedheavylaser') ||
            lo.includes('improved heavy laser') ||
            lo.includes('improvedmediumheavylaser') ||
            lo.includes('improved medium heavy') ||
            lo.includes('improvedsmallheavylaser') ||
            lo.includes('improved small heavy') ||
            lo.includes('improvedlargeheavylaser') ||
            lo.includes('improved large heavy')) &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // Extended Fuel Tank — explosive per MegaMek MiscType.java (misc.explosive = true)
        // Each crit slot carries -15 BV penalty in standard explosive processing
        if (
          lo.includes('extended fuel tank') ||
          lo.includes('extendedfueltank')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'standard',
            });
        }

        // Mek Taser — weapon itself is explosive per MegaMek ISMekTaser.java
        // (explosive = true, explosionDamage = 6). Uses reduced penalty (1 BV per slot)
        // same as TSEMP, Improved Heavy Lasers, B/M-Pods per MekBVCalculator.
        if (
          lo === 'mek taser' ||
          lo === 'ismektaser' ||
          lo === 'isbattlemechtaser' ||
          lo === 'battlemech taser'
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // PPC Capacitor — explosive per MegaMek MiscType.F_PPC_CAPACITOR
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 231-233
        if (lo.includes('ppc capacitor') || lo.includes('ppccapacitor')) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // Coolant Pod — explosive per MegaMek AmmoType COOLANT_POD
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 241-243
        if (lo.includes('coolant pod') && !lo.includes('emergency')) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // TSEMP weapons — explosive per MegaMek TSEMPWeapon.java (explosive = true)
        // Reduced penalty: 1 BV per slot per MekBVCalculator (instanceof TSEMPWeapon)
        if (lo.includes('tsemp') && !lo.includes('ammo')) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // B-Pod — explosive per MegaMek WeaponType.F_B_POD
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 227-228
        // Note: B-Pod is ALSO defensive equipment (pushed to defEquipIds below),
        // explosive penalty is a separate deduction from defensive BV.
        if (
          (lo.includes('b-pod') || lo === 'isbpod' || lo === 'clbpod') &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // M-Pod — explosive per MegaMek WeaponType.F_M_POD
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 229-230
        if (
          (lo.includes('m-pod') || lo === 'ismpod' || lo === 'clmpod') &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // HVAC (Hyper-Velocity Autocannon) — explosive per MegaMek HVACWeapon.java
        // Special handling: 1 BV total regardless of actual slot count
        if (
          (lo.includes('hvac') ||
            lo.includes('hyper velocity') ||
            lo.includes('hypervelocity')) &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'hvac',
            });
        }

        // Emergency Coolant System — explosive per MegaMek MiscType.F_EMERGENCY_COOLANT_SYSTEM
        // Reduced penalty: 1 BV per slot per MekBVCalculator
        if (
          lo.includes('emergency coolant') ||
          lo.includes('emergencycoolant')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // RISC Hyper Laser — explosive per MegaMek ISRISCHyperLaser.java (explosive = true)
        // Reduced penalty: 1 BV per slot per MekBVCalculator (instanceof ISRISCHyperLaser)
        if (
          lo.includes('risc') &&
          lo.includes('hyper') &&
          lo.includes('laser')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // RISC Laser Pulse Module — explosive per MegaMek MiscType.F_RISC_LASER_PULSE_MODULE
        // Reduced penalty: 1 BV per slot per MekBVCalculator
        // Also boosts linked laser: BV × 1.15 and heat + 2 (like Apollo for missiles)
        if (
          lo.includes('risc') &&
          (lo.includes('laser pulse module') || lo.includes('laserpulsemodule'))
        ) {
          if (ml) {
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
            r.riscLPMLocs.push(loc);
          }
        }

        // Defensive equip — push once per equipment instance (skip consecutive duplicate slots for multi-slot items)
        // Regular AMS is 1-crit (each slot = separate weapon). Laser AMS is 2-crit IS / 1-crit Clan → use dedup.
        if (
          (lo.includes('anti-missile') ||
            lo.includes('antimissile') ||
            lo === 'isams' ||
            lo === 'clams') &&
          !lo.includes('ammo')
        ) {
          const isMultiCritAMS = lo.includes('laser');
          if (isMultiCritAMS) {
            if (clean !== prevSlotClean) r.defEquipIds.push(clean);
          } else {
            r.defEquipIds.push(clean);
          }
        } else if (
          (lo.includes('ecm') ||
            lo.includes('guardian') ||
            lo.includes('angel') ||
            lo.includes('watchdog') ||
            lo.includes('novacews') ||
            lo.includes('nova cews') ||
            lo.includes('electronicwarfare') ||
            lo.includes('electronic warfare')) &&
          !lo.includes('ammo')
        ) {
          if (clean !== prevSlotClean) r.defEquipIds.push(clean);
        } else if (
          (lo.includes('beagle') ||
            lo.includes('bloodhound') ||
            (lo.includes('active') && lo.includes('probe'))) &&
          !lo.includes('ammo')
        ) {
          if (clean !== prevSlotClean) r.defEquipIds.push(clean);
        } else if (
          lo.includes('shield') &&
          !lo.includes('blue-shield') &&
          !lo.includes('chameleon')
        ) {
          if (clean !== prevSlotClean) {
            r.defEquipIds.push(clean);
            // Only Medium/Large shields impose weapon BV penalty (active shields).
            // Small shields are passive — weapons in that arm fire normally.
            const isActiveShield =
              (lo.includes('medium') || lo.includes('large')) &&
              !lo.includes('small');
            if (isActiveShield && loc.toUpperCase().includes('ARM')) {
              const armLoc =
                loc
                  .toUpperCase()
                  .replace(/[_(].*/, '')
                  .trim() + '_ARM';
              if (!r.shieldArms.includes(armLoc)) r.shieldArms.push(armLoc);
            }
          }
          if (lo.includes('large')) r.hasLargeShield = true;
          if (
            lo.includes('medium') &&
            !lo.includes('small') &&
            !lo.includes('large')
          )
            r.hasMediumShield = true;
        } else if (
          (lo.includes('b-pod') || lo === 'isbpod' || lo === 'clbpod') &&
          !lo.includes('ammo')
        )
          r.defEquipIds.push(clean);
        // M-Pod is an offensive weapon (BV=5), NOT defensive equipment — handled via equipment list
        else if (
          (lo.includes('a-pod') ||
            lo.includes('antipersonnel') ||
            lo === 'isapod' ||
            lo === 'clapod') &&
          !lo.includes('ammo')
        )
          r.defEquipIds.push(clean);
        // Spikes: defensive equipment, BV=4 per location (MegaMek MiscType.F_CLUB + countsAsDefensiveEquipment)
        if (
          (lo === 'spikes' ||
            lo === 'isspikes' ||
            lo === 'clspikes' ||
            lo === 'is spikes' ||
            lo === 'clan spikes') &&
          clean !== prevSlotClean
        )
          r.spikeCount++;
        // Mine Dispensers: offensive equipment, BV=8 per slot per MegaMek
        // Each crit slot is counted separately (no dedup) — 4 slots = 4 dispensers = 32 BV
        if (
          lo.includes('mine dispenser') ||
          lo.includes('minedispenser') ||
          lo === 'isvehicularminedispenser' ||
          lo === 'vehicularminedispenser'
        )
          r.mineDispenserCount++;

        // Bridge Layers: misc equipment with non-zero offensive BV, dedup per slot group.
        // Light=5, Medium=10, Heavy=20 per MegaMek MiscType.java
        if (clean !== prevSlotClean) {
          if (lo.includes('heavybridgelayer') || lo === 'heavy bridge layer')
            r.miscEquipBV += 20;
          else if (
            lo.includes('mediumbridgelayer') ||
            lo === 'medium bridge layer'
          )
            r.miscEquipBV += 10;
          else if (
            lo.includes('lightbridgelayer') ||
            lo === 'light bridge layer'
          )
            r.miscEquipBV += 5;
        }

        prevSlotClean = clean;

        // Physical weapons — detect first slot only (they span multiple slots)
        const physType = classifyPhysicalWeapon(lo);
        if (physType) {
          const key = physType + '@' + loc;
          if (
            !r.physicalWeapons.some((pw) => pw.type + '@' + pw.location === key)
          ) {
            r.physicalWeapons.push({ type: physType, location: loc });
          }
        }
      } // end for (const slot of subItems)
    }
  }

  const allSlots = Object.values(unit.criticalSlots)
    .flat()
    .filter((s): s is string => !!s && typeof s === 'string');
  const allSlotsLo = allSlots.map((s) => s.toLowerCase());
  r.detectedArmorType = detectCritArmorType(allSlotsLo);
  r.detectedGyroType = detectCritGyroType(unit);

  const { rearWeaponCountByLoc, turretWeaponCountByLoc } =
    countCritWeaponMounts(unit);
  r.rearWeaponCountByLoc = rearWeaponCountByLoc;
  r.turretWeaponCountByLoc = turretWeaponCountByLoc;

  const { critDHSCount, critProtoDHSCount, critLaserHSCount } =
    countCritHeatSinks(unit);
  r.critDHSCount = critDHSCount;
  r.critProtoDHSCount = critProtoDHSCount;
  r.critLaserHSCount = critLaserHSCount;

  // Clan mechs have built-in CASE in all non-head locations (torsos, arms, legs, CT).
  // Per MegaMek: Mek.addClanCase() auto-adds explicit CASE equipment to every location
  // with explosive equipment, but ONLY when Entity.isClan() returns true.
  //
  // Entity.isClan() depends on the techLevel field:
  //   - Pure Clan (T_CLAN_*): isClan() = true
  //   - Mixed (Clan Chassis): also T_CLAN_* → isClan() = true
  //   - Mixed (IS Chassis): T_IS_* → isClan() = false
  //
  // For BV explosive penalty, MegaMek uses Entity.locationHasCase() which ONLY checks
  // for explicitly-mounted CASE/CASEP equipment. Since addClanCase() auto-adds CASE
  // for units where isClan()=true, the net effect is:
  //   - Pure Clan → implicit CASE everywhere → no explosive penalty
  //   - Mixed (Clan Chassis) → implicit CASE everywhere → no explosive penalty
  //   - Mixed (IS Chassis) → NO implicit CASE → explosive penalty applies
  //
  // Our JSON stores techBase="MIXED" for both Clan and IS chassis variants.
  // The CLAN_CHASSIS_MIXED_UNITS set identifies the Clan-chassis mixed units
  // (derived from MegaMek's "Mixed (Clan Chassis)" TechBase designation).
  const ALL_NON_HEAD_LOCS: MechLocation[] = [
    'LT',
    'RT',
    'LA',
    'RA',
    'CT',
    'LL',
    'RL',
  ];
  const isClanChassis =
    unit.techBase === 'CLAN' ||
    (unit.techBase === 'MIXED' &&
      unitId !== undefined &&
      CLAN_CHASSIS_MIXED_UNITS.has(unitId));
  if (isClanChassis) {
    // Pure Clan and Mixed (Clan Chassis) units: addClanCase() auto-adds explicit
    // CASE to all locations with explosive equipment. Grant CASE to all non-head locs.
    for (const loc of ALL_NON_HEAD_LOCS) {
      if (!r.caseLocs.includes(loc) && !r.caseIILocs.includes(loc))
        r.caseLocs.push(loc);
    }
  }
  // For Mixed (IS Chassis) units: no implicit CASE. Only explicitly-mounted
  // CASE/CASEII from crit scanning provides protection.

  // Small cockpit detection:
  // 1. Prefer unit.cockpit field if it says SMALL
  // 2. Crit-based: Small cockpit HEAD layout = [LS, Sensors, Cockpit, Sensors, ?, ?]
  //    (Sensors in slot 4) vs standard = [LS, Sensors, Cockpit, ?, Sensors, LS]
  //    (Sensors in slot 5, LS in slots 1 and 6)
  if (unit.cockpit && unit.cockpit.toUpperCase().includes('SMALL'))
    r.detectedSmallCockpit = true;
  const headSlots = unit.criticalSlots?.HEAD;
  if (
    !r.detectedSmallCockpit &&
    Array.isArray(headSlots) &&
    headSlots.length >= 4
  ) {
    const slot4 = headSlots[3]; // 0-indexed
    const lsCount = headSlots.filter(
      (s: string | null) => s && s.includes('Life Support'),
    ).length;
    if (
      slot4 &&
      typeof slot4 === 'string' &&
      slot4.includes('Sensors') &&
      lsCount === 1
    ) {
      r.detectedSmallCockpit = true;
    }
  }

  // Interface Cockpit detection: HEAD has 2 "Cockpit" entries AND no "Gyro" anywhere in crits.
  // Command Console mechs also have 2 cockpit entries in HEAD but DO have Gyro entries.
  if (Array.isArray(headSlots)) {
    let cockpitCount = 0;
    for (const hs of headSlots) {
      if (hs && typeof hs === 'string' && hs.toLowerCase().includes('cockpit'))
        cockpitCount++;
    }
    if (cockpitCount >= 2) {
      const hasGyroAnywhere = allSlotsLo.some((s) => s.includes('gyro'));
      if (!hasGyroAnywhere) r.detectedInterfaceCockpit = true;
    }
  }

  // Drone Operating System detection: cockpit field says STANDARD but crits have ISDroneOperatingSystem
  if (
    allSlotsLo.some(
      (s) =>
        s.includes('droneoperatingsystem') ||
        s.includes('drone operating system'),
    )
  ) {
    r.detectedDroneOS = true;
  }

  // PPC weapons with linked PPC Capacitor: MegaMek treats the PPC weapon itself as
  // explosive (PPCWeapon → 1 BV per slot) in addition to the PPC Capacitor (1 slot).
  // Per MekBVCalculator.processExplosiveEquipment() lines 235-237.
  if (r.ppcCapLocs.length > 0 && unit.criticalSlots) {
    // Deduplicate: scan PPC weapon slots once per unique location, not per capacitor
    const uniqueCapLocs = [...new Set(r.ppcCapLocs)];
    for (const capLoc of uniqueCapLocs) {
      const locSlots =
        unit.criticalSlots[capLoc] || unit.criticalSlots[capLoc.toUpperCase()];
      if (!Array.isArray(locSlots)) continue;
      const ml = toMechLoc(capLoc);
      if (!ml) continue;
      for (const s of locSlots) {
        if (!s || typeof s !== 'string') continue;
        const slo = s
          .toLowerCase()
          .replace(/\s*\(omnipod\)/gi, '')
          .trim();
        // Match PPC weapon slots (not capacitors or ammo)
        if (
          slo.includes('ppc') &&
          !slo.includes('capacitor') &&
          !slo.includes('ammo')
        ) {
          r.explosive.push({
            location: ml,
            slots: 1,
            penaltyCategory: 'reduced',
          });
        }
      }
    }
  }

  return r;
}
