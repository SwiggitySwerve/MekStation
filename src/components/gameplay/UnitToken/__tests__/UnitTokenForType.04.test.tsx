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
describe('UnitTokenForType event projection', () => {
  it('passes destroyed state from token.isDestroyed to the renderer', () => {
    const token = makeToken({
      unitType: TokenUnitType.Mech,
      isDestroyed: true,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={jest.fn()} />);
    // MechToken renders data-testid="unit-destroyed-overlay" when destroyed.
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });

  it('projects heat events into token heat and ammo-risk visuals', () => {
    const token = makeToken({ unitId: 'hot-mech' });
    renderInSvg(
      <UnitTokenForType
        token={token}
        onClick={jest.fn()}
        events={[
          makeEvent(GameEventType.HeatGenerated, {
            unitId: 'hot-mech',
            amount: 10,
            source: 'firing',
            previousTotal: 8,
            newTotal: 19,
            ammoExplosionRisk: true,
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('heat-glow')).toHaveAttribute(
      'data-heat-threshold',
      'overheat',
    );
    expect(screen.getByTestId('ammo-explosion-aura')).toHaveAttribute(
      'data-risk-heat',
      '19',
    );
  });

  it('keeps shutdown visible after a failed startup attempt', () => {
    const token = makeToken({ unitId: 'shutdown-mech' });
    renderInSvg(
      <UnitTokenForType
        token={token}
        onClick={jest.fn()}
        events={[
          makeEvent(
            GameEventType.ShutdownCheck,
            {
              unitId: 'shutdown-mech',
              heatLevel: 18,
              targetNumber: 6,
              roll: 4,
              shutdownOccurred: true,
            },
            1,
          ),
          makeEvent(
            GameEventType.StartupAttempt,
            {
              unitId: 'shutdown-mech',
              targetNumber: 6,
              roll: 5,
              success: false,
            },
            2,
          ),
        ]}
      />,
    );

    expect(screen.getByTestId('shutdown-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('startup-pulse')).toHaveAttribute(
      'data-outcome',
      'failure',
    );
  });

  it('clears shutdown after a successful startup attempt', () => {
    const token = makeToken({ unitId: 'restarted-mech' });
    renderInSvg(
      <UnitTokenForType
        token={token}
        onClick={jest.fn()}
        events={[
          makeEvent(
            GameEventType.ShutdownCheck,
            {
              unitId: 'restarted-mech',
              heatLevel: 18,
              targetNumber: 6,
              roll: 4,
              shutdownOccurred: true,
            },
            1,
          ),
          makeEvent(
            GameEventType.StartupAttempt,
            {
              unitId: 'restarted-mech',
              targetNumber: 6,
              roll: 8,
              success: true,
            },
            2,
          ),
        ]}
      />,
    );

    expect(screen.queryByTestId('shutdown-overlay')).toBeNull();
    expect(screen.getByTestId('startup-pulse')).toHaveAttribute(
      'data-outcome',
      'success',
    );
  });
});
