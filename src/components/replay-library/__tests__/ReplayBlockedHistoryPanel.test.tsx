/**
 * Truthful blocked-state UI contract (replay-safety PR 20).
 *
 * Pins: the 422 REPLAY_HISTORY_BLOCKED response renders the PERSISTENT
 * blocked panel (never the player, never the generic error) with the
 * scope-safe evidence - source identity, format, digest, per-line
 * reason codes + event types + line numbers only, never payload
 * contents - plus recovery guidance; the panel announces via
 * role="alert"/aria-live and moves focus to its heading; row overflow
 * is summarized; and no partial replay is presented as complete.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

import {
  ReplayBlockedHistoryPanel,
  type IReplayBlockedHistoryInfo,
} from '../ReplayBlockedHistoryPanel';
import ReplayLibraryPage from '../ReplayLibraryPage';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const BLOCKED: IReplayBlockedHistoryInfo = {
  sourceId: 'quick/old-recording-7',
  formatId: 'simulation-report-jsonl',
  formatVersion: 1,
  sourceDigest: 'a'.repeat(64),
  blockedLineCount: 10,
  blockedLines: Array.from({ length: 10 }, (_, index) => ({
    line: index + 2,
    reason: 'invalid-payload',
    eventType: 'damage_applied',
  })),
};

describe('ReplayBlockedHistoryPanel', () => {
  it('renders the persistent scope-safe evidence with guidance and focuses the heading', async () => {
    render(<ReplayBlockedHistoryPanel blocked={BLOCKED} />);

    const panel = screen.getByTestId('replay-blocked-history');
    expect(panel).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: /replay blocked/i,
    });
    await waitFor(() => expect(heading).toHaveFocus());

    expect(screen.getByText('quick/old-recording-7')).toBeInTheDocument();
    expect(screen.getByText('simulation-report-jsonl@1')).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
    // Scope-safe rows: reason + eventType + line only.
    expect(
      screen.getByText('line 2: invalid-payload (damage_applied)'),
    ).toBeInTheDocument();
    // Overflow summarized (8 shown of 10).
    expect(screen.getByText(/and 2 more/)).toBeInTheDocument();
    // Recovery guidance present.
    expect(screen.getByText(/What you can do/)).toBeInTheDocument();
    expect(screen.getByText(/Watch a different replay/)).toBeInTheDocument();
  });
});

describe('ReplayLibraryPage blocked-history flow', () => {
  const entry = {
    id: 'old-recording-7',
    replaySource: 'quick',
    path: 'quick/old-recording-7.jsonl',
    createdAt: '2026-06-24T00:00:00.000Z',
    turns: 12,
    winner: 'player',
    bvTotal: 5000,
  };

  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/replay-library') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ entries: [entry] }),
        } as Response;
      }
      return {
        ok: false,
        status: 422,
        json: async () => ({
          error: 'replay history is blocked',
          code: 'REPLAY_HISTORY_BLOCKED',
          blocked: BLOCKED,
        }),
      } as Response;
    }) as unknown as typeof fetch;
  });

  it('renders the blocked panel - never the player, never the generic error', async () => {
    render(<ReplayLibraryPage />);

    const watch = await screen.findByTestId(`replay-watch-${entry.id}`);
    watch.click();

    await screen.findByTestId('replay-blocked-history');
    expect(screen.queryByTestId('replay-viewer-error')).toBeNull();
    // No player surface (partial replay) is presented - the REAL player
    // test ids, not stand-ins.
    expect(screen.queryByTestId('quickgame-replay-panel')).toBeNull();
    expect(screen.queryByTestId('replay-controls')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByText(/Loading replay events/)).toBeNull();
    // The in-panel recovery action is reachable in tab order.
    expect(screen.getByTestId('blocked-back-to-library')).toBeInTheDocument();
  });
});
