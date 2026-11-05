import type { IVehicleBVBreakdown } from './vehicleBVTypes';

import { calculateBaseBV } from '../battleValueTotals';
import { ammoPoolTerms, weaponMountTerms } from '../bvTraceTerms';

/** getLocationAbbr of Tank, SuperHeavyTank, LargeSupportTank and VTOL
 * (Tank.java:174-177, SuperHeavyTank.java:79-85, VTOL.java:85 at 48fcb2f6).
 * A dual-turret unit names its turrets RT (rear) and FT (front).
 */
const JAVA_LOCATION: Readonly<Record<string, string>> = {
  body: 'BD',
  front: 'FR',
  right: 'RS',
  left: 'LS',
  rear: 'RR',
  turret: 'TU',
  'turret 2': 'FT',
  rotor: 'RO',
  'front right': 'FRRS',
  'front left': 'FRLS',
  'rear right': 'RRRS',
  'rear left': 'RRLS',
};
function vehicleLocationAbbr(dualTurret: boolean) {
  return (location: string): string => {
    const key = location.toLowerCase().replace(/_/g, ' ');
    if (dualTurret && key === 'turret') return 'RT';
    return JAVA_LOCATION[key] ?? location;
  };
}

/** Baseline reference trace; all nonneutral values come from their owning stages.
 * CombatVehicle inherits the empty offensive type stage at MegaMek 48fcb2f6.
 * Weapon mounts and native ammo pools are named as in the Java trace.
 */
export function vehicleBVTerms(b: IVehicleBVBreakdown): IVehicleBVBreakdown & {
  offensiveTypeModifier: number;
  adjustment: number | undefined;
} {
  const dualTurret = (b.weaponMountBV ?? []).some(
    (mount) => vehicleLocationAbbr(false)(mount.location ?? '') === 'FT',
  );
  return {
    ...b,
    ...weaponMountTerms(b.weaponMountBV, vehicleLocationAbbr(dualTurret)),
    ...ammoPoolTerms(b.ammoPools),
    offensiveTypeModifier: 1,
    adjustment:
      b.summaryModifier === undefined
        ? undefined
        : b.final -
          calculateBaseBV(b.defensive, b.offensive, [b.summaryModifier]),
  };
}
