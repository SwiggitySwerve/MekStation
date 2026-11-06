import type {
  IProtoMechBVMountValue,
  IProtoMechBVWeaponMount,
} from '@/types/unit/BVBreakdownTypes';

import { IProtoMechUnit } from '@/types/unit/ProtoMechInterfaces';

import { addBVToAmmoCapGroup, sumCappedAmmoBV } from '../battleValueAmmo';
import { calculateOffensiveSpeedFactor } from '../battleValueMovement';
import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { resolveProtoAmmoBV } from './protoMechAmmo';
import {
  classifyEquipment,
  resolveProtoOffensiveEquipmentBV,
} from './protoMechBVEquipment';

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
  readonly weaponMountBV?: readonly IProtoMechBVWeaponMount[];
  readonly ammoBV: number;
  readonly physicalWeaponBV: number;
  readonly offensiveEquipmentBV: number;
  readonly offensiveEquipmentMountBV?: readonly IProtoMechBVMountValue[];
  readonly speedFactor: number;
  readonly offensiveBV: number;
}

function calculateProtoOffensive(unit: IProtoMechUnit): OffensivePieces {
  let rawWeaponBV = 0;
  let offensiveEquipmentBV = 0;

  const weaponsForAmmo: Array<{ id: string; bv: number }> = [];
  const ammoForCap: Array<{ id: string; bv: number; weaponType: string }> = [];
  const ammoMounts: Array<{
    readonly equipmentIndex: number;
    readonly mount: IProtoMechUnit['equipment'][number];
  }> = [];
  const weaponMountBV: IProtoMechBVWeaponMount[] = [];
  const offensiveEquipmentMountBV: IProtoMechBVMountValue[] = [];

  for (const [equipmentIndex, mount] of unit.equipment.entries()) {
    const nativeBV = resolveProtoOffensiveEquipmentBV(
      mount.equipmentId,
      unit.tonnage,
    );
    if (nativeBV !== undefined) {
      offensiveEquipmentBV += nativeBV;
      // Snapshot the existing owner's actual value; fallback zero is not a fact.
      if (Number.isFinite(nativeBV) && nativeBV > 0) {
        offensiveEquipmentMountBV.push({
          equipmentIndex,
          equipmentId: mount.equipmentId,
          location: mount.location,
          battleValue: nativeBV,
        });
      }
      continue;
    }
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
        // Retain the value already admitted above, without resolving it again.
        weaponMountBV.push({
          equipmentIndex,
          equipmentId: mount.equipmentId,
          location: mount.location,
          battleValue: resolved.battleValue,
        });
      }
      continue;
    }

    if (kind === 'offensive') {
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) offensiveEquipmentBV += resolved.battleValue;
      continue;
    }

    if (kind === 'ammo') ammoMounts.push({ equipmentIndex, mount });
  }

  // Ammo pairs with the unit's weapons, so it resolves after them, in mount order.
  const weaponIds = weaponsForAmmo.map((w) => w.id);
  for (const { mount } of ammoMounts) {
    const equipmentId = mount.equipmentId;
    const protoAmmo = resolveProtoAmmoBV(equipmentId, weaponIds);
    if (protoAmmo) {
      ammoForCap.push({
        id: equipmentId,
        bv: protoAmmo.battleValue,
        weaponType: protoAmmo.weaponType,
      });
      continue;
    }
    const resolved = resolveEquipmentBV(equipmentId);
    if (resolved.resolved) {
      const weaponType = normalizeEquipmentId(equipmentId)
        .replace(/-ammo$/, '')
        .replace(/^ammo-/, '');
      ammoForCap.push({
        id: equipmentId,
        bv: resolved.battleValue,
        weaponType,
      });
    }
  }

  // Apply targeting-computer multiplier if present — proto targeting
  // computers exist but are rare; the OFFENSIVE_EQUIPMENT_HINTS list catches
  // them and adds their BV. We do NOT apply the 1.25× per-weapon boost at
  // the proto scale (TechManual does not grant this to protos).

  // Preserve the ProtoMech exact-key policy while sharing cap arithmetic.
  let ammoBV = 0;
  if (ammoForCap.length > 0 && weaponsForAmmo.length > 0) {
    const weaponBVByType: Record<string, number> = {};
    for (const w of weaponsForAmmo) {
      const type = normalizeEquipmentId(w.id);
      addBVToAmmoCapGroup(weaponBVByType, type, w.bv);
    }
    const ammoBVByType: Record<string, number> = {};
    for (const a of ammoForCap) {
      addBVToAmmoCapGroup(ammoBVByType, a.weaponType, a.bv);
    }
    ammoBV = sumCappedAmmoBV(ammoBVByType, (type) => weaponBVByType[type]);
  }

  // Pinned ProtoMekBVCalculator inherits the empty processWeight method.
  // Keep the public breakdown field without inventing weight-only offense.
  const physicalWeaponBV = 0;

  const speedFactor = calculateProtoSpeedFactor(unit.runMP, unit.jumpMP);

  const weaponBV = rawWeaponBV;
  const offensiveBV =
    (weaponBV + ammoBV + physicalWeaponBV + offensiveEquipmentBV) * speedFactor;

  return {
    weaponBV,
    ...(weaponMountBV.length > 0 ? { weaponMountBV } : {}),
    ammoBV,
    physicalWeaponBV,
    offensiveEquipmentBV,
    ...(offensiveEquipmentMountBV.length > 0
      ? { offensiveEquipmentMountBV }
      : {}),
    speedFactor,
    offensiveBV,
  };
}

export { calculateProtoOffensive };
