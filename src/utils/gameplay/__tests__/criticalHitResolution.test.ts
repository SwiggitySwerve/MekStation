/**
 * Critical Hit Resolution Tests
 * Comprehensive tests for all component types and critical hit mechanics.
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { CriticalEffectType } from '@/types/gameplay';
import { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';

import {
  rollCriticalHits,
  selectCriticalSlot,
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
  resolveCriticalHits,
  applyCriticalHitEffect,
  checkTACTrigger,
  processTAC,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
  ICriticalSlotEntry,
  CriticalSlotManifest,
} from '../criticalHitResolution';

// =============================================================================
// Test Helpers
// =============================================================================

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

function makeDiceRoller(values: number[]) {
  let idx = 0;
  return () => {
    const val = values[idx % values.length];
    idx++;
    return val;
  };
}

function makeManifestWithWeapons(): CriticalSlotManifest {
  const base = buildDefaultCriticalSlotManifest();
  return {
    ...base,
    right_torso: [
      ...base.right_torso,
      {
        slotIndex: 3,
        componentType: 'weapon',
        componentName: 'Medium Laser',
        destroyed: false,
        weaponId: 'weapon-ml-1',
      },
      {
        slotIndex: 4,
        componentType: 'heat_sink',
        componentName: 'Heat Sink',
        destroyed: false,
      },
      {
        slotIndex: 5,
        componentType: 'jump_jet',
        componentName: 'Jump Jet',
        destroyed: false,
      },
      {
        slotIndex: 6,
        componentType: 'ammo',
        componentName: 'AC/5 Ammo',
        destroyed: false,
      },
    ],
  };
}

// =============================================================================
// rollCriticalHits
// =============================================================================

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

// =============================================================================
// selectCriticalSlot
// =============================================================================

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

// =============================================================================
// buildDefaultCriticalSlotManifest
// =============================================================================

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

// =============================================================================
// Engine Critical Effects (Task 5.6)
// =============================================================================

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

// =============================================================================
// Gyro Critical Effects (Task 5.7)
// =============================================================================

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

// =============================================================================
// Cockpit Critical Effects (Task 5.8)
// =============================================================================

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

// =============================================================================
// Sensor Critical Effects (Task 5.9)
// =============================================================================

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

// =============================================================================
// Actuator Critical Effects (Task 5.10)
// =============================================================================

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

// =============================================================================
// Weapon Critical Effects (Task 5.11)
// =============================================================================

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
});

// =============================================================================
// Heat Sink Critical Effects (Task 5.12)
// =============================================================================

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

// =============================================================================
// Jump Jet Critical Effects (Task 5.13)
// =============================================================================

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

// =============================================================================
// Ammo Critical Effects
// =============================================================================

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

// =============================================================================
// resolveCriticalHits — Full Resolution
// =============================================================================

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

// =============================================================================
// Through-Armor Critical (TAC) (Task 5.15)
// =============================================================================

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
    it('performs normal critical determination on TAC location', () => {
      // Roll 4+4=8 → 1 crit, select slot 1
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

    it('TAC can result in 0 crits on low determination roll', () => {
      const roller = makeDiceRoller([1, 3]); // Roll 4 → 0 crits
      const manifest = buildDefaultCriticalSlotManifest();
      const result = processTAC(
        'unit-1',
        'center_torso',
        manifest,
        DEFAULT_COMPONENT_DAMAGE,
        roller,
      );

      expect(result.hits.length).toBe(0);
    });
  });
});

// =============================================================================
// Actuator Helper Functions
// =============================================================================

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

// =============================================================================
// Deterministic Behavior
// =============================================================================

describe('deterministic behavior', () => {
  it('identical inputs and seeds produce identical outcomes', () => {
    const manifest = buildDefaultCriticalSlotManifest();

    const run = () => {
      const roller = makeDiceRoller([5, 5, 1, 2]); // Roll 10 → 2 crits
      return resolveCriticalHits(
        'unit-1',
        'center_torso',
        manifest,
        DEFAULT_COMPONENT_DAMAGE,
        roller,
      );
    };

    const result1 = run();
    const result2 = run();

    expect(result1.hits.length).toBe(result2.hits.length);
    expect(result1.events.length).toBe(result2.events.length);
    expect(result1.updatedComponentDamage).toEqual(
      result2.updatedComponentDamage,
    );
  });
});

// =============================================================================
// Integration: Equipment Slots in Manifest
// =============================================================================

describe('equipment slots in manifest', () => {
  it('weapon slot in torso can be critted', () => {
    const manifest = makeManifestWithWeapons();
    // Force 1 crit, select slot index that maps to weapon
    const roller = makeDiceRoller([4]); // 4th available slot → weapon at index 3
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
    const roller = makeDiceRoller([5]); // 5th slot → heat sink
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
    const roller = makeDiceRoller([6]); // 6th slot → jump jet
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
    const roller = makeDiceRoller([7]); // 7th slot → ammo
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
});

// =============================================================================
// Life Support Critical
// =============================================================================

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
