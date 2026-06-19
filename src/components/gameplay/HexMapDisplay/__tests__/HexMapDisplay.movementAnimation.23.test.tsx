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

  it('suppresses LOS and arc overlays while movement animations are active', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    act(() => {
      useAnimationQueue.getState().enqueue({
        id: 'move-selected',
        mapId: 'map-1',
        unitId: selected.unitId,
        kind: 'movement',
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
        mode: MovementType.Walk,
      });
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
        attackRange={[{ q: 1, r: 0 }]}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.queryByTestId('firing-arc-overlay')).toBeNull();
    expect(screen.queryByTestId('los-overlay')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('mounts attack and persistent damage effect layers from event history', () => {
    const attacker = makeToken({
      unitId: 'attacker',
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 1, r: 0 },
    });
    const events = [
      makeEvent(
        GameEventType.AttackResolved,
        {
          attackerId: 'attacker',
          targetId: 'target',
          weaponId: 'medium-laser',
          roll: 9,
          toHitNumber: 7,
          hit: true,
          damage: 5,
          location: 'centerTorso',
          visualCategory: 'laser',
          visualSubtype: 'medium-laser',
          projectileCount: 1,
        },
        1,
      ),
      makeEvent(
        GameEventType.UnitDestroyed,
        {
          unitId: 'target',
          cause: 'damage',
          killerUnitId: 'attacker',
        },
        2,
      ),
    ];

    render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[attacker, target]}
        events={events}
        selectedHex={null}
      />,
    );

    expect(screen.getByTestId('attack-effects-layer')).toBeInTheDocument();
    expect(
      screen.getByTestId('attack-effect-event-attack_resolved-1'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('persistent-effects-layer')).toBeInTheDocument();
    expect(screen.getByTestId('wreck-marker-target')).toBeInTheDocument();
  });

  it('renders sensor rings and last-known fog contacts on the tactical map', () => {
    const scout = makeToken({
      unitId: 'scout',
      sensorRange: 3,
      position: { q: 0, r: 0 },
    });
    const contact = makeToken({
      unitId: 'contact',
      name: 'Last Contact',
      side: GameSide.Opponent,
      fogStatus: 'lastKnown',
      sensorRange: 2,
      position: { q: 3, r: 0 },
      lastKnownPosition: { q: 1, r: 0 },
    });
    const hidden = makeToken({
      unitId: 'hidden-contact',
      side: GameSide.Opponent,
      fogStatus: 'hidden',
      sensorRange: 4,
      position: { q: -2, r: 1 },
    });

    render(
      <HexMapDisplay
        mapId="map-1"
        radius={3}
        tokens={[scout, contact, hidden]}
        selectedHex={null}
      />,
    );

    expect(screen.getByTestId('sensor-rings-layer')).toBeInTheDocument();
    const scoutRing = screen.getByTestId('sensor-ring-scout');
    const contactRing = screen.getByTestId('sensor-ring-contact');
    const contactDisplayCenter = hexToPixel({ q: 1, r: 0 });

    expect(scoutRing).toHaveAttribute('data-sensor-range-hexes', '3');
    expect(scoutRing).toHaveAttribute('data-sensor-radius-px', '180');
    expect(scoutRing).toHaveAttribute('data-sensor-display-position', '0,0');
    expect(scoutRing).toHaveAttribute('data-sensor-source-position', '0,0');
    expect(scoutRing).toHaveAttribute('data-sensor-position-source', 'current');
    expect(scoutRing).toHaveAttribute('data-sensor-fog-status', 'visible');
    expect(scoutRing).toHaveAccessibleName(
      'Unit sensor ring; range 3 hexes; displayed at 0,0; source 0,0; position source current; visibility visible',
    );

    expect(contactRing).toHaveAttribute('data-sensor-range-hexes', '2');
    expect(contactRing).toHaveAttribute('data-sensor-radius-px', '120');
    expect(contactRing).toHaveAttribute('data-sensor-display-position', '1,0');
    expect(contactRing).toHaveAttribute('data-sensor-source-position', '3,0');
    expect(contactRing).toHaveAttribute(
      'data-sensor-position-source',
      'last-known',
    );
    expect(contactRing).toHaveAttribute('data-sensor-fog-status', 'lastKnown');
    expect(contactRing).toHaveAttribute('cx', `${contactDisplayCenter.x}`);
    expect(contactRing).toHaveAttribute('cy', `${contactDisplayCenter.y}`);
    expect(contactRing).toHaveAccessibleName(
      'Last Contact sensor ring; range 2 hexes; displayed at 1,0; source 3,0; position source last-known; visibility lastKnown',
    );
    expect(screen.queryByTestId('sensor-ring-hidden-contact')).toBeNull();
    expect(screen.getByTestId('fog-marker-contact')).toBeInTheDocument();
  });
});
