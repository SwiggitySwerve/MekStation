import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

export type WeaponAttackManifestResolver = (id: string) => CriticalSlotManifest;

export function createWeaponAttackManifestResolver(
  manifestsByUnit: Map<string, CriticalSlotManifest> | undefined,
): WeaponAttackManifestResolver {
  return (id: string): CriticalSlotManifest => {
    if (!manifestsByUnit) return buildDefaultCriticalSlotManifest();

    const existing = manifestsByUnit.get(id);
    if (existing) return existing;

    const seeded = buildDefaultCriticalSlotManifest();
    manifestsByUnit.set(id, seeded);
    return seeded;
  };
}
