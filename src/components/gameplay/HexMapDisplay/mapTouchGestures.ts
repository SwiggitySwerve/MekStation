import type { MapIsometricRotationStep } from '@/types/gameplay';

const ISOMETRIC_TOUCH_ROTATION_STEP_DEGREES = 60;

type TouchPoint = Pick<Touch, 'clientX' | 'clientY'>;

export function touchDistance(t1: TouchPoint, t2: TouchPoint): number {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function touchAngleDegrees(t1: TouchPoint, t2: TouchPoint): number {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function isometricRotationStepForTouchGesture(
  startStep: MapIsometricRotationStep,
  startAngle: number,
  currentAngle: number,
): MapIsometricRotationStep {
  const delta = signedAngleDeltaDegrees(currentAngle, startAngle);
  const rawSteps = delta / ISOMETRIC_TOUCH_ROTATION_STEP_DEGREES;
  const rotationDelta =
    rawSteps < 0 ? -Math.round(Math.abs(rawSteps)) : Math.round(rawSteps);
  return normalizeRotationStep(startStep + rotationDelta);
}

function normalizeRotationStep(step: number): MapIsometricRotationStep {
  return (((step % 6) + 6) % 6) as MapIsometricRotationStep;
}

function signedAngleDeltaDegrees(current: number, start: number): number {
  return ((current - start + 540) % 360) - 180;
}
