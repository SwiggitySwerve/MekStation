import {
  ArmorTypeEnum,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
  resolveCriticalHits,
  isFerroLamellorArmor,
  halveCritCount,
} from './criticalHitResolution.test-helpers';

describe('resolveCriticalHits', () => {
  it('resolves 0 crits when roll is 2-7', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const roller = makeDiceRoller([1, 3]); // roll = 4 → 0 crits
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.hits.length).toBe(0);
    expect(result.locationBlownOff).toBe(false);
    expect(result.headDestroyed).toBe(false);
    expect(result.unitDestroyed).toBe(false);
  });

  it('resolves 1 crit when roll is 8', () => {
    // Determination roll: 4+4=8 → 1 crit, then slot selection: 1 → first slot
    const roller = makeDiceRoller([4, 4, 1]);
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.hits.length).toBe(1);
    expect(result.unitDestroyed).toBe(false);
  });

  it('resolves 2 crits when roll is 10', () => {
    // Determination: 5+5=10 → 2 crits, slot selections: 1, 2
    const roller = makeDiceRoller([5, 5, 1, 2]);
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.hits.length).toBe(2);
  });

  it('resolves 3 crits on torso roll of 12', () => {
    // Determination: 6+6=12 on torso → 3 crits, slot selections: 1, 2, 3
    const roller = makeDiceRoller([6, 6, 1, 2, 3]);
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.hits.length).toBe(3);
  });

  it('blows off arm on roll of 12', () => {
    const roller = makeDiceRoller([6, 6]);
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'left_arm',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.locationBlownOff).toBe(true);
    // All 4 actuator slots should have been processed
    expect(result.hits.length).toBe(4);
    // All slots destroyed in manifest
    const updatedSlots = result.updatedManifest.left_arm;
    expect(updatedSlots.every((s) => s.destroyed)).toBe(true);
  });

  it('destroys head on roll of 12', () => {
    const roller = makeDiceRoller([6, 6]);
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'head',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.headDestroyed).toBe(true);
    expect(result.unitDestroyed).toBe(true);
    expect(result.destructionCause).toBe('pilot_death');

    const pilotEvent = result.events.find((e) => e.type === 'pilot_hit');
    expect(pilotEvent).toBeDefined();
    expect(pilotEvent!.payload.wounds).toBe(6);
  });

  it('uses forceCrits to override determination roll', () => {
    const roller = makeDiceRoller([1]); // Slot selection: first slot
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      2, // Force 2 crits
    );

    expect(result.hits.length).toBe(2);
  });

  it('stops early when all slots destroyed', () => {
    const manifest = buildCriticalSlotManifest({
      center_torso: [
        {
          slotIndex: 0,
          componentType: 'engine',
          componentName: 'Engine',
          destroyed: false,
        },
      ],
    });
    const roller = makeDiceRoller([1, 1, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      3, // Force 3 crits but only 1 slot available
    );

    expect(result.hits.length).toBe(1);
  });

  it('marks slots as destroyed in updated manifest', () => {
    const roller = makeDiceRoller([4, 4, 1]); // Roll 8 = 1 crit, select first slot
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    const destroyedCount = result.updatedManifest.center_torso.filter(
      (s) => s.destroyed,
    ).length;
    expect(destroyedCount).toBe(1);
  });

  it('engine destruction emits UnitDestroyed on 3rd hit', () => {
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, engineHits: 2 };
    const roller = makeDiceRoller([1]); // Select first slot (engine)
    const manifest = buildDefaultCriticalSlotManifest();
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      dmg,
      roller,
      1,
    );

    expect(result.unitDestroyed).toBe(true);
    expect(result.updatedComponentDamage.engineHits).toBe(3);
  });
});

describe('isFerroLamellorArmor', () => {
  it('returns true for FERRO_LAMELLOR armor type', () => {
    expect(isFerroLamellorArmor(ArmorTypeEnum.FERRO_LAMELLOR)).toBe(true);
  });

  it('returns false for STANDARD armor type', () => {
    expect(isFerroLamellorArmor(ArmorTypeEnum.STANDARD)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isFerroLamellorArmor(undefined)).toBe(false);
  });

  it('returns false for HARDENED armor type', () => {
    expect(isFerroLamellorArmor(ArmorTypeEnum.HARDENED)).toBe(false);
  });

  it('returns false for other armor types', () => {
    expect(isFerroLamellorArmor(ArmorTypeEnum.FERRO_FIBROUS_IS)).toBe(false);
    expect(isFerroLamellorArmor(ArmorTypeEnum.REACTIVE)).toBe(false);
    expect(isFerroLamellorArmor(ArmorTypeEnum.STEALTH)).toBe(false);
  });
});

describe('halveCritCount', () => {
  it('returns 0 for 0 crits', () => {
    expect(halveCritCount(0)).toBe(0);
  });

  it('returns 1 for 1 crit (minimum 1 rule)', () => {
    expect(halveCritCount(1)).toBe(1);
  });

  it('returns 1 for 2 crits', () => {
    expect(halveCritCount(2)).toBe(1);
  });

  it('returns 1 for 3 crits (floor(3/2)=1)', () => {
    expect(halveCritCount(3)).toBe(1);
  });

  it('returns 0 for negative input', () => {
    expect(halveCritCount(-1)).toBe(0);
  });
});
