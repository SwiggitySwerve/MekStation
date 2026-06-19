import * as H from './UnitTokenForType.test-helpers';

const {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  React,
  TokenUnitType,
  UnitTokenForType,
  VehicleMotionType,
  act,
  fireEvent,
  flushRafFrame,
  installRafMock,
  makeEvent,
  makeToken,
  rafCallbacks,
  render,
  renderInSvg,
  screen,
  useAnimationQueue,
} = H;

type IGameEvent = H.IGameEvent;
type IUnitToken = H.IUnitToken;
describe('UnitTokenForType dispatcher routing', () => {
  const noop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  it('renders a <g> with data-testid="unit-token-unit-1" for any token', () => {
    const token = makeToken({ unitType: TokenUnitType.Mech });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId('unit-token-unit-1');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('data-unit-type', TokenUnitType.Mech);
    expect(wrapper).toHaveAttribute('data-token-map-position', '0,0');
    expect(wrapper).toHaveAttribute('data-token-source-position', '0,0');
    expect(wrapper).toHaveAttribute('data-token-facing', `${Facing.North}`);
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('type mech'),
    );
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('position 0,0'),
    );
  });

  it('renders a hidden-contact marker for fogged tokens', () => {
    const token = makeToken({
      unitType: TokenUnitType.Mech,
      fogStatus: 'hidden',
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);

    expect(screen.getByTestId('unit-token-unit-1')).toHaveAttribute(
      'data-fog-status',
      'hidden',
    );
    expect(screen.getByTestId('fog-marker-unit-1')).toBeInTheDocument();
    expect(screen.getAllByText('?')).toHaveLength(2);
    expect(screen.queryByText('TST-1')).not.toBeInTheDocument();
  });

  it('renders last-known contacts at their last visible hex', () => {
    const token = makeToken({
      unitType: TokenUnitType.Mech,
      fogStatus: 'lastKnown',
      position: { q: 0, r: 0 },
      lastKnownPosition: { q: 1, r: 0 },
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);

    expect(
      screen.getByTestId('unit-token-unit-1').getAttribute('transform'),
    ).toContain('translate(60');
    expect(screen.getByTestId('unit-token-unit-1')).toHaveAttribute(
      'data-token-map-position',
      '1,0',
    );
    expect(screen.getByTestId('unit-token-unit-1')).toHaveAttribute(
      'data-token-source-position',
      '0,0',
    );
    expect(screen.getByTestId('fog-marker-unit-1')).toBeInTheDocument();
  });

  it('Mech → renders circular mech body (r attribute present)', () => {
    const token = makeToken({ unitType: TokenUnitType.Mech });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    // MechToken renders a <circle> element as the body — assert at least one circle exists.
    const wrapper = screen.getByTestId('unit-token-unit-1');
    expect(wrapper.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('Vehicle → renders a <rect> body element', () => {
    const token = makeToken({ unitType: TokenUnitType.Vehicle });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId('unit-token-unit-1');
    // VehicleToken uses a <rect> for its body shape.
    expect(wrapper.querySelectorAll('rect').length).toBeGreaterThan(0);
  });

  it('Vehicle VTOL → exposes altitude metadata and aria context', () => {
    const token = makeToken({
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.VTOL,
      altitude: 4,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId('unit-token-unit-1');

    expect(wrapper).toHaveAttribute('data-unit-type', TokenUnitType.Vehicle);
    expect(wrapper).toHaveAttribute(
      'data-vehicle-motion-type',
      VehicleMotionType.VTOL,
    );
    expect(wrapper).toHaveAttribute('data-vehicle-altitude', '4');
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('motion VTOL'),
    );
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 4'),
    );
  });

  it('Vehicle WiGE exposes altitude metadata and aria context', () => {
    const token = makeToken({
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.WiGE,
      altitude: 2,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId('unit-token-unit-1');

    expect(wrapper).toHaveAttribute('data-unit-type', TokenUnitType.Vehicle);
    expect(wrapper).toHaveAttribute(
      'data-vehicle-motion-type',
      VehicleMotionType.WiGE,
    );
    expect(wrapper).toHaveAttribute('data-vehicle-altitude', '2');
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('motion WiGE'),
    );
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 2'),
    );
    expect(screen.getByTestId('vehicle-altitude-badge')).toHaveTextContent(
      'ALT2',
    );
  });

  it('Aerospace → renders altitude badge text element', () => {
    const token = makeToken({
      unitType: TokenUnitType.Aerospace,
      altitude: 3,
      velocity: 5,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId('unit-token-unit-1');
    // AerospaceToken renders an altitude badge; the value "3" must appear in the SVG text.
    const texts = Array.from(wrapper.querySelectorAll('text')).map(
      (el) => el.textContent,
    );
    expect(texts.some((t) => t?.includes('3'))).toBe(true);
    expect(wrapper).toHaveAttribute('data-unit-type', TokenUnitType.Aerospace);
    expect(wrapper).toHaveAttribute('data-aerospace-altitude', '3');
    expect(wrapper).toHaveAttribute('data-aerospace-velocity', '5');
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 3'),
    );
    expect(wrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('velocity 5'),
    );
  });

  it('Infantry → renders trooper-count label text', () => {
    const token = makeToken({
      unitType: TokenUnitType.Infantry,
      infantryCount: 28,
      platoonCount: 1,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId('unit-token-unit-1');
    const texts = Array.from(wrapper.querySelectorAll('text')).map(
      (el) => el.textContent,
    );
    expect(texts.some((t) => t?.includes('28'))).toBe(true);
  });

  it('ProtoMech → renders proto-count indicator circles', () => {
    const token = makeToken({
      unitType: TokenUnitType.ProtoMech,
      protoCount: 5,
      isGlider: false,
      hasMainGun: false,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId('unit-token-unit-1');
    // ProtoMechToken renders individual proto silhouette circles.
    expect(wrapper.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('BattleArmor standalone → renders pip cluster (circles), no ba-badge testid', () => {
    const token = makeToken({
      unitType: TokenUnitType.BattleArmor,
      trooperCount: 4,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    // Not mounted → no ba-badge testid.
    expect(screen.queryByTestId('ba-badge-unit-1')).toBeNull();
    const wrapper = screen.getByTestId('unit-token-unit-1');
    expect(wrapper.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  // Removed test "undefined unitType defaults to Mech renderer" — under PR8's
  // discriminated-union flip, IUnitToken requires unitType. The dispatcher
  // exhaustively narrows on unitType with no default fallback. Callers must
  // pass a TokenUnitType variant; undefined is no longer a valid input.
});
