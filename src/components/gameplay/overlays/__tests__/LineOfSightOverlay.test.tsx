import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';

import {
  LineOfSightOverlay,
  areLineOfSightOverlayPropsEqual,
  type LineOfSightOverlayProps,
} from '../LineOfSightOverlay';

const origin: IHexCoordinate = { q: 0, r: 0 };
const target: IHexCoordinate = { q: 2, r: 0 };

function createHex(
  q: number,
  r: number,
  terrain: TerrainType = TerrainType.Clear,
  elevation = 0,
): IHex {
  return {
    coord: { q, r },
    occupantId: null,
    terrain,
    elevation,
  };
}

function createGrid(hexes: readonly IHex[]): IHexGrid {
  const map = new Map<string, IHex>();
  for (const hex of hexes) {
    map.set(coordToKey(hex.coord), hex);
  }

  return {
    config: { radius: 10 },
    hexes: map,
  };
}

function renderOverlay(
  grid: IHexGrid,
  props: Partial<LineOfSightOverlayProps> = {},
) {
  return render(
    <svg>
      <LineOfSightOverlay
        origin={origin}
        target={target}
        grid={grid}
        {...props}
      />
    </svg>,
  );
}

describe('LineOfSightOverlay', () => {
  it('renders clear LOS as a solid green SVG line with pointer events disabled', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0),
      createHex(2, 0),
    ]);

    renderOverlay(grid);

    const overlay = screen.getByTestId('line-of-sight-overlay');
    expect(overlay).toHaveAttribute('pointer-events', 'none');
    expect(overlay).toHaveAttribute('aria-live', 'polite');
    expect(overlay).toHaveAttribute('aria-label', 'Line of sight clear');

    const line = screen.getByTestId('los-line');
    expect(line).toHaveAttribute('data-state', 'clear');
    expect(line).toHaveAttribute('stroke', '#16a34a');
    expect(line).toHaveAttribute('stroke-width', '2');
    expect(line).not.toHaveAttribute('stroke-dasharray');
  });

  it('renders partial cover as a dashed yellow line with a titled cover annotation', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.LightWoods),
      createHex(2, 0),
    ]);
    const { container } = renderOverlay(grid);

    const line = screen.getByTestId('los-line');
    expect(line).toHaveAttribute('data-state', 'partial');
    expect(line).toHaveAttribute('stroke', '#ca8a04');
    expect(line).toHaveAttribute('stroke-dasharray', '6,4');

    const annotation = screen.getByTestId('los-annotation-cover-1,0');
    expect(annotation).toHaveAttribute('data-icon', 'cover');
    expect(annotation).toHaveAttribute(
      'aria-label',
      'Partial cover through light woods at (1, 0)',
    );
    expect(container.querySelector('title')?.textContent).toContain(
      'Line of sight partial',
    );
    expect(annotation.querySelector('title')?.textContent).toContain(
      'Partial cover through light woods',
    );
  });

  it('renders blocked LOS as a solid red line ending at the first blocker', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Building),
      createHex(2, 0),
    ]);
    const blockerPixel = hexToPixel({ q: 1, r: 0 });
    const targetPixel = hexToPixel(target);

    renderOverlay(grid);

    const line = screen.getByTestId('los-line');
    expect(line).toHaveAttribute('data-state', 'blocked');
    expect(line).toHaveAttribute('stroke', '#dc2626');
    expect(line).not.toHaveAttribute('stroke-dasharray');
    expect(line).toHaveAttribute('x2', String(blockerPixel.x));
    expect(line).not.toHaveAttribute('x2', String(targetPixel.x));

    const annotation = screen.getByTestId('los-annotation-wall-1,0');
    expect(annotation).toHaveAttribute('data-icon', 'wall');
    expect(annotation.querySelector('title')?.textContent).toContain(
      'Blocked by building',
    );
  });

  it('renders an empty labelled group when origin, target, or grid is unavailable', () => {
    render(
      <svg>
        <LineOfSightOverlay origin={origin} target={null} grid={null} />
      </svg>,
    );

    const overlay = screen.getByTestId('line-of-sight-overlay');
    expect(overlay).toHaveAttribute('pointer-events', 'none');
    expect(overlay).toHaveAttribute('aria-label', 'Line of sight overlay');
    expect(screen.queryByTestId('los-line')).not.toBeInTheDocument();
  });

  it('exposes a memo comparator scoped to hover/origin/grid changes', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0),
      createHex(2, 0),
    ]);
    const previous: LineOfSightOverlayProps = {
      origin,
      target,
      grid,
      enabled: true,
    };
    const next: LineOfSightOverlayProps = {
      origin: { ...origin },
      target: { ...target },
      grid,
      enabled: true,
    };

    expect(areLineOfSightOverlayPropsEqual(previous, next)).toBe(true);
    expect(
      areLineOfSightOverlayPropsEqual(previous, {
        ...next,
        target: { q: 3, r: 0 },
      }),
    ).toBe(false);
  });
});
