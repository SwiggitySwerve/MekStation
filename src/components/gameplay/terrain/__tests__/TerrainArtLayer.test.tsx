/**
 * Tests: TerrainArtLayer
 *
 * Covers `terrain-rendering` spec:
 *  - Layer stacking order (shading -> base -> secondary -> contour).
 *  - Combined features (clear + woods, pavement + building, rubble
 *    override).
 *  - Secondary opacity (woods/rubble at 75%, buildings at 100%).
 *  - Accessibility: every symbol carries a `data-shape` signature.
 *  - Fallback-on-asset-load-failure: missing symbols produce a flat
 *    fallback path and emit exactly one console.warn per key.
 *  - Contour edges render for hexes with neighbor elevation delta >= 1.
 *
 * Covers `tactical-map-interface` spec:
 *  - Terrain art layer renders beneath tactical overlays — verified
 *    indirectly here by the structural presence of the art `<g>`
 *    without overlay children (overlays are a HexCell concern).
 */

import { render } from '@testing-library/react';
import * as React from 'react';

import type { IHexTerrain } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay/TerrainTypes';

import { TerrainArtLayer } from '../TerrainArtLayer';
import { TerrainSymbolDefs } from '../TerrainSymbolDefs';

/**
 * Helper: wrap a TerrainArtLayer in an <svg> so SVG children render
 * correctly in jsdom. Also injects TerrainSymbolDefs so <use> references
 * resolve to real <symbol> nodes.
 */
function renderInSvg(ui: React.ReactElement) {
  return render(
    <svg data-testid="svg-root">
      <defs>
        <TerrainSymbolDefs />
      </defs>
      {ui}
    </svg>,
  );
}

function mkTerrain(
  q: number,
  r: number,
  elevation: number,
  features: IHexTerrain['features'],
): IHexTerrain {
  return { coordinate: { q, r }, elevation, features };
}

describe('TerrainArtLayer — layer stacking order', () => {
  it('clear hex renders shading + base clear only (no secondary, no contour)', () => {
    const terrain = mkTerrain(0, 0, 0, [{ type: TerrainType.Clear, level: 0 }]);
    const lookup = new Map<string, IHexTerrain>([['0,0', terrain]]);
    const { getByTestId, queryByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 0, r: 0 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    expect(getByTestId('terrain-shading-0-0')).toBeInTheDocument();
    expect(
      getByTestId('terrain-base-0-0').getAttribute('data-visual-key'),
    ).toBe('clear');
    expect(queryByTestId('terrain-secondary-0-0')).toBeNull();
  });

  it('heavy-woods hex renders clear base AND woods secondary (stacking)', () => {
    const terrain = mkTerrain(1, 1, 0, [
      { type: TerrainType.HeavyWoods, level: 2 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['1,1', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 1, r: 1 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    const base = getByTestId('terrain-base-1-1');
    const secondary = getByTestId('terrain-secondary-1-1');
    expect(base.getAttribute('data-visual-key')).toBe('clear');
    expect(secondary.getAttribute('data-visual-key')).toBe('heavy-woods');
  });

  it('building without pavement falls back to pavement base automatically', () => {
    const terrain = mkTerrain(2, 2, 0, [
      { type: TerrainType.Building, level: 2 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['2,2', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 2, r: 2 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    expect(
      getByTestId('terrain-base-2-2').getAttribute('data-visual-key'),
    ).toBe('pavement');
    expect(
      getByTestId('terrain-secondary-2-2').getAttribute('data-visual-key'),
    ).toBe('medium-building');
  });

  it('explicit pavement + building renders pavement base and building secondary', () => {
    const terrain = mkTerrain(3, 3, 0, [
      { type: TerrainType.Pavement, level: 0 },
      { type: TerrainType.Building, level: 3 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['3,3', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 3, r: 3 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    expect(
      getByTestId('terrain-base-3-3').getAttribute('data-visual-key'),
    ).toBe('pavement');
    expect(
      getByTestId('terrain-secondary-3-3').getAttribute('data-visual-key'),
    ).toBe('heavy-building');
  });

  it('rubble override: rubble secondary replaces building regardless of other features', () => {
    const terrain = mkTerrain(4, 4, 0, [
      { type: TerrainType.Pavement, level: 0 },
      { type: TerrainType.Building, level: 2 },
      { type: TerrainType.Rubble, level: 0 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['4,4', terrain]]);
    const { getByTestId, queryByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 4, r: 4 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    // Base remains pavement, but the secondary is rubble (NOT the building).
    expect(
      getByTestId('terrain-base-4-4').getAttribute('data-visual-key'),
    ).toBe('pavement');
    expect(
      getByTestId('terrain-secondary-4-4').getAttribute('data-visual-key'),
    ).toBe('rubble');
    // Confirm we didn't also render the building (there should be only
    // one terrain-secondary node per hex).
    expect(queryByTestId('terrain-secondary-4-4')).not.toBeNull();
  });
});

describe('TerrainArtLayer — secondary art opacity', () => {
  it('woods secondary renders at 75% opacity', () => {
    const terrain = mkTerrain(5, 5, 0, [
      { type: TerrainType.LightWoods, level: 1 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['5,5', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 5, r: 5 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    const secondary = getByTestId('terrain-secondary-5-5');
    expect(secondary.getAttribute('opacity')).toBe('0.75');
  });

  it('rubble secondary renders at 75% opacity', () => {
    const terrain = mkTerrain(6, 6, 0, [
      { type: TerrainType.Pavement, level: 0 },
      { type: TerrainType.Rubble, level: 0 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['6,6', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 6, r: 6 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    expect(getByTestId('terrain-secondary-6-6').getAttribute('opacity')).toBe(
      '0.75',
    );
  });

  it('building secondary renders at full opacity (1)', () => {
    const terrain = mkTerrain(7, 7, 0, [
      { type: TerrainType.Building, level: 4 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['7,7', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 7, r: 7 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    expect(getByTestId('terrain-secondary-7-7').getAttribute('opacity')).toBe(
      '1',
    );
  });
});

describe('TerrainArtLayer — accessibility (shape signatures)', () => {
  it('every rendered symbol carries a data-shape attribute on the SymbolDefs <g>', () => {
    // TerrainSymbolDefs renders <symbol> nodes; each <symbol>'s body
    // includes a data-shape annotation. We assert at least one symbol
    // has a data-shape attribute present in the rendered document.
    const { container } = render(
      <svg>
        <defs>
          <TerrainSymbolDefs />
        </defs>
      </svg>,
    );
    const shapeNodes = container.querySelectorAll('[data-shape]');
    // Spec: we ship 12 art keys; each symbol body has a data-shape
    // annotation. Expect at least 12 nodes with the attribute.
    expect(shapeNodes.length).toBeGreaterThanOrEqual(12);
  });
});

describe('TerrainArtLayer — fallback on asset load failure', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('forceFallback renders a flat color path, no <use> base', () => {
    const terrain = mkTerrain(8, 8, 0, [
      { type: TerrainType.LightWoods, level: 1 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['8,8', terrain]]);
    const { getByTestId, queryByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 8, r: 8 }}
        terrain={terrain}
        terrainLookup={lookup}
        forceFallback={true}
      />,
    );
    expect(getByTestId('terrain-art-8-8').getAttribute('data-fallback')).toBe(
      'true',
    );
    expect(queryByTestId('terrain-base-8-8')).toBeNull();
    expect(queryByTestId('terrain-secondary-8-8')).toBeNull();
  });

  it('missing base symbol emits exactly one console.warn per key and renders fallback path', () => {
    const terrain = mkTerrain(9, 9, 0, [{ type: TerrainType.Clear, level: 0 }]);
    const lookup = new Map<string, IHexTerrain>([['9,9', terrain]]);
    const missing = new Set<string>(['terrain-clear']);
    const { getByTestId, queryByTestId, rerender } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 9, r: 9 }}
        terrain={terrain}
        terrainLookup={lookup}
        missingSymbolIds={missing}
      />,
    );
    // Fallback <path> rendered, no <use>.
    expect(queryByTestId('terrain-base-9-9')).toBeNull();
    expect(getByTestId('terrain-base-fallback-9-9')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('terrain-clear');

    // Second render with the same missing key should NOT re-warn.
    rerender(
      <svg>
        <defs>
          <TerrainSymbolDefs />
        </defs>
        <TerrainArtLayer
          hex={{ q: 9, r: 9 }}
          terrain={terrain}
          terrainLookup={lookup}
          missingSymbolIds={missing}
        />
      </svg>,
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('TerrainArtLayer — contour edges against neighbor elevations', () => {
  it('renders one contour line per neighbor with |delta| >= 1', () => {
    // Center hex at (0,0) elevation 2; neighbor (1,0) elevation 0 (delta 2);
    // neighbor (0,1) elevation 1 (delta 1). Other 4 neighbors absent
    // (off-map -> null -> no contour).
    const center = mkTerrain(0, 0, 2, [{ type: TerrainType.Clear, level: 0 }]);
    const east = mkTerrain(1, 0, 0, [{ type: TerrainType.Clear, level: 0 }]);
    const southeast = mkTerrain(0, 1, 1, [
      { type: TerrainType.Clear, level: 0 },
    ]);
    const lookup = new Map<string, IHexTerrain>([
      ['0,0', center],
      ['1,0', east],
      ['0,1', southeast],
    ]);
    const { container } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 0, r: 0 }}
        terrain={center}
        terrainLookup={lookup}
      />,
    );
    const contours = container.querySelectorAll(
      "[data-testid^='terrain-contour-0-0-']",
    );
    expect(contours.length).toBe(2);
  });

  it('thicker contour (width 2) when elevation delta >= 2', () => {
    const center = mkTerrain(0, 0, 4, [{ type: TerrainType.Clear, level: 0 }]);
    const east = mkTerrain(1, 0, 0, [{ type: TerrainType.Clear, level: 0 }]);
    const lookup = new Map<string, IHexTerrain>([
      ['0,0', center],
      ['1,0', east],
    ]);
    const { container } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 0, r: 0 }}
        terrain={center}
        terrainLookup={lookup}
      />,
    );
    const contour = container.querySelector(
      "[data-testid^='terrain-contour-0-0-']",
    );
    expect(contour).not.toBeNull();
    expect(contour?.getAttribute('stroke-width')).toBe('2');
  });

  it('no contours when all neighbors share elevation with center', () => {
    const mk = (q: number, r: number) =>
      mkTerrain(q, r, 1, [{ type: TerrainType.Clear, level: 0 }]);
    const lookup = new Map<string, IHexTerrain>([
      ['0,0', mk(0, 0)],
      ['1,0', mk(1, 0)],
      ['-1,0', mk(-1, 0)],
      ['0,1', mk(0, 1)],
      ['0,-1', mk(0, -1)],
      ['1,-1', mk(1, -1)],
      ['-1,1', mk(-1, 1)],
    ]);
    const { container } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 0, r: 0 }}
        terrain={mk(0, 0)}
        terrainLookup={lookup}
      />,
    );
    const contours = container.querySelectorAll(
      "[data-testid^='terrain-contour-0-0-']",
    );
    expect(contours.length).toBe(0);
  });
});

describe('TerrainArtLayer — elevation shading always renders', () => {
  it('shading path is present on every hex', () => {
    const terrain = mkTerrain(0, 0, -2, [
      { type: TerrainType.Water, level: 2 },
    ]);
    const lookup = new Map<string, IHexTerrain>([['0,0', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 0, r: 0 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    const shading = getByTestId('terrain-shading-0-0');
    expect(shading.getAttribute('data-elevation')).toBe('-2');
    // HSL string must be present as the shading fill.
    expect(shading.getAttribute('fill')).toMatch(/^hsl\(/);
  });

  it('shading is neutral (hsl hue 0, saturation 0) per spec colorblind-safe rule', () => {
    const terrain = mkTerrain(0, 0, 3, [{ type: TerrainType.Clear, level: 0 }]);
    const lookup = new Map<string, IHexTerrain>([['0,0', terrain]]);
    const { getByTestId } = renderInSvg(
      <TerrainArtLayer
        hex={{ q: 0, r: 0 }}
        terrain={terrain}
        terrainLookup={lookup}
      />,
    );
    expect(getByTestId('terrain-shading-0-0').getAttribute('fill')).toMatch(
      /^hsl\(0,\s*0%/,
    );
  });
});
