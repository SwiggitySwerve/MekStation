import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import type { ICombatRangeHex, IHexCoordinate } from '@/types/gameplay';

import { generateHexesInRadius } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { Facing } from '@/types/gameplay';
import { RangeBracket } from '@/types/gameplay/HexGridInterfaces';
import { CoverLevel } from '@/types/gameplay/TerrainTypes';
import { coordToKey, hexNeighbor } from '@/utils/gameplay/hexMath';
import { classifyFiringArcHexes } from '@/utils/overlays/arcClassifier';

import {
  FiringArcOverlay,
  areFiringArcOverlayPropsEqual,
  type FiringArcOverlayProps,
} from '../FiringArcOverlay';

const origin: IHexCoordinate = { q: 0, r: 0 };
const unit = {
  unitId: 'atlas',
  coord: origin,
  facing: Facing.North,
  prone: false,
};

const radiusOneHexes: readonly IHexCoordinate[] = [
  origin,
  hexNeighbor(origin, Facing.North),
  hexNeighbor(origin, Facing.Northeast),
  hexNeighbor(origin, Facing.Southeast),
  hexNeighbor(origin, Facing.South),
  hexNeighbor(origin, Facing.Southwest),
  hexNeighbor(origin, Facing.Northwest),
];

function createCombatProjection(
  hex: IHexCoordinate,
  overrides: Partial<ICombatRangeHex> = {},
): ICombatRangeHex {
  return {
    hex,
    distance: 1,
    rangeBracket: RangeBracket.Short,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: CoverLevel.None,
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['enemy'],
    obscuredTargetUnitIds: [],
    attackable: true,
    weaponIdsInRange: ['front-laser'],
    weaponIdsInArc: ['front-laser'],
    weaponIdsAvailable: ['front-laser'],
    weaponRangeOptions: [],
    availableWeaponImpacts: [],
    availableWeaponHeat: 3,
    availableWeaponDamage: 5,
    targetUnitIds: ['enemy'],
    validTargetUnitIds: ['enemy'],
    ...overrides,
  };
}

function projectionLookup(
  projections: readonly ICombatRangeHex[],
): ReadonlyMap<string, ICombatRangeHex> {
  return new Map(
    projections.map((projection) => [coordToKey(projection.hex), projection]),
  );
}

function renderOverlay(props: Partial<FiringArcOverlayProps> = {}) {
  return render(
    <svg>
      <FiringArcOverlay
        unit={unit}
        hexes={radiusOneHexes}
        maxRange={1}
        {...props}
      />
    </svg>,
  );
}

describe('FiringArcOverlay', () => {
  it('renders SVG-only arc shading with pointer events disabled and labels', () => {
    const { container } = renderOverlay();

    const overlay = screen.getByTestId('firing-arc-overlay');
    expect(overlay).toHaveAttribute('pointer-events', 'none');
    expect(overlay).toHaveAttribute('aria-label', 'Firing arc overlay');

    const frontHex = screen.getByTestId('firing-arc-hex-0,-1');
    expect(frontHex).toHaveAttribute('data-arc', 'front');
    expect(frontHex).toHaveAttribute('aria-label', 'Front arc at (0, -1)');

    const frontFill = screen.getByTestId('firing-arc-fill-0,-1');
    expect(frontFill).toHaveAttribute('fill', '#22c55e');
    expect(frontFill).toHaveAttribute('fill-opacity', '0.25');
    expect(
      screen.getByTestId('firing-arc-shape-front-0,-1'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('firing-arc-label-0,-1')).toHaveAttribute(
      'data-arc-label',
      'FRONT',
    );
    expect(screen.getByTestId('firing-arc-label-0,-1')).toHaveTextContent(
      'FRONT',
    );

    expect(container.querySelectorAll('title').length).toBeGreaterThan(0);
  });

  it('exposes shared combat projection context on shaded arc hexes', () => {
    const frontHex = hexNeighbor(origin, Facing.North);
    renderOverlay({
      combatProjectionLookup: projectionLookup([
        createCombatProjection(frontHex),
      ]),
    });

    const frontArcHex = screen.getByTestId('firing-arc-hex-0,-1');
    expect(frontArcHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Combat projection front arc; attackable; range short at 1 hex',
      ),
    );
    expect(frontArcHex).toHaveAttribute(
      'data-combat-projection-firing-arc',
      'front',
    );
    expect(frontArcHex).toHaveAttribute(
      'data-combat-projection-range-bracket',
      'short',
    );
    expect(frontArcHex).toHaveAttribute(
      'data-combat-projection-in-range',
      'true',
    );
    expect(frontArcHex).toHaveAttribute(
      'data-combat-projection-in-arc',
      'true',
    );
    expect(frontArcHex).toHaveAttribute(
      'data-combat-projection-attackable',
      'true',
    );
    expect(frontArcHex).toHaveAttribute(
      'data-combat-projection-target-ids',
      'enemy',
    );
    expect(frontArcHex).toHaveAttribute(
      'data-combat-projection-weapons-available',
      'front-laser',
    );
    expect(screen.getByTestId('firing-arc-fill-0,-1')).toHaveAttribute(
      'data-combat-projection-weapons-in-arc',
      'front-laser',
    );
  });

  it('renders side and rear style distinctions without shading the unit origin', () => {
    renderOverlay();

    expect(screen.queryByTestId('firing-arc-hex-0,0')).not.toBeInTheDocument();

    const rightSideHex = screen.getByTestId('firing-arc-hex-1,0');
    expect(rightSideHex).toHaveAttribute('data-arc', 'right-side');
    expect(screen.getByTestId('firing-arc-fill-1,0')).toHaveAttribute(
      'fill-opacity',
      '0.2',
    );
    expect(
      screen.getByTestId('firing-arc-shape-right-side-1,0'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('firing-arc-label-1,0')).toHaveTextContent(
      'R ARC',
    );

    const rearHex = screen.getByTestId('firing-arc-hex-0,1');
    expect(rearHex).toHaveAttribute('data-arc', 'rear');
    expect(screen.getByTestId('firing-arc-fill-0,1')).toHaveAttribute(
      'fill',
      '#f43f5e',
    );
    expect(screen.getByTestId('firing-arc-shape-rear-0,1')).toBeInTheDocument();
    expect(screen.getByTestId('firing-arc-label-0,1')).toHaveTextContent(
      'REAR',
    );
  });

  it('keeps out-of-range and hidden arcs unrendered', () => {
    renderOverlay({
      hexes: [...radiusOneHexes, { q: 0, r: -2 }],
      maxRange: 1,
      visibleArcs: ['rear'],
    });

    expect(screen.queryByTestId('firing-arc-hex-0,-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('firing-arc-hex-0,-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('firing-arc-hex-0,1')).toHaveAttribute(
      'data-arc',
      'rear',
    );
  });

  it.each([
    ['short', 3],
    ['medium', 6],
    ['long', 9],
  ])('includes hexes exactly at the %s range edge', (_band, range) => {
    renderOverlay({
      hexes: [origin, { q: 0, r: -range }, { q: 0, r: -(range + 1) }],
      maxRange: range,
    });

    expect(
      screen.getByTestId(`firing-arc-hex-0,-${range}`),
    ).toBeInTheDocument();
    expect(screen.queryByTestId(`firing-arc-hex-0,-${range + 1}`)).toBeNull();
  });

  it('bounds long-range wide-arc text labels while preserving shaded arc coverage', () => {
    const longRangeHexes = generateHexesInRadius(23);
    const expectedArcHexes = classifyFiringArcHexes(unit, longRangeHexes, {
      maxRange: 23,
      includeOrigin: false,
      visibleArcs: ['front'],
    }).filter((classification) => classification.arc !== 'out-of-arc');

    expect(expectedArcHexes.length).toBeGreaterThan(100);

    renderOverlay({
      hexes: longRangeHexes,
      maxRange: 23,
      visibleArcs: ['front'],
    });

    expect(screen.getAllByTestId(/^firing-arc-hex-/)).toHaveLength(
      expectedArcHexes.length,
    );
    expect(screen.getAllByTestId(/^firing-arc-fill-/)).toHaveLength(
      expectedArcHexes.length,
    );
    expect(screen.getAllByTestId(/^firing-arc-shape-/)).toHaveLength(
      expectedArcHexes.length,
    );
    expect(
      screen.getAllByTestId(/^firing-arc-label-/).length,
    ).toBeLessThanOrEqual(4);
  });

  it('suppresses arc text labels below the zoom threshold while preserving shaded coverage', () => {
    const longRangeHexes = generateHexesInRadius(18);
    const expectedArcHexes = classifyFiringArcHexes(unit, longRangeHexes, {
      maxRange: 18,
      includeOrigin: false,
      visibleArcs: ['front'],
    }).filter((classification) => classification.arc !== 'out-of-arc');

    renderOverlay({
      hexes: longRangeHexes,
      maxRange: 18,
      visibleArcs: ['front'],
      zoom: 0.5,
    });

    expect(screen.getAllByTestId(/^firing-arc-hex-/)).toHaveLength(
      expectedArcHexes.length,
    );
    expect(screen.getAllByTestId(/^firing-arc-fill-/)).toHaveLength(
      expectedArcHexes.length,
    );
    expect(screen.getAllByTestId(/^firing-arc-shape-/)).toHaveLength(
      expectedArcHexes.length,
    );
    expect(screen.queryAllByTestId(/^firing-arc-label-/)).toHaveLength(0);
  });

  it('exposes a memo comparator to avoid rerendering for semantically identical map props', () => {
    const previous: FiringArcOverlayProps = {
      unit,
      hexes: radiusOneHexes,
      maxRange: 1,
      enabled: true,
    };
    const next: FiringArcOverlayProps = {
      unit: { ...unit, coord: { ...unit.coord } },
      hexes: radiusOneHexes.map((hex) => ({ ...hex })),
      maxRange: 1,
      enabled: true,
    };

    expect(areFiringArcOverlayPropsEqual(previous, next)).toBe(true);
    expect(
      areFiringArcOverlayPropsEqual(previous, {
        ...next,
        unit: { ...unit, facing: Facing.South },
      }),
    ).toBe(false);

    const lookup = projectionLookup([
      createCombatProjection(hexNeighbor(origin, Facing.North)),
    ]);
    expect(
      areFiringArcOverlayPropsEqual(
        { ...previous, combatProjectionLookup: lookup },
        { ...next, combatProjectionLookup: lookup },
      ),
    ).toBe(true);
    expect(
      areFiringArcOverlayPropsEqual(
        { ...previous, combatProjectionLookup: lookup },
        { ...next, combatProjectionLookup: new Map(lookup) },
      ),
    ).toBe(false);
  });
});
