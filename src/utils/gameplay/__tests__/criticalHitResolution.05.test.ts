import {
  ArmorTypeEnum,
  ActuatorType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
  resolveCriticalHits,
  checkTACTrigger,
  processTAC,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './criticalHitResolution.test-helpers';

describe('Ferro-Lamellor armor crit damage halving', () => {
  it('FL armor: 2 crits halved to 1', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 5+5=10 → 2 crits, halved to 1. Slot selection: 1
    const roller = makeDiceRoller([5, 5, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.FERRO_LAMELLOR,
    );

    expect(result.hits.length).toBe(1);
  });

  it('FL armor: 1 crit stays at 1 (minimum rule)', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 4+4=8 → 1 crit, halved → max(floor(0.5),1) = 1. Slot: 1
    const roller = makeDiceRoller([4, 4, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.FERRO_LAMELLOR,
    );

    expect(result.hits.length).toBe(1);
  });

  it('FL armor: 3 crits (torso roll 12) halved to 1', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 6+6=12 on torso → 3 crits, halved to 1. Slot: 1
    const roller = makeDiceRoller([6, 6, 1]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.FERRO_LAMELLOR,
    );

    expect(result.hits.length).toBe(1);
  });

  it('FL armor: 0 crits remains 0 (no halving on zero)', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 1+3=4 → 0 crits
    const roller = makeDiceRoller([1, 3]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.FERRO_LAMELLOR,
    );

    expect(result.hits.length).toBe(0);
  });

  it('non-FL armor: damage unchanged', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 5+5=10 → 2 crits (no halving). Slot selections: 1, 2
    const roller = makeDiceRoller([5, 5, 1, 2]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.STANDARD,
    );

    expect(result.hits.length).toBe(2);
  });

  it('FL armor: forceCrits bypasses halving', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const roller = makeDiceRoller([1, 2]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      2,
      ArmorTypeEnum.FERRO_LAMELLOR,
    );

    expect(result.hits.length).toBe(2);
  });

  it('FL armor: limb blowoff on roll 12 is NOT affected', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 6+6=12 on arm → limb blown off (not halved)
    const roller = makeDiceRoller([6, 6]);
    const result = resolveCriticalHits(
      'unit-1',
      'left_arm',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.FERRO_LAMELLOR,
    );

    expect(result.locationBlownOff).toBe(true);
    expect(result.hits.length).toBe(4);
  });

  it('FL armor: head destruction on roll 12 is NOT affected', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 6+6=12 on head → head destroyed
    const roller = makeDiceRoller([6, 6]);
    const result = resolveCriticalHits(
      'unit-1',
      'head',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      undefined,
      ArmorTypeEnum.FERRO_LAMELLOR,
    );

    expect(result.headDestroyed).toBe(true);
    expect(result.unitDestroyed).toBe(true);
    expect(result.destructionCause).toBe('pilot_death');
  });

  it('FL armor: no armorType param behaves as standard (backward compat)', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Determination: 5+5=10 → 2 crits (no halving). Slot selections: 1, 2
    const roller = makeDiceRoller([5, 5, 1, 2]);
    const result = resolveCriticalHits(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.hits.length).toBe(2);
  });
});

describe('Through-Armor Critical', () => {
  describe('checkTACTrigger', () => {
    it('triggers on hit location roll of 2', () => {
      expect(checkTACTrigger(2, 'front')).toBe('center_torso');
    });

    it('does not trigger on other rolls', () => {
      for (let i = 3; i <= 12; i++) {
        expect(checkTACTrigger(i, 'front')).toBeNull();
      }
    });

    it('front/rear → center torso', () => {
      expect(checkTACTrigger(2, 'front')).toBe('center_torso');
      expect(checkTACTrigger(2, 'rear')).toBe('center_torso');
    });

    it('left → left torso', () => {
      expect(checkTACTrigger(2, 'left')).toBe('left_torso');
    });

    it('right → right torso', () => {
      expect(checkTACTrigger(2, 'right')).toBe('right_torso');
    });
  });

  describe('processTAC', () => {
    it('applies one critical on the TAC location', () => {
      const roller = makeDiceRoller([4, 4, 1]);
      const manifest = buildDefaultCriticalSlotManifest();
      const result = processTAC(
        'unit-1',
        'center_torso',
        manifest,
        DEFAULT_COMPONENT_DAMAGE,
        roller,
      );

      expect(result.hits.length).toBe(1);
    });

    it('forces one TAC crit instead of rolling critical determination', () => {
      const roller = makeDiceRoller([1, 3]);
      const manifest = buildDefaultCriticalSlotManifest();
      const result = processTAC(
        'unit-1',
        'center_torso',
        manifest,
        DEFAULT_COMPONENT_DAMAGE,
        roller,
      );

      expect(result.hits.length).toBe(1);
    });

    it('passes edge_when_explosion options through forced TAC critical selection', () => {
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
      const roller = makeDiceRoller([1, 1, 1, 2]);

      const result = processTAC(
        'unit-1',
        'right_torso',
        manifest,
        DEFAULT_COMPONENT_DAMAGE,
        roller,
        undefined,
        {
          pilotAbilities: ['edge_when_explosion'],
          edgePointsRemaining: 1,
          turn: 3,
          unitId: 'unit-1',
        },
      );

      expect(result.edgePointsRemaining).toBe(0);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].slot.componentType).toBe('heat_sink');
      expect(result.events).toContainEqual(
        expect.objectContaining({
          type: 'critical_hit_resolved',
          payload: expect.objectContaining({
            componentType: 'heat_sink',
            edgePointsRemaining: 0,
          }),
        }),
      );
    });
  });
});

describe('actuator helper functions', () => {
  describe('getActuatorToHitModifier', () => {
    it('returns correct modifiers for all 8 types', () => {
      expect(getActuatorToHitModifier(ActuatorType.SHOULDER)).toBe(4);
      expect(getActuatorToHitModifier(ActuatorType.UPPER_ARM)).toBe(1);
      expect(getActuatorToHitModifier(ActuatorType.LOWER_ARM)).toBe(1);
      expect(getActuatorToHitModifier(ActuatorType.HAND)).toBe(1);
      expect(getActuatorToHitModifier(ActuatorType.HIP)).toBe(0);
      expect(getActuatorToHitModifier(ActuatorType.UPPER_LEG)).toBe(2);
      expect(getActuatorToHitModifier(ActuatorType.LOWER_LEG)).toBe(2);
      expect(getActuatorToHitModifier(ActuatorType.FOOT)).toBe(1);
    });
  });

  describe('actuatorPreventsAttack', () => {
    it('shoulder prevents punch', () => {
      expect(actuatorPreventsAttack(ActuatorType.SHOULDER, 'punch')).toBe(true);
    });

    it('hip prevents kick', () => {
      expect(actuatorPreventsAttack(ActuatorType.HIP, 'kick')).toBe(true);
    });

    it('other actuators do not prevent attacks', () => {
      expect(actuatorPreventsAttack(ActuatorType.UPPER_ARM, 'punch')).toBe(
        false,
      );
      expect(actuatorPreventsAttack(ActuatorType.HAND, 'punch')).toBe(false);
      expect(actuatorPreventsAttack(ActuatorType.UPPER_LEG, 'kick')).toBe(
        false,
      );
      expect(actuatorPreventsAttack(ActuatorType.FOOT, 'kick')).toBe(false);
    });
  });

  describe('actuatorHalvesDamage', () => {
    it('upper/lower arm halve punch damage', () => {
      expect(actuatorHalvesDamage(ActuatorType.UPPER_ARM, 'punch')).toBe(true);
      expect(actuatorHalvesDamage(ActuatorType.LOWER_ARM, 'punch')).toBe(true);
    });

    it('upper/lower leg halve kick damage', () => {
      expect(actuatorHalvesDamage(ActuatorType.UPPER_LEG, 'kick')).toBe(true);
      expect(actuatorHalvesDamage(ActuatorType.LOWER_LEG, 'kick')).toBe(true);
    });

    it('shoulder and hand do not halve damage', () => {
      expect(actuatorHalvesDamage(ActuatorType.SHOULDER, 'punch')).toBe(false);
      expect(actuatorHalvesDamage(ActuatorType.HAND, 'punch')).toBe(false);
    });

    it('hip and foot do not halve damage', () => {
      expect(actuatorHalvesDamage(ActuatorType.HIP, 'kick')).toBe(false);
      expect(actuatorHalvesDamage(ActuatorType.FOOT, 'kick')).toBe(false);
    });
  });
});
