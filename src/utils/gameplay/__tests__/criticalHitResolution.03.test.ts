import {
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildCriticalSlotManifest,
  resolveCriticalHits,
  applyCriticalHitEffect,
  type ICriticalSlotEntry,
} from './criticalHitResolution.test-helpers';

describe('weapon critical effects', () => {
  it('marks weapon as destroyed', () => {
    const weaponSlot: ICriticalSlotEntry = {
      slotIndex: 3,
      componentType: 'weapon',
      componentName: 'Medium Laser',
      destroyed: false,
      weaponId: 'weapon-ml-1',
    };
    const result = applyCriticalHitEffect(
      weaponSlot,
      'unit-1',
      'right_torso',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.effect.type).toBe(CriticalEffectType.WeaponDestroyed);
    expect(result.updatedComponentDamage.weaponsDestroyed).toContain(
      'weapon-ml-1',
    );
    expect(result.effect.weaponDisabled).toBe('weapon-ml-1');
  });

  it('uses componentName when no weaponId', () => {
    const weaponSlot: ICriticalSlotEntry = {
      slotIndex: 3,
      componentType: 'weapon',
      componentName: 'PPC',
      destroyed: false,
    };
    const result = applyCriticalHitEffect(
      weaponSlot,
      'unit-1',
      'right_arm',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.updatedComponentDamage.weaponsDestroyed).toContain('PPC');
  });

  const playtest3AutocannonCriticalCases = [
    { componentName: 'AC/5', weaponId: 'ac-5-0' },
    { componentName: 'Rotary AC/5', weaponId: 'rotary-ac-5-0' },
    {
      componentName: 'Hyper Velocity Auto Cannon/10',
      weaponId: 'hyper-velocity-auto-cannon-10-0',
    },
  ];

  it.each(playtest3AutocannonCriticalCases)(
    'records the first PLAYTEST_3 $componentName critical without disabling the weapon',
    ({ componentName, weaponId }) => {
      const weaponSlot: ICriticalSlotEntry = {
        slotIndex: 3,
        componentType: 'weapon',
        componentName,
        destroyed: false,
        weaponId,
      };
      const result = applyCriticalHitEffect(
        weaponSlot,
        'unit-1',
        'right_torso',
        DEFAULT_COMPONENT_DAMAGE,
        { optionalRules: ['PLAYTEST_3'] },
      );

      expect(result.effect).toEqual({
        type: CriticalEffectType.EquipmentHit,
        equipmentHit: componentName,
      });
      expect(result.slotDestroyed).toBe(false);
      expect(result.updatedComponentDamage.weaponsDestroyed).toEqual([]);
      expect(
        result.updatedComponentDamage.playtestAutocannonFirstCrits,
      ).toEqual([weaponId]);
      expect(result.events).toEqual([
        expect.objectContaining({
          type: 'critical_hit_resolved',
          payload: expect.objectContaining({
            componentType: 'weapon',
            componentName,
            weaponId,
            effect: `Equipment hit: ${componentName}`,
            destroyed: false,
          }),
        }),
      ]);
    },
  );

  it.each(playtest3AutocannonCriticalCases)(
    'destroys a PLAYTEST_3 $componentName after its first critical was already recorded',
    ({ componentName, weaponId }) => {
      const weaponSlot: ICriticalSlotEntry = {
        slotIndex: 3,
        componentType: 'weapon',
        componentName,
        destroyed: false,
        weaponId,
      };
      const result = applyCriticalHitEffect(
        weaponSlot,
        'unit-1',
        'right_torso',
        {
          ...DEFAULT_COMPONENT_DAMAGE,
          playtestAutocannonFirstCrits: [weaponId],
        },
        { optionalRules: ['PLAYTEST_3'] },
      );

      expect(result.effect.type).toBe(CriticalEffectType.WeaponDestroyed);
      expect(result.slotDestroyed).toBe(true);
      expect(result.updatedComponentDamage.weaponsDestroyed).toEqual([
        weaponId,
      ]);
    },
  );

  it('keeps the first PLAYTEST_3 autocannon critical slot available for later crits', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'weapon',
          componentName: 'AC/5',
          weaponId: 'ac-5-0',
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
      { optionalRules: ['PLAYTEST_3'] },
    );

    expect(result.hits).toHaveLength(1);
    expect(result.updatedManifest.right_torso).toEqual([
      expect.objectContaining({
        componentName: 'AC/5',
        destroyed: false,
      }),
    ]);
    expect(result.updatedComponentDamage).toEqual({
      ...DEFAULT_COMPONENT_DAMAGE,
      playtestAutocannonFirstCrits: ['ac-5-0'],
    });
  });
});

describe('heat sink critical effects', () => {
  it('increments heatSinksDestroyed', () => {
    const hsSlot: ICriticalSlotEntry = {
      slotIndex: 4,
      componentType: 'heat_sink',
      componentName: 'Heat Sink',
      destroyed: false,
    };
    const result = applyCriticalHitEffect(
      hsSlot,
      'unit-1',
      'right_torso',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.effect.type).toBe(CriticalEffectType.HeatSinkDestroyed);
    expect(result.updatedComponentDamage.heatSinksDestroyed).toBe(1);
  });

  it('cumulates multiple heat sink destructions', () => {
    const hsSlot: ICriticalSlotEntry = {
      slotIndex: 4,
      componentType: 'heat_sink',
      componentName: 'Heat Sink',
      destroyed: false,
    };
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, heatSinksDestroyed: 2 };
    const result = applyCriticalHitEffect(hsSlot, 'unit-1', 'right_torso', dmg);

    expect(result.updatedComponentDamage.heatSinksDestroyed).toBe(3);
  });
});

describe('jump jet critical effects', () => {
  it('increments jumpJetsDestroyed', () => {
    const jjSlot: ICriticalSlotEntry = {
      slotIndex: 5,
      componentType: 'jump_jet',
      componentName: 'Jump Jet',
      destroyed: false,
    };
    const result = applyCriticalHitEffect(
      jjSlot,
      'unit-1',
      'right_torso',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.effect.type).toBe(CriticalEffectType.JumpJetDestroyed);
    expect(result.updatedComponentDamage.jumpJetsDestroyed).toBe(1);
  });

  it('cumulates multiple jump jet destructions', () => {
    const jjSlot: ICriticalSlotEntry = {
      slotIndex: 5,
      componentType: 'jump_jet',
      componentName: 'Jump Jet',
      destroyed: false,
    };
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, jumpJetsDestroyed: 3 };
    const result = applyCriticalHitEffect(jjSlot, 'unit-1', 'right_torso', dmg);

    expect(result.updatedComponentDamage.jumpJetsDestroyed).toBe(4);
  });
});

describe('ammo critical effects', () => {
  it('returns AmmoExplosion effect type', () => {
    const ammoSlot: ICriticalSlotEntry = {
      slotIndex: 6,
      componentType: 'ammo',
      componentName: 'AC/5 Ammo',
      destroyed: false,
    };
    const result = applyCriticalHitEffect(
      ammoSlot,
      'unit-1',
      'right_torso',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.effect.type).toBe(CriticalEffectType.AmmoExplosion);
  });
});
