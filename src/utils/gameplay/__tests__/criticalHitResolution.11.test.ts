import {
  ArmorTypeEnum,
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
  resolveCriticalHits,
  applyCriticalHitEffect,
  isHardenedArmor,
} from './criticalHitResolution.test-helpers';

describe('equipment slots in manifest', () => {
  it('spends edge_when_explosion to avoid a represented equipment explosion critical', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'PPC Capacitor',
          destroyed: false,
          explosionDamage: 15,
        },
        {
          slotIndex: 1,
          componentType: 'heat_sink',
          componentName: 'Heat Sink',
          destroyed: false,
        },
      ],
    });
    const roller = makeDiceRoller([1, 1, 1, 2]);

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
      expect.objectContaining({
        componentName: 'PPC Capacitor',
        destroyed: false,
      }),
      expect.objectContaining({ componentName: 'Heat Sink', destroyed: true }),
    ]);
  });

  it('does not spend edge_when_explosion when the pilot lacks the trigger', () => {
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
    const roller = makeDiceRoller([1, 1]);

    const result = resolveCriticalHits(
      'unit-1',
      'right_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      1,
      undefined,
      {
        pilotAbilities: [],
        edgePointsRemaining: 1,
        turn: 3,
      },
    );

    expect(result.edgePointsRemaining).toBe(1);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].slot.componentType).toBe('ammo');
  });

  it('does not spend edge_when_explosion when no alternate slot is hittable', () => {
    const manifest = buildCriticalSlotManifest({
      right_torso: [
        {
          slotIndex: 0,
          componentType: 'ammo',
          componentName: 'AC/20 Ammo',
          destroyed: false,
        },
      ],
    });
    const roller = makeDiceRoller([1, 1]);

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

    expect(result.edgePointsRemaining).toBe(1);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].slot.componentType).toBe('ammo');
  });
});

describe('life support critical effects', () => {
  it('increments lifeSupport count', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const lsSlot = manifest.head[0]; // Life Support
    const result = applyCriticalHitEffect(
      lsSlot,
      'unit-1',
      'head',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.updatedComponentDamage.lifeSupport).toBe(1);
    expect(result.effect.type).toBe(CriticalEffectType.LifeSupportHit);
  });

  it('second hit sets lifeSupport to 2', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const lsSlot = manifest.head[0];
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, lifeSupport: 1 };
    const result = applyCriticalHitEffect(lsSlot, 'unit-1', 'head', dmg);

    expect(result.updatedComponentDamage.lifeSupport).toBe(2);
  });
});

describe('isHardenedArmor', () => {
  it('returns true for HARDENED armor type', () => {
    expect(isHardenedArmor(ArmorTypeEnum.HARDENED)).toBe(true);
  });

  it('returns false for STANDARD armor type', () => {
    expect(isHardenedArmor(ArmorTypeEnum.STANDARD)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isHardenedArmor(undefined)).toBe(false);
  });

  it('returns false for other armor types', () => {
    expect(isHardenedArmor(ArmorTypeEnum.FERRO_FIBROUS_IS)).toBe(false);
    expect(isHardenedArmor(ArmorTypeEnum.REACTIVE)).toBe(false);
    expect(isHardenedArmor(ArmorTypeEnum.STEALTH)).toBe(false);
  });
});

describe('hardened armor double crit roll', () => {
  it('standard armor is unchanged — single roll determines crits', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 4+4=8 → 1 crit (standard), slot selection: 1
    const roller = makeDiceRoller([4, 4, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.STANDARD,
    );

    expect(result.hits.length).toBe(1);
  });

  it('hardened armor: single positive roll negated by second negative roll', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 1: 4+4=8 → 1 crit, Roll 2: 1+3=4 → 0 crits → result: 0 crits
    const roller = makeDiceRoller([4, 4, 1, 3]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.hits.length).toBe(0);
  });

  it('hardened armor: first negative roll negates second positive', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 1: 1+3=4 → 0 crits, Roll 2: 5+5=10 → 2 crits → result: 0 crits
    const roller = makeDiceRoller([1, 3, 5, 5]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.hits.length).toBe(0);
  });

  it('hardened armor: both rolls positive uses minimum crit count', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 1: 5+5=10 → 2 crits, Roll 2: 4+4=8 → 1 crit → min(2,1)=1
    // Then slot selection: 1
    const roller = makeDiceRoller([5, 5, 4, 4, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.hits.length).toBe(1);
  });

  it('hardened armor: both rolls 12 on torso gives 3 crits', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 1: 6+6=12 → 3 crits (torso), Roll 2: 6+6=12 → 3 crits
    // Slot selections: 1, 2, 3
    const roller = makeDiceRoller([6, 6, 6, 6, 1, 2, 3]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.hits.length).toBe(3);
  });

  it('hardened armor: roll 12 on limb requires both to blow off', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 1: 6+6=12 → limb blown off, Roll 2: 6+6=12 → limb blown off
    const roller = makeDiceRoller([6, 6, 6, 6]);
    const result = resolveCriticalHits(
      'unit-1',
      'left_arm',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.locationBlownOff).toBe(true);
  });

  it('hardened armor: single roll 12 on limb does NOT blow off if second roll is low', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 1: 6+6=12 → limb blown off, Roll 2: 1+3=4 → 0 crits
    const roller = makeDiceRoller([6, 6, 1, 3]);
    const result = resolveCriticalHits(
      'unit-1',
      'left_arm',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.locationBlownOff).toBe(false);
    expect(result.hits.length).toBe(0);
  });

  it('hardened armor: forceCrits bypasses double-roll logic', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const roller = makeDiceRoller([1, 2]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      2,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.hits.length).toBe(2);
  });

  it('hardened armor: no armorType param behaves as standard (backward compat)', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 4+4=8 → 1 crit, slot selection: 1
    const roller = makeDiceRoller([4, 4, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.hits.length).toBe(1);
  });
});
