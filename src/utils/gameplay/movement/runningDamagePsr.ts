import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  MovementType,
  type CombatLocation,
  type IComponentDamageState,
  type IPendingPSR,
} from '@/types/gameplay';
import {
  createRunningDamagedGyroPSR,
  createRunningDamagedHipPSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { isHeavyDutyGyro } from '../gyroRules';
import { canFall, type ITerrainPsrMover } from './terrainPsrTriggers';

export type RunningDamageStep = {
  readonly kind: string;
  readonly index: number;
};

/** The unit facts the running-with-damage roll reads, taken after the move. */
export interface IRunningDamageMover extends ITerrainPsrMover {
  readonly componentDamage?: IComponentDamageState;
  readonly gyroType?: string;
  readonly destroyedLocations?: readonly string[];
}

const LEG_LOCATIONS: readonly CombatLocation[] = ['left_leg', 'right_leg'];

/**
 * MegaMek 48fcb2f64 `TWRulesPSR.checkRunningWithDamage` (L62-L77) rolls for a
 * Run or Sprint move; `MoveStep.java` L2257-L2260 makes an evade step a run.
 */
function isRunningMove(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Run ||
    movementType === MovementType.Sprint ||
    movementType === MovementType.Evade
  );
}

/**
 * Gyro hits that count toward the roll: a heavy-duty gyro ignores its first
 * hit (`TWRulesPSR.java` L63-L65).
 */
function effectiveGyroDamage(unit: IRunningDamageMover): number {
  const hits = unit.componentDamage?.gyroHits ?? 0;
  return isHeavyDutyGyro(unit.gyroType) ? hits - 1 : hits;
}

/**
 * `Mek.hasHipCrit` (L1410-L1432): a hip crit on a leg that is not destroyed.
 * Where the hip damage carries no location only the aggregate flag is known.
 */
function hasHipCrit(unit: IRunningDamageMover): boolean {
  const damage = unit.componentDamage;
  const hipLegs = LEG_LOCATIONS.filter(
    (location) =>
      damage?.actuatorsByLocation?.[location]?.[ActuatorType.HIP] === true,
  );
  if (hipLegs.length > 0) {
    const destroyed = new Set(unit.destroyedLocations ?? []);
    return hipLegs.some((location) => !destroyed.has(location));
  }
  return damage?.actuators?.[ActuatorType.HIP] === true;
}

/**
 * The single producer of the running-with-damaged-hip-or-gyro roll. MegaMek
 * 48fcb2f64 makes one roll after the whole move (`MovePathHandler.java`
 * L1282-L1286, `doSkillCheckInPlace`), for a Run or Sprint by a unit that can
 * fall, when the gyro has taken damage that counts or a leg has a hip crit.
 * A hip and a gyro together are still one roll. The roll is stamped with the
 * last step of the path. MekStation keeps separate reason codes; the gyro is
 * tested first, as in the pin's condition (`TWRulesPSR.java` L69-L70).
 */
export function planRunningWithDamagePSR(options: {
  readonly unitId: string;
  readonly unit: IRunningDamageMover | undefined;
  readonly movementType: MovementType;
  readonly steps: readonly RunningDamageStep[];
}): IPendingPSR | undefined {
  const { movementType, steps, unit, unitId } = options;
  if (!unit || !isRunningMove(movementType) || !canFall(unit)) {
    return undefined;
  }
  const lastStep = steps[steps.length - 1];
  if (!lastStep) return undefined;

  if (effectiveGyroDamage(unit) > 0) {
    return createRunningDamagedGyroPSR(unitId, lastStep.index);
  }
  if (hasHipCrit(unit)) {
    return createRunningDamagedHipPSR(unitId, lastStep.index);
  }
  return undefined;
}
