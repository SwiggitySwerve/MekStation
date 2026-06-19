import {
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  CATALOG_CRITICAL_SLOT_HYDRATION_GAPS,
  CRITICAL_SLOT_COMPONENT_TYPES,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  sortedKeys,
  supportGaps,
  supportIdsByLevel,
} from './combatCriticalSlotHydrationCatalog.test-helpers';

describe('BattleMech critical-slot hydration support catalog', () => {
  it('catalogs every critical slot component type recognized by the resolver', () => {
    expect(sortedKeys(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT)).toEqual(
      [...CRITICAL_SLOT_COMPONENT_TYPES].sort(),
    );
    expect(supportGaps(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT)).toEqual([]);
    expect(sortedKeys(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT)).toEqual(
      [
        ...CRITICAL_SLOT_COMPONENT_TYPES,
        ...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
        ...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
        ...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ].sort(),
    );
    expect(supportGaps(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT)).toEqual([]);
  });

  it('separates proven critical effects from catalog slot hydration gaps', () => {
    const integratedEffectTypes = CRITICAL_SLOT_COMPONENT_TYPES.filter(
      (componentType) => componentType !== 'equipment',
    );

    expect(
      supportIdsByLevel(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'equipment',
        ...integratedEffectTypes,
        ...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ].sort(),
    );
    expect(
      supportIdsByLevel(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual([...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS].sort());
    expect(
      supportIdsByLevel(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT, 'out-of-scope'),
    ).toEqual([...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS]);
    expect(
      supportIdsByLevel(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([...CATALOG_CRITICAL_SLOT_HYDRATION_GAPS].sort());
    expect(CATALOG_CRITICAL_SLOT_HYDRATION_GAPS).toEqual([]);
  });
});
