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
describe('BattleArmor mounted-on-mech badge', () => {
  const noop = jest.fn();

  it('renders a mounted BA badge as a child of the host token', () => {
    const hostToken = makeToken({
      unitId: 'mech-host',
      unitType: TokenUnitType.Mech,
    });
    const baToken = makeToken({
      unitId: 'ba-1',
      unitType: TokenUnitType.BattleArmor,
      mountedOn: 'mech-host',
      position: { q: 2, r: 0 },
      trooperCount: 4,
    });

    renderInSvg(
      <>
        <UnitTokenForType
          token={hostToken}
          onClick={noop}
          allTokens={[hostToken, baToken]}
        />
        <UnitTokenForType
          token={baToken}
          onClick={noop}
          allTokens={[hostToken, baToken]}
        />
      </>,
    );

    const hostWrapper = screen.getByTestId('unit-token-mech-host');
    const baWrapper = screen.getByTestId('unit-token-ba-1');

    expect(hostWrapper).toContainElement(baWrapper);
    expect(screen.getByTestId('ba-badge-ba-1')).toBeInTheDocument();
    expect(baWrapper).toHaveAttribute(
      'data-unit-type',
      TokenUnitType.BattleArmor,
    );
    expect(baWrapper).toHaveAttribute('data-mounted-on', 'mech-host');
    expect(baWrapper).toHaveAttribute('data-passenger-host', 'mech-host');
    expect(baWrapper).toHaveAttribute('data-passenger-slot', 'shoulder');
    expect(baWrapper).toHaveAttribute('data-token-map-position', '0,0');
    expect(baWrapper).toHaveAttribute('data-token-source-position', '2,0');
    expect(baWrapper.getAttribute('transform')).toContain('translate(18, -18)');
    expect(baWrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('mounted on mech-host'),
    );
    expect(baWrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('passenger slot shoulder'),
    );
    expect(screen.getByTestId('ba-badge-ba-1')).toHaveAttribute(
      'data-ba-passenger-name',
      'Test Unit',
    );
  });

  it('uses passengerBadge host and slot metadata when provided', () => {
    const hostToken = makeToken({
      unitId: 'mech-host',
      unitType: TokenUnitType.Mech,
    });
    const baToken = makeToken({
      unitId: 'ba-back',
      unitType: TokenUnitType.BattleArmor,
      position: { q: 2, r: 0 },
      trooperCount: 2,
      passengerBadge: { hostTokenId: 'mech-host', slot: 'back' },
    });

    renderInSvg(
      <UnitTokenForType
        token={hostToken}
        onClick={noop}
        allTokens={[hostToken, baToken]}
      />,
    );

    const baWrapper = screen.getByTestId('unit-token-ba-back');
    expect(screen.getByTestId('unit-token-mech-host')).toContainElement(
      baWrapper,
    );
    expect(baWrapper).toHaveAttribute('data-passenger-host', 'mech-host');
    expect(baWrapper).toHaveAttribute('data-passenger-slot', 'back');
    expect(baWrapper).toHaveAttribute(
      'aria-label',
      expect.stringContaining('passenger slot back'),
    );
    expect(baWrapper.getAttribute('transform')).toContain('translate(-18, 18)');
    expect(screen.getByTestId('ba-badge-ba-back')).toHaveAttribute(
      'data-ba-passenger-troopers',
      '2',
    );
  });

  it('BA without host token falls back to standalone rendering', () => {
    const baToken = makeToken({
      unitId: 'ba-orphan',
      unitType: TokenUnitType.BattleArmor,
      mountedOn: 'missing-mech',
      trooperCount: 4,
    });

    renderInSvg(
      <UnitTokenForType token={baToken} onClick={noop} allTokens={[baToken]} />,
    );

    // Host not found → standalone path renders the normal token wrapper.
    expect(screen.getByTestId('unit-token-ba-orphan')).toBeInTheDocument();
    expect(screen.queryByTestId('ba-badge-ba-orphan')).toBeNull();
  });
});
