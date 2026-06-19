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

  it('distinguishes isometric fog visibility rules from terrain occlusion', () => {
    const hiddenContact = makeToken({
      unitId: 'hidden-contact',
      name: 'Hidden scout',
      side: GameSide.Opponent,
      fogStatus: 'hidden',
      position: { q: 0, r: 0 },
    });
    const lastKnownContact = makeToken({
      unitId: 'last-known-contact',
      name: 'Last known scout',
      side: GameSide.Opponent,
      fogStatus: 'lastKnown',
      position: { q: 2, r: 0 },
      lastKnownPosition: { q: -1, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[hiddenContact, lastKnownContact]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    expect(
      screen.queryByTestId('isometric-visibility-rule-hidden-contact'),
    ).toBeNull();
    expect(screen.getByTestId('fog-marker-hidden-contact')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const hiddenToken = screen.getByTestId('unit-token-hidden-contact');
    expect(hiddenToken).toHaveAttribute(
      'data-isometric-visibility-rule',
      'hidden',
    );
    expect(hiddenToken).toHaveAttribute(
      'data-isometric-visibility-rule-reason',
      'Hidden contact is limited by fog or visibility rules',
    );
    expect(hiddenToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Hidden contact is limited by fog or visibility rules',
      ),
    );
    expect(hiddenToken).not.toHaveAttribute('data-visibility-boost', 'true');
    expect(hiddenToken).not.toHaveAttribute('data-isometric-occlusion-reason');
    const hiddenSceneToken = screen.getByTestId(
      'isometric-scene-token-hidden-contact',
    );
    expect(hiddenSceneToken).not.toHaveAttribute(
      'data-isometric-foreground-boost',
      'true',
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'data-isometric-token-map-position',
      '0,0',
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'data-isometric-token-source-position',
      '0,0',
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Isometric token Hidden contact'),
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('visibility hidden'),
    );
    expect(hiddenSceneToken.querySelector('title')).toHaveTextContent(
      'visibility hidden',
    );
    expect(
      screen.queryByTestId('isometric-visibility-halo-hidden-contact'),
    ).toBeNull();
    expect(
      screen.queryByTestId('isometric-visibility-reason-hidden-contact'),
    ).toBeNull();
    expect(
      screen.getByTestId('isometric-visibility-rule-hidden-contact'),
    ).toHaveTextContent('FOG');
    expect(screen.getByTestId('fog-marker-hidden-contact')).toBeInTheDocument();

    const lastKnownToken = screen.getByTestId('unit-token-last-known-contact');
    const lastKnownSceneToken = screen.getByTestId(
      'isometric-scene-token-last-known-contact',
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-unit-type',
      TokenUnitType.Mech,
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-map-position',
      '-1,0',
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-source-position',
      '2,0',
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-facing',
      `${Facing.North}`,
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Isometric token Last known scout'),
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('map position -1,0'),
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('source position 2,0'),
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('visibility lastKnown'),
    );
    expect(lastKnownSceneToken.querySelector('title')).toHaveTextContent(
      'visibility lastKnown',
    );
    expect(lastKnownToken).toHaveAttribute(
      'data-isometric-visibility-rule',
      'lastKnown',
    );
    expect(lastKnownToken).toHaveAttribute(
      'data-isometric-visibility-rule-reason',
      'Last known contact is limited to stale visibility information',
    );
    expect(
      screen.getByTestId('isometric-visibility-rule-last-known-contact'),
    ).toHaveTextContent('LAST');
    expect(
      screen.getByTestId('fog-marker-last-known-contact'),
    ).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('highlights the selected unit for isometric occlusion readability', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
      />,
    );

    expect(
      screen.queryByTestId('isometric-visibility-halo-selected'),
    ).toBeNull();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-visibility-halo-selected'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('unit-token-selected')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );

    act(() => {
      unmount();
    });
  });

  it('highlights combat-projected targets for isometric occlusion readability', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      isValidTarget: false,
      position: { q: 2, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[selected, target]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId('isometric-visibility-halo-target')).toBeNull();
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-visibility-halo-target'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('isometric-scene-token-target')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat projection target blocked'),
    );
    expect(screen.getByTestId('isometric-scene-token-target')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('foreground readability boost'),
    );
    expect(screen.getByTestId('unit-token-target')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );

    act(() => {
      unmount();
    });
  });
});
