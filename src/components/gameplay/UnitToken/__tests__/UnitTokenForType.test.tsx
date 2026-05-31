/**
 * Tests for UnitTokenForType — central dispatcher for per-type hex map tokens.
 *
 * Uses @testing-library/react to render the SVG dispatcher and asserts that:
 *   1. Each unitType routes to the correct per-type renderer (identified via data-testid).
 *   2. BA mounted-on-mech path renders the badge overlay next to the host token.
 *   3. Click handler (onClick) is forwarded correctly.
 *
 * All SVG rendering runs in jsdom. Components are rendered inside an <svg>
 * wrapper because jsdom requires SVG children to live inside an <svg> root.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — dispatcher routes to correct renderer per unit type
 */

import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  GameSide,
  TokenUnitType,
  Facing,
  MovementType,
  GameEventType,
  GamePhase,
  VehicleMotionType,
} from '@/types/gameplay';

import { UnitTokenForType } from '../UnitTokenForType';

// =============================================================================
// Helpers
// =============================================================================

/** Wrap the dispatcher in an <svg> element so jsdom renders it correctly. */
function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

/** Base token fixture — override fields per test. */
function makeToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'unit-1',
    name: 'Test Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'TST-1',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeEvent(
  type: GameEventType,
  payload: IGameEvent['payload'],
  sequence = 1,
): IGameEvent {
  return {
    id: `${type}-${sequence}`,
    gameId: 'game',
    sequence,
    timestamp: `2026-04-29T00:00:0${sequence}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.Heat,
    payload,
  };
}

// =============================================================================
// Dispatcher routing — each unitType → correct wrapper data-testid
// =============================================================================

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

// =============================================================================
// BA mounted-on-mech path — badge overlaid on host
// =============================================================================

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

// =============================================================================
// onClick event forwarding
// =============================================================================

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

// =============================================================================
// Event projection — destroyed state wires through correctly
// =============================================================================

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

let rafCallbacks = new Map<number, FrameRequestCallback>();

function installRafMock(): () => void {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  let nextFrameId = 1;
  rafCallbacks = new Map();

  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: jest.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      rafCallbacks.set(frameId, callback);
      return frameId;
    }),
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: jest.fn((frameId: number) => {
      rafCallbacks.delete(frameId);
    }),
  });

  return () => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: originalCancelAnimationFrame,
    });
  };
}

function flushRafFrame(timestamp: number): void {
  const callbacks = Array.from(rafCallbacks.values());
  rafCallbacks.clear();
  act(() => {
    for (const callback of callbacks) {
      callback(timestamp);
    }
  });
}
