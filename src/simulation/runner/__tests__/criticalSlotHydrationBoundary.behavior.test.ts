import type { CriticalSlotComponentType } from '@/utils/gameplay/criticalHitResolution';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GameSide } from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import {
  CATALOG_CRITICAL_SLOT_HYDRATION_GAPS,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
} from '../CombatCriticalSlotHydrationSupport';
import {
  buildWeaponLookupFromCatalogFiles,
  createHydratedUnitState,
  hydrateCriticalSlotManifestFromFullUnit,
  hydrateAIWeaponsFromFullUnit,
} from '../UnitHydration';

const weaponLookup = buildWeaponLookupFromCatalogFiles(
  WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
);

function manifestComponentTypes(): readonly CriticalSlotComponentType[] {
  return Array.from(
    new Set(
      Object.values(buildDefaultCriticalSlotManifest())
        .flat()
        .map((slot) => slot.componentType),
    ),
  ).sort();
}

describe('catalog critical-slot hydration boundary', () => {
  it('hydrates Atlas catalog critical slots into the runner manifest while keeping lifecycle gaps explicit', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const aiWeapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    expect(aiWeapons).toHaveLength(7);
    expect(aiWeapons.some((weapon) => weapon.ammoPerTon > 0)).toBe(true);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons,
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.heatSinks).toBe(20);
    expect(unitState.ammoState).toBeUndefined();
    expect(
      (unitState as unknown as Record<string, unknown>).criticalSlotManifest,
    ).toBeUndefined();

    const manifest = hydrateCriticalSlotManifestFromFullUnit(
      fullUnit,
      aiWeapons,
    );
    expect(manifest).toBeDefined();
    if (!manifest) return;

    expect(
      Object.values(manifest)
        .flat()
        .filter((slot) => slot.componentType === 'heat_sink'),
    ).toHaveLength(8);
    expect(manifest.head).toContainEqual(
      expect.objectContaining({
        slotIndex: 3,
        componentType: 'heat_sink',
        componentName: 'Heat Sink',
      }),
    );
    expect(
      manifest.right_torso.filter((slot) => slot.componentType === 'weapon'),
    ).toHaveLength(10);
    expect(
      manifest.right_torso.filter((slot) => slot.componentType === 'ammo'),
    ).toHaveLength(2);
    expect(manifestComponentTypes()).toEqual(
      expect.not.arrayContaining(['heat_sink', 'weapon', 'ammo']),
    );

    const defaultManifestTypes = manifestComponentTypes();
    expect(
      CATALOG_CRITICAL_SLOT_HYDRATION_GAPS.filter((componentType) =>
        defaultManifestTypes.includes(componentType),
      ),
    ).toEqual([]);
    for (const componentType of CATALOG_CRITICAL_SLOT_HYDRATION_GAPS) {
      expect(
        CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT[componentType],
      ).toMatchObject({
        level: 'helper-only',
      });
    }
  });
});
