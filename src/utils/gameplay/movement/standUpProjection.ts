import type {
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
  StandUpMode,
} from '@/types/gameplay';
import type { IStandUpRuleOptions } from '@/utils/gameplay/standUpRules';

import { projectStandUpPsr } from '@/utils/gameplay/standUpRules';

import { getStandingCost } from './validation';

type StandUpProjection = Pick<
  IMovementRangeHex,
  | 'standUpRequired'
  | 'standUpMode'
  | 'standUpCost'
  | 'standUpPsrRequired'
  | 'standUpPsrReason'
  | 'standUpPsrTargetNumber'
  | 'standUpPsrModifier'
  | 'standUpPsrModifierDetails'
  | 'standUpPsrImpossibleReason'
  | 'standUpPsrAutomaticSuccessReason'
>;

export function deriveStandUpProjection(
  unit: IUnitGameState,
  capability: IMovementCapability,
  standUpMode: StandUpMode = 'normal',
  ruleOptions: IStandUpRuleOptions = {},
): StandUpProjection {
  if (!unit.prone) return {};

  const psr = projectStandUpPsr({
    unitState: unit,
    unitPiloting: unit.piloting,
    movementCapability: capability,
    standUpMode,
    optionalRules: ruleOptions.optionalRules,
  });

  return {
    standUpRequired: true,
    standUpMode,
    standUpCost: getStandingCost(capability, standUpMode),
    standUpPsrRequired: psr.required,
    standUpPsrReason: psr.reason,
    standUpPsrModifier: psr.modifier,
    standUpPsrModifierDetails: psr.modifierDetails,
    ...(psr.targetNumber === undefined
      ? {}
      : { standUpPsrTargetNumber: psr.targetNumber }),
    ...(psr.impossibleReason === undefined
      ? {}
      : { standUpPsrImpossibleReason: psr.impossibleReason }),
    ...(psr.automaticSuccessReason === undefined
      ? {}
      : { standUpPsrAutomaticSuccessReason: psr.automaticSuccessReason }),
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
