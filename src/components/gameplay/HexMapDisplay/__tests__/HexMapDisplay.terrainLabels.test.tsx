import { act, fireEvent, render, screen } from '@testing-library/react';

import type {
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
  MapProjectionMode,
} from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameSide,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';

import {
  formatElevationLabel,
  formatTerrainFeatureReferenceLabel,
  formatTerrainLabel,
  terrainFeatureLevelsAttribute,
} from '../HexCell.labels';
import { HexMapDisplay } from '../HexMapDisplay';
import {
  FOCUS_BUMP_ZOOM,
  type MapInteractionState,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../useMapInteraction';

const TERRAIN_COORDS: readonly IHexCoordinate[] = [
  { q: 0, r: -2 },
  { q: 1, r: -2 },
  { q: 2, r: -2 },
  { q: -1, r: -1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 2, r: -1 },
  { q: -2, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },
  { q: -2, r: 1 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 1, r: 1 },
  { q: -2, r: 2 },
  { q: -1, r: 2 },
  { q: 0, r: 2 },
  { q: 1, r: 2 },
];

const TERRAIN_BADGE_BY_TYPE = {
  [TerrainType.Clear]: 'CLR',
  [TerrainType.Pavement]: 'PAV',
  [TerrainType.Road]: 'RD',
  [TerrainType.LightWoods]: 'LWD',
  [TerrainType.HeavyWoods]: 'HWD',
  [TerrainType.Rough]: 'RGH',
  [TerrainType.Rubble]: 'RBL',
  [TerrainType.Water]: 'WTR',
  [TerrainType.Sand]: 'SND',
  [TerrainType.Mud]: 'MUD',
  [TerrainType.Snow]: 'SNW',
  [TerrainType.Ice]: 'ICE',
  [TerrainType.Swamp]: 'SWP',
  [TerrainType.HeavyIndustrial]: 'IND',
  [TerrainType.PlantedField]: 'PLT',
  [TerrainType.Building]: 'BLDG',
  [TerrainType.Bridge]: 'BRG',
  [TerrainType.Mines]: 'MIN',
  [TerrainType.Fire]: 'FIR',
  [TerrainType.Smoke]: 'SMK',
} satisfies Record<TerrainType, string>;

function terrainFeatureLevel(type: TerrainType): number {
  return type === TerrainType.Clear ? 0 : 1;
}

function buildTerrainMatrix(): readonly IHexTerrain[] {
  return Object.values(TerrainType).map((type, index) => ({
    coordinate: TERRAIN_COORDS[index],
    elevation: (index % 7) - 3,
    features: [{ type, level: terrainFeatureLevel(type) }],
  }));
}

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 2, medium: 4, long: 6 },
    ...overrides,
  };
}

function assertTerrainElevationProjectionMetadata(
  badge: HTMLElement,
  terrain: IHexTerrain,
): void {
  expect(badge).toHaveAttribute(
    'data-tactical-projection-source',
    'shared-tactical-map-projection',
  );
  expect(badge).toHaveAttribute(
    'data-tactical-projection-channel',
    'terrain-elevation',
  );
  expect(badge).toHaveAttribute(
    'data-tactical-rules-surface',
    'terrain-elevation',
  );
  expect(badge).toHaveAttribute('data-tactical-projection-intent');
  expect(badge).toHaveAttribute('data-tactical-projection-status');
  expect(badge).toHaveAttribute(
    'data-tactical-projection-sources',
    expect.stringContaining(
      'terrain-elevation:mekstation:Rendered map terrain/elevation grid:',
    ),
  );
  expect(badge).toHaveAttribute(
    'data-tactical-projection-sources',
    expect.stringContaining(`elevation ${terrain.elevation}`),
  );
  expect(badge).toHaveAttribute(
    'data-tactical-projection-rule-refs',
    expect.stringContaining(
      'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
    ),
  );
}

function assertTerrainAndElevationBadges(
  terrainMatrix: readonly IHexTerrain[],
  projectionMode: MapProjectionMode = 'topDown',
): void {
  for (const terrain of terrainMatrix) {
    const { q, r } = terrain.coordinate;
    const terrainType = terrain.features[0].type;
    const terrainLabel = formatTerrainLabel(terrainType);
    const terrainReferenceLabel = formatTerrainFeatureReferenceLabel(
      terrain.features,
    );
    const terrainFeatureLevels = terrainFeatureLevelsAttribute(
      terrain.features,
    );
    const elevationLabel = formatElevationLabel(terrain.elevation);
    const elevationSign =
      terrain.elevation > 0
        ? 'positive'
        : terrain.elevation < 0
          ? 'negative'
          : 'zero';

    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        `terrain ${terrainReferenceLabel}; primary ${terrainLabel}; elevation ${elevationLabel}`,
      ),
    );
    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'data-terrain-primary',
      terrainType,
    );
    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'data-elevation',
      `${terrain.elevation}`,
    );
    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'data-terrain-feature-levels',
      terrainFeatureLevels,
    );

    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveTextContent(
      TERRAIN_BADGE_BY_TYPE[terrainType],
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`Terrain ${terrainReferenceLabel}`),
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-terrain-badge',
      TERRAIN_BADGE_BY_TYPE[terrainType],
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-terrain-feature-count',
      `${terrain.features.length}`,
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-terrain-feature-levels',
      terrainFeatureLevels,
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-projection-mode',
      projectionMode,
    );
    assertTerrainElevationProjectionMetadata(
      screen.getByTestId(`hex-terrain-label-${q}-${r}`),
      terrain,
    );
    expect(
      screen.getByTestId(`hex-terrain-label-${q}-${r}`).querySelector('rect'),
    ).toHaveAttribute('height', '11');
    expect(
      screen.getByTestId(`hex-terrain-label-${q}-${r}`).querySelector('text'),
    ).toHaveAttribute('font-size', '7');

    expect(
      screen.getByTestId(`hex-elevation-label-${q}-${r}`),
    ).toHaveTextContent(elevationLabel);
    expect(screen.getByTestId(`hex-elevation-label-${q}-${r}`)).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        `Elevation ${elevationLabel} (level ${terrain.elevation})`,
      ),
    );
    expect(screen.getByTestId(`hex-elevation-label-${q}-${r}`)).toHaveAttribute(
      'data-elevation-value',
      `${terrain.elevation}`,
    );
    expect(screen.getByTestId(`hex-elevation-label-${q}-${r}`)).toHaveAttribute(
      'data-elevation-sign',
      elevationSign,
    );
    expect(screen.getByTestId(`hex-elevation-label-${q}-${r}`)).toHaveAttribute(
      'data-projection-mode',
      projectionMode,
    );
    assertTerrainElevationProjectionMetadata(
      screen.getByTestId(`hex-elevation-label-${q}-${r}`),
      terrain,
    );
    expect(
      screen.getByTestId(`hex-elevation-label-${q}-${r}`).querySelector('rect'),
    ).toHaveAttribute('height', '14');
    expect(
      screen.getByTestId(`hex-elevation-label-${q}-${r}`).querySelector('text'),
    ).toHaveAttribute('font-size', '10');
  }
}

describe('HexMapDisplay terrain and elevation labels', () => {
  beforeEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  it('renders the full terrain vocabulary with readable elevation labels in top-down and isometric modes', () => {
    const terrainMatrix = buildTerrainMatrix();
    const tallHex = terrainMatrix.find((terrain) => terrain.elevation > 0);

    const { unmount } = render(
      <HexMapDisplay
        mapId="terrain-labels"
        radius={3}
        tokens={[]}
        selectedHex={null}
        hexTerrain={terrainMatrix}
      />,
    );

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );
    assertTerrainAndElevationBadges(terrainMatrix);

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    assertTerrainAndElevationBadges(terrainMatrix, 'isometric2d');
    expect(tallHex).toBeDefined();
    expect(
      screen.getByTestId(
        `hex-elevation-stack-${tallHex?.coordinate.q}-${tallHex?.coordinate.r}`,
      ),
    ).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('exposes terrain feature levels for layered terrain in both map projections', () => {
    const layeredTerrain: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 2,
      features: [
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Smoke, level: 2 },
        { type: TerrainType.Building, level: 3 },
      ],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="layered-terrain-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[layeredTerrain]}
      />,
    );

    const assertLayeredReference = (
      projectionMode: MapProjectionMode,
    ): void => {
      const hex = screen.getByTestId('hex-1-0');
      const terrainBadge = screen.getByTestId('hex-terrain-label-1-0');
      const elevationBadge = screen.getByTestId('hex-elevation-label-1-0');

      expect(hex).toHaveAttribute(
        'aria-label',
        expect.stringContaining(
          'terrain smoke L2, building L3, water L2; primary smoke; elevation +2',
        ),
      );
      expect(hex).toHaveAttribute(
        'data-terrain-feature-levels',
        'smoke:2|building:3|water:2',
      );
      expect(terrainBadge).toHaveTextContent('SMK2/BLDG3+1');
      expect(terrainBadge).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Terrain smoke L2, building L3, water L2'),
      );
      expect(terrainBadge).toHaveAttribute(
        'data-terrain-badge',
        'SMK2/BLDG3+1',
      );
      expect(terrainBadge).toHaveAttribute(
        'data-terrain-features',
        'smoke,building,water',
      );
      expect(terrainBadge).toHaveAttribute(
        'data-terrain-feature-levels',
        'smoke:2|building:3|water:2',
      );
      expect(terrainBadge).toHaveAttribute('data-terrain-feature-count', '3');
      expect(terrainBadge).toHaveAttribute(
        'data-projection-mode',
        projectionMode,
      );
      for (const badge of [terrainBadge, elevationBadge]) {
        assertTerrainElevationProjectionMetadata(badge, layeredTerrain);
        expect(badge).toHaveAttribute(
          'data-tactical-projection-sources',
          expect.stringContaining('water depth 2'),
        );
        expect(badge).toHaveAttribute(
          'data-tactical-projection-sources',
          expect.stringContaining('smoke intensity 2'),
        );
        expect(badge).toHaveAttribute(
          'data-tactical-projection-sources',
          expect.stringContaining('building level 3'),
        );
      }
    };

    assertLayeredReference('topDown');

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    assertLayeredReference('isometric2d');

    act(() => {
      unmount();
    });
  });

  it('surfaces represented cliff exits in hex labels and terrain hover context', () => {
    const cliffTerrain: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 2,
      features: [
        {
          type: TerrainType.Rough,
          level: 1,
          cliffTopExits: [Facing.North, Facing.Southeast],
        },
      ],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="cliff-exit-terrain-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[cliffTerrain]}
      />,
    );

    const cliffHex = screen.getByTestId('hex-1-0');
    expect(cliffHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('terrain rough L1 cliff edges N,SE'),
    );
    expect(cliffHex).toHaveAttribute('data-terrain-cliff-exits', '0,2');
    expect(cliffHex).toHaveAttribute('data-terrain-cliff-exit-labels', 'N,SE');
    expect(cliffHex).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:rough level 1 cliff edges N/SE elevation 2',
      ),
    );

    const terrainBadge = screen.getByTestId('hex-terrain-label-1-0');
    expect(terrainBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Terrain rough L1 cliff edges N,SE'),
    );
    expect(terrainBadge).toHaveAttribute('data-terrain-cliff-exits', '0,2');
    expect(terrainBadge).toHaveAttribute(
      'data-terrain-cliff-exit-labels',
      'N,SE',
    );

    fireEvent.mouseEnter(cliffHex);

    const cliffContext = screen.getByTestId('hex-terrain-tooltip-cliff-exits');
    expect(cliffContext).toHaveTextContent('Cliff edges: North, Southeast');
    expect(cliffContext).toHaveAttribute('data-terrain-cliff-exits', '0,2');
    expect(cliffContext).toHaveAttribute(
      'data-terrain-cliff-exit-labels',
      'N,SE',
    );
    expect(cliffContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining('rough level 1 cliff edges N/SE elevation 2'),
    );

    act(() => {
      unmount();
    });
  });

  it('renders represented building levels as isometric stack layers on flat terrain', () => {
    const flatBuilding: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Building, level: 3 }],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="building-stack-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[flatBuilding]}
      />,
    );

    expect(screen.queryByTestId('hex-elevation-stack-1-0')).toBeNull();
    expect(screen.getByTestId('hex-terrain-label-1-0')).toHaveTextContent(
      'BLDG3',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation',
      '0',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation-layers',
      '3',
    );
    expect(screen.getByTestId('hex-elevation-stack-1-0')).toBeInTheDocument();
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-3'),
    ).toHaveAttribute('aria-label', 'Elevation layer +3 of hex 1,0');
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-3'),
    ).toHaveTextContent('+3');
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-1'),
    ).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('exposes capped isometric stack metadata for very tall terrain', () => {
    const tallBuilding: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 4,
      features: [{ type: TerrainType.Building, level: 8 }],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="capped-building-stack-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[tallBuilding]}
      />,
    );

    expect(screen.queryByTestId('hex-elevation-stack-1-0')).toBeNull();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const hex = screen.getByTestId('hex-1-0');
    const stack = screen.getByTestId('hex-elevation-stack-1-0');
    const cap = screen.getByTestId('hex-elevation-stack-cap-1-0');

    expect(hex).toHaveAttribute('data-elevation', '4');
    expect(hex).toHaveAttribute('data-elevation-layers', '8');
    expect(hex).toHaveAttribute('data-elevation-effective-height', '12');
    expect(hex).toHaveAttribute('data-elevation-rendered-layers', '8');
    expect(hex).toHaveAttribute('data-elevation-stack-capped', 'true');
    expect(hex).toHaveAttribute('data-elevation-stack-overflow', '4');

    expect(stack).toHaveAttribute('data-elevation-effective-height', '12');
    expect(stack).toHaveAttribute('data-elevation-rendered-layers', '8');
    expect(stack).toHaveAttribute('data-elevation-stack-capped', 'true');
    expect(stack).toHaveAttribute('data-elevation-stack-overflow', '4');
    expect(stack).toHaveAttribute(
      'aria-label',
      'Elevation stack 1,0 shows 8 of 12 effective levels (4 levels above rendered cap)',
    );
    expect(stack.querySelector('title')).toHaveTextContent(
      'Elevation stack 1,0 shows 8 of 12 effective levels (4 levels above rendered cap)',
    );
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-8'),
    ).toHaveTextContent('+8');
    expect(screen.queryByTestId('hex-elevation-stack-layer-1-0-9')).toBeNull();

    expect(cap).toHaveAttribute('data-elevation-effective-height', '12');
    expect(cap).toHaveAttribute('data-elevation-rendered-layers', '8');
    expect(cap).toHaveAttribute('data-elevation-stack-overflow', '4');
    expect(cap).toHaveAttribute(
      'aria-label',
      'Effective stack height +12; 8 of 12 levels rendered',
    );
    expect(cap).toHaveTextContent('+12');

    act(() => {
      unmount();
    });
  });

  it('keeps top-down terrain and elevation badges exposed across playable zoom levels', () => {
    const roughRise: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 2,
      features: [{ type: TerrainType.Rough, level: 1 }],
    };
    let interaction: MapInteractionState | null = null;

    const { unmount } = render(
      <HexMapDisplay
        mapId="terrain-zoom-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[roughRise]}
        onInteractionReady={(nextInteraction) => {
          interaction = nextInteraction;
        }}
      />,
    );

    const requireInteraction = (): MapInteractionState => {
      if (!interaction) {
        throw new Error('Expected HexMapDisplay to expose map interaction');
      }
      return interaction;
    };

    const assertTopDownLabels = (): void => {
      expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
        'data-projection-mode',
        'topDown',
      );
      assertTerrainAndElevationBadges([roughRise]);
    };

    assertTopDownLabels();

    for (const zoom of [ZOOM_MIN, FOCUS_BUMP_ZOOM, ZOOM_MAX]) {
      act(() => {
        requireInteraction().setZoom(zoom);
      });
      expect(requireInteraction().zoom).toBe(zoom);
      assertTopDownLabels();
    }

    act(() => {
      unmount();
    });
  });

  it('keeps terrain and elevation readable while tactical overlays stack', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      isValidTarget: true,
    });
    const contact = makeToken({
      unitId: 'contact',
      side: GameSide.Opponent,
      position: { q: -1, r: 1 },
      lastKnownPosition: { q: -1, r: 1 },
      fogStatus: 'lastKnown',
    });
    const terrainMatrix: readonly IHexTerrain[] = [
      {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Clear, level: 0 }],
      },
      {
        coordinate: { q: 1, r: 0 },
        elevation: 1,
        features: [{ type: TerrainType.Rough, level: 1 }],
      },
      {
        coordinate: { q: 2, r: 0 },
        elevation: 2,
        features: [{ type: TerrainType.LightWoods, level: 1 }],
      },
      {
        coordinate: { q: -1, r: 1 },
        elevation: -1,
        features: [{ type: TerrainType.Water, level: 1 }],
      },
    ];
    const movementRange: readonly IMovementRangeHex[] = [
      {
        hex: { q: 1, r: 0 },
        mpCost: 3,
        terrainCost: 1,
        elevationDelta: 1,
        elevationCost: 1,
        heatGenerated: 1,
        movementMode: 'walk',
        reachable: true,
        movementType: MovementType.Walk,
      },
    ];

    const { unmount } = render(
      <HexMapDisplay
        mapId="terrain-overlay-stack"
        radius={2}
        tokens={[selected, target, contact]}
        selectedHex={selected.position}
        hexTerrain={terrainMatrix}
        movementRange={movementRange}
        highlightPath={[
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ]}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-movement'));
    fireEvent.click(screen.getByTestId('overlay-toggle-cover'));
    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-2-0'));

    assertTerrainAndElevationBadges(terrainMatrix);
    expect(screen.getByTestId('movement-overlay')).toBeInTheDocument();
    const movementCostOverlay = screen.getByTestId(
      'movement-cost-overlay-hex-1-0',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Terrain movement cost'),
    );
    expect(movementCostOverlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Projected movement: walk reachable; 3 MP; terrain +1; elevation delta 1; elevation cost +1; heat +1',
      ),
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-type',
      MovementType.Walk,
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-mode',
      'walk',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-reachable',
      'true',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-mp-cost',
      '3',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-terrain-cost',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-elevation-delta',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-elevation-cost',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-heat-generated',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(screen.getByTestId('cover-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Partial cover; terrain light woods; elevation +2',
      ),
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-level',
      'partial',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-terrain-cover-level',
      'partial',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-source-terrain',
      TerrainType.LightWoods,
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-terrain-features',
      TerrainType.LightWoods,
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-elevation',
      '2',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-level',
      'none',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-modifier',
      '0',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-partial-cover',
      'false',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-target-ids',
      'target',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('los-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('los-line')).toBeInTheDocument();
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent('W');
    expect(screen.getByTestId('hex-path-step-badge-1-0')).toHaveTextContent(
      '1',
    );
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveTextContent('+1H');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'walk reachable: 3 MP, terrain +1, elevation delta +1 cost +1, heat +1',
      ),
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveTextContent('S2');
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'LOS',
    );
    expect(screen.getByTestId('unit-token-selected')).toBeInTheDocument();
    expect(screen.getByTestId('unit-token-target')).toBeInTheDocument();
    expect(screen.getByTestId('fog-marker-contact')).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('surfaces represented minefield movement hazards with runner provenance', () => {
    const minefield: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Mines, level: 1 }],
    };
    const movementRange: readonly IMovementRangeHex[] = [
      {
        hex: { q: 1, r: 0 },
        mpCost: 1,
        terrainCost: 0,
        elevationDelta: 0,
        elevationCost: 0,
        heatGenerated: 0,
        movementMode: 'walk',
        reachable: true,
        movementType: MovementType.Walk,
      },
    ];

    const { unmount } = render(
      <HexMapDisplay
        mapId="minefield-hazard-projection"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[minefield]}
        movementRange={movementRange}
      />,
    );

    const hex = screen.getByTestId('hex-1-0');
    const overlay = screen.getByTestId('hex-overlay-1-0');
    const projectionBadge = screen.getByTestId(
      'hex-projection-status-badge-1-0',
    );

    expect(screen.getByTestId('hex-terrain-label-1-0')).toHaveTextContent(
      'MIN',
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-movement-hazard-status',
      'represented-minefield',
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-movement-hazard-reasons',
      expect.stringContaining(
        'reachable entry through represented mines can apply 10 damage to each leg',
      ),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'movement:mekstation:Represented minefield movement hazard projection:represented mines levels 1; reachable entry can apply 10 damage to each leg and queue PSRs',
      ),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-rule-refs',
      expect.stringContaining(
        'movement:mekstation:MekStation src/simulation/runner/phases/movementMines.ts: represented TerrainType.Mines entry applies BattleMech leg damage and queues PSRs',
      ),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('movement hazard status represented-minefield'),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        '20+ mine damage in the movement phase can queue a damage-threshold PSR',
      ),
    );
    expect(overlay).toHaveAttribute(
      'data-hex-overlay-movement-hazard-status',
      'represented-minefield',
    );
    expect(projectionBadge).toHaveTextContent('HAZ');
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-hazard-status',
      'represented-minefield',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-hazard-reasons',
      expect.stringContaining(
        'mine leg structure damage can queue a leg-damage PSR',
      ),
    );

    act(() => {
      unmount();
    });
  });
});
