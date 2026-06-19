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
describe('UnitTokenForType movement animation integration', () => {
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

  it('renders an active movement at the tween start and completes it on unmount', () => {
    const token = makeToken({
      unitId: 'animated-mech',
      position: { q: 2, r: 0 },
    });
    useAnimationQueue.getState().enqueue({
      id: 'move-animated-mech',
      mapId: 'map-1',
      unitId: token.unitId,
      kind: 'movement',
      path: [
        { q: 0, r: 0 },
        { q: 2, r: 0 },
      ],
      mode: MovementType.Walk,
      initialFacing: Facing.North,
      finalFacing: Facing.South,
    });
    const movementAnimation = useAnimationQueue.getState().active[0];

    const { unmount } = renderInSvg(
      <UnitTokenForType
        token={token}
        onClick={jest.fn()}
        movementAnimation={movementAnimation}
      />,
    );

    const wrapper = screen.getByTestId('unit-token-animated-mech');
    expect(wrapper).toHaveAttribute('data-animating', 'true');
    expect(wrapper.getAttribute('transform')).toContain('translate(0, 0)');
    expect(useAnimationQueue.getState().isActive).toBe(true);

    unmount();

    expect(useAnimationQueue.getState().isActive).toBe(false);
  });

  it('renders the jump arc in the jump MP color after fade-in starts', () => {
    const restoreRaf = installRafMock();
    const token = makeToken({
      unitId: 'jumping-mech',
      position: { q: 2, r: 0 },
    });
    useAnimationQueue.getState().enqueue({
      id: 'jumping-mech-animation',
      mapId: 'map-1',
      unitId: token.unitId,
      kind: 'movement',
      path: [
        { q: 0, r: 0 },
        { q: 2, r: 0 },
      ],
      mode: MovementType.Jump,
    });
    const movementAnimation = useAnimationQueue.getState().active[0];

    renderInSvg(
      <UnitTokenForType
        token={token}
        onClick={jest.fn()}
        movementAnimation={movementAnimation}
      />,
    );

    flushRafFrame(0);
    flushRafFrame(50);

    const arc = screen.getByTestId('jump-arc-jumping-mech');
    expect(arc).toHaveAttribute('stroke', '#3b82f6');
    expect(Number(arc.getAttribute('opacity'))).toBeGreaterThan(0);

    restoreRaf();
  });
});
