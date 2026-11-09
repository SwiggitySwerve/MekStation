import type {
  IProtoMechBVAmmoMount,
  IProtoMechBVMountValue,
  IProtoMechBVResolvedZeroMount,
  IProtoMechBVWeaponMount,
} from '@/types/unit/BVBreakdownTypes';

import { IProtoMechUnit } from '@/types/unit/ProtoMechInterfaces';

import {
  addBVToAmmoCapGroup,
  calculateAmmoBVPools,
  sumCappedAmmoBV,
} from '../battleValueAmmo';
import { calculateOffensiveSpeedFactor } from '../battleValueMovement';
import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { resolveProtoAmmoBV } from './protoMechAmmo';
import {
  classifyEquipment,
  protoMechBVMountValue,
  resolveProtoOffensiveEquipmentBV,
  resolveProtoZeroEquipmentMountBV,
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
  readonly ammoAvailableMountBV?: readonly IProtoMechBVAmmoMount[];
  readonly ammoCapBVByGroup?: Readonly<Record<string, number>>;
  readonly physicalWeaponBV: number;
  readonly offensiveEquipmentBV: number;
  readonly offensiveEquipmentMountBV?: readonly IProtoMechBVMountValue[];
  readonly speedFactor: number;
  readonly offensiveBV: number;
  readonly resolvedZeroEquipmentMountBV?: readonly IProtoMechBVResolvedZeroMount[];
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
  const ammoAvailableMountBV: IProtoMechBVAmmoMount[] = [];
  const offensiveEquipmentMountBV: IProtoMechBVMountValue[] = [];
  const resolvedZeroEquipmentMountBV: IProtoMechBVResolvedZeroMount[] = [];

  for (const [equipmentIndex, mount] of unit.equipment.entries()) {
    const zeroFact = resolveProtoZeroEquipmentMountBV(equipmentIndex, mount);
    if (zeroFact !== undefined) resolvedZeroEquipmentMountBV.push(zeroFact);
    const nativeBV = resolveProtoOffensiveEquipmentBV(
      mount.equipmentId,
      unit.tonnage,
    );
    if (nativeBV !== undefined) {
      offensiveEquipmentBV += nativeBV;
      // Snapshot the existing owner's actual value; fallback zero is not a fact.
      if (Number.isFinite(nativeBV) && nativeBV > 0) {
        offensiveEquipmentMountBV.push(
          protoMechBVMountValue(equipmentIndex, mount, nativeBV),
        );
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
        weaponMountBV.push(
          protoMechBVMountValue(equipmentIndex, mount, resolved.battleValue),
        );
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
  for (const { equipmentIndex, mount } of ammoMounts) {
    const equipmentId = mount.equipmentId;
    const protoAmmo = resolveProtoAmmoBV(equipmentId, weaponIds);
    if (protoAmmo) {
      ammoForCap.push({
        id: equipmentId,
        bv: protoAmmo.battleValue,
        weaponType: protoAmmo.weaponType,
      });
      if (Number.isFinite(protoAmmo.battleValue) && protoAmmo.battleValue > 0) {
        ammoAvailableMountBV.push({
          ...protoMechBVMountValue(
            equipmentIndex,
            mount,
            protoAmmo.battleValue,
          ),
          nativeGroup: protoAmmo.nativeGroup,
        });
      }
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

  // Reuse the public native cap owner for diagnostics only. Its matching/total
  // policy never replaces the ProtoMech exact-key calculation above.
  const availableGroups = new Set(
    ammoAvailableMountBV.map((fact) => fact.nativeGroup),
  );
  const nativeCaps =
    availableGroups.size > 0
      ? calculateAmmoBVPools(weaponsForAmmo, []).cap
      : {};
  const ammoCapBVByGroup = Object.fromEntries(
    Object.entries(nativeCaps).filter(
      ([group, value]) =>
        availableGroups.has(group) && Number.isFinite(value) && value > 0,
    ),
  );

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
    ...(ammoAvailableMountBV.length > 0 ? { ammoAvailableMountBV } : {}),
    ...(Object.keys(ammoCapBVByGroup).length > 0 ? { ammoCapBVByGroup } : {}),
    physicalWeaponBV,
    offensiveEquipmentBV,
    ...(offensiveEquipmentMountBV.length > 0
      ? { offensiveEquipmentMountBV }
      : {}),
    speedFactor,
    offensiveBV,
    ...(resolvedZeroEquipmentMountBV.length > 0
      ? { resolvedZeroEquipmentMountBV }
      : {}),
  };
}

export { calculateProtoOffensive };
