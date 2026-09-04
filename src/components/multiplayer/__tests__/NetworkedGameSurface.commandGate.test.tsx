/**
 * The networked surface refuses commands the client cannot vouch for
 * (umbrella 19.2, finding #37 - the reachable half).
 *
 * The dock's gate (3a) landed on a surface the multiplayer routes do not
 * render: `/multiplayer/lobby/[roomCode]` and `/multiplayer/spectate/
 * [matchId]` mount `NetworkedGameSurface`, whose controls live in
 * `NetworkedGameSurface.actionbar`. That bar gated on `blocked` alone -
 * `rebuilding`, `rewound`, `syncing`, `reconnecting` and `behind` all
 * left every control live, which is the silent-retry 19.2 forbids.
 *
 * These rows drive the gate through `NetworkedGameSurface` itself, from
 * the props a live client actually supplies (`clientLifecycle` and
 * `projectionSignal`), rather than passing a ready-made gate in. A guard
 * that cannot see the wiring it guards is the miss this program keeps
 * hitting.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import type { IClientLifecycleState } from '@/lib/multiplayer/client';
import type { TacticalLifecycleProjectionSignal } from '@/lib/multiplayer/tacticalLifecycleState';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { tacticalCommandAvailability } from '@/lib/multiplayer/tacticalCommandGate';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import { NetworkedGameSurface } from '../NetworkedGameSurface';
import { buildActionControlContext } from '../NetworkedGameSurface.actionContext';

// =============================================================================
// Fixtures
// =============================================================================

function buildAuthoritativeSession(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      {
        id: 'player-1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'opponent-1',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'marauder-mad-3r',
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    { id: 'match-fixture', createdAt: '2026-05-19T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  return advancePhase(session); // → Movement, local side moves first
}

const SEATS: readonly IMatchSeat[] = [
  {
    slotId: 'alpha-1',
    side: 'Alpha',
    seatNumber: 1,
    occupant: { playerId: 'pid_host', displayName: 'Host' },
    kind: 'human',
    ready: true,
  },
  {
    slotId: 'bravo-1',
    side: 'Bravo',
    seatNumber: 1,
    occupant: { playerId: 'pid_guest', displayName: 'Guest' },
    kind: 'human',
    ready: true,
  },
];

/** The mirror the bar renders from, never null in these rows. */
function mirrorOrThrow(): IGameSession {
  const mirror = buildMirrorSession(buildAuthoritativeSession().events);
  if (mirror === null) throw new Error('fixture mirror failed to build');
  return mirror;
}

const LIVE_CLIENT: IClientLifecycleState = {
  blockedBySequenceCollision: false,
  pendingIntentCount: 0,
  ready: true,
  reconnectScheduled: false,
  recoveringFromGap: false,
};

/** Every control the bar mounts in the Movement phase. */
const CONTROL_TEST_IDS = [
  'declare-movement-button',
  'stand-button',
  'advance-phase-button',
  'eject-button',
  'concede-button',
] as const;

function renderSurface(opts: {
  readonly client?: Partial<IClientLifecycleState>;
  readonly projectionSignal?: TacticalLifecycleProjectionSignal | null;
}) {
  const authoritative = buildAuthoritativeSession();
  const onSendGameIntent = jest.fn(() => true);
  render(
    <NetworkedGameSurface
      mirrorSession={buildMirrorSession(authoritative.events)}
      mirrorEvents={authoritative.events}
      seats={SEATS}
      playerId="pid_host"
      hostPlayerId="pid_host"
      status="ready"
      pausedInfo={null}
      closedInfo={null}
      intentError={null}
      onClearIntentError={jest.fn()}
      onSendGameIntent={onSendGameIntent}
      clientLifecycle={{ ...LIVE_CLIENT, ...(opts.client ?? {}) }}
      projectionSignal={opts.projectionSignal ?? null}
    />,
  );
  return { onSendGameIntent };
}

/** The refusal text the gate produces for a posture, by state name. */
function gateReason(state: 'rebuilding' | 'behind'): string {
  const availability = tacticalCommandAvailability({
    state,
    commandsEnabled: false,
    message: 'unused',
  });
  if (availability.available) throw new Error(`${state} must refuse`);
  return availability.reason;
}

// =============================================================================
// Rows
// =============================================================================

describe('networked action bar command gate', () => {
  it.each([
    ['rebuilding', { projectionSignal: 'PROJECTION_REBUILDING' as const }],
    ['rewound', { projectionSignal: 'PROJECTION_REWOUND' as const }],
    ['syncing', { client: { recoveringFromGap: true } }],
    ['reconnecting', { client: { reconnectScheduled: true } }],
    ['behind', { client: { ready: false } }],
    ['blocked', { client: { blockedBySequenceCollision: true } }],
  ])('disables every control in the %s posture', (_state, opts) => {
    renderSurface(opts);
    for (const testId of CONTROL_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeDisabled();
    }
  });

  it('names the refusal on every disabled control through a resolvable description', () => {
    // Finding #42's lesson, applied here before it can be repeated: a
    // description that names no element in the document reaches nobody.
    renderSurface({ projectionSignal: 'PROJECTION_REBUILDING' });
    for (const testId of CONTROL_TEST_IDS) {
      const control = screen.getByTestId(testId);
      const describedBy = control.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      const description = document.getElementById(describedBy as string);
      expect(description).not.toBeNull();
      expect(description?.textContent).toBe(gateReason('rebuilding'));
    }
  });

  it('carries the posture-specific reason, not one generic refusal', () => {
    renderSurface({ client: { ready: false } });
    const control = screen.getByTestId('declare-movement-button');
    const description = document.getElementById(
      control.getAttribute('aria-describedby') as string,
    );
    expect(description?.textContent).toBe(gateReason('behind'));
    expect(description?.textContent).not.toBe(gateReason('rebuilding'));
  });

  it.each([
    ['pending', { client: { pendingIntentCount: 1 } }],
    ['live', {}],
  ])('keeps the bar playable in the %s posture', (_state, opts) => {
    // The carve-out 3a pinned: `pending` is the player's OWN command in
    // flight, not a stale board. A gate that collapsed to
    // `!posture.commandsEnabled` would take the bar away here.
    // `declare-movement` is excluded deliberately: it is disabled here
    // for want of a map selection, which is not the gate's doing.
    renderSurface(opts);
    expect(screen.getByTestId('advance-phase-button')).not.toBeDisabled();
    expect(screen.getByTestId('concede-button')).not.toBeDisabled();
    expect(screen.getByTestId('advance-phase-button')).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('shows the server recovery action and disables commands for a stale-branch block', () => {
    renderSurface({
      projectionSignal: {
        code: 'STALE_BRANCH',
        conflictHead: { branchId: 'root', revision: 7 },
        recoveryAction: 'resync-to-active-head',
      },
    });

    expect(screen.getByTestId('tactical-branch-recovery-action')).toHaveTextContent(
      'resync-to-active-head',
    );
    for (const testId of CONTROL_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeDisabled();
    }
  });

  it('sends nothing while a control is gated', () => {
    const { onSendGameIntent } = renderSurface({
      projectionSignal: 'PROJECTION_REBUILDING',
    });
    for (const testId of CONTROL_TEST_IDS) {
      fireEvent.click(screen.getByTestId(testId));
    }
    expect(onSendGameIntent).not.toHaveBeenCalled();
  });
});

describe('networked action control context', () => {
  it('hands the controls a sender that refuses while the gate refuses', () => {
    // The dispatch half of the gate. Disabling a button is not a
    // refusal: the surface must also decline to ask the server, or a
    // path that is not a mouse click becomes the silent retry.
    const onSendIntent = jest.fn();
    const context = buildActionControlContext({
      session: mirrorOrThrow(),
      enabled: false,
      canAdvancePhase: false,
      authorPeerId: 'pid_host',
      selectedUnitId: 'player-1',
      selectedHex: { q: 0, r: 0 },
      targetUnitId: null,
      onSendIntent,
      commandGate: {
        available: false,
        reason: gateReason('rebuilding'),
      },
    });

    context.onSendIntent({
      type: 'endPhase',
      payload: {},
      authorPeerId: 'pid_host',
    });

    expect(onSendIntent).not.toHaveBeenCalled();
  });

  it('forwards normally when the gate allows', () => {
    const onSendIntent = jest.fn();
    const context = buildActionControlContext({
      session: mirrorOrThrow(),
      enabled: true,
      canAdvancePhase: true,
      authorPeerId: 'pid_host',
      selectedUnitId: 'player-1',
      selectedHex: { q: 0, r: 0 },
      targetUnitId: null,
      onSendIntent,
      commandGate: { available: true },
    });

    const intent = {
      type: 'endPhase' as const,
      payload: {},
      authorPeerId: 'pid_host',
    };
    context.onSendIntent(intent);

    expect(onSendIntent).toHaveBeenCalledWith(intent);
  });
});
