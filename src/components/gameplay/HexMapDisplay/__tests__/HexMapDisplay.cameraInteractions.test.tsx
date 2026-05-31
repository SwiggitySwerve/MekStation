import { fireEvent, render, screen } from '@testing-library/react';

import type { MapInteractionState } from '../useMapInteraction';

import { HexMapDisplay } from '../HexMapDisplay';
import { isometricRotationStepForTouchGesture } from '../mapTouchGestures';

type MockTouch = Pick<Touch, 'clientX' | 'clientY'>;

function touch(clientX: number, clientY: number): MockTouch {
  return { clientX, clientY };
}

function renderCameraMap(): {
  readonly getInteraction: () => MapInteractionState;
} {
  let interaction: MapInteractionState | null = null;

  render(
    <HexMapDisplay
      mapId="camera-interaction-map"
      radius={2}
      tokens={[]}
      selectedHex={null}
      projectionMode="isometric2d"
      onInteractionReady={(nextInteraction) => {
        interaction = nextInteraction;
      }}
    />,
  );

  return {
    getInteraction: () => {
      if (!interaction) {
        throw new Error('Expected HexMapDisplay interaction state');
      }
      return interaction;
    },
  };
}

describe('HexMapDisplay camera interactions', () => {
  it('rounds touch twist deltas symmetrically to isometric camera headings', () => {
    expect(isometricRotationStepForTouchGesture(0, 0, 90)).toBe(2);
    expect(isometricRotationStepForTouchGesture(0, 0, -90)).toBe(4);
  });

  it('keeps pointer pan, touch pan, pinch zoom, and touch rotation on the shared isometric camera surface', () => {
    const { getInteraction } = renderCameraMap();
    const grid = screen.getByTestId('hex-grid');
    const projectionLayer = screen.getByTestId('map-projection-layer');

    expect(grid).toHaveAttribute(
      'data-isometric-pointer-camera-source',
      'shared-tactical-map-projection',
    );
    expect(grid).toHaveAttribute(
      'data-isometric-pointer-camera-channel',
      'isometric-camera',
    );
    expect(grid).toHaveAttribute(
      'data-isometric-pointer-camera-rules-surface',
      'presentation',
    );
    expect(grid).toHaveAttribute(
      'data-isometric-pointer-camera-controls',
      'mouse-pan|touch-pan|pinch-zoom|touch-rotate|touch-rotate-buttons',
    );

    fireEvent.mouseDown(grid, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(grid, { clientX: 138, clientY: 126 });
    fireEvent.mouseUp(grid);

    expect(getInteraction().pan).toEqual({ x: 38, y: 26 });

    fireEvent.touchStart(grid, { touches: [touch(80, 90)] });
    fireEvent.touchMove(grid, { touches: [touch(104, 118)] });
    fireEvent.touchEnd(grid);

    expect(getInteraction().pan).toEqual({ x: 62, y: 54 });

    fireEvent.touchStart(grid, {
      touches: [touch(100, 100), touch(200, 100)],
    });
    fireEvent.touchMove(grid, {
      touches: [touch(100, 100), touch(250, 100)],
    });

    expect(getInteraction().zoom).toBeCloseTo(1.5);

    fireEvent.touchStart(grid, {
      touches: [touch(100, 100), touch(200, 100)],
    });
    fireEvent.touchMove(grid, {
      touches: [touch(100, 100), touch(150, 187)],
    });

    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '1',
    );
    expect(getInteraction().isometricRotationStep).toBe(1);
  });
});
