/**
 * Perf P2: what one appended event and one hex hover cost the play page,
 * and how many event-log rows render at 50, 500 and 2,000 events.
 *
 * Real `GameSessionPage`, real gameplay store, real `InteractiveSession`
 * (inline units, no catalog reads). A `<Profiler>` counts React commits;
 * `counted` wrappers count real body executions of the page, the layout,
 * the map, the event log and its rows.
 */
import 'fake-indexeddb/auto';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import React, { Profiler } from 'react';

import type { IAdaptedUnit } from '@/engine/types';

import { GameEngine } from '@/engine/GameEngine';
import {
  flushMatchLogWrites,
  matchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import GameSessionPage from '@/pages/gameplay/games/[id]';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  Facing,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';

import {
  counted,
  renderCounts,
  resetRenderCounts,
} from './renderCounts.test-helpers';

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { id: 'p2-render-counts' },
    asPath: '/gameplay/games/p2-render-counts',
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));
jest.mock(
  '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle',
  () => ({
    ...jest.requireActual(
      '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle',
    ),
    useGameSessionLifecycle: jest.fn(),
  }),
);
jest.mock('@/hooks/useP2PCommandGate', () => ({
  useP2PCommandGate: () => undefined,
}));
jest.mock('@/components/gameplay/GameplayLayout', () => {
  const actual = jest.requireActual('@/components/gameplay/GameplayLayout');
  const { counted: count } = jest.requireActual('./renderCounts.test-helpers');
  return { ...actual, GameplayLayout: count('layout', actual.GameplayLayout) };
});
jest.mock('@/components/gameplay/HexMapDisplay/HexMapDisplay', () => {
  const actual = jest.requireActual(
    '@/components/gameplay/HexMapDisplay/HexMapDisplay',
  );
  const { counted: count } = jest.requireActual('./renderCounts.test-helpers');
  const HexMapDisplay = count('map', actual.HexMapDisplay);
  return { ...actual, HexMapDisplay, default: HexMapDisplay };
});
jest.mock('@/components/gameplay/EventLogDisplay', () => {
  const actual = jest.requireActual('@/components/gameplay/EventLogDisplay');
  const { counted: count } = jest.requireActual('./renderCounts.test-helpers');
  const EventLogDisplay = count('eventLog', actual.EventLogDisplay);
  return { ...actual, EventLogDisplay, default: EventLogDisplay };
});
jest.mock('@/components/gameplay/EventLogDisplayRow', () => {
  const actual = jest.requireActual('@/components/gameplay/EventLogDisplayRow');
  const { counted: count } = jest.requireActual('./renderCounts.test-helpers');
  return { ...actual, EventRow: count('eventRow', actual.EventRow) };
});

const Page = counted('page', GameSessionPage);

let commits = 0;
const onRender = (): void => {
  commits += 1;
};

function adaptedUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [
      {
        id: `${id}-ml-1`,
        name: 'Medium Laser',
        shortRange: 3,
        mediumRange: 6,
        longRange: 9,
        damage: 5,
        heat: 3,
        minRange: 0,
        ammoPerTon: -1,
        destroyed: false,
      },
    ],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

/** A real battle in Movement where the local player moves first. */
function createBattle(): ReturnType<GameEngine['createInteractiveSession']> {
  for (let seed = 1; seed < 50; seed++) {
    const battle = new GameEngine({
      seed,
      turnLimit: 0,
      mapRadius: 7,
    }).createInteractiveSession(
      [adaptedUnit('player-1', GameSide.Player, { q: 0, r: 3 })],
      [adaptedUnit('opponent-1', GameSide.Opponent, { q: 0, r: -3 })],
      [
        gameUnit('player-1', GameSide.Player),
        gameUnit('opponent-1', GameSide.Opponent),
      ],
    );
    battle.advancePhase();
    if (battle.getState().firstMover === GameSide.Player) return battle;
  }
  throw new Error('No seed under 50 gives the player the first move');
}

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function snapshot(): Record<string, number> {
  return { commits, ...renderCounts };
}

function reset(): void {
  commits = 0;
  resetRenderCounts();
}

/** Append `count` copies of a non-movement event to the store session. */
function appendEvents(count: number, tag: string): void {
  const session = useGameplayStore.getState().session;
  if (!session) throw new Error('No session');
  const template = session.events[0];
  const lastSequence = session.events[session.events.length - 1].sequence;
  const extra: IGameEvent[] = Array.from({ length: count }, (_, index) => ({
    ...template,
    id: `${tag}-${index}`,
    sequence: lastSequence + index + 1,
  }));
  useGameplayStore.setState({
    session: { ...session, events: [...session.events, ...extra] },
  });
}

async function mountPage(phase: GamePhase): Promise<void> {
  const battle = createBattle();
  while (battle.getState().phase !== phase) battle.advancePhase();
  useGameplayStore.getState().setInteractiveSession(battle);
  useGameplayStore.getState().selectUnit('player-1');
  render(
    <Profiler id="play-page" onRender={onRender}>
      <Page />
    </Profiler>,
  );
  await settle();
  // The log starts collapsed; measure it the way a player reads it, open.
  fireEvent.click(screen.getByTestId('event-log-toggle'));
  await settle();
}

async function hoverHex(testId: string): Promise<Record<string, number>> {
  reset();
  act(() => {
    fireEvent.mouseEnter(screen.getByTestId(testId));
  });
  await settle();
  return snapshot();
}

/** The hex two steps ahead (north) of the deployed player unit. */
function hexAheadOfPlayer(): string {
  const unit =
    useGameplayStore.getState().session?.currentState.units['player-1'];
  if (!unit) throw new Error('No player unit');
  return `hex-${unit.position.q}-${unit.position.r - 2}`;
}

/**
 * What the page shows: the map tooltip text, and an FNV-1a hash of the whole
 * page DOM so a run on main and a run on the branch can be compared exactly.
 */
function pageOutput(): { readonly tooltip: string; readonly domHash: string } {
  // Random per-run ids (UUIDs, terrain clip ids) are masked.
  const html = screen
    .getByTestId('game-session')
    .outerHTML.replace(/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/g, 'uuid')
    .replace(/terrain-clip-[a-z0-9]+/g, 'terrain-clip');
  let hash = 0x811c9dc5;
  for (let i = 0; i < html.length; i++) {
    hash = Math.imul(hash ^ html.charCodeAt(i), 0x01000193) >>> 0;
  }
  const tooltip = Array.from(
    document.querySelectorAll('[data-testid$="-tooltip"]'),
  )
    .map((node) => node.textContent)
    .join(' | ');
  return { tooltip, domHash: `${html.length}:${hash.toString(16)}` };
}

const results: Record<string, unknown> = {};

beforeEach(() => {
  matchLogStorage.close();
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    configurable: true,
    writable: true,
  });
});

afterEach(async () => {
  cleanup();
  await flushMatchLogWrites();
  useGameplayStore.getState().reset();
  useAnimationQueue.getState().reset();
  matchLogStorage.close();
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`P2 render counts ${JSON.stringify(results, null, 2)}`);
});

describe('play page renders per event and per hover (perf P2)', () => {
  it('(a) renders the page once and only the new log row for one appended event', async () => {
    await mountPage(GamePhase.Movement);
    reset();
    act(() => appendEvents(1, 'p2-a'));
    await settle();
    const counts = snapshot();
    results.appendOneEvent = { ...counts, ...pageOutput() };
    expect(counts).toMatchObject({ commits: 1, page: 1, eventRow: 1 });
  });

  it('(b) leaves the page and the log alone for one movement-phase hover', async () => {
    await mountPage(GamePhase.Movement);
    expect(pageOutput().tooltip).toBe('');
    const counts = await hoverHex(hexAheadOfPlayer());
    const after = pageOutput();
    results.hoverMovement = { ...counts, ...after };
    // The hover still reaches the map: the reachable hex's movement tooltip.
    expect(after.tooltip).toContain('Reachable - walkMP: 2');
    expect(after.tooltip).toContain('Path: 2 steps');
    expect(counts).toMatchObject({
      commits: 1,
      page: 0,
      eventLog: 0,
      eventRow: 0,
    });
    expect(counts.map).toBeGreaterThan(0);
  });

  it('(b) leaves the page and the log alone for one weapon-attack-phase hover', async () => {
    await mountPage(GamePhase.WeaponAttack);
    const counts = await hoverHex(hexAheadOfPlayer());
    const after = pageOutput();
    results.hoverAttack = { ...counts, ...after };
    expect(after.tooltip).toContain('In range');
    expect(counts).toMatchObject({
      commits: 1,
      page: 0,
      eventLog: 0,
      eventRow: 0,
    });
  });

  it.each([50, 500, 2000])(
    '(c) keeps all %i log rows and renders one per append, none per hover',
    async (total) => {
      await mountPage(GamePhase.Movement);
      const existing = useGameplayStore.getState().session?.events.length ?? 0;
      act(() => appendEvents(total - existing, `p2-c${total}`));
      await settle();
      const domRows = screen.queryAllByTestId('event-row').length;
      reset();
      act(() => appendEvents(1, `p2-c${total}-append`));
      await settle();
      const append = snapshot();
      const hover = await hoverHex(hexAheadOfPlayer());
      const row = {
        events: total,
        domRows,
        appendRowRenders: append.eventRow,
        appendCommits: append.commits,
        hoverRowRenders: hover.eventRow,
      };
      results[`log${total}`] = row;
      // Not windowed: every row stays in the DOM (find-in-page, screen
      // readers); the saving is renders, not rows.
      expect(row).toEqual({
        events: total,
        domRows: total,
        appendRowRenders: 1,
        appendCommits: 1,
        hoverRowRenders: 0,
      });
    },
  );
});
