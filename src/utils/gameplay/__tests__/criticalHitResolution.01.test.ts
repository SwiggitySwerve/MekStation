import {
  ActuatorType,
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  rollCriticalHits,
  selectCriticalSlot,
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
  applyCriticalHitEffect,
} from './criticalHitResolution.test-helpers';

describe('rollCriticalHits', () => {
  it('returns 0 crits for roll 2-7', () => {
    for (let total = 2; total <= 7; total++) {
      const die1 = 1;
      const die2 = total - 1;
      const roller = makeDiceRoller([die1, die2]);
      const result = rollCriticalHits('center_torso', roller);
      expect(result.criticalHits).toBe(0);
      expect(result.limbBlownOff).toBe(false);
      expect(result.headDestroyed).toBe(false);
    }
  });

  it('returns 1 crit for roll 8-9', () => {
    for (const total of [8, 9]) {
      const die1 = total - 5;
      const die2 = 5;
      const roller = makeDiceRoller([die1, die2]);
      const result = rollCriticalHits('center_torso', roller);
      expect(result.criticalHits).toBe(1);
    }
  });

  it('applies glancing critical-hit-table modifiers before counting crits', () => {
    const roller = makeDiceRoller([4, 5]);
    const result = rollCriticalHits('center_torso', roller, -2);

    expect(result.roll.total).toBe(9);
    expect(result.criticalHits).toBe(0);
    expect(result.limbBlownOff).toBe(false);
    expect(result.headDestroyed).toBe(false);
  });

  it('returns 2 crits for roll 10-11', () => {
    for (const total of [10, 11]) {
      const die1 = total - 5;
      const die2 = 5;
      const roller = makeDiceRoller([die1, die2]);
      const result = rollCriticalHits('center_torso', roller);
      expect(result.criticalHits).toBe(2);
    }
  });

  it('returns 3 crits for roll 12 on torso', () => {
    const roller = makeDiceRoller([6, 6]);
    const result = rollCriticalHits('center_torso', roller);
    expect(result.criticalHits).toBe(3);
    expect(result.limbBlownOff).toBe(false);
    expect(result.headDestroyed).toBe(false);
  });

  it('returns 3 crits for roll 12 on side torso', () => {
    const roller = makeDiceRoller([6, 6]);
    const resultL = rollCriticalHits('left_torso', roller);
    expect(resultL.criticalHits).toBe(3);

    const roller2 = makeDiceRoller([6, 6]);
    const resultR = rollCriticalHits('right_torso', roller2);
    expect(resultR.criticalHits).toBe(3);
  });

  it('blows off limb on roll 12 on arm', () => {
    const roller = makeDiceRoller([6, 6]);
    const result = rollCriticalHits('left_arm', roller);
    expect(result.limbBlownOff).toBe(true);
    expect(result.criticalHits).toBe(0);
  });

  it('blows off limb on roll 12 on leg', () => {
    const roller = makeDiceRoller([6, 6]);
    const result = rollCriticalHits('right_leg', roller);
    expect(result.limbBlownOff).toBe(true);
  });

  it('destroys head on roll 12 on head', () => {
    const roller = makeDiceRoller([6, 6]);
    const result = rollCriticalHits('head', roller);
    expect(result.headDestroyed).toBe(true);
    expect(result.criticalHits).toBe(0);
  });
});

describe('selectCriticalSlot', () => {
  it('selects from available non-destroyed slots', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const roller = makeDiceRoller([1]);
    const slot = selectCriticalSlot(manifest, 'center_torso', roller);
    expect(slot).not.toBeNull();
    expect(slot!.destroyed).toBe(false);
  });

  it('returns null if all slots destroyed', () => {
    const manifest = buildCriticalSlotManifest({
      center_torso: [
        {
          slotIndex: 0,
          componentType: 'engine',
          componentName: 'Engine',
          destroyed: true,
        },
      ],
    });
    const roller = makeDiceRoller([1]);
    const slot = selectCriticalSlot(manifest, 'center_torso', roller);
    expect(slot).toBeNull();
  });

  it('skips source missing and breached slots during critical selection', () => {
    const manifest = buildCriticalSlotManifest({
      right_arm: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Claw',
          destroyed: false,
          missing: true,
        },
        {
          slotIndex: 1,
          componentType: 'equipment',
          componentName: 'Talons',
          destroyed: false,
          breached: true,
        },
        {
          slotIndex: 2,
          componentType: 'actuator',
          componentName: ActuatorType.SHOULDER,
          destroyed: false,
          actuatorType: ActuatorType.SHOULDER,
        },
      ],
    });
    const roller = makeDiceRoller([1]);
    const slot = selectCriticalSlot(manifest, 'right_arm', roller);

    expect(slot).toMatchObject({
      slotIndex: 2,
      componentName: ActuatorType.SHOULDER,
    });
  });

  it('returns null for location with no slots', () => {
    const manifest = buildCriticalSlotManifest({});
    const roller = makeDiceRoller([1]);
    const slot = selectCriticalSlot(manifest, 'center_torso_rear', roller);
    expect(slot).not.toBeNull(); // Rear normalizes to front, which has slots
  });

  it('normalizes rear locations', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const roller = makeDiceRoller([1]);
    const slot = selectCriticalSlot(manifest, 'center_torso_rear', roller);
    expect(slot).not.toBeNull();
    expect(slot!.componentType).toBe('engine');
  });

  it('uses dice roller for random selection', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // CT has 7 slots (3 engine + 4 gyro). Roll 1 → index 0, Roll 4 → index 3
    const roller1 = makeDiceRoller([1]);
    const slot1 = selectCriticalSlot(manifest, 'center_torso', roller1);

    const roller4 = makeDiceRoller([4]);
    const slot4 = selectCriticalSlot(manifest, 'center_torso', roller4);

    expect(slot1!.slotIndex).not.toBe(slot4!.slotIndex);
  });
});

describe('buildDefaultCriticalSlotManifest', () => {
  const manifest = buildDefaultCriticalSlotManifest();

  it('has all 8 standard locations', () => {
    expect(Object.keys(manifest)).toEqual(
      expect.arrayContaining([
        'head',
        'center_torso',
        'left_torso',
        'right_torso',
        'left_arm',
        'right_arm',
        'left_leg',
        'right_leg',
      ]),
    );
  });

  it('head has cockpit, sensors, life support', () => {
    const head = manifest.head;
    const types = head.map((s) => s.componentType);
    expect(types).toContain('cockpit');
    expect(types).toContain('sensor');
    expect(types).toContain('life_support');
  });

  it('center torso has engine and gyro', () => {
    const ct = manifest.center_torso;
    const types = ct.map((s) => s.componentType);
    expect(types).toContain('engine');
    expect(types).toContain('gyro');
  });

  it('arms have 4 actuators each', () => {
    for (const arm of ['left_arm', 'right_arm']) {
      const slots = manifest[arm];
      expect(slots.length).toBe(4);
      expect(slots.every((s) => s.componentType === 'actuator')).toBe(true);
    }
  });

  it('legs have 4 actuators each', () => {
    for (const leg of ['left_leg', 'right_leg']) {
      const slots = manifest[leg];
      expect(slots.length).toBe(4);
      expect(slots.every((s) => s.componentType === 'actuator')).toBe(true);
    }
  });

  it('arm actuators are shoulder, upper arm, lower arm, hand', () => {
    const la = manifest.left_arm;
    expect(la[0].actuatorType).toBe(ActuatorType.SHOULDER);
    expect(la[1].actuatorType).toBe(ActuatorType.UPPER_ARM);
    expect(la[2].actuatorType).toBe(ActuatorType.LOWER_ARM);
    expect(la[3].actuatorType).toBe(ActuatorType.HAND);
  });

  it('leg actuators are hip, upper leg, lower leg, foot', () => {
    const ll = manifest.left_leg;
    expect(ll[0].actuatorType).toBe(ActuatorType.HIP);
    expect(ll[1].actuatorType).toBe(ActuatorType.UPPER_LEG);
    expect(ll[2].actuatorType).toBe(ActuatorType.LOWER_LEG);
    expect(ll[3].actuatorType).toBe(ActuatorType.FOOT);
  });
});

describe('engine critical effects', () => {
  it('first engine hit increments engineHits and adds +5 heat', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const engineSlot = manifest.center_torso[0]; // Engine slot
    const result = applyCriticalHitEffect(
      engineSlot,
      'unit-1',
      'center_torso',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.updatedComponentDamage.engineHits).toBe(1);
    expect(result.effect.type).toBe(CriticalEffectType.EngineHit);
    expect(result.effect.heatAdded).toBe(5);
  });

  it('second engine hit sets engineHits to 2', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const engineSlot = manifest.center_torso[0];
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, engineHits: 1 };
    const result = applyCriticalHitEffect(
      engineSlot,
      'unit-1',
      'center_torso',
      dmg,
    );

    expect(result.updatedComponentDamage.engineHits).toBe(2);
  });

  it('third engine hit destroys unit', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const engineSlot = manifest.center_torso[0];
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, engineHits: 2 };
    const result = applyCriticalHitEffect(
      engineSlot,
      'unit-1',
      'center_torso',
      dmg,
    );

    expect(result.updatedComponentDamage.engineHits).toBe(3);
    const destroyEvent = result.events.find((e) => e.type === 'unit_destroyed');
    expect(destroyEvent).toBeDefined();
  });
});

describe('gyro critical effects', () => {
  it('first gyro hit triggers immediate PSR with +3 modifier', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const gyroSlot = manifest.center_torso[3]; // First gyro slot
    const result = applyCriticalHitEffect(
      gyroSlot,
      'unit-1',
      'center_torso',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.updatedComponentDamage.gyroHits).toBe(1);
    expect(result.effect.type).toBe(CriticalEffectType.GyroHit);

    const psrEvent = result.events.find((e) => e.type === 'psr_triggered');
    expect(psrEvent).toBeDefined();
    expect(psrEvent!.payload.additionalModifier).toBe(3);
  });

  it('second gyro hit triggers PSR with +6 modifier and cannot stand', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const gyroSlot = manifest.center_torso[3];
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, gyroHits: 1 };
    const result = applyCriticalHitEffect(
      gyroSlot,
      'unit-1',
      'center_torso',
      dmg,
    );

    expect(result.updatedComponentDamage.gyroHits).toBe(2);
    expect(result.effect.movementPenalty).toBe(999); // Cannot stand
    const psrEvent = result.events.find((e) => e.type === 'psr_triggered');
    expect(psrEvent!.payload.additionalModifier).toBe(6);
  });
});
