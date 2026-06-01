import type { MapProjectionMode } from '@/types/gameplay';

type IsometricCameraDirection = 'left' | 'right';

type ProjectionModeControlAttributes = {
  readonly 'data-map-projection-source': 'shared-tactical-map-projection';
  readonly 'data-map-projection-channel': 'view-mode';
  readonly 'data-map-projection-rules-surface': 'presentation';
  readonly 'data-map-projection-current-mode': MapProjectionMode;
  readonly 'data-map-projection-target-mode': MapProjectionMode;
  readonly 'data-map-projection-isometric-rotation-step': number;
  readonly 'data-map-projection-isometric-rotation-degrees': number;
};

type IsometricCameraControlAttributes = {
  readonly 'data-isometric-camera-source': 'shared-tactical-map-projection';
  readonly 'data-isometric-camera-channel': 'isometric-camera';
  readonly 'data-isometric-camera-rules-surface': 'presentation';
  readonly 'data-isometric-camera-action': 'rotate-left' | 'rotate-right';
  readonly 'data-isometric-camera-current-step': number;
  readonly 'data-isometric-camera-next-step': number;
  readonly 'data-isometric-camera-current-degrees': number;
  readonly 'data-isometric-camera-next-degrees': number;
};

type IsometricSvgCameraControlAttributes = {
  readonly 'data-isometric-keyboard-camera-source'?:
    | 'shared-tactical-map-projection'
    | undefined;
  readonly 'data-isometric-keyboard-camera-channel'?:
    | 'isometric-camera'
    | undefined;
  readonly 'data-isometric-keyboard-camera-rules-surface'?:
    | 'presentation'
    | undefined;
  readonly 'data-isometric-keyboard-camera-controls'?:
    | 'q:rotate-left|e:rotate-right'
    | undefined;
  readonly 'data-isometric-pointer-camera-source'?:
    | 'shared-tactical-map-projection'
    | undefined;
  readonly 'data-isometric-pointer-camera-channel'?:
    | 'isometric-camera'
    | undefined;
  readonly 'data-isometric-pointer-camera-rules-surface'?:
    | 'presentation'
    | undefined;
  readonly 'data-isometric-pointer-camera-controls'?:
    | 'mouse-pan|touch-pan|pinch-zoom|touch-rotate|touch-rotate-buttons'
    | undefined;
};

export function formatIsometricRotationDegrees(rotationStep: number): number {
  return rotationStep * 60;
}

function normalizeIsometricRotationStep(rotationStep: number): number {
  return ((rotationStep % 6) + 6) % 6;
}

function nextIsometricRotationStep(
  rotationStep: number,
  direction: IsometricCameraDirection,
): number {
  return normalizeIsometricRotationStep(
    rotationStep + (direction === 'right' ? 1 : -1),
  );
}

function formatProjectionModeLabel(mode: MapProjectionMode): string {
  return mode === 'topDown' ? 'top-down' : 'isometric 2.5D';
}

export function projectionModeControlAttributes({
  currentMode,
  targetMode,
  rotationStep,
}: {
  readonly currentMode: MapProjectionMode;
  readonly targetMode: MapProjectionMode;
  readonly rotationStep: number;
}): ProjectionModeControlAttributes {
  return {
    'data-map-projection-source': 'shared-tactical-map-projection',
    'data-map-projection-channel': 'view-mode',
    'data-map-projection-rules-surface': 'presentation',
    'data-map-projection-current-mode': currentMode,
    'data-map-projection-target-mode': targetMode,
    'data-map-projection-isometric-rotation-step': rotationStep,
    'data-map-projection-isometric-rotation-degrees':
      formatIsometricRotationDegrees(rotationStep),
  };
}

export function formatProjectionModeControlLabel(
  currentMode: MapProjectionMode,
  targetMode: MapProjectionMode,
): string {
  return [
    `Switch to ${formatProjectionModeLabel(targetMode)} view`,
    `current ${formatProjectionModeLabel(currentMode)}`,
    `target ${formatProjectionModeLabel(targetMode)}`,
    'projection channel view-mode',
    'rules surface presentation',
  ].join('; ');
}

export function isometricCameraControlAttributes(
  rotationStep: number,
  direction: IsometricCameraDirection,
): IsometricCameraControlAttributes {
  const nextStep = nextIsometricRotationStep(rotationStep, direction);
  return {
    'data-isometric-camera-source': 'shared-tactical-map-projection',
    'data-isometric-camera-channel': 'isometric-camera',
    'data-isometric-camera-rules-surface': 'presentation',
    'data-isometric-camera-action': `rotate-${direction}`,
    'data-isometric-camera-current-step': rotationStep,
    'data-isometric-camera-next-step': nextStep,
    'data-isometric-camera-current-degrees':
      formatIsometricRotationDegrees(rotationStep),
    'data-isometric-camera-next-degrees':
      formatIsometricRotationDegrees(nextStep),
  };
}

export function isometricSvgCameraControlAttributes(
  isIsometricView: boolean,
): IsometricSvgCameraControlAttributes {
  if (!isIsometricView) return {};

  return {
    'data-isometric-keyboard-camera-source': 'shared-tactical-map-projection',
    'data-isometric-keyboard-camera-channel': 'isometric-camera',
    'data-isometric-keyboard-camera-rules-surface': 'presentation',
    'data-isometric-keyboard-camera-controls': 'q:rotate-left|e:rotate-right',
    'data-isometric-pointer-camera-source': 'shared-tactical-map-projection',
    'data-isometric-pointer-camera-channel': 'isometric-camera',
    'data-isometric-pointer-camera-rules-surface': 'presentation',
    'data-isometric-pointer-camera-controls':
      'mouse-pan|touch-pan|pinch-zoom|touch-rotate|touch-rotate-buttons',
  };
}

export function formatIsometricCameraControlLabel(
  direction: IsometricCameraDirection,
  rotationStep: number,
): string {
  const nextStep = nextIsometricRotationStep(rotationStep, direction);
  return [
    `Rotate isometric camera ${direction}`,
    `current heading ${formatIsometricRotationDegrees(rotationStep)} degrees`,
    `next heading ${formatIsometricRotationDegrees(nextStep)} degrees`,
    'projection channel isometric-camera',
    'rules surface presentation',
  ].join('; ');
}
