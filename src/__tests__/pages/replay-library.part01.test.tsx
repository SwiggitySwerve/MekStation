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

  it('lists entries from a mocked /api/replay-library fetch', async () => {
    const entries = [
      makeSwarmEntry({ id: 'sim-1' }),
      makeSwarmEntry({ id: 'sim-2', path: 'swarm/sim-2.jsonl' }),
      makeSwarmEntry({ id: 'sim-3', path: 'swarm/sim-3.jsonl' }),
      makeQuickEntry({ id: 'quick-9' }),
      makeQuickEntry({ id: 'quick-10', path: 'quick/quick-10.jsonl' }),
    ];
    setupFetchMock({ entries, total: entries.length });

    await renderLibrary();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/replay-library');
    });

    expect(screen.getByTestId('replay-row-sim-1')).toBeInTheDocument();
    expect(screen.getByTestId('replay-row-sim-2')).toBeInTheDocument();
    expect(screen.getByTestId('replay-row-sim-3')).toBeInTheDocument();
    expect(screen.getByTestId('replay-row-quick-9')).toBeInTheDocument();
    expect(screen.getByTestId('replay-row-quick-10')).toBeInTheDocument();
  });

  it('renders source-appropriate metadata per row', async () => {
    const entries = [
      makeSwarmEntry({ id: 'sim-1', configName: 'duel-3kbv', seed: 42 }),
      makeQuickEntry({ id: 'quick-9', aiVariant: 'aggressive-v2' }),
    ];
    setupFetchMock({ entries, total: entries.length });

    await renderLibrary();

    await waitFor(() => {
      expect(screen.getByTestId('replay-row-sim-1')).toBeInTheDocument();
    });

    // Swarm row shows configName + seed.
    const swarmRow = screen.getByTestId('replay-row-sim-1');
    expect(swarmRow).toHaveTextContent('duel-3kbv');
    expect(swarmRow).toHaveTextContent('42');
    expect(
      swarmRow.querySelector('[data-testid="replay-meta-swarm"]'),
    ).toBeTruthy();

    // Quick row shows aiVariant.
    const quickRow = screen.getByTestId('replay-row-quick-9');
    expect(quickRow).toHaveTextContent('aggressive-v2');
    expect(
      quickRow.querySelector('[data-testid="replay-meta-quick"]'),
    ).toBeTruthy();
  });

  it('source filter restricts the visible rows', async () => {
    const entries = [
      makeSwarmEntry({ id: 'sim-1' }),
      makeSwarmEntry({ id: 'sim-2', path: 'swarm/sim-2.jsonl' }),
      makeQuickEntry({ id: 'quick-9' }),
    ];
    setupFetchMock({ entries, total: entries.length });

    await renderLibrary();

    await waitFor(() => {
      expect(screen.getByTestId('replay-row-sim-1')).toBeInTheDocument();
    });

    // All three visible at first.
    expect(screen.getByTestId('replay-row-sim-1')).toBeInTheDocument();
    expect(screen.getByTestId('replay-row-sim-2')).toBeInTheDocument();
    expect(screen.getByTestId('replay-row-quick-9')).toBeInTheDocument();

    // Click Quick filter — only the quick entry remains.
    await act(async () => {
      screen.getByTestId('source-filter-quick').click();
    });

    expect(screen.queryByTestId('replay-row-sim-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('replay-row-sim-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('replay-row-quick-9')).toBeInTheDocument();

    // Click Swarm filter — only swarm entries.
    await act(async () => {
      screen.getByTestId('source-filter-swarm').click();
    });

    expect(screen.getByTestId('replay-row-sim-1')).toBeInTheDocument();
    expect(screen.getByTestId('replay-row-sim-2')).toBeInTheDocument();
    expect(screen.queryByTestId('replay-row-quick-9')).not.toBeInTheDocument();
  });

  it('shows the empty state when fetch returns no entries', async () => {
    setupFetchMock({ entries: [], total: 0 });

    await renderLibrary();

    await waitFor(() => {
      expect(screen.getByTestId('replay-library-empty')).toBeInTheDocument();
    });
    expect(screen.getByTestId('replay-library-empty')).toHaveTextContent(
      'No replays yet',
    );
  });

  it('shows the loading state while fetch is in-flight', async () => {
    const { resolve } = setupFetchPending();

    let renderResult: ReturnType<typeof render> | undefined;
    await act(async () => {
      renderResult = render(<ReplayLibraryPage />);
    });

    expect(renderResult!.container.textContent).toMatch(/Loading/i);

    // Cleanup: resolve so the post-test cleanup doesn't see a dangling promise.
    await act(async () => {
      resolve({ entries: [], total: 0 });
    });
  });

  it('shows the error state when fetch returns non-200', async () => {
    setupFetchError();

    await renderLibrary();

    await waitFor(() => {
      expect(
        screen.getByText(/Replay library unavailable/i),
      ).toBeInTheDocument();
    });
  });

  it('renders a Watch button on every row', async () => {
    const entries = [
      makeSwarmEntry({ id: 'sim-1' }),
      makeQuickEntry({ id: 'quick-9' }),
    ];
    setupFetchMock({ entries, total: entries.length });

    await renderLibrary();

    await waitFor(() => {
      expect(screen.getByTestId('replay-row-sim-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('replay-watch-sim-1')).toBeInTheDocument();
    expect(screen.getByTestId('replay-watch-sim-1')).toHaveTextContent('Watch');
    expect(screen.getByTestId('replay-watch-quick-9')).toBeInTheDocument();
  });
});
