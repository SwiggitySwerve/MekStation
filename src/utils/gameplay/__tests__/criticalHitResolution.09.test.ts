import {
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildCriticalSlotManifest,
  resolveCriticalHits,
} from './criticalHitResolution.test-helpers';

describe('equipment slots in manifest', () => {
  it('does not trigger HarJel II secondary effects when secondary effects are disabled', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'HarJel II',
          destroyed: false,
        },
        {
          slotIndex: 1,
          componentType: 'heat_sink',
          componentName: 'Heat Sink',
          destroyed: false,
        },
      ],
    });
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
      undefined,
      { secondaryEffects: false },
    );

    expect(result.hits.map((hit) => hit.slot.componentName)).toEqual([
      'HarJel II',
    ]);
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({ componentName: 'HarJel II', destroyed: true }),
      expect.objectContaining({ componentName: 'Heat Sink', destroyed: false }),
    ]);
    expect(result.updatedComponentDamage).toEqual(DEFAULT_COMPONENT_DAMAGE);
  });

  it('routes represented charged PPC Capacitor equipment criticals through an explosion effect', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'PPC Capacitor',
          destroyed: false,
          explosionDamage: 15,
        },
      ],
    });
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
      undefined,
      { secondaryEffects: false },
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: 'PPC Capacitor',
      additionalDamage: 15,
    });
    expect(result.updatedComponentDamage).toEqual(DEFAULT_COMPONENT_DAMAGE);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'PPC Capacitor',
          effect: 'Equipment explosion: PPC Capacitor (15 damage)',
          destroyed: true,
          explosionDamage: 15,
        }),
      }),
    ]);
  });

  it('routes represented hot-loaded weapon criticals through explicit explosion damage', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'weapon',
          componentName: 'LRM 20',
          weaponId: 'lrm-20',
          destroyed: false,
          hotLoaded: true,
          explosionDamage: 12,
        },
      ],
    });
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: 'LRM 20',
      additionalDamage: 12,
    });
    expect(result.updatedComponentDamage).toEqual(DEFAULT_COMPONENT_DAMAGE);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'weapon',
          componentName: 'LRM 20',
          weaponId: 'lrm-20',
          effect: 'Equipment explosion: LRM 20 (12 damage)',
          destroyed: true,
          hotLoaded: true,
          explosionDamage: 12,
        }),
      }),
    ]);
  });

  it('does not synthesize hot-loaded weapon explosion damage without explicit damage state', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'weapon',
          componentName: 'Hot-Loaded LRM 20',
          weaponId: 'lrm-20',
          destroyed: false,
          hotLoaded: true,
        },
      ],
    });
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.WeaponDestroyed,
      equipmentDestroyed: 'Hot-Loaded LRM 20',
      weaponDisabled: 'lrm-20',
    });
    expect(result.events[0].payload).toMatchObject({
      componentType: 'weapon',
      componentName: 'Hot-Loaded LRM 20',
      effect: 'Weapon destroyed: Hot-Loaded LRM 20',
      destroyed: true,
      hotLoaded: true,
    });
    expect(result.events[0].payload).not.toHaveProperty('explosionDamage');
  });

  it('routes represented RISC Laser Pulse Module criticals to the explicitly linked working laser', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'RISC Laser Pulse Module',
          destroyed: false,
          linkedCriticalWeaponId: 'medium-laser-0',
          linkedCriticalWeaponName: 'Medium Laser',
        },
        {
          slotIndex: 1,
          componentType: 'weapon',
          componentName: 'Medium Laser',
          destroyed: false,
          weaponId: 'medium-laser-0',
        },
      ],
    });
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.WeaponDestroyed,
      equipmentDestroyed: 'Medium Laser',
      weaponDisabled: 'medium-laser-0',
    });
    expect(result.updatedComponentDamage.weaponsDestroyed).toEqual([
      'medium-laser-0',
    ]);
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({
        slotIndex: 0,
        componentName: 'RISC Laser Pulse Module',
        destroyed: true,
      }),
      expect.objectContaining({
        slotIndex: 1,
        componentName: 'Medium Laser',
        destroyed: true,
      }),
    ]);
    expect(result.events[0].payload).toMatchObject({
      componentType: 'equipment',
      componentName: 'RISC Laser Pulse Module',
      linkedCriticalWeaponId: 'medium-laser-0',
      linkedCriticalWeaponName: 'Medium Laser',
      effect: 'Weapon destroyed: Medium Laser',
      destroyed: true,
    });
    expect(result.events[0].payload).not.toHaveProperty('explosionDamage');
  });

  it('keeps RISC Laser Pulse Module criticals generic without explicit linked-laser state', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'RISC Laser Pulse Module',
          destroyed: false,
        },
      ],
    });
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
    );

    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'RISC Laser Pulse Module',
    });
    expect(result.updatedComponentDamage.weaponsDestroyed).toEqual([]);
    expect(result.events[0].payload).not.toHaveProperty(
      'linkedCriticalWeaponId',
    );
  });
});
