/**
 * Running or sprinting with a damaged hip or gyro (C-1a).
 *
 * MegaMek 48fcb2f64 rolls once per move, after the whole path, for a unit that
 * can fall: `MovePathHandler.java` L1282-L1286 -> `Entity.checkRunningWithDamage`
 * (L9138-L9148) -> `TWRulesPSR.checkRunningWithDamage` (L62-L77). A heavy-duty
 * gyro ignores its first hit, a hip and a gyro together are still one roll,
 * and walking or jumping never rolls. An evade step counts as a run
 * (`MoveStep.java` L2257-L2260).
 *
 * @spec openspec/changes/close-combat-psr-parity-gaps/specs/piloting-skill-rolls/spec.md
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  MovementType,
  PSRTrigger,
  type IComponentDamageState,
  type IPendingPSR,
} from '@/types/gameplay';
import {
  planRunningWithDamagePSR,
  type IRunningDamageMover,
  type RunningDamageStep,
} from '@/utils/gameplay/movement/runningDamagePsr';

const NO_DAMAGE: IComponentDamageState = {
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

const THREE_FORWARD_STEPS: readonly RunningDamageStep[] = [
  { kind: 'forward', index: 0 },
  { kind: 'forward', index: 1 },
  { kind: 'forward', index: 2 },
];

function damage(
  overrides: Partial<IComponentDamageState> = {},
): IComponentDamageState {
  return { ...NO_DAMAGE, ...overrides };
}

function plan(
  unit: IRunningDamageMover | undefined,
  options: {
    readonly movementType?: MovementType;
    readonly steps?: readonly RunningDamageStep[];
  } = {},
): IPendingPSR | undefined {
  return planRunningWithDamagePSR({
    unitId: 'm1',
    unit,
    movementType: options.movementType ?? MovementType.Run,
    steps: options.steps ?? THREE_FORWARD_STEPS,
  });
}

describe('planRunningWithDamagePSR', () => {
  it('rolls nothing for an undamaged unit', () => {
    expect(plan({ componentDamage: damage() })).toBeUndefined();
    expect(plan(undefined)).toBeUndefined();
  });

  it('rolls once for a hip even when the path has several forward steps', () => {
    const psr = plan({
      componentDamage: damage({ actuators: { [ActuatorType.HIP]: true } }),
    });

    expect(psr).toMatchObject({
      entityId: 'm1',
      reasonCode: PSRTrigger.RunningDamagedHip,
      additionalModifier: 0,
      triggerSource: 'movement-step:2',
    });
  });

  it.each([MovementType.Run, MovementType.Sprint, MovementType.Evade])(
    'rolls for a damaged gyro on a %s move',
    (movementType) => {
      expect(
        plan({ componentDamage: damage({ gyroHits: 1 }) }, { movementType }),
      ).toMatchObject({ reasonCode: PSRTrigger.RunningDamagedGyro });
    },
  );

  it.each([MovementType.Walk, MovementType.Jump, MovementType.Stationary])(
    'never rolls on a %s move',
    (movementType) => {
      expect(
        plan(
          {
            componentDamage: damage({
              gyroHits: 1,
              actuators: { [ActuatorType.HIP]: true },
            }),
          },
          { movementType },
        ),
      ).toBeUndefined();
    },
  );

  it('rolls once, not twice, for a hip and a gyro together', () => {
    const psr = plan({
      componentDamage: damage({
        gyroHits: 1,
        actuators: { [ActuatorType.HIP]: true },
      }),
    });

    expect(psr).toBeDefined();
    expect(psr?.reasonCode).toBe(PSRTrigger.RunningDamagedGyro);
  });

  it('lets a heavy-duty gyro ignore its first hit but not its second', () => {
    expect(
      plan({
        gyroType: 'Heavy-Duty',
        componentDamage: damage({ gyroHits: 1 }),
      }),
    ).toBeUndefined();
    expect(
      plan({
        gyroType: 'Heavy-Duty',
        componentDamage: damage({ gyroHits: 2 }),
      }),
    ).toMatchObject({ reasonCode: PSRTrigger.RunningDamagedGyro });
    expect(
      plan({ gyroType: 'Standard', componentDamage: damage({ gyroHits: 1 }) }),
    ).toMatchObject({ reasonCode: PSRTrigger.RunningDamagedGyro });
  });

  it('still rolls for a hip on a heavy-duty gyro that ignored its only hit', () => {
    expect(
      plan({
        gyroType: 'Heavy-Duty',
        componentDamage: damage({
          gyroHits: 1,
          actuators: { [ActuatorType.HIP]: true },
        }),
      }),
    ).toMatchObject({ reasonCode: PSRTrigger.RunningDamagedHip });
  });

  it('never rolls for a unit that cannot fall', () => {
    const componentDamage = damage({
      gyroHits: 1,
      actuators: { [ActuatorType.HIP]: true },
    });

    expect(plan({ componentDamage, prone: true })).toBeUndefined();
    expect(plan({ componentDamage, unitType: 'Tank' })).toBeUndefined();
    expect(plan({ componentDamage, unitType: 'BattleMech' })).toBeDefined();
  });

  it('ignores a hip crit on a destroyed leg (Mek.legHasHipCrit)', () => {
    const componentDamage = damage({
      actuators: { [ActuatorType.HIP]: true },
      actuatorsByLocation: { left_leg: { [ActuatorType.HIP]: true } },
    });

    expect(
      plan({ componentDamage, destroyedLocations: ['left_leg'] }),
    ).toBeUndefined();
    expect(plan({ componentDamage, destroyedLocations: [] })).toMatchObject({
      reasonCode: PSRTrigger.RunningDamagedHip,
    });
    expect(
      plan({ componentDamage, destroyedLocations: ['right_leg'] }),
    ).toMatchObject({ reasonCode: PSRTrigger.RunningDamagedHip });
  });

  it('rolls when only the aggregate hip flag records the damage', () => {
    expect(
      plan({
        componentDamage: damage({ actuators: { [ActuatorType.HIP]: true } }),
        destroyedLocations: ['left_leg'],
      }),
    ).toMatchObject({ reasonCode: PSRTrigger.RunningDamagedHip });
  });

  it('rolls nothing when the path has no steps', () => {
    expect(
      plan({ componentDamage: damage({ gyroHits: 1 }) }, { steps: [] }),
    ).toBeUndefined();
  });
});
