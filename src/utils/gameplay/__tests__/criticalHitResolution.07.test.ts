import {
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  makeManifestWithWeapons,
  buildCriticalSlotManifest,
  resolveCriticalHits,
} from './criticalHitResolution.test-helpers';

describe('equipment slots in manifest', () => {
  it('weapon slot in torso can be critted', () => {
    const manifest = makeManifestWithWeapons();
    // Force 1 crit, select slot index that maps to weapon.
    const roller = makeDiceRoller([1, 4]);
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      1,
    );

    expect(result.hits.length).toBe(1);
    expect(result.hits[0].slot.componentType).toBe('weapon');
    expect(result.updatedComponentDamage.weaponsDestroyed).toContain(
      'weapon-ml-1',
    );
  });

  it('heat sink slot can be critted', () => {
    const manifest = makeManifestWithWeapons();
    const roller = makeDiceRoller([1, 5]);
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      1,
    );

    expect(result.hits.length).toBe(1);
    expect(result.hits[0].slot.componentType).toBe('heat_sink');
    expect(result.updatedComponentDamage.heatSinksDestroyed).toBe(1);
  });

  it('jump jet slot can be critted', () => {
    const manifest = makeManifestWithWeapons();
    const roller = makeDiceRoller([1, 6]);
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      1,
    );

    expect(result.hits.length).toBe(1);
    expect(result.hits[0].slot.componentType).toBe('jump_jet');
    expect(result.updatedComponentDamage.jumpJetsDestroyed).toBe(1);
  });

  it('ammo slot can be critted', () => {
    const manifest = makeManifestWithWeapons();
    const roller = makeDiceRoller([2, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      1,
    );

    expect(result.hits.length).toBe(1);
    expect(result.hits[0].slot.componentType).toBe('ammo');
  });

  it('generic equipment slot resolves only as EquipmentDestroyed', () => {
    const manifest = makeManifestWithWeapons();
    const roller = makeDiceRoller([2, 2]);
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      1,
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].slot).toMatchObject({
      componentType: 'equipment',
      componentName: 'CASE',
    });
    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'CASE',
    });
    expect(result.updatedComponentDamage).toEqual(DEFAULT_COMPONENT_DAMAGE);
  });

  it('shield equipment critical preserves shield function after the slot is hit', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Medium Shield',
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
      type: CriticalEffectType.EquipmentHit,
      equipmentHit: 'Medium Shield',
    });
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({
        componentName: 'Medium Shield',
        destroyed: true,
      }),
    ]);
    expect(result.updatedComponentDamage).toEqual(DEFAULT_COMPONENT_DAMAGE);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'Medium Shield',
          effect: 'Equipment hit: Medium Shield',
          destroyed: false,
        }),
      }),
    ]);
  });

  it('Blue Shield equipment critical is represented only by generic shield preservation', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Blue Shield Particle Field Damper',
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
      type: CriticalEffectType.EquipmentHit,
      equipmentHit: 'Blue Shield Particle Field Damper',
    });
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({
        componentName: 'Blue Shield Particle Field Damper',
        destroyed: true,
      }),
    ]);
    expect(result.updatedComponentDamage).toEqual(DEFAULT_COMPONENT_DAMAGE);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'Blue Shield Particle Field Damper',
          effect: 'Equipment hit: Blue Shield Particle Field Damper',
          destroyed: false,
        }),
      }),
    ]);
  });

  it('Blue Shield equipment critical with explicit explosion damage cascades as explosive equipment', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Blue Shield Particle Field Damper',
          destroyed: false,
          explosionDamage: 5,
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
      equipmentDestroyed: 'Blue Shield Particle Field Damper',
      additionalDamage: 5,
    });
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({
        componentName: 'Blue Shield Particle Field Damper',
        destroyed: true,
      }),
    ]);
    expect(result.updatedComponentDamage).toEqual(DEFAULT_COMPONENT_DAMAGE);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'Blue Shield Particle Field Damper',
          effect:
            'Equipment explosion: Blue Shield Particle Field Damper (5 damage)',
          destroyed: true,
          explosionDamage: 5,
        }),
      }),
    ]);
  });

  it('tracks Super-Cooled Myomer equipment criticals without disabling the mount before the sixth hit', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Super-Cooled Myomer',
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
      type: CriticalEffectType.EquipmentHit,
      equipmentHit: 'Super-Cooled Myomer',
    });
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({
        componentName: 'Super-Cooled Myomer',
        destroyed: true,
      }),
    ]);
    expect(result.updatedComponentDamage).toEqual({
      ...DEFAULT_COMPONENT_DAMAGE,
      superCooledMyomerHits: 1,
    });
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'Super-Cooled Myomer',
          effect: 'Equipment hit: Super-Cooled Myomer',
          destroyed: false,
        }),
      }),
    ]);
  });
});
