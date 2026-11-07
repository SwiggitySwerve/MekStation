/**
 * ProtoMek ammo BV. Pinned MegaMek 48fcb2f6 `ProtoMekBVCalculator.getAmmoBV`
 * (ProtoMekBVCalculator.java:50-52) is `AmmoType.getKgPerShotBV(shots)` =
 * kgPerShot x shots / 1000 x bv (AmmoType.java:17103-17105), where `bv` is the
 * AmmoType's per-ton value and the BLK count `(N)` is the shot count.
 *
 * kgPerShot, bv and the Java ammoType:rackSize pool come from the generated
 * Java registry record of that internal name (scripts/equipment-catalog).
 * Java's kgPerShot is not 1000 / shotsPerTon (ProtoMech LRM-3 is 24.99 kg).
 * Names without such a record keep the ton-bin lookup.
 */
import registryAmmo from '../../../../public/data/equipment/official/ammunition/java-registry.json';
import { getNativeAmmoBVGroup } from '../battleValueAmmo';
import { normalizeEquipmentId } from '../equipmentBVResolver';

interface ProtoAmmo {
  readonly kgPerShot: number;
  readonly battleValue: number;
  /** Java `ammoType:rackSize`, the native BV cap pool. */
  readonly group: string;
}

// The generator names each record `${slug(internalName)}-registry`
// (scripts/equipment-catalog/generate.mjs:16,38).
const registryId = (name: string): string =>
  `${(name.toLowerCase().match(/[a-z0-9]+/g) ?? []).join('-')}-registry`;
const PROTO_AMMO = new Map<string, ProtoAmmo>();
for (const item of registryAmmo.items as ReadonlyArray<{
  id: string;
  battleValue: number;
  kgPerShot?: number;
  special?: string[];
}>) {
  const group = item.special
    ?.find((value) => value.startsWith('Java ammoType:rackSize '))
    ?.slice('Java ammoType:rackSize '.length);
  if (item.kgPerShot !== undefined && group)
    PROTO_AMMO.set(item.id, {
      kgPerShot: item.kgPerShot,
      battleValue: item.battleValue,
      group,
    });
}

/** Per-shot facts of a Java ammo internal name such as `Clan Ammo SRM-2`. */
export function getProtoAmmo(name: string): ProtoAmmo | undefined {
  return PROTO_AMMO.get(registryId(name.trim()));
}

/** BV of one BLK ammo mount such as `Clan Ammo SRM-2 (10)`; the count is its shots.
 * The cap key is the mounted weapon in the same Java pool (BVCalculator.java:1190-1240).
 */
export function resolveProtoAmmoBV(
  equipmentId: string,
  weaponIds: readonly string[],
):
  | { battleValue: number; weaponType: string; readonly nativeGroup: string }
  | undefined {
  const match = /^(.*?)\s*\((\d+)\)$/.exec(equipmentId.trim());
  const ammo = match ? getProtoAmmo(match[1]) : undefined;
  if (!match || !ammo) return undefined;
  const weapon = weaponIds.find(
    (id) => getNativeAmmoBVGroup(id) === ammo.group,
  );
  return {
    battleValue:
      ((ammo.kgPerShot * Number(match[2])) / 1000) * ammo.battleValue,
    weaponType: weapon ? normalizeEquipmentId(weapon) : ammo.group,
    nativeGroup: ammo.group,
  };
}
