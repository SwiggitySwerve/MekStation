import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';
import { parseEquipmentSizeNumber } from '@/utils/equipmentSize';

import type { UnitData } from './types';

import { processCritAmmoSlot } from './critScanAmmo';
import { finalizeCritScan } from './critScanFinalize';
import { createEmptyCritScan, type CritScan } from './critScanTypes';
import { normalizeCritName, toMechLoc } from './normalizers';
import { classifyPhysicalWeapon } from './physicalWeapons';
import { linkSplitExplosiveMounts } from './splitMounts';
import { resolveWeaponForUnit } from './weaponResolution';

export type { CritScan } from './critScanTypes';

export function scanCrits(unit: UnitData, unitId?: string): CritScan {
  const r = createEmptyCritScan();
  const gaussCriticals = new Map<string, CritScan['explosive']>();
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

        // Spreadable boosters repeat in critical slots; the first mount's size is MP.
        const booster =
          /^(?:MechanicalJumpBooster|Jump Booster|Mech Mechanical Jump Boosters):SIZE:(.+)$/i.exec(
            clean,
          );
        if (booster && r.mechanicalJumpBoosterMP === undefined) {
          const size = parseEquipmentSizeNumber(booster[1].trim());
          if (size === undefined)
            throw new Error(`Invalid mechanical jump booster size: ${clean}`);
          r.mechanicalJumpBoosterMP = Math.max(0, Math.round(size));
        }

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
        else if (
          /^chaindrape(?:cape|apron|poncho)$/.test(normalizeCritName(clean))
        ) {
          r.hasChainDrape = true;
        } else if (lo.includes('void') && lo.includes('sig'))
          r.hasVoidSig = true;
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
        } else if (
          (lo.includes('chaff pod') ||
            lo.includes('chaffpod') ||
            lo === 'ischaffpod') &&
          !lo.includes('ammo')
        ) {
          if (clean !== prevSlotClean) r.defEquipIds.push(clean);
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
          if (ml && !r.harjelIIILocs.includes(ml)) {
            r.harjelIIILocs.push(ml);
            r.defEquipIds.push(clean);
          }
        } else if (
          lo.includes('harjel ii') ||
          lo.includes('harjel2') ||
          lo === 'harjel ii self-repair system'
        ) {
          if (ml && !r.harjelIILocs.includes(ml)) {
            r.harjelIILocs.push(ml);
            r.defEquipIds.push(clean);
          }
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

        processCritAmmoSlot({
          r,
          clean,
          lo,
          loc,
          ml,
          unitTechBase: unit.techBase,
        });

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
            lo.includes('magshot') ||
            /(?:cl|is)?hag\d/.test(lo) ||
            lo.includes('sbgr') ||
            lo.includes('sbg')) &&
          !lo.includes('ammo') &&
          !lo.includes('ap gauss')
        ) {
          if (ml) {
            const part: CritScan['explosive'][number] = {
              location: ml,
              slots: 1,
              penaltyCategory: 'gauss',
            };
            r.explosive.push(part);
            const identity = normalizeCritName(clean);
            const parts = gaussCriticals.get(identity) ?? [];
            parts.push(part);
            gaussCriticals.set(identity, parts);
          }
        }

        // Improved Heavy Lasers: 1 BV per slot (reduced penalty) per MekBVCalculator
        if (
          /improved(?:heavy(?:small|medium|large)?|(?:small|medium|large)heavy)laser/.test(
            normalizeCritName(clean),
          ) &&
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
          lo.includes('extendedfueltank') ||
          // Pinned MiscType.createLAMBombBay: each one-slot bay is explosive.
          lo === 'bomb bay' ||
          // Pinned MiscType.createLAMAdditionalFuel is explosive as well.
          lo === 'lam fuel tank'
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

        // B-Pod's explosive flag is insufficient: pinned EquipmentType.java:
        // 448-460 consults CoreRulesExplosions.java:241-247, which excludes pods.
        // Keep its independent defensive-equipment inclusion below.

        // CoreRulesExplosions.java:241-247 (48fcb2f64) excludes M-Pods.
        // Their defensive BV is collected separately below.

        // HVAC (Hyper-Velocity Autocannon) — explosive per MegaMek HVACWeapon.java
        // 1 BV per mounted weapon regardless of slot count
        // (MekBVCalculator.java:252-253), so one entry per instance.
        if (
          (lo.includes('hvac') ||
            lo.includes('hyper velocity') ||
            lo.includes('hypervelocity')) &&
          !lo.includes('ammo')
        ) {
          if (ml && clean !== prevSlotClean)
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

        // MASS is one critical per mount; use its existing canonical identity and BV.
        if (getEquipmentEntry(clean)?.id === 'mass') r.defEquipIds.push(clean);

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
          (lo.includes('b-pod') ||
            lo === 'isbpod' ||
            lo === 'clbpod' ||
            lo.includes('m-pod') ||
            lo === 'ismpod' ||
            lo === 'clmpod') &&
          !lo.includes('ammo')
        )
          r.defEquipIds.push(clean);
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
        ) {
          r.spikeCount++;
          if (ml && !r.spikeLocations.includes(ml)) r.spikeLocations.push(ml);
        }
        // Mine Dispensers: offensive equipment, BV=8 per slot per MegaMek
        // Each crit slot is counted separately (no dedup) — 4 slots = 4 dispensers = 32 BV
        if (
          lo.includes('mine dispenser') ||
          lo.includes('minedispenser') ||
          lo === 'isvehicularminedispenser' ||
          lo === 'vehicularminedispenser'
        )
          r.mineDispenserCount++;

        // BVCalculator.java:534-536,1004-1006: bridge layers are defensive.
        if (
          clean !== prevSlotClean &&
          getEquipmentEntry(clean)?.id.startsWith('bridge-layer-')
        ) {
          r.defEquipIds.push(clean);
        }

        prevSlotClean = clean;

        // Physical weapons — detect first slot only (they span multiple slots)
        const physType = classifyPhysicalWeapon(lo);
        if (physType) {
          // Talons are one spreadable mount: MtfFile.java:1053-1068,
          // MiscType.java:4310-4316 (48fcb2f64). Other mounts retain location.
          if (
            !r.physicalWeapons.some(
              (pw) =>
                pw.type === physType &&
                (physType === 'talon' || pw.location === loc),
            )
          ) {
            r.physicalWeapons.push({ type: physType, location: loc });
          }
        }
      } // end for (const slot of subItems)
    }
  }

  linkSplitExplosiveMounts(unit, gaussCriticals);
  finalizeCritScan(unit, unitId, r);
  return r;
}
