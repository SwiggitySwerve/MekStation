import {
  ActuatorType,
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  buildDefaultCriticalSlotManifest,
  applyCriticalHitEffect,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './criticalHitResolution.test-helpers';

describe('cockpit critical effects', () => {
  it('cockpit hit kills pilot and destroys unit', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const cockpitSlot = manifest.head[2]; // Cockpit
    const result = applyCriticalHitEffect(
      cockpitSlot,
      'unit-1',
      'head',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.updatedComponentDamage.cockpitHit).toBe(true);
    expect(result.effect.type).toBe(CriticalEffectType.CockpitHit);

    const pilotEvent = result.events.find((e) => e.type === 'pilot_hit');
    expect(pilotEvent).toBeDefined();
    expect(pilotEvent!.payload.wounds).toBe(6);

    const destroyEvent = result.events.find((e) => e.type === 'unit_destroyed');
    expect(destroyEvent).toBeDefined();
    expect(destroyEvent!.payload.cause).toBe('pilot_death');
  });
});

describe('sensor critical effects', () => {
  it('first sensor hit sets sensorHits to 1', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const sensorSlot = manifest.head[1]; // Sensors
    const result = applyCriticalHitEffect(
      sensorSlot,
      'unit-1',
      'head',
      DEFAULT_COMPONENT_DAMAGE,
    );

    expect(result.updatedComponentDamage.sensorHits).toBe(1);
    expect(result.effect.type).toBe(CriticalEffectType.SensorHit);
  });

  it('second sensor hit sets sensorHits to 2', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const sensorSlot = manifest.head[1];
    const dmg = { ...DEFAULT_COMPONENT_DAMAGE, sensorHits: 1 };
    const result = applyCriticalHitEffect(sensorSlot, 'unit-1', 'head', dmg);

    expect(result.updatedComponentDamage.sensorHits).toBe(2);
  });
});

describe('actuator critical effects', () => {
  const manifest = buildDefaultCriticalSlotManifest();

  describe('arm actuators', () => {
    it('shoulder: +4 to-hit, prevents punching', () => {
      const shoulderSlot = manifest.left_arm[0];
      const result = applyCriticalHitEffect(
        shoulderSlot,
        'unit-1',
        'left_arm',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(result.effect.type).toBe(CriticalEffectType.ActuatorHit);
      expect(
        result.updatedComponentDamage.actuators[ActuatorType.SHOULDER],
      ).toBe(true);
      expect(getActuatorToHitModifier(ActuatorType.SHOULDER)).toBe(4);
      expect(actuatorPreventsAttack(ActuatorType.SHOULDER, 'punch')).toBe(true);
    });

    it('upper arm: +1 to-hit, halves punch damage', () => {
      const upperArmSlot = manifest.left_arm[1];
      const result = applyCriticalHitEffect(
        upperArmSlot,
        'unit-1',
        'left_arm',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(
        result.updatedComponentDamage.actuators[ActuatorType.UPPER_ARM],
      ).toBe(true);
      expect(getActuatorToHitModifier(ActuatorType.UPPER_ARM)).toBe(1);
      expect(actuatorHalvesDamage(ActuatorType.UPPER_ARM, 'punch')).toBe(true);
    });

    it('lower arm: +1 to-hit, halves punch damage', () => {
      const lowerArmSlot = manifest.left_arm[2];
      const result = applyCriticalHitEffect(
        lowerArmSlot,
        'unit-1',
        'left_arm',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(
        result.updatedComponentDamage.actuators[ActuatorType.LOWER_ARM],
      ).toBe(true);
      expect(getActuatorToHitModifier(ActuatorType.LOWER_ARM)).toBe(1);
      expect(actuatorHalvesDamage(ActuatorType.LOWER_ARM, 'punch')).toBe(true);
    });

    it('hand: +1 to-hit', () => {
      const handSlot = manifest.left_arm[3];
      const result = applyCriticalHitEffect(
        handSlot,
        'unit-1',
        'left_arm',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(result.updatedComponentDamage.actuators[ActuatorType.HAND]).toBe(
        true,
      );
      expect(getActuatorToHitModifier(ActuatorType.HAND)).toBe(1);
    });
  });

  describe('leg actuators', () => {
    it('hip: prevents kicking, triggers PSR', () => {
      const hipSlot = manifest.left_leg[0];
      const result = applyCriticalHitEffect(
        hipSlot,
        'unit-1',
        'left_leg',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(result.updatedComponentDamage.actuators[ActuatorType.HIP]).toBe(
        true,
      );
      expect(actuatorPreventsAttack(ActuatorType.HIP, 'kick')).toBe(true);

      const psrEvent = result.events.find((e) => e.type === 'psr_triggered');
      expect(psrEvent).toBeDefined();
    });

    it('upper leg: +2 kick to-hit, halves kick damage, triggers PSR', () => {
      const upperLegSlot = manifest.left_leg[1];
      const result = applyCriticalHitEffect(
        upperLegSlot,
        'unit-1',
        'left_leg',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(
        result.updatedComponentDamage.actuators[ActuatorType.UPPER_LEG],
      ).toBe(true);
      expect(
        result.updatedComponentDamage.actuatorsByLocation?.left_leg?.[
          ActuatorType.UPPER_LEG
        ],
      ).toBe(true);
      expect(getActuatorToHitModifier(ActuatorType.UPPER_LEG)).toBe(2);
      expect(actuatorHalvesDamage(ActuatorType.UPPER_LEG, 'kick')).toBe(true);

      const psrEvent = result.events.find((e) => e.type === 'psr_triggered');
      expect(psrEvent).toBeDefined();
    });

    it('lower leg: +2 kick to-hit, halves kick damage, triggers PSR', () => {
      const lowerLegSlot = manifest.left_leg[2];
      const result = applyCriticalHitEffect(
        lowerLegSlot,
        'unit-1',
        'left_leg',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(
        result.updatedComponentDamage.actuators[ActuatorType.LOWER_LEG],
      ).toBe(true);
      expect(getActuatorToHitModifier(ActuatorType.LOWER_LEG)).toBe(2);
      expect(actuatorHalvesDamage(ActuatorType.LOWER_LEG, 'kick')).toBe(true);

      const psrEvent = result.events.find((e) => e.type === 'psr_triggered');
      expect(psrEvent).toBeDefined();
    });

    it('foot: +1 kick to-hit, +1 PSR terrain, triggers PSR', () => {
      const footSlot = manifest.left_leg[3];
      const result = applyCriticalHitEffect(
        footSlot,
        'unit-1',
        'left_leg',
        DEFAULT_COMPONENT_DAMAGE,
      );

      expect(result.updatedComponentDamage.actuators[ActuatorType.FOOT]).toBe(
        true,
      );
      expect(getActuatorToHitModifier(ActuatorType.FOOT)).toBe(1);

      const psrEvent = result.events.find((e) => e.type === 'psr_triggered');
      expect(psrEvent).toBeDefined();
    });
  });
});
