import type { IMovementStep } from '@/types/gameplay';

export function movementStepUsesBackwardMovement(step: IMovementStep): boolean {
  if (step.kind === 'forward') {
    return step.direction === 'backward';
  }

  return (
    step.kind === 'lateral' &&
    (step.direction === 'left-backwards' ||
      step.direction === 'right-backwards')
  );
}

export function movementStepsUseBackwardMovement(
  steps: readonly IMovementStep[] | undefined,
): boolean {
  return steps?.some(movementStepUsesBackwardMovement) ?? false;
}

export function movementStepUsesMechanicalJumpBooster(
  step: IMovementStep,
): boolean {
  return step.kind === 'jump' && step.usesMechanicalJumpBooster === true;
}

export function movementStepsUseMechanicalJumpBooster(
  steps: readonly IMovementStep[] | undefined,
): boolean {
  return steps?.some(movementStepUsesMechanicalJumpBooster) ?? false;
}
