/**
 * Camera projection + handler identity tests for `useMapInteraction`.
 *
 * Audit 2026-06-09 G cluster (remediation W5.1a):
 *
 *  - `centerOn` must route the target hex through the SAME projection
 *    transform the render layer uses (rotate-before-shear, per the
 *    W2.6 / C-15 fix in `getMapProjectionTransform`). Previously it
 *    centered on the unprojected top-down pixel, so double-click
 *    focus / minimap centering landed the viewport off-target at any
 *    isometric rotation step.
 *
 *  - The camera action handlers must keep stable identities across
 *    pan/zoom state changes. Identity churn re-fired downstream
 *    effects (lens applicator, hotkey re-attach) and defeated the
 *    HexCell memo chain on every camera event.
 */

import { act, renderHook } from '@testing-library/react';

import { hexToPixel } from '@/constants/hexMap';

import { projectMapPoint } from '../projection';
import { useMapInteraction } from '../useMapInteraction';

/**
 * Mount the hook with a patched SVG rect so zoom/center math that
 * reads getBoundingClientRect executes (jsdom returns 0x0 rects).
 */
function setupInteraction(
  radius: number,
  mode: 'topDown' | 'isometric2d' = 'topDown',
  size = 800,
) {
  const result = renderHook(() => useMapInteraction(radius, mode));
  if (!result.result.current.svgRef.current) {
    const fakeSvg = {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: size,
        height: size,
        right: size,
        bottom: size,
        toJSON: () => ({}),
      }),
    } as unknown as SVGSVGElement;
    (
      result.result.current.svgRef as React.MutableRefObject<SVGSVGElement>
    ).current = fakeSvg;
  }
  return result;
}

describe('projectMapPoint (canonical layer-transform math)', () => {
  it('returns the input unchanged in top-down mode', () => {
    expect(projectMapPoint({ x: 123, y: -45 }, 'topDown', 2)).toEqual({
      x: 123,
      y: -45,
    });
  });

  it('applies the shear matrix(1 0 0.28 0.72) at rotation step 0', () => {
    // matrix(1 0 0.28 0.72 0 0): x' = x + 0.28y, y' = 0.72y.
    const projected = projectMapPoint({ x: 100, y: 50 }, 'isometric2d', 0);
    expect(projected.x).toBeCloseTo(114, 5);
    expect(projected.y).toBeCloseTo(36, 5);
  });

  it('rotates BEFORE shearing at rotation step 2 (120°)', () => {
    // rotate(120°): (100, 0) -> (-50, 86.6025…); then shear:
    // x' = -50 + 0.28 * 86.6025 = -25.7513, y' = 0.72 * 86.6025 = 62.3538.
    const projected = projectMapPoint({ x: 100, y: 0 }, 'isometric2d', 2);
    expect(projected.x).toBeCloseTo(-25.75129, 4);
    expect(projected.y).toBeCloseTo(62.35383, 4);
  });
});

describe('centerOn projection routing (audit G: isometric centering)', () => {
  it('centers on the raw hex pixel in top-down mode', () => {
    const { result } = setupInteraction(7);
    act(() => {
      result.current.centerOn(
        { q: 2, r: -1 },
        { animate: false, bumpLowZoom: false },
      );
    });
    const world = hexToPixel(2, -1);
    expect(result.current.pan.x).toBeCloseTo(-world.x * result.current.zoom, 3);
    expect(result.current.pan.y).toBeCloseTo(-world.y * result.current.zoom, 3);
  });

  it('centers on the PROJECTED hex position at isometric rotation step 2', () => {
    const { result } = setupInteraction(7, 'isometric2d');
    act(() => {
      result.current.setIsometricRotationStep(2);
    });
    act(() => {
      result.current.centerOn(
        { q: 2, r: -1 },
        { animate: false, bumpLowZoom: false },
      );
    });

    const world = hexToPixel(2, -1);
    const projected = projectMapPoint(world, 'isometric2d', 2);

    // Sanity: at step 2 the projected point genuinely differs from the
    // raw pixel, so the assertion below cannot pass by accident.
    expect(
      Math.hypot(projected.x - world.x, projected.y - world.y),
    ).toBeGreaterThan(1);

    expect(result.current.pan.x).toBeCloseTo(
      -projected.x * result.current.zoom,
      3,
    );
    expect(result.current.pan.y).toBeCloseTo(
      -projected.y * result.current.zoom,
      3,
    );
  });
});

describe('camera handler identity stability (audit G: interaction churn)', () => {
  it('keeps action/handler identities stable across pan and zoom changes', () => {
    const { result } = setupInteraction(7);
    const first = {
      panBy: result.current.panBy,
      zoomTo: result.current.zoomTo,
      centerOn: result.current.centerOn,
      handleWheel: result.current.handleWheel,
      handleMouseDown: result.current.handleMouseDown,
      handleMouseMove: result.current.handleMouseMove,
      handleTouchStart: result.current.handleTouchStart,
      handleTouchMove: result.current.handleTouchMove,
      handleKeyDown: result.current.handleKeyDown,
    };

    act(() => {
      result.current.panBy(25, 40);
    });
    act(() => {
      result.current.zoomTo(1.4);
    });

    // Camera values updated…
    expect(result.current.zoom).toBeCloseTo(1.4, 5);
    expect(result.current.pan.x).not.toBe(0);

    // …but the function surface kept its identity, so consumers that
    // key effects on these functions do not churn per camera event.
    expect(result.current.panBy).toBe(first.panBy);
    expect(result.current.zoomTo).toBe(first.zoomTo);
    expect(result.current.centerOn).toBe(first.centerOn);
    expect(result.current.handleWheel).toBe(first.handleWheel);
    expect(result.current.handleMouseDown).toBe(first.handleMouseDown);
    expect(result.current.handleMouseMove).toBe(first.handleMouseMove);
    expect(result.current.handleTouchStart).toBe(first.handleTouchStart);
    expect(result.current.handleTouchMove).toBe(first.handleTouchMove);
    expect(result.current.handleKeyDown).toBe(first.handleKeyDown);
  });
});
