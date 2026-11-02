/**
 * ProtoMek ammo BV. Pinned MegaMek 48fcb2f6 `ProtoMekBVCalculator.getAmmoBV`
 * (ProtoMekBVCalculator.java:50-52) is `AmmoType.getKgPerShotBV(shots)` =
 * kgPerShot x shots / 1000 x bv (AmmoType.java:17103-17105), where `bv` is the
 * AmmoType's per-ton value and the BLK count `(N)` is the shot count.
 *
 * STOPGAP TABLE: the equipment catalog has no kgPerShot, and Java's value is
 * not 1000 / shotsPerTon (ProtoMech LRM-3 is 24.99 kg, not 10). Each row is
 * [kgPerShot, bv per ton, launcher whose ammoType:rackSize pool it feeds] for
 * the AmmoType of that internal name; the trailing `:N` is the pinned
 * AmmoType.java line of its kgPerShot. A test checks every row against the
 * catalog entry that resolves. The catalog owner should replace this table with
 * catalog fields (owner question: add kgPerShot and the missing ProtoMech
 * ammo). Names outside the table keep the ton-bin lookup.
 */
import { normalizeEquipmentId } from '../equipmentBVResolver';

export const PROTO_AMMO_STOPGAP: Record<
  string,
  readonly [number, number, string]
> = {
  'CLAPGaussRifle Ammo': [25, 3, 'CLAPGaussRifle'], // :6330
  CLMediumChemLaserAmmo: [33.33, 5, 'CLMediumChemicalLaser'], // :5997
  CLPlasmaCannonAmmo: [100, 21, 'CLPlasmaCannon'], // :12230
  'Clan Ammo LRM-5': [41.65, 7, 'CLLRM5'], // :8487
  'Clan Ammo LRM-10': [83.3, 14, 'CLLRM10'], // :8518
  'Clan Ammo LRM-15': [124.95, 21, 'CLLRM15'], // :8549
  'Clan Ammo ProtoMech LRM-2': [16.66, 3, 'CLLRM2'], // :9224
  'Clan Ammo ProtoMech LRM-3': [24.99, 4, 'CLLRM3'], // :9255
  'Clan Ammo ProtoMech LRM-4': [33.32, 6, 'CLLRM4'], // :9286
  'Clan Ammo ProtoMech LRM-6': [49.98, 9, 'CLLRM6'], // :9317
  'Clan Ammo ProtoMech LRM-12': [99.96, 18, 'CLLRM12'], // :9472
  'Clan Ammo SRM-1': [10, 2, 'CLSRM1'], // :9912
  'Clan Ammo SRM-2': [20, 3, 'CLSRM2'], // :9942
  'Clan Ammo SRM-3': [30, 4, 'CLSRM3'], // :9972
  'Clan Ammo SRM-4': [40, 5, 'CLSRM4'], // :10002
  'Clan Ammo SRM-5': [50, 6, 'CLSRM5'], // :10032
  'Clan Ammo SRM-6': [60, 7, 'CLSRM6'], // :10062
  'Clan LB 2-X AC Ammo': [20, 6, 'CLLBXAC2'], // :5258
  'Clan Machine Gun Ammo - Proto': [5, 1, 'CLMG'], // :14376
  'Clan Light Machine Gun Ammo - Proto': [5, 1, 'CLLightMG'], // :14405
  'Clan ProtoMech AC/2 Ammo': [25, 4, 'CLProtoMechAC2'], // :4794
  'Clan Streak LRM 5 Ammo': [41.65, 11, 'CLStreakLRM5'], // :8613
  'Clan Streak SRM 1 Ammo': [10, 3, 'CLStreakSRM1'], // :10535
  'Clan Streak SRM 2 Ammo': [10, 5, 'CLStreakSRM2'], // :10443
  'Clan Streak SRM 3 Ammo': [30, 7, 'CLStreakSRM3'], // :10566
  'Clan Streak SRM 4 Ammo': [40, 10, 'CLStreakSRM4'], // :10474
  'Clan Streak SRM 5 Ammo': [50, 13, 'CLStreakSRM5'], // :10597
  'Clan Streak SRM 6 Ammo': [60, 15, 'CLStreakSRM6'], // :10505
};

/** BV of one BLK ammo mount such as `Clan Ammo SRM-2 (10)`; the count is its shots. */
export function resolveProtoAmmoBV(
  equipmentId: string,
): { battleValue: number; weaponType: string } | undefined {
  const match = /^(.*?)\s*\((\d+)\)$/.exec(equipmentId.trim());
  const row = match && PROTO_AMMO_STOPGAP[match[1]];
  if (!row) return undefined;
  const [kgPerShot, bv, launcher] = row;
  return {
    battleValue: ((kgPerShot * Number(match[2])) / 1000) * bv,
    weaponType: normalizeEquipmentId(launcher),
  };
}
