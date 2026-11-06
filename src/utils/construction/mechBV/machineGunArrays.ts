import type { WeaponEntry } from '../../../../scripts/validate-bv-calculator-weapons';
import type { UnitData } from '../../../../scripts/validate-bv-types';

import { getMachineGunArrayBVGroup } from '../battleValueAmmo';
import {
  linkMachineGunArrayBVWeapons,
  type IMachineGunArrayBVWeapon,
} from '../equipmentBV/weaponLinks';

interface ICompatibilityGroup {
  typeId: string;
  arrays: readonly string[];
  suffix: string;
  guns: readonly string[];
}

// This closed Mech admission policy predates native linking; other families
// retain their own catalog projection. Do not widen aliases in a consolidation.
const COMPATIBILITY_GROUPS: readonly ICompatibilityGroup[] = [
  {
    typeId: 'mga',
    arrays: ['machine-gun-array', 'ismga', 'clmga'],
    suffix: '-mga',
    guns: ['machine-gun', 'clmg', 'ismg', 'ismachine-gun', 'clmachine-gun'],
  },
  {
    typeId: 'lmga',
    suffix: '-lmga',
    arrays: [
      'light-machine-gun-array',
      'islmga',
      'cllmga',
      'islightmga',
      'cllightmga',
    ],
    guns: [
      'light-machine-gun',
      'islightmg',
      'cllightmg',
      'islmg',
      'islightmachine-gun',
      'cllightmachine-gun',
    ],
  },
  {
    typeId: 'hmga',
    suffix: '-hmga',
    arrays: [
      'heavy-machine-gun-array',
      'ishmga',
      'clhmga',
      'isheavymga',
      'clheavymga',
    ],
    guns: [
      'heavy-machine-gun',
      'isheavymg',
      'clheavymg',
      'clhmg',
      'isheavymachine-gun',
      'clheavymachine-gun',
    ],
  },
];

interface IMechArrayMount extends IMachineGunArrayBVWeapon<string> {
  sourceId: string;
  sourceLocation: string;
}

/** Projects the established Mech policy into the shared MGA value owner. */
export function applyMechMachineGunArrays(
  unit: UnitData,
  weapons: WeaponEntry[],
): void {
  const guns: IMachineGunArrayBVWeapon<string>[] = weapons.map((w) => {
    const policy = COMPATIBILITY_GROUPS.find((p) =>
      p.guns.includes(w.name.replace(/^\d+-/, '')),
    );
    return {
      location: w.location.split(',')[0].toUpperCase(),
      baseBV: w.bv,
      bv: w.bv,
      ammoGroup: policy ? getMachineGunArrayBVGroup(policy.typeId) : undefined,
    };
  });
  const arrays: IMechArrayMount[] = [];
  for (const eq of unit.equipment) {
    const rawId = eq.id.toLowerCase().replace(/^\d+-/, '');
    const policy = COMPATIBILITY_GROUPS.find(
      (p) => p.arrays.includes(rawId) || rawId.endsWith(p.suffix),
    );
    if (!policy) continue;
    arrays.push({
      sourceId: rawId,
      sourceLocation: eq.location,
      location: eq.location.split(',')[0].toUpperCase(),
      baseBV: 0,
      bv: 0,
      arrayGroup: getMachineGunArrayBVGroup(policy.typeId),
    });
  }
  linkMachineGunArrayBVWeapons([...guns, ...arrays]);
  for (const array of arrays) {
    if (!((array.linkedBaseBV ?? 0) > 0)) continue;
    weapons.push({
      id: 'mga-bonus',
      name: array.sourceId,
      heat: 0,
      bv: array.bv,
      rear: false,
      hasAES: false,
      isDirectFire: false,
      location: array.sourceLocation,
    });
  }
}
