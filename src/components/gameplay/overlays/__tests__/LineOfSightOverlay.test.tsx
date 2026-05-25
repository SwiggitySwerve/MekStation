import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { RangeBracket } from '@/types/gameplay/HexGridInterfaces';
import { CoverLevel, TerrainType } from '@/types/gameplay/TerrainTypes';
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

function createCombatProjection(
  overrides: Partial<ICombatRangeHex> = {},
): ICombatRangeHex {
  return {
    hex: target,
    distance: 2,
    rangeBracket: RangeBracket.Short,
    inRange: true,
    inArc: true,
    losState: 'blocked',
    lineOfSightBlockerReason: 'Blocked by building at (1, 0)',
    lineOfSightBlocker: {
      hex: { q: 1, r: 0 },
      kind: 'terrain',
      terrain: TerrainType.Building,
      reason: 'Blocked by building at (1, 0)',
    },
    targetCoverLevel: CoverLevel.None,
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['enemy'],
    obscuredTargetUnitIds: [],
    attackable: false,
    weaponIdsInRange: ['medium-laser'],
    weaponIdsInArc: ['medium-laser'],
    weaponIdsAvailable: [],
    weaponRangeOptions: [],
    availableWeaponImpacts: [],
    availableWeaponHeat: 0,
    availableWeaponDamage: 0,
    targetUnitIds: ['enemy'],
    validTargetUnitIds: [],
    attackInvalidReason: 'NoLineOfSight',
    attackInvalidDetails: 'Blocked by building at (1, 0)',
    blockedReason: 'Blocked by building at (1, 0)',
    ...overrides,
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
    expect(screen.getByTestId('los-state-badge')).toHaveAttribute(
      'data-state',
      'clear',
    );
    expect(screen.getByTestId('los-state-badge')).toHaveTextContent('LOS');
    expect(screen.getByTestId('los-state-badge')).toHaveAttribute(
      'aria-label',
      'Line of sight clear',
    );
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
    expect(screen.getByTestId('los-state-badge')).toHaveAttribute(
      'data-state',
      'partial',
    );
    expect(screen.getByTestId('los-state-badge')).toHaveTextContent('P-LOS');

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
      createHex(1, 0, TerrainType.Building, 1),
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
    expect(screen.getByTestId('los-state-badge')).toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('los-state-badge')).toHaveTextContent('NO LOS');

    const annotation = screen.getByTestId('los-annotation-wall-1,0');
    expect(annotation).toHaveAttribute('data-icon', 'wall');
    expect(annotation.querySelector('title')?.textContent).toContain(
      'Blocked by building',
    );
  });

  it('renders hovered LOS behind a wall as a red line ending at the wall', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Building, 1),
      createHex(2, 0),
    ]);
    const blockerPixel = hexToPixel({ q: 1, r: 0 });
    const targetPixel = hexToPixel(target);

    function HoverProbe(): ReactElement {
      const [hovered, setHovered] = useState<IHexCoordinate | null>(null);
      return (
        <svg>
          <g
            data-testid="hover-target"
            onMouseEnter={() => setHovered(target)}
            onMouseLeave={() => setHovered(null)}
          />
          <LineOfSightOverlay origin={origin} target={hovered} grid={grid} />
        </svg>
      );
    }

    render(<HoverProbe />);

    expect(screen.queryByTestId('los-line')).toBeNull();
    fireEvent.mouseEnter(screen.getByTestId('hover-target'));

    const line = screen.getByTestId('los-line');
    expect(line).toHaveAttribute('data-state', 'blocked');
    expect(line).toHaveAttribute('stroke', '#dc2626');
    expect(line).toHaveAttribute('x2', String(blockerPixel.x));
    expect(line).not.toHaveAttribute('x2', String(targetPixel.x));
    expect(screen.getByTestId('los-annotation-wall-1,0')).toBeInTheDocument();
  });

  it('exposes combat projection LOS evidence on the overlay, line, and badge', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Building, 1),
      createHex(2, 0),
    ]);
    const combatProjection = createCombatProjection();

    renderOverlay(grid, { combatProjection });

    const overlay = screen.getByTestId('line-of-sight-overlay');
    expect(overlay).toHaveAttribute(
      'data-combat-projection-los-state',
      'blocked',
    );
    expect(overlay).toHaveAttribute(
      'data-combat-projection-range-bracket',
      RangeBracket.Short,
    );
    expect(overlay).toHaveAttribute('data-combat-projection-distance', '2');
    expect(overlay).toHaveAttribute(
      'data-combat-projection-target-ids',
      'enemy',
    );
    expect(overlay).toHaveAttribute(
      'data-combat-projection-los-blocker-hex',
      '1,0',
    );
    expect(overlay).toHaveAttribute(
      'data-combat-projection-los-blocker-kind',
      'terrain',
    );
    expect(overlay).toHaveAttribute(
      'data-combat-projection-los-blocker-terrain',
      TerrainType.Building,
    );
    expect(overlay).toHaveAttribute(
      'data-combat-projection-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    expect(overlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Combat projection LOS blocked'),
    );
    expect(overlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining('targets enemy'),
    );

    const line = screen.getByTestId('los-line');
    expect(line).toHaveAttribute('data-combat-projection-los-state', 'blocked');
    expect(line).toHaveAttribute(
      'data-combat-projection-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );

    const badge = screen.getByTestId('los-state-badge');
    expect(badge).toHaveAttribute(
      'data-combat-projection-los-blocker-hex',
      '1,0',
    );
    expect(badge.querySelector('title')?.textContent).toContain(
      'Combat projection LOS blocked',
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

  it('fades the line and annotations in together via a single wrapper animation', () => {
    // Task 7.4: annotations fade in/out with the LOS line. Implemented as
    // a CSS keyframe on the wrapper <g> so the line + every blocker icon
    // share the same opacity transition.
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Building, 1),
      createHex(2, 0),
    ]);
    renderOverlay(grid);

    const overlay = screen.getByTestId('line-of-sight-overlay');
    const fadeMs = overlay.getAttribute('data-fade-duration-ms');
    expect(fadeMs).not.toBeNull();
    expect(Number(fadeMs)).toBeGreaterThan(0);

    // Sanity: the wrapper carries the animation; line + annotation are
    // descendants of that wrapper so they inherit the fade.
    expect(screen.getByTestId('los-line').closest('g')).toBe(overlay);
    expect(
      screen
        .getByTestId(/los-annotation-(wall|cover)-/)
        .closest('g[data-testid="line-of-sight-overlay"]'),
    ).toBe(overlay);
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
      combatProjection: createCombatProjection(),
    };
    const next: LineOfSightOverlayProps = {
      origin: { ...origin },
      target: { ...target },
      grid,
      enabled: true,
      combatProjection: previous.combatProjection,
    };

    expect(areLineOfSightOverlayPropsEqual(previous, next)).toBe(true);
    expect(
      areLineOfSightOverlayPropsEqual(previous, {
        ...next,
        target: { q: 3, r: 0 },
      }),
    ).toBe(false);
    expect(
      areLineOfSightOverlayPropsEqual(previous, {
        ...next,
        combatProjection: createCombatProjection({
          lineOfSightBlockerReason: 'Blocked by elevation +2 at (1, 0)',
        }),
      }),
    ).toBe(false);
  });
});
