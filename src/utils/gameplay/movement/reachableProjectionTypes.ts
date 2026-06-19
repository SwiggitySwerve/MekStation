import type {
  IEnvironmentalConditions,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { IStandUpRuleOptions } from '@/utils/gameplay/standUpRules';

export interface IMovementProjectionRuleOptions extends IStandUpRuleOptions {
  readonly environmentalConditions?: IEnvironmentalConditions;
}

export type StandUpProjection = Pick<
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

export type HullDownExitProjection = Pick<
  IMovementRangeHex,
  'hullDownExitRequired' | 'hullDownExitCost'
>;

export type ReservedProjectionApplier = (
  movementHex: IMovementRangeHex,
) => IMovementRangeHex;
