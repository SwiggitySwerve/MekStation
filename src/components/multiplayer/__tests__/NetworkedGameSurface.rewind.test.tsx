/**
 * The GM rewind preview flow on the networked lobby surface (umbrella 19.3).
 *
 * The lobby route is the only mount for the host-GM controls, so these rows
 * cover who gets them (the #21-class relationship: the control follows the
 * authority projection's `viewerRole`, not the raw player id) and what the
 * flow does with a producer's answer.
 *
 * REPLACED-WHEN-EMITTED: the preview producer is injected. The route that
 * will supply it, `POST /api/matches/[id]/rewind-preview`, is task 3b-iii
 * and does not exist yet; it will return the `GmCombatRewindPreviewResult`
 * union verbatim (200 preview / 403 / 404 / 409 refusals), with transport
 * failures carrying no `kind` at all - which is why a producer that throws
 * lands here as `unavailable` rather than as a domain refusal.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import type { INetworkedGameSurfaceProps } from '../NetworkedGameSurface';

import { NetworkedGameSurface } from '../NetworkedGameSurface';

function buildSession() {
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
    { id: 'match-rewind-fixture', createdAt: '2026-09-02T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session);
  return session;
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

function renderSurface(overrides: Partial<INetworkedGameSurfaceProps> = {}) {
  const authoritative = buildSession();
  return render(
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
      onSendGameIntent={jest.fn(() => true)}
      {...overrides}
    />,
  );
}

const PREVIEW_ANSWER = {
  kind: 'preview',
  matchId: 'match-rewind-fixture',
  targetRevision: 3,
  priorHead: { branchId: 'root', revision: 7, effectiveGeneration: 1 },
  changedViewerIds: ['pid_host', 'pid_guest'],
  entries: [
    { artifactKind: 'checkpoint', artifactId: 'cp-1', sourceRevision: 5 },
  ],
} as const;

const COMMITTED_ANSWER: GmCombatRewindCommitResult = {
  kind: 'committed',
  matchId: 'match-rewind-fixture',
  activatedBranchId: 'candidate-1',
  priorBranchId: 'root',
  effectiveGeneration: 2,
  invalidations: [
    { artifactKind: 'checkpoint', artifactId: 'cp-1', sourceRevision: 5 },
  ],
};

const COMMIT_REFUSED: GmCombatRewindCommitResult = {
  kind: 'refused',
  reason: 'campaign-receipt-delivered',
  detail: 'raw operator text',
};

describe('NetworkedGameSurface — who gets the rewind control', () => {
  it('offers it to the host GM', () => {
    renderSurface();
    expect(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    ).toBeInTheDocument();
  });

  it('offers it to nobody else at the table', () => {
    renderSurface({ playerId: 'pid_guest' });
    expect(
      screen.queryByTestId('networked-gm-rewind-preview-btn'),
    ).not.toBeInTheDocument();
  });

  it('offers confirm to nobody else at the table', () => {
    renderSurface({
      playerId: 'pid_guest',
      onPreviewRewind: jest.fn().mockResolvedValue(PREVIEW_ANSWER),
      onConfirmRewind: jest.fn().mockResolvedValue(COMMITTED_ANSWER),
    });
    expect(
      screen.queryByTestId('networked-gm-rewind-preview-btn'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('gm-rewind-confirm')).not.toBeInTheDocument();
  });

  it('offers it to no spectator, even one holding the host id', () => {
    renderSurface({ spectator: true });
    expect(
      screen.queryByTestId('networked-gm-rewind-preview-btn'),
    ).not.toBeInTheDocument();
  });

  it('mounts none of the inert correction stubs it replaced', () => {
    // Defect #15: those two buttons called props that defaulted to no-ops,
    // so the lobby route - which passes neither - shipped a host GM two
    // controls that did nothing. The defaults are gone, so a caller that
    // supplies no handler gets no button.
    renderSurface();
    expect(
      screen.queryByTestId('networked-gm-preview-btn'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('networked-gm-approve-btn'),
    ).not.toBeInTheDocument();
  });

  it('keeps the GM-fix stubs for the harness that actually wires them', () => {
    // A regression pin, not a design: `/e2e/networked-command-proof` passes
    // both handlers and two Playwright specs click the buttons. This row is
    // the runnable statement of that relationship, so removing the block
    // goes red here rather than in a browser nobody ran.
    renderSurface({
      onPreviewHostGmCorrection: jest.fn(),
      onApproveHostGmCorrection: jest.fn(),
    });
    expect(screen.getByTestId('networked-gm-preview-btn')).toBeInTheDocument();
    expect(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    ).toBeInTheDocument();
    // Distinct containers, so neither locator resolves to two elements.
    expect(screen.getByTestId('networked-host-gm-controls')).not.toBe(
      screen.getByTestId('networked-gm-rewind-controls'),
    );
  });
});

describe('NetworkedGameSurface — the preview flow', () => {
  it('shows the blast radius the producer answered with', async () => {
    const onPreviewRewind = jest.fn().mockResolvedValue(PREVIEW_ANSWER);
    renderSurface({ onPreviewRewind });
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId('gm-rewind-preview-blast-radius'),
      ).toHaveTextContent('1 saved artifact'),
    );
    expect(onPreviewRewind).toHaveBeenCalledTimes(1);
  });

  it('opens no dialog when no producer is wired', async () => {
    renderSurface();
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('networked-gm-rewind-unavailable'),
    ).toBeInTheDocument();
  });

  it('keeps the dialog open on a refusal and phrases it for the GM', async () => {
    const onPreviewRewind = jest.fn().mockResolvedValue({
      kind: 'refused',
      reason: 'PROJECTION_REBUILDING',
      detail: 'raw operator text',
    });
    renderSurface({ onPreviewRewind });
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-refusal')).toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('raw operator text');
  });

  it('treats a producer that throws as a preview it could not get', async () => {
    const onPreviewRewind = jest
      .fn()
      .mockRejectedValue(new Error('socket hang up at 127.0.0.1'));
    renderSurface({ onPreviewRewind });
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-refusal')).toHaveTextContent(
        /could not answer/i,
      ),
    );
    expect(document.body.textContent).not.toContain('socket hang up');
  });

  it('confirm calls the producer once and phrases committed', async () => {
    const onPreviewRewind = jest.fn().mockResolvedValue(PREVIEW_ANSWER);
    const onConfirmRewind = jest.fn().mockResolvedValue(COMMITTED_ANSWER);
    renderSurface({ onPreviewRewind, onConfirmRewind });
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-confirm')).toBeEnabled(),
    );
    await userEvent.click(screen.getByTestId('gm-rewind-confirm'));
    expect(onConfirmRewind).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-committed')).toHaveTextContent(
        /committed/i,
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('a campaign-receipt-delivered refusal keeps the dialog open with its phrasing', async () => {
    const onPreviewRewind = jest.fn().mockResolvedValue(PREVIEW_ANSWER);
    const onConfirmRewind = jest.fn().mockResolvedValue(COMMIT_REFUSED);
    renderSurface({ onPreviewRewind, onConfirmRewind });
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-confirm')).toBeEnabled(),
    );
    await userEvent.click(screen.getByTestId('gm-rewind-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-refusal')).toHaveTextContent(
        /campaign has already taken delivery/i,
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('raw operator text');
    expect(screen.queryByTestId('gm-rewind-committed')).not.toBeInTheDocument();
  });

  it('confirm is disabled while in flight so a second click does not call the producer again', async () => {
    let resolveCommit: (value: GmCombatRewindCommitResult) => void =
      () => undefined;
    const onPreviewRewind = jest.fn().mockResolvedValue(PREVIEW_ANSWER);
    const onConfirmRewind = jest.fn(
      () =>
        new Promise<GmCombatRewindCommitResult>((resolve) => {
          resolveCommit = resolve;
        }),
    );
    renderSurface({ onPreviewRewind, onConfirmRewind });
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-confirm')).toBeEnabled(),
    );
    const confirm = screen.getByTestId('gm-rewind-confirm');
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirmRewind).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(confirm).toBeDisabled());
    resolveCommit(COMMITTED_ANSWER);
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-committed')).toBeInTheDocument(),
    );
  });

  it('closes on cancel and applies nothing', async () => {
    const onPreviewRewind = jest.fn().mockResolvedValue(PREVIEW_ANSWER);
    const onConfirmRewind = jest.fn();
    renderSurface({ onPreviewRewind, onConfirmRewind });
    await userEvent.click(
      screen.getByTestId('networked-gm-rewind-preview-btn'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-cancel')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByTestId('gm-rewind-cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirmRewind).not.toHaveBeenCalled();
  });
});
