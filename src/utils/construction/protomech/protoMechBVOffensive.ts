import { IProtoMechUnit } from '@/types/unit/ProtoMechInterfaces';

import { calculateOffensiveSpeedFactor } from '../battleValueMovement';
import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { classifyEquipment } from './protoMechBVEquipment';

/**
 * Compute the proto offensive speed factor.
 *
 * `mp = runMP + round(max(jumpMP, 0) / 2)` (no UMU input for this contract).
 * `sf = round(pow(1 + (mp − 5) / 10, 1.2) × 100) / 100`
 */
export function calculateProtoSpeedFactor(
  runMP: number,
  jumpMP: number,
): number {
  return calculateOffensiveSpeedFactor(runMP, jumpMP);
}

interface OffensivePieces {
  readonly weaponBV: number;
  readonly ammoBV: number;
  readonly physicalWeaponBV: number;
  readonly offensiveEquipmentBV: number;
  readonly speedFactor: number;
  readonly offensiveBV: number;
}

function calculateProtoOffensive(unit: IProtoMechUnit): OffensivePieces {
  let rawWeaponBV = 0;
  let offensiveEquipmentBV = 0;

  const weaponsForAmmo: Array<{ id: string; bv: number }> = [];
  const ammoForCap: Array<{ id: string; bv: number; weaponType: string }> = [];

  for (const mount of unit.equipment) {
    const kind = classifyEquipment(mount);

    if (kind === 'weapon') {
      // Main gun weapons count at full BV, identical to mech-mounted.
      // (Note: arm / torso weapons also at full BV for protos — proto scale
      //  is baked into the damage value in the catalog, not a BV discount.)
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) {
        rawWeaponBV += resolved.battleValue;
        weaponsForAmmo.push({
          id: mount.equipmentId,
          bv: resolved.battleValue,
        });
      }
      continue;
    }

    if (kind === 'offensive') {
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) offensiveEquipmentBV += resolved.battleValue;
      continue;
    }

    if (kind === 'ammo') {
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) {
        const weaponType = normalizeEquipmentId(mount.equipmentId)
          .replace(/-ammo$/, '')
          .replace(/^ammo-/, '');
        ammoForCap.push({
          id: mount.equipmentId,
          bv: resolved.battleValue,
          weaponType,
        });
      }
      continue;
    }
  }

  // Apply targeting-computer multiplier if present — proto targeting
  // computers exist but are rare; the OFFENSIVE_EQUIPMENT_HINTS list catches
  // them and adds their BV. We do NOT apply the 1.25× per-weapon boost at
  // the proto scale (TechManual does not grant this to protos).

  // Ammo cap: each ammo type's contribution is capped at the matching
  // weapon's BV. We mirror the mech calculation but keep it conservative
  // since protos rarely ship with more than 1 mount per weapon type.
  let ammoBV = 0;
  if (ammoForCap.length > 0 && weaponsForAmmo.length > 0) {
    const weaponBVByType: Record<string, number> = {};
    for (const w of weaponsForAmmo) {
      const type = normalizeEquipmentId(w.id);
      weaponBVByType[type] = (weaponBVByType[type] ?? 0) + w.bv;
    }
    const ammoBVByType: Record<string, number> = {};
    for (const a of ammoForCap) {
      ammoBVByType[a.weaponType] = (ammoBVByType[a.weaponType] ?? 0) + a.bv;
    }
    for (const t of Object.keys(ammoBVByType)) {
      const cap = weaponBVByType[t];
      if (cap === undefined) continue;
      ammoBV += Math.min(ammoBVByType[t], cap);
    }
  }

  // Physical attack bonus: small flat bonus equal to tonnage.
  // Rationale (TechManual proto errata): protos inherit a weight-based
  // physical attack contribution, matching the mech BV "weight bonus" term
  // but scaled to proto combat (no TSM, no AES, no industrial bump).
  const physicalWeaponBV = unit.tonnage;

  const speedFactor = calculateProtoSpeedFactor(unit.runMP, unit.jumpMP);

  const weaponBV = rawWeaponBV;
  const offensiveBV =
    (weaponBV + ammoBV + physicalWeaponBV + offensiveEquipmentBV) * speedFactor;

  return {
    weaponBV,
    ammoBV,
    physicalWeaponBV,
    offensiveEquipmentBV,
    speedFactor,
    offensiveBV,
  };
}

export { calculateProtoOffensive };
