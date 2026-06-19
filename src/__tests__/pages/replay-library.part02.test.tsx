/**
 * Replay Library page tests.
 *
 * Phase A coverage:
 *   1. Lists entries from a mocked /api/replay-library fetch
 *   2. Renders source-appropriate metadata per row (swarm + quick)
 *   3. Source filter restricts the visible rows
 *   4. Empty state when fetch returns { entries: [], total: 0 }
 *   5. Loading state while fetch is in-flight
 *   6. Error state when fetch returns non-200
 *   7. Watch button is present on every row (orchestrator wires it next)
 *
 * Tests live under src/__tests__/pages/ rather than src/pages/__tests__/
 * because Next.js's TypeScript route validator inspects every file under
 * src/pages/ during `next build` and treats test files as broken API
 * routes (they lack a default export shaped like a handler).
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { IReplayManifestEntry } from '@/replay-library/types';

import { ScenarioTemplateType } from '@/types/encounter';
import { GameSide, ReplaySource } from '@/types/gameplay';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Mock QuickGameReplayPanel — the page wires Watch → mounts the panel,
// but the panel itself owns the hex-map + scrubber lifecycle which is
// covered by its own tests. Stubbing it here keeps this suite focused on
// the click-to-open wiring (props passed in, viewer mode rendered).
jest.mock('@/components/quickgame/QuickGameReplayPanel', () => ({
  __esModule: true,
  QuickGameReplayPanel: ({
    gameId,
    events,
  }: {
    gameId: string;
    events: ReadonlyArray<unknown>;
  }) => (
    <div
      data-testid="quickgame-replay-panel-mock"
      data-gameid={gameId}
      data-events-count={events.length}
    >
      Mock replay panel for {gameId}
    </div>
  ),
}));

// =============================================================================
// Test Data
// =============================================================================

function makeSwarmEntry(
  overrides: Partial<IReplayManifestEntry> = {},
): IReplayManifestEntry {
  return {
    id: 'sim-1',
    replaySource: ReplaySource.Swarm,
    path: 'swarm/sim-1.jsonl',
    createdAt: '2026-05-07T10:00:00.000Z',
    turns: 8,
    winner: GameSide.Player,
    bvTotal: 4500,
    configName: 'duel-3kbv',
    seed: 42,
    batchTimestamp: '2026-05-07T10-00-00-000Z',
    ...overrides,
  } as IReplayManifestEntry;
}

function makeQuickEntry(
  overrides: Partial<IReplayManifestEntry> = {},
): IReplayManifestEntry {
  return {
    id: 'quick-9',
    replaySource: ReplaySource.Quick,
    path: 'quick/quick-9.jsonl',
    createdAt: '2026-05-07T11:00:00.000Z',
    turns: 5,
    winner: GameSide.Opponent,
    bvTotal: 3200,
    playerSide: GameSide.Player,
    aiVariant: 'aggressive-v2',
    ...overrides,
  } as IReplayManifestEntry;
}

// Per `link-encounters-to-replays` PR 3: encounter manifest entries
// expose `encounterName`, `templateType` (or null for free-form
// encounters), and rendered `playerForceSummary` / `opponentSummary`
// strings. Mirrors what `EncounterService.launchEncounter` stamps onto
// the GameCreated event at session creation.
function makeEncounterEntry(
  overrides: Partial<IReplayManifestEntry> = {},
): IReplayManifestEntry {
  return {
    id: 'enc-session-7',
    replaySource: ReplaySource.Encounter,
    path: 'encounter/enc-session-7.jsonl',
    createdAt: '2026-05-08T09:30:00.000Z',
    turns: 7,
    winner: GameSide.Player,
    bvTotal: 5400,
    encounterId: 'enc-1',
    encounterName: 'Defense of New Avalon',
    templateType: ScenarioTemplateType.Duel,
    playerForceSummary: 'Lance Alpha (4500 BV, 4 units)',
    opponentSummary: 'Generated OpFor (~3000 BV)',
    ...overrides,
  } as IReplayManifestEntry;
}

// =============================================================================
// Fetch Mock Setup
// =============================================================================

let fetchMock: jest.Mock;

interface ListResponseShape {
  readonly entries: readonly IReplayManifestEntry[];
  readonly total: number;
}

function setupFetchMock(payload: ListResponseShape, ok = true): void {
  fetchMock = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(payload),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
}

function setupFetchPending(): {
  resolve: (payload: ListResponseShape) => void;
} {
  let resolveFn: (value: unknown) => void = () => {};
  const pending = new Promise<unknown>((r) => {
    resolveFn = r;
  });
  fetchMock = jest.fn().mockReturnValue(pending);
  global.fetch = fetchMock as unknown as typeof fetch;
  return {
    resolve: (payload) =>
      resolveFn({
        ok: true,
        status: 200,
        json: () => Promise.resolve(payload),
      }),
  };
}

function setupFetchError(): void {
  fetchMock = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: 'boom' }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
}

// =============================================================================
// Imports (after mocks)
// =============================================================================

import ReplayLibraryPage from '@/components/replay-library/ReplayLibraryPage';

// =============================================================================
// Render helper — flushes the mount-effect before returning.
// =============================================================================

async function renderLibrary(): Promise<ReturnType<typeof render>> {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ReplayLibraryPage />);
  });
  return result!;
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReplayLibraryPage', () => {
  // ===========================================================================
  // Per `link-encounters-to-replays` PR 3: Encounter source variant tests.
  // The page gains a 6th source-filter button (All / Swarm / Quick / PvP /
  // Campaign / Encounter), the row renders the encounter snapshot
  // (encounterName, templateType, summary strings), the source filter
  // restricts to encounter-only rows, and Watch fetches via the
  // `/api/replay-library/encounter/<gameId>` route.
  // ===========================================================================

  it('renders 6 source-filter buttons (All / Swarm / Quick / PvP / Campaign / Encounter)', async () => {
    setupFetchMock({ entries: [], total: 0 });

    await renderLibrary();

    await waitFor(() => {
      expect(screen.getByTestId('replay-library-empty')).toBeInTheDocument();
    });

    expect(screen.getByTestId('source-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('source-filter-swarm')).toBeInTheDocument();
    expect(screen.getByTestId('source-filter-quick')).toBeInTheDocument();
    expect(screen.getByTestId('source-filter-pvp')).toBeInTheDocument();
    expect(screen.getByTestId('source-filter-campaign')).toBeInTheDocument();
    expect(screen.getByTestId('source-filter-encounter')).toBeInTheDocument();

    // Strict count assertion — adding a 7th filter without updating
    // SOURCE_FILTERS would fail this.
    const filterStrip = screen.getByTestId('source-filter');
    expect(filterStrip.querySelectorAll('button').length).toBe(6);
  });

  it('clicking Watch fetches events and mounts the replay viewer', async () => {
    const entries = [makeQuickEntry({ id: 'quick-9' })];
    const fixtureEvents = [
      { type: 'GameCreated', sequence: 1 },
      { type: 'TurnStarted', sequence: 2 },
      { type: 'GameEnded', sequence: 3 },
    ];

    fetchMock = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/replay-library') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ entries, total: entries.length }),
        });
      }
      if (url === '/api/replay-library/quick/quick-9') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ events: fixtureEvents }),
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await renderLibrary();

    await waitFor(() => {
      expect(screen.getByTestId('replay-row-quick-9')).toBeInTheDocument();
    });

    // Click Watch — this should set viewer state and trigger the events fetch.
    await act(async () => {
      screen.getByTestId('replay-watch-quick-9').click();
    });

    // The mocked panel renders once events arrive.
    await waitFor(() => {
      expect(
        screen.getByTestId('quickgame-replay-panel-mock'),
      ).toBeInTheDocument();
    });

    const panel = screen.getByTestId('quickgame-replay-panel-mock');
    expect(panel.getAttribute('data-gameid')).toBe('quick-9');
    expect(panel.getAttribute('data-events-count')).toBe(
      String(fixtureEvents.length),
    );

    // Both URLs were called — index on mount, events on Watch.
    const calledUrls = fetchMock.mock.calls.map(
      (call: ReadonlyArray<unknown>) => call[0],
    );
    expect(calledUrls).toContain('/api/replay-library');
    expect(calledUrls).toContain('/api/replay-library/quick/quick-9');

    // Back button returns to the list.
    expect(screen.getByTestId('back-to-library')).toBeInTheDocument();
    await act(async () => {
      screen.getByTestId('back-to-library').click();
    });
    expect(
      screen.queryByTestId('quickgame-replay-panel-mock'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('replay-row-quick-9')).toBeInTheDocument();
  });

  it('renders Encounter row metadata strip (name + template + force summaries)', async () => {
    const entries = [
      makeEncounterEntry({
        id: 'enc-session-7',
        encounterName: 'Defense of New Avalon',
        templateType: ScenarioTemplateType.Duel,
        playerForceSummary: 'Lance Alpha (4500 BV, 4 units)',
        opponentSummary: 'Generated OpFor (~3000 BV)',
      }),
    ];
    setupFetchMock({ entries, total: entries.length });

    await renderLibrary();

    await waitFor(() => {
      expect(
        screen.getByTestId('replay-row-enc-session-7'),
      ).toBeInTheDocument();
    });

    const row = screen.getByTestId('replay-row-enc-session-7');
    expect(row).toHaveTextContent('Defense of New Avalon');
    expect(row).toHaveTextContent('duel');
    expect(row).toHaveTextContent('Lance Alpha (4500 BV, 4 units)');
    expect(row).toHaveTextContent('Generated OpFor (~3000 BV)');

    // The dedicated metadata strip exists with the right testids.
    expect(
      row.querySelector('[data-testid="replay-meta-encounter"]'),
    ).toBeTruthy();
    expect(screen.getByTestId('replay-encounter-name')).toHaveTextContent(
      'Defense of New Avalon',
    );
    expect(screen.getByTestId('replay-template-type')).toHaveTextContent(
      'duel',
    );
    expect(screen.getByTestId('replay-player-force-summary')).toHaveTextContent(
      'Lance Alpha (4500 BV, 4 units)',
    );
    expect(screen.getByTestId('replay-opponent-summary')).toHaveTextContent(
      'Generated OpFor (~3000 BV)',
    );
  });

  it('falls back to "Custom" when templateType is null', async () => {
    const entries = [
      makeEncounterEntry({
        id: 'enc-custom-1',
        encounterName: 'Free-form Brawl',
        templateType: null,
      }),
    ];
    setupFetchMock({ entries, total: entries.length });

    await renderLibrary();

    await waitFor(() => {
      expect(screen.getByTestId('replay-row-enc-custom-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('replay-template-type')).toHaveTextContent(
      'Custom',
    );
  });
});
