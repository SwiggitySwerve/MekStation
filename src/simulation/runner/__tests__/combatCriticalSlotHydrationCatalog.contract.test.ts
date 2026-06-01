import {
  buildCriticalSlotManifest,
  buildDefaultCriticalSlotManifest,
  type CriticalSlotComponentType,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import { CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT } from '../CombatCriticalSlotEffectSupport';
import {
  CATALOG_CRITICAL_SLOT_HYDRATION_GAPS,
  CRITICAL_SLOT_COMPONENT_TYPES,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  DEFAULT_CRITICAL_SLOT_COMPONENT_TYPES,
} from '../CombatCriticalSlotHydrationSupport';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function supportIdsMissingSourceRefs(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
    .map((entry) => entry.id)
    .sort();
}

function manifestComponentTypes(
  manifest: CriticalSlotManifest,
): readonly CriticalSlotComponentType[] {
  return Array.from(
    new Set(
      Object.values(manifest)
        .flat()
        .map((slot) => slot.componentType),
    ),
  ).sort();
}

describe('BattleMech critical-slot hydration support catalog', () => {
  it('catalogs every critical slot component type recognized by the resolver', () => {
    expect(sortedKeys(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT)).toEqual(
      [...CRITICAL_SLOT_COMPONENT_TYPES].sort(),
    );
    expect(supportGaps(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT)).toEqual([]);
    expect(sortedKeys(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT)).toEqual(
      [...CRITICAL_SLOT_COMPONENT_TYPES].sort(),
    );
    expect(supportGaps(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT)).toEqual([]);
  });

  it('separates proven critical effects from catalog slot hydration gaps', () => {
    const integratedEffectTypes = CRITICAL_SLOT_COMPONENT_TYPES.filter(
      (componentType) => componentType !== 'equipment',
    );

    expect(
      supportIdsByLevel(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([...integratedEffectTypes].sort());
    expect(
      supportIdsByLevel(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['equipment']);
    expect(
      supportIdsByLevel(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([...CATALOG_CRITICAL_SLOT_HYDRATION_GAPS].sort());
    expect(CATALOG_CRITICAL_SLOT_HYDRATION_GAPS).toEqual([]);
  });

  it('source-pins critical slot rows and preserves generic equipment lifecycle gaps', () => {
    expect(
      supportIdsMissingSourceRefs(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT),
    ).toEqual([]);
    expect(
      supportIdsMissingSourceRefs(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT),
    ).toEqual([]);
    expect(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT.equipment).toMatchObject({
      level: 'helper-only',
      gap: expect.stringContaining('equipment-specific'),
    });
  });

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
