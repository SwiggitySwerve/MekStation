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

  it('does not foreground stale legacy target flags when combat projection is active', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const staleFriendlyTarget = makeToken({
      unitId: 'stale-friendly-target',
      side: GameSide.Player,
      isValidTarget: true,
      position: { q: 0, r: 1 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected, staleFriendlyTarget]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-scene-token-stale-friendly-target'),
    ).not.toHaveAttribute('data-isometric-foreground-boost', 'true');
    expect(
      screen.getByTestId('isometric-scene-token-stale-friendly-target'),
    ).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat projection target blocked'),
    );
    expect(
      screen.getByTestId('unit-token-stale-friendly-target'),
    ).toHaveAttribute('data-token-valid-target-source', 'combat-projection');
    expect(
      screen.getByTestId('unit-token-stale-friendly-target'),
    ).toHaveAttribute('data-token-combat-projection-valid-target', 'false');
    expect(
      screen.getByTestId('unit-token-stale-friendly-target'),
    ).not.toHaveAttribute('data-visibility-boost', 'true');

    act(() => {
      unmount();
    });
  });

  it('keeps legacy target flags as isometric foreground fallback without combat projection', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const legacyTarget = makeToken({
      unitId: 'legacy-target',
      side: GameSide.Opponent,
      isValidTarget: true,
      position: { q: 0, r: 1 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected, legacyTarget]}
        selectedHex={null}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-scene-token-legacy-target'),
    ).toHaveAttribute('data-isometric-foreground-boost', 'true');
    expect(screen.getByTestId('unit-token-legacy-target')).toHaveAttribute(
      'data-token-valid-target-source',
      'token',
    );
    expect(screen.getByTestId('unit-token-legacy-target')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );

    act(() => {
      unmount();
    });
  });

  it('hides the LOS line on hex click while leaving the committed click path to the host', () => {
    const onHexClick = jest.fn();
    const onHexHover = jest.fn();
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
        onHexClick={onHexClick}
        onHexHover={onHexHover}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));
    expect(screen.getByTestId('los-line')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('hex-1-0'));

    expect(onHexClick).toHaveBeenCalledWith({ q: 1, r: 0 });
    expect(onHexHover).toHaveBeenLastCalledWith(null);
    expect(screen.queryByTestId('los-line')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('uses configured weapon ranges for firing arc shading', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={3}
        tokens={[selected]}
        selectedHex={null}
        unitWeapons={{
          selected: [makeWeapon({ ranges: { short: 1, medium: 1, long: 1 } })],
        }}
      />,
    );

    expect(screen.getByTestId('firing-arc-hex-0,-1')).toBeInTheDocument();
    expect(screen.getByTestId('firing-arc-label-0,-1')).toHaveTextContent(
      'FRONT',
    );
    expect(screen.queryByTestId('firing-arc-hex-0,-2')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('hides firing-arc information when no configured weapons are operational', () => {
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
        unitWeapons={{
          selected: [
            makeWeapon({ id: 'destroyed-laser', destroyed: true }),
            makeWeapon({ id: 'dry-ac', ammoRemaining: 0 }),
            makeWeapon({ id: 'jammed-uac', jammed: true }),
          ],
        }}
      />,
    );

    expect(screen.queryByTestId('firing-arc-hex-0,-1')).toBeNull();
    expect(screen.queryByTestId('firing-arc-hex-1,0')).toBeNull();
    expect(screen.queryByTestId('firing-arc-hex-0,1')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('toggles the LOS overlay off independently from firing arcs', () => {
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

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));
    expect(screen.getByTestId('los-line')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    expect(screen.queryByTestId('los-line')).toBeNull();
    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('renders blocked hover LOS as a red line ending at the wall hex', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const blockerPixel = hexToPixel({ q: 1, r: 0 });
    const targetPixel = hexToPixel({ q: 2, r: 0 });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[selected]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Building, level: 2 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-2-0'));

    const line = screen.getByTestId('los-line');
    expect(line).toHaveAttribute('data-state', 'blocked');
    expect(line).toHaveAttribute('stroke', '#dc2626');
    expect(line).toHaveAttribute('x2', String(blockerPixel.x));
    expect(line).not.toHaveAttribute('x2', String(targetPixel.x));
    expect(screen.getByTestId('los-state-badge')).toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('los-state-badge')).toHaveTextContent('NO LOS');
    expect(screen.getByTestId('los-annotation-wall-1,0')).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });
});
