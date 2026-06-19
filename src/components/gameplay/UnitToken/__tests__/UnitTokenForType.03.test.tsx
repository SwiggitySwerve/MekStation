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
describe('UnitTokenForType onClick forwarding', () => {
  it('calls onClick with the token unitId when the wrapper <g> is clicked', () => {
    const onClick = jest.fn();
    const token = makeToken({
      unitId: 'mech-click-test',
      unitType: TokenUnitType.Mech,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('unit-token-mech-click-test'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith('mech-click-test');
  });

  it('calls onClick for a Vehicle token click', () => {
    const onClick = jest.fn();
    const token = makeToken({
      unitId: 'veh-1',
      unitType: TokenUnitType.Vehicle,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('unit-token-veh-1'));
    expect(onClick).toHaveBeenCalledWith('veh-1');
  });

  it('calls onClick for a mounted BA badge click', () => {
    const onClick = jest.fn();
    const hostToken = makeToken({
      unitId: 'mech-host-2',
      unitType: TokenUnitType.Mech,
    });
    const baToken = makeToken({
      unitId: 'ba-click',
      unitType: TokenUnitType.BattleArmor,
      mountedOn: 'mech-host-2',
      trooperCount: 3,
    });

    renderInSvg(
      <>
        <UnitTokenForType
          token={hostToken}
          onClick={onClick}
          allTokens={[hostToken, baToken]}
        />
        <UnitTokenForType
          token={baToken}
          onClick={onClick}
          allTokens={[hostToken, baToken]}
        />
      </>,
    );

    // Click the BA token wrapper (mounted path uses unit-token-ba-click testid).
    fireEvent.click(screen.getByTestId('unit-token-ba-click'));
    expect(onClick).toHaveBeenCalledWith('ba-click');
  });
});
