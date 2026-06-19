import {
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildCriticalSlotManifest,
  resolveCriticalHits,
} from './criticalHitResolution.test-helpers';

describe('equipment slots in manifest', () => {
  it('disables Super-Cooled Myomer equipment on the sixth damaged SCM critical slot', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'SCM',
          destroyed: false,
        },
      ],
    });
    const componentDamage = {
      ...DEFAULT_COMPONENT_DAMAGE,
      superCooledMyomerHits: 5,
    };
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      componentDamage,
      makeDiceRoller([1]),
      1,
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'SCM',
    });
    expect(result.updatedComponentDamage).toEqual({
      ...DEFAULT_COMPONENT_DAMAGE,
      superCooledMyomerHits: 6,
    });
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'SCM',
          effect: 'Equipment destroyed: SCM',
          destroyed: true,
        }),
      }),
    ]);
  });

  it('marks Emergency Coolant System state damaged when its equipment critical resolves', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Emergency Coolant System',
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

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'Emergency Coolant System',
    });
    expect(result.updatedComponentDamage).toEqual({
      ...DEFAULT_COMPONENT_DAMAGE,
      emergencyCoolantSystemDamaged: true,
    });
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'Emergency Coolant System',
          effect: 'Equipment destroyed: Emergency Coolant System',
          destroyed: true,
        }),
      }),
    ]);
  });

  it('routes represented Emergency Coolant System criticals through explosion damage while preserving damaged-system state', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'RISC Emergency Coolant System',
          destroyed: false,
          explosionDamage: 5,
          explosionRequiresSecondaryEffects: true,
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
      equipmentDestroyed: 'RISC Emergency Coolant System',
      additionalDamage: 5,
    });
    expect(result.updatedComponentDamage).toEqual({
      ...DEFAULT_COMPONENT_DAMAGE,
      emergencyCoolantSystemDamaged: true,
    });
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'RISC Emergency Coolant System',
          effect:
            'Equipment explosion: RISC Emergency Coolant System (5 damage)',
          destroyed: true,
          explosionDamage: 5,
        }),
      }),
    ]);
  });

  it('suppresses Emergency Coolant System explosion damage when secondary effects are disabled', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'RISC Emergency Coolant System',
          destroyed: false,
          explosionDamage: 5,
          explosionRequiresSecondaryEffects: true,
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
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'RISC Emergency Coolant System',
    });
    expect(result.updatedComponentDamage).toEqual({
      ...DEFAULT_COMPONENT_DAMAGE,
      emergencyCoolantSystemDamaged: true,
    });
    expect(result.events[0].payload).not.toHaveProperty('explosionDamage');
  });

  it('records plain HarJel equipment criticals as location breaches', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'HarJel',
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

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'HarJel',
    });
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({ componentName: 'HarJel', destroyed: true }),
    ]);
    expect(result.updatedComponentDamage).toEqual({
      ...DEFAULT_COMPONENT_DAMAGE,
      breachedLocations: ['right_torso'],
    });
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'HarJel',
          effect: 'Equipment destroyed: HarJel',
          destroyed: true,
          breached: true,
        }),
      }),
    ]);
  });

  it('lets HarJel II and III trigger one same-location secondary critical when newly hit', () => {
    for (const componentName of ['HarJel II', 'HarJel III']) {
      const manifest = buildCriticalSlotManifest({
        right_torso: [
          {
            slotIndex: 0,
            componentType: 'equipment',
            componentName,
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
        makeDiceRoller([1, 1]),
        1,
      );

      expect(result.hits.map((hit) => hit.slot.componentName)).toEqual([
        componentName,
        'Heat Sink',
      ]);
      expect(result.updatedManifest.right_torso).toEqual([
        expect.objectContaining({ componentName, destroyed: true }),
        expect.objectContaining({
          componentName: 'Heat Sink',
          destroyed: true,
        }),
      ]);
      expect(result.updatedComponentDamage).toEqual({
        ...DEFAULT_COMPONENT_DAMAGE,
        heatSinksDestroyed: 1,
      });
      expect(result.events).toEqual([
        expect.objectContaining({
          type: 'critical_hit_resolved',
          payload: expect.objectContaining({
            componentName,
            destroyed: true,
          }),
        }),
        expect.objectContaining({
          type: 'critical_hit_resolved',
          payload: expect.objectContaining({
            componentType: 'heat_sink',
            componentName: 'Heat Sink',
            destroyed: true,
          }),
        }),
      ]);
    }
  });
});
