import * as H from './HexMapDisplay.movementAnimation.test-helpers';

const {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  HexMapDisplay,
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
  act,
  fireEvent,
  hexToPixel,
  makeEvent,
  makeToken,
  makeWeapon,
  render,
  screen,
  useAnimationQueue,
} = H;

type IGameEvent = H.IGameEvent;
type IUnitToken = H.IUnitToken;
type IWeaponStatus = H.IWeaponStatus;
describe('HexMapDisplay tactical visual layers', () => {
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

  it('renders firing arcs only for the selected friendly unit', () => {
    const enemySelected = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[enemySelected]}
        selectedHex={null}
      />,
    );

    expect(screen.queryByTestId('firing-arc-overlay')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('lets the user toggle firing arcs independently from LOS', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
      />,
    );

    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();
    const firingArcToggle = screen.getByTestId('overlay-toggle-arcs');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-id', 'firingArcs');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-visible', 'true');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-locked', 'false');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-intensity', '1');
    expect(firingArcToggle).toHaveAttribute(
      'data-map-layer-projection-source',
      'shared-tactical-map-projection',
    );
    expect(firingArcToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'firing-arc',
    );
    expect(firingArcToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'firing-arc',
    );
    expect(firingArcToggle).toHaveAttribute(
      'aria-label',
      'Toggle firing arc overlay; visible; projection channel firing-arc; rules surface firing-arc',
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-arcs'));
    expect(screen.queryByTestId('firing-arc-overlay')).toBeNull();
    expect(firingArcToggle).toHaveAttribute('data-map-layer-visible', 'false');
    expect(firingArcToggle).toHaveAttribute(
      'aria-label',
      'Toggle firing arc overlay; hidden; projection channel firing-arc; rules surface firing-arc',
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-arcs'));
    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();
    expect(firingArcToggle).toHaveAttribute('data-map-layer-visible', 'true');

    act(() => {
      unmount();
    });
  });

  it('routes movement and cover overlay toggles through typed layer state', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.LightWoods, level: 1 }],
          },
          {
            coordinate: { q: 0, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.HeavyWoods, level: 1 }],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId('movement-overlay')).toBeNull();
    expect(screen.queryByTestId('cover-overlay')).toBeNull();
    const movementToggle = screen.getByTestId('overlay-toggle-movement');
    const coverToggle = screen.getByTestId('overlay-toggle-cover');
    expect(movementToggle).toHaveAttribute('data-map-layer-id', 'movement');
    expect(movementToggle).toHaveAttribute('data-map-layer-visible', 'false');
    expect(movementToggle).toHaveAttribute('data-map-layer-locked', 'false');
    expect(movementToggle).toHaveAttribute('data-map-layer-intensity', '1');
    expect(movementToggle).toHaveAttribute(
      'data-map-layer-projection-source',
      'shared-tactical-map-projection',
    );
    expect(movementToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'movement',
    );
    expect(movementToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'movement-cost',
    );
    expect(movementToggle).toHaveAttribute(
      'aria-label',
      'Toggle movement cost overlay; hidden; projection channel movement; rules surface movement-cost',
    );
    expect(coverToggle).toHaveAttribute('data-map-layer-id', 'cover');
    expect(coverToggle).toHaveAttribute('data-map-layer-visible', 'false');
    expect(coverToggle).toHaveAttribute('data-map-layer-locked', 'false');
    expect(coverToggle).toHaveAttribute('data-map-layer-intensity', '1');
    expect(coverToggle).toHaveAttribute(
      'data-map-layer-projection-source',
      'shared-tactical-map-projection',
    );
    expect(coverToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'cover',
    );
    expect(coverToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'cover-level',
    );
    expect(coverToggle).toHaveAttribute(
      'aria-label',
      'Toggle cover level overlay; hidden; projection channel cover; rules surface cover-level',
    );

    fireEvent.click(movementToggle);
    fireEvent.click(coverToggle);

    expect(screen.getByTestId('movement-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('cover-overlay')).toBeInTheDocument();
    expect(movementToggle).toHaveAttribute('data-map-layer-visible', 'true');
    expect(movementToggle).toHaveAttribute(
      'aria-label',
      'Toggle movement cost overlay; visible; projection channel movement; rules surface movement-cost',
    );
    expect(coverToggle).toHaveAttribute('data-map-layer-visible', 'true');
    expect(coverToggle).toHaveAttribute(
      'aria-label',
      'Toggle cover level overlay; visible; projection channel cover; rules surface cover-level',
    );
    expect(screen.getByTestId('movement-cost-overlay-hex-1-0')).toHaveAttribute(
      'data-terrain-movement-cost',
      '2',
    );
    expect(screen.getByTestId('movement-cost-overlay-hex-1-0')).toHaveAttribute(
      'data-terrain-movement-cost-band',
      'medium',
    );
    expect(screen.getByTestId('movement-cost-overlay-hex-1-0')).toHaveAttribute(
      'data-terrain-movement-cost-fill',
      '#eab308',
    );
    expect(
      screen.getByTestId('movement-cost-overlay-hex-1-0'),
    ).toHaveTextContent('T2');
    const movementCostOverlay = screen.getByTestId(
      'movement-cost-overlay-hex-1-0',
    );
    expect(movementCostOverlay.getAttribute('aria-label')).toContain(
      'Terrain movement cost 2; terrain light woods; elevation 0',
    );
    expect(movementCostOverlay.getAttribute('aria-label')).toContain(
      'Projection: Hex 1,0; intent terrain; status neutral',
    );
    expect(
      screen.getByTestId('movement-cost-overlay-hex--1-0'),
    ).toHaveAttribute('data-terrain-movement-cost', '1');
    expect(
      screen.getByTestId('movement-cost-overlay-hex--1-0'),
    ).toHaveAttribute('data-terrain-movement-cost-band', 'low');
    expect(
      screen.getByTestId('movement-cost-overlay-hex--1-0'),
    ).toHaveAttribute('data-terrain-movement-cost-fill', '#22c55e');
    expect(screen.getByTestId('cover-overlay-hex-1-0')).toHaveAttribute(
      'data-cover-level',
      'partial',
    );
    expect(screen.getByTestId('cover-overlay-hex-1-0')).toHaveTextContent(
      'PART',
    );
    const coverOverlay = screen.getByTestId('cover-overlay-hex-1-0');
    expect(coverOverlay.getAttribute('aria-label')).toContain(
      'Partial cover; terrain light woods; elevation 0',
    );
    expect(coverOverlay.getAttribute('aria-label')).toContain(
      'Projection: Hex 1,0; intent terrain; status neutral',
    );
    expect(screen.getByTestId('cover-overlay-hex-0-0')).toHaveAttribute(
      'data-cover-level',
      'full',
    );
    expect(screen.getByTestId('cover-overlay-hex-0-0')).toHaveTextContent(
      'FULL',
    );
    expect(screen.queryByTestId('cover-overlay-hex--1-0')).toBeNull();

    act(() => {
      unmount();
    });
  });
});
