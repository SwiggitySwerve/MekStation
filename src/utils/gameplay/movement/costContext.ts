import type {
  IMovementCapability,
  MovementPavementRoadBonusProfile,
  MovementTerrainProfile,
  IMovementWaterCapability,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

export interface IMovementCostContext {
  readonly declaredMovementType?: MovementType;
  readonly isFirstStep?: boolean;
  readonly movementTerrainProfile?: MovementTerrainProfile;
  readonly pavementRoadBonusProfile?: MovementPavementRoadBonusProfile;
  readonly optionalRules?: readonly string[] | undefined;
  readonly unitHeight?: number;
  readonly waterCapability?: IMovementWaterCapability;
}

export function movementCostContextForCapability(
  movementType: MovementType,
  capability: IMovementCapability,
  stepContext: Pick<IMovementCostContext, 'isFirstStep' | 'optionalRules'> = {},
): IMovementCostContext {
  return {
    declaredMovementType: movementType,
    ...(stepContext.isFirstStep !== undefined
      ? { isFirstStep: stepContext.isFirstStep }
      : {}),
    ...(capability.movementTerrainProfile
      ? { movementTerrainProfile: capability.movementTerrainProfile }
      : {}),
    ...(capability.pavementRoadBonusProfile
      ? { pavementRoadBonusProfile: capability.pavementRoadBonusProfile }
      : {}),
    ...(stepContext.optionalRules !== undefined
      ? { optionalRules: stepContext.optionalRules }
      : {}),
    ...(capability.unitHeight !== undefined
      ? { unitHeight: capability.unitHeight }
      : {}),
    waterCapability: capability.waterCapability,
  };
}

export function movementCostContextForStep(
  context: IMovementCostContext,
  isFirstStep: boolean,
): IMovementCostContext {
  if (context.isFirstStep === isFirstStep) return context;
  return { ...context, isFirstStep };
}
