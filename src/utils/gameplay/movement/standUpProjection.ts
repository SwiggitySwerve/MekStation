import type {
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
} from '@/types/gameplay';

import { projectStandUpPsr } from '@/utils/gameplay/standUpRules';

import { getStandingCost } from './validation';

type StandUpProjection = Pick<
  IMovementRangeHex,
  | 'standUpRequired'
  | 'standUpCost'
  | 'standUpPsrRequired'
  | 'standUpPsrReason'
  | 'standUpPsrTargetNumber'
  | 'standUpPsrModifier'
  | 'standUpPsrModifierDetails'
  | 'standUpPsrImpossibleReason'
>;

export function deriveStandUpProjection(
  unit: IUnitGameState,
  capability: IMovementCapability,
): StandUpProjection {
  if (!unit.prone) return {};

  const psr = projectStandUpPsr({
    unitState: unit,
    unitPiloting: unit.piloting,
  });

  return {
    standUpRequired: true,
    standUpCost: getStandingCost(capability),
    standUpPsrRequired: true,
    standUpPsrReason: psr.reason,
    standUpPsrModifier: psr.modifier,
    standUpPsrModifierDetails: psr.modifierDetails,
    ...(psr.targetNumber === undefined
      ? {}
      : { standUpPsrTargetNumber: psr.targetNumber }),
    ...(psr.impossibleReason === undefined
      ? {}
      : { standUpPsrImpossibleReason: psr.impossibleReason }),
  };
}

export function withStandUpProjection(
  movementHex: IMovementRangeHex,
  standUpProjection: StandUpProjection,
): IMovementRangeHex {
  return standUpProjection.standUpRequired
    ? { ...movementHex, ...standUpProjection }
    : movementHex;
}
