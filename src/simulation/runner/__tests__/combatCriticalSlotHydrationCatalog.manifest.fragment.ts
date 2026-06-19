import {
  buildCriticalSlotManifest,
  buildDefaultCriticalSlotManifest,
  CATALOG_CRITICAL_SLOT_HYDRATION_GAPS,
  CRITICAL_SLOT_COMPONENT_TYPES,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  DEFAULT_CRITICAL_SLOT_COMPONENT_TYPES,
  supportIdsByLevel,
  manifestComponentTypes,
} from './combatCriticalSlotHydrationCatalog.test-helpers';

describe('BattleMech critical-slot hydration support catalog', () => {
  it('keeps the default manifest scoped to core slots while catalog hydration covers mounted slots', () => {
    const defaultManifestTypes = manifestComponentTypes(
      buildDefaultCriticalSlotManifest(),
    );

    expect(defaultManifestTypes).toEqual(
      [...DEFAULT_CRITICAL_SLOT_COMPONENT_TYPES].sort(),
    );
    expect(
      supportIdsByLevel(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([...CRITICAL_SLOT_COMPONENT_TYPES].sort());
    expect(
      supportIdsByLevel(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(expect.arrayContaining(defaultManifestTypes));
  });

  it('keeps catalog-mounted hydration gaps empty once UnitHydration builds those slots', () => {
    const defaultManifestTypes = manifestComponentTypes(
      buildDefaultCriticalSlotManifest(),
    );

    expect(
      supportIdsByLevel(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([...CATALOG_CRITICAL_SLOT_HYDRATION_GAPS].sort());
    expect(
      CATALOG_CRITICAL_SLOT_HYDRATION_GAPS.filter((type) =>
        defaultManifestTypes.includes(type),
      ),
    ).toEqual([]);
  });

  it('proves the manifest builder can represent every catalog slot category used by hydration', () => {
    const manifest = buildCriticalSlotManifest({
      center_torso: CRITICAL_SLOT_COMPONENT_TYPES.map(
        (componentType, slotIndex) => ({
          slotIndex,
          componentType,
          componentName: componentType,
          destroyed: false,
        }),
      ),
    });

    expect(manifestComponentTypes(manifest)).toEqual(
      expect.arrayContaining([...CRITICAL_SLOT_COMPONENT_TYPES]),
    );
  });
});
