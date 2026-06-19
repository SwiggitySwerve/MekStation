import {
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildCriticalSlotManifest,
  resolveCriticalHits,
} from './criticalHitResolution.test-helpers';

describe('equipment slots in manifest', () => {
  it('destroys only the RISC Laser Pulse Module when its explicit linked laser is already destroyed', () => {
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
      ],
    });
    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      {
        ...DEFAULT_COMPONENT_DAMAGE,
        weaponsDestroyed: ['medium-laser-0'],
      },
      makeDiceRoller([1]),
      1,
    );

    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'RISC Laser Pulse Module',
    });
    expect(result.updatedComponentDamage.weaponsDestroyed).toEqual([
      'medium-laser-0',
    ]);
    expect(result.events[0].payload).toMatchObject({
      componentType: 'equipment',
      componentName: 'RISC Laser Pulse Module',
      effect: 'Equipment destroyed: RISC Laser Pulse Module',
      destroyed: true,
    });
    expect(result.events[0].payload).not.toHaveProperty(
      'linkedCriticalWeaponId',
    );
    expect(result.events[0].payload).not.toHaveProperty('explosionDamage');
  });

  it('lets secondary-effect-gated explosive equipment fall back when secondary effects are disabled', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Booby Trap',
          destroyed: false,
          explosionDamage: 10,
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
      equipmentDestroyed: 'Booby Trap',
    });
    expect(result.events[0]).toMatchObject({
      type: 'critical_hit_resolved',
      payload: {
        componentType: 'equipment',
        componentName: 'Booby Trap',
        effect: 'Equipment destroyed: Booby Trap',
        destroyed: true,
      },
    });
    expect(result.events[0].payload).not.toHaveProperty('explosionDamage');
  });

  it('only explodes represented Prototype Improved Jump Jet equipment when secondary effects are enabled', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'ISPrototypeImprovedJumpJet',
          destroyed: false,
          explosionDamage: 10,
          explosionRequiresSecondaryEffects: true,
        },
      ],
    });

    const withoutSecondaryEffects = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
      undefined,
      { secondaryEffects: false },
    );
    const withSecondaryEffects = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
      undefined,
      { secondaryEffects: true },
    );

    expect(withoutSecondaryEffects.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'ISPrototypeImprovedJumpJet',
    });
    expect(withoutSecondaryEffects.events[0].payload).toMatchObject({
      componentType: 'equipment',
      componentName: 'ISPrototypeImprovedJumpJet',
      effect: 'Equipment destroyed: ISPrototypeImprovedJumpJet',
      destroyed: true,
    });
    expect(withoutSecondaryEffects.events[0].payload).not.toHaveProperty(
      'explosionDamage',
    );

    expect(withSecondaryEffects.hits[0].effect).toEqual({
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: 'ISPrototypeImprovedJumpJet',
      additionalDamage: 10,
    });
    expect(withSecondaryEffects.events[0].payload).toMatchObject({
      componentType: 'equipment',
      componentName: 'ISPrototypeImprovedJumpJet',
      effect: 'Equipment explosion: ISPrototypeImprovedJumpJet (10 damage)',
      destroyed: true,
      explosionDamage: 10,
    });
  });

  it('only explodes represented Extended Fuel Tank equipment when secondary effects are enabled', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Extended Fuel Tank',
          destroyed: false,
          explosionDamage: 20,
          explosionRequiresSecondaryEffects: true,
        },
      ],
    });

    const withoutSecondaryEffects = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
      undefined,
      { secondaryEffects: false },
    );
    const withSecondaryEffects = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      makeDiceRoller([1]),
      1,
      undefined,
      { secondaryEffects: true },
    );

    expect(withoutSecondaryEffects.hits[0].effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'Extended Fuel Tank',
    });
    expect(withoutSecondaryEffects.events[0].payload).toMatchObject({
      componentType: 'equipment',
      componentName: 'Extended Fuel Tank',
      effect: 'Equipment destroyed: Extended Fuel Tank',
      destroyed: true,
    });
    expect(withoutSecondaryEffects.events[0].payload).not.toHaveProperty(
      'explosionDamage',
    );

    expect(withSecondaryEffects.hits[0].effect).toEqual({
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: 'Extended Fuel Tank',
      additionalDamage: 20,
    });
    expect(withSecondaryEffects.events[0].payload).toMatchObject({
      componentType: 'equipment',
      componentName: 'Extended Fuel Tank',
      effect: 'Equipment explosion: Extended Fuel Tank (20 damage)',
      destroyed: true,
      explosionDamage: 20,
    });
  });

  it('spends edge_when_explosion to avoid an ammo critical when another slot is hittable', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'ammo',
          componentName: 'AC/20 Ammo',
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
    const roller = makeDiceRoller([1, 6]);

    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      1,
      undefined,
      {
        pilotAbilities: ['edge_when_explosion'],
        edgePointsRemaining: 1,
        turn: 3,
      },
    );

    expect(result.edgePointsRemaining).toBe(0);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].slot.componentType).toBe('heat_sink');
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({ slotIndex: 0, destroyed: false }),
      expect.objectContaining({ slotIndex: 1, destroyed: true }),
    ]);
  });
});
