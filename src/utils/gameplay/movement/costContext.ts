import type {
  IMovementCapability,
  MovementTerrainProfile,
  IMovementWaterCapability,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

export interface IMovementCostContext {
  readonly declaredMovementType?: MovementType;
  readonly isFirstStep?: boolean;
  readonly movementTerrainProfile?: MovementTerrainProfile;
  readonly unitHeight?: number;
  readonly waterCapability?: IMovementWaterCapability;
}

export function movementCostContextForCapability(
  movementType: MovementType,
  capability: IMovementCapability,
  stepContext: Pick<IMovementCostContext, 'isFirstStep'> = {},
): IMovementCostContext {
  return {
    declaredMovementType: movementType,
    ...(stepContext.isFirstStep !== undefined
      ? { isFirstStep: stepContext.isFirstStep }
      : {}),
    ...(capability.movementTerrainProfile
      ? { movementTerrainProfile: capability.movementTerrainProfile }
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
