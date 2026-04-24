/**
 * Tests: contourEdges
 *
 * Covers `terrain-rendering` spec:
 *  - Contour line thickness scales with delta (delta 1 -> 1px,
 *    delta >= 2 -> 2px, delta 0 -> no contour).
 *  - Contour color adapts to contrast against the base hex lightness.
 */

import { contourSegmentsFor, elevationLookup } from '../contourEdges';

describe('contourEdges — line thickness scales with delta', () => {
  const center = { x: 100, y: 100 };
  const ownElev = 2;

  it('delta 0 between neighbors produces no contour', () => {
    const segments = contourSegmentsFor(center, ownElev, [2, 2, 2, 2, 2, 2]);
    expect(segments).toHaveLength(0);
  });

  it('delta 1 produces a 1px line', () => {
    const segments = contourSegmentsFor(center, ownElev, [
      3,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].width).toBe(1);
  });

  it('delta 2 produces a 2px line', () => {
    const segments = contourSegmentsFor(center, ownElev, [
      4,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].width).toBe(2);
  });

  it('delta >= 2 caps at 2px (delta 5 is still 2px)', () => {
    const segments = contourSegmentsFor(center, -3, [
      5,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(segments[0].width).toBe(2);
  });

  it('off-map neighbors (null elevation) produce no contour', () => {
    const segments = contourSegmentsFor(center, ownElev, [
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(segments).toHaveLength(0);
  });

  it('produces one segment per neighbor whose delta is >= 1', () => {
    // Three neighbors differ, three are equal. Expect 3 segments.
    const segments = contourSegmentsFor(center, ownElev, [
      3, // +1 -> contour
      2, // equal -> no contour
      0, // -2 -> contour (width 2)
      2, // equal
      4, // +2 -> contour (width 2)
      2, // equal
    ]);
    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.edgeIndex).sort()).toEqual([0, 2, 4]);
  });
});

describe('contourEdges — contrast color picks against own hex shading', () => {
  it('dark hex (negative elevation) gets a light ink color', () => {
    const segs = contourSegmentsFor({ x: 0, y: 0 }, -3, [0, 0, 0, 0, 0, 0]);
    expect(segs[0].color).toBe('#f8fafc');
  });

  it('light hex (positive elevation) gets a dark ink color', () => {
    const segs = contourSegmentsFor({ x: 0, y: 0 }, 3, [0, 0, 0, 0, 0, 0]);
    expect(segs[0].color).toBe('#0f172a');
  });
});

describe('contourEdges — elevationLookup', () => {
  it('returns elevation when the coord is in the map', () => {
    const lookup = new Map([
      ['1,2', { elevation: 3 }],
      ['4,5', { elevation: -1 }],
    ]);
    expect(elevationLookup({ q: 1, r: 2 }, lookup)).toBe(3);
    expect(elevationLookup({ q: 4, r: 5 }, lookup)).toBe(-1);
  });

  it('returns null for off-map coords', () => {
    const lookup = new Map([['1,2', { elevation: 3 }]]);
    expect(elevationLookup({ q: 9, r: 9 }, lookup)).toBeNull();
  });
});
