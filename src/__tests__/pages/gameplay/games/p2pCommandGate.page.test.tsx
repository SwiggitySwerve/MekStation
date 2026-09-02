/**
 * The gate reaches the dock (umbrella 19.2, finding #61) - page half.
 *
 * The game-session page is where "which transport is this session on" is
 * known: the route's match id carries the `p2p-` prefix. So the page is
 * what turns the P2P status into a `CommandAvailability` and hands it to
 * the layout. A row that stopped at the layout would pass with the page
 * computing nothing at all - which is the state this seam found.
 *
 * `GameplayLayout` is mocked here to capture the prop the page passes;
 * the layout-to-dock hops are pinned by the sibling layout rows.
 */

import { act, render } from '@testing-library/react';
import React from 'react';

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { CommandAvailability } from '@/types/gameplay/TacticalCommandInterfaces';

import { createDemoSession } from '@/__fixtures__/gameplay';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameSide } from '@/types/gameplay';

const mockCapturedLayout: { commandGate?: CommandAvailability } = {};
const mockRoute: { id: string } = { id: 'p2p-ROOM01' };

jest.mock('@/components/gameplay/GameplayLayout', () => ({
  GameplayLayout: (props: { commandGate?: CommandAvailability }) => {
    mockCapturedLayout.commandGate = props.commandGate;
    return <div data-testid="gameplay-layout-mock" />;
  },
}));

jest.mock('@/components/gameplay/SpectatorView', () => ({
  SpectatorView: () => <div data-testid="spectator-view-mock" />,
}));

jest.mock('@/components/gameplay/CombatPlanningPanel', () => ({
  CombatPlanningPanel: () => <div data-testid="planning-panel-mock" />,
}));

jest.mock('@/hooks/gameplay', () => ({
  usePhaseQueueProjection: () => ({
    activeUnitId: undefined,
    activeSide: GameSide.Player,
  }),
}));

// The lifecycle hook redirects/loads sessions and mounts the peer
// detector; neither is what these rows are about.
jest.mock(
  '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle',
  () => ({
    resolveGameSessionRouteId: jest.fn(() => mockRoute.id),
    useGameSessionLifecycle: jest.fn(),
  }),
);

jest.mock(
  '@/components/gameplay/pages/gameSession/GameSessionPage.movement',
  () => ({
    useGameMovementPlanning: () => ({
      isPlayerControlled: false,
      handleHexClick: jest.fn(),
      setHoveredHex: jest.fn(),
      movementRangeHexes: [],
      hoveredHex: null,
      hoveredMovementRangeHex: undefined,
      hoveredPath: [],
      hoverMpCost: undefined,
      hoverUnreachable: false,
      mpLegend: undefined,
      handleMovementModeSelect: jest.fn(),
      effectiveMovementMps: null,
      capability: null,
    }),
  }),
);

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    query: { id: mockRoute.id },
    pathname: '/gameplay/games/[id]',
    isReady: true,
  }),
}));

import GameSessionPage from '@/pages/gameplay/games/[id]';

function seedStore(): void {
  useGameplayStore.setState({
    session: createDemoSession(),
    isLoading: false,
    error: null,
    interactiveSession: {
      getResult: () => null,
    } as unknown as InteractiveSession,
    interactivePhase: null,
    spectatorMode: null,
    handleAction: jest.fn(),
    checkGameOver: jest.fn(),
  } as never);
}

describe('game-session page P2P command gate', () => {
  beforeEach(() => {
    mockCapturedLayout.commandGate = undefined;
    mockRoute.id = 'p2p-ROOM01';
    useGameplayStore.getState().resetLocalMatchStatus();
  });
  afterEach(() => {
    useGameplayStore.getState().resetLocalMatchStatus();
  });

  it('hands the layout a refusal once the P2P peer is gone', () => {
    seedStore();
    useGameplayStore.getState().setLocalMatchStatus('hostPending');
    render(<GameSessionPage />);
    expect(mockCapturedLayout.commandGate?.available).toBe(false);
  });

  it('hands the layout an allowance while the P2P match is live', () => {
    seedStore();
    render(<GameSessionPage />);
    expect(mockCapturedLayout.commandGate).toStrictEqual({ available: true });
  });

  it('re-renders the gate when the peer drops after the surface is mounted', () => {
    // The detector writes the status while the page is already open -
    // that is the whole point of it. A page that read the status once
    // at mount would leave the dock live for the rest of the match, and
    // every row above would still pass because they seed the store
    // BEFORE rendering. This row is what makes the subscription a fact.
    seedStore();
    render(<GameSessionPage />);
    expect(mockCapturedLayout.commandGate).toStrictEqual({ available: true });

    act(() => {
      useGameplayStore.getState().setLocalMatchStatus('hostPending');
    });

    expect(mockCapturedLayout.commandGate?.available).toBe(false);
  });

  it('hands the layout no gate at all in a single-player session', () => {
    // A local battle has no peer to lose. The gate must be absent, not
    // merely permissive: an absent gate is what keeps the dock's
    // pre-19.2 behaviour provably unchanged for single player.
    mockRoute.id = 'demo-game-001';
    seedStore();
    useGameplayStore.getState().setLocalMatchStatus('hostPending');
    render(<GameSessionPage />);
    expect(mockCapturedLayout.commandGate).toBeUndefined();
  });
});
