import { fireEvent, renderHook } from '@testing-library/react';

import type { CameraControls } from '../useCameraControls';

import { useGameplayHotkeys } from '../useGameplayHotkeys';

function makeCamera(): CameraControls {
  return {
    zoom: 1,
    pan: { x: 0, y: 0 },
    panBy: jest.fn(),
    panByHex: jest.fn(),
    zoomTo: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    centerOn: jest.fn(),
    prefersReducedMotion: false,
  };
}

function renderHotkeys(
  overrides: Partial<Parameters<typeof useGameplayHotkeys>[0]> = {},
) {
  const camera = makeCamera();
  const callbacks = {
    onToggleMinimap: jest.fn(),
    onToggleArcs: jest.fn(),
    onToggleLOS: jest.fn(),
    onToggleHelp: jest.fn(),
    onEscape: jest.fn(),
  };

  renderHook(() =>
    useGameplayHotkeys({
      camera,
      selectedUnitHex: { q: 2, r: -1 },
      modalOpen: false,
      ...callbacks,
      ...overrides,
    }),
  );

  return { camera, callbacks };
}

describe('useGameplayHotkeys', () => {
  it('keeps lowercase a as pan-left and uppercase A as firing-arcs toggle', () => {
    const { camera, callbacks } = renderHotkeys();

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'A' });

    expect(camera.panByHex).toHaveBeenCalledWith('left');
    expect(camera.panByHex).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleArcs).toHaveBeenCalledTimes(1);
  });

  it('suppresses gameplay keys while modalOpen but still handles Escape and help', () => {
    const { camera, callbacks } = renderHotkeys({ modalOpen: true });

    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: '?' });

    expect(callbacks.onToggleMinimap).not.toHaveBeenCalled();
    expect(camera.panByHex).not.toHaveBeenCalled();
    expect(callbacks.onEscape).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleHelp).toHaveBeenCalledTimes(1);
  });

  it('does not steal keystrokes from form controls', () => {
    const { camera, callbacks } = renderHotkeys();
    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: 'A' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    expect(callbacks.onToggleArcs).not.toHaveBeenCalled();
    expect(camera.panByHex).not.toHaveBeenCalled();

    input.remove();
  });

  it('recenters on Space only when a selected unit hex exists', () => {
    const { camera } = renderHotkeys({ selectedUnitHex: { q: 3, r: 4 } });

    fireEvent.keyDown(window, { key: ' ' });

    expect(camera.centerOn).toHaveBeenCalledWith({ q: 3, r: 4 });
  });
});
