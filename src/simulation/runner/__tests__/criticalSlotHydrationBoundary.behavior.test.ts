import type { IFullUnit } from '@/services/units/CanonicalUnitService';
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
  hydrateCASEProtectionFromFullUnit,
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
    expect(Object.keys(unitState.ammoState ?? {})).toHaveLength(5);
    expect(unitState.ammoState).toMatchObject({
      'left_torso-8-ammo-lrm-20': {
        weaponType: 'lrm-20',
        location: 'left_torso',
        remainingRounds: 6,
        maxRounds: 6,
        isExplosive: true,
      },
      'left_torso-9-ammo-lrm-20': {
        weaponType: 'lrm-20',
        location: 'left_torso',
        remainingRounds: 6,
        maxRounds: 6,
        isExplosive: true,
      },
      'left_torso-10-ammo-srm-6': {
        weaponType: 'srm-6',
        location: 'left_torso',
        remainingRounds: 15,
        maxRounds: 15,
        isExplosive: true,
      },
      'right_torso-10-ac-20-ammo': {
        weaponType: 'ac-20',
        location: 'right_torso',
        remainingRounds: 5,
        maxRounds: 5,
        isExplosive: true,
      },
      'right_torso-11-ac-20-ammo': {
        weaponType: 'ac-20',
        location: 'right_torso',
        remainingRounds: 5,
        maxRounds: 5,
        isExplosive: true,
      },
    });
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
    expect(
      manifest.right_torso.filter((slot) => slot.componentType === 'ammo'),
    ).toEqual([
      expect.objectContaining({
        slotIndex: 10,
        ammoBinId: 'right_torso-10-ac-20-ammo',
      }),
      expect.objectContaining({
        slotIndex: 11,
        ammoBinId: 'right_torso-11-ac-20-ammo',
      }),
    ]);
    expect(
      manifest.left_torso
        .filter((slot) => slot.componentType === 'ammo')
        .map((slot) => slot.ammoBinId),
    ).toEqual([
      'left_torso-8-ammo-lrm-20',
      'left_torso-9-ammo-lrm-20',
      'left_torso-10-ammo-srm-6',
    ]);
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

  it('hydrates mounted CASE protection from catalog critical slots', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('emperor-emp-6a-nerran');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateCASEProtectionFromFullUnit(fullUnit)).toEqual({
      left_torso: 'case',
      right_torso: 'case',
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.caseProtection).toEqual({
      left_torso: 'case',
      right_torso: 'case',
    });
  });

  it('hydrates source-backed plasma cannon ammo from legacy Clan critical-slot aliases', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('dasher-j');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const aiWeapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const plasmaCannon = aiWeapons.find((weapon) =>
      weapon.id.startsWith('clan-plasma-cannon-'),
    );
    expect(plasmaCannon).toMatchObject({
      name: 'Plasma Cannon (Clan)',
      ammoPerTon: 10,
      location: 'RIGHT_ARM',
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons,
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.ammoState).toMatchObject({
      'right_arm-5-clan-plasma-cannon-ammo': {
        weaponType: 'clan-plasma-cannon',
        location: 'right_arm',
        remainingRounds: 10,
        maxRounds: 10,
        isExplosive: false,
      },
    });

    const manifest = hydrateCriticalSlotManifestFromFullUnit(
      fullUnit,
      aiWeapons,
    );
    expect(manifest?.right_arm).toContainEqual(
      expect.objectContaining({
        slotIndex: 5,
        componentType: 'ammo',
        ammoBinId: 'right_arm-5-clan-plasma-cannon-ammo',
      }),
    );
  });

  it('hydrates CASE-P and prototype CASE as standard CASE without broad substring matches', () => {
    const fullUnit = {
      criticalSlots: {
        LEFT_TORSO: ['CASE-P'],
        RIGHT_TORSO: ['Prototype CASE'],
        CENTER_TORSO: ['Showcase Mount'],
      },
    } as unknown as IFullUnit;

    expect(hydrateCASEProtectionFromFullUnit(fullUnit)).toEqual({
      left_torso: 'case',
      right_torso: 'case',
    });
  });

  it('keeps CASE II stronger than CASE-P when both are mounted in the same location', () => {
    const fullUnit = {
      criticalSlots: {
        RIGHT_TORSO: ['CASE-P', 'CASE II'],
      },
    } as unknown as IFullUnit;

    expect(hydrateCASEProtectionFromFullUnit(fullUnit)).toEqual({
      right_torso: 'case_ii',
    });
  });
});
