/**
 * The host GM correction producers (roadmap U5b, E2E-25's client half).
 *
 * E2E-25 says the private detail belongs in the GM private record and
 * NOWHERE else. This suite is the runnable half of that sentence on the
 * client: the reason reaches exactly one place, the commit call's own
 * argument, and every other thing the hook emits or touches is swept for
 * it. A row that only asserted "approve sends the reason" would pass with
 * the same string also sitting in the preview request, in a store, or in
 * a rendered line - which is the failure this unit exists to prevent.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';

import type { GmRewindPreviewOutcome } from '@/components/multiplayer/gmRewindPreviewPhrasing';
import type { IPreviewGmCombatRewindInput } from '@/lib/multiplayer/client/previewGmCombatRewind';
import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import type { IGmCorrectionCommitInput } from '@/pages-modules/multiplayer/useGmCorrectionProducers';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { MATCH_BASELINE_FIRST_GENERATION } from '@/lib/multiplayer/server/matchAuthorityBaseline';
import { useGmCorrectionProducers } from '@/pages-modules/multiplayer/useGmCorrectionProducers';
import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Fixtures
// =============================================================================

const PRIVATE_REASON = 'guest rolled for the wrong mech; GM eyes only';

/**
 * Two events so the believed head is a real number rather than the
 * empty-mirror floor - a request derived from an empty mirror would be
 * legal but would not prove the builder read the mirror at all.
 */
const MIRROR_EVENTS: readonly IGameEvent[] = [
  {
    id: 'evt-0',
    type: GameEventType.GameCreated,
    timestamp: '2026-09-17T00:00:00.000Z',
    sequence: 0,
    data: {},
  } as unknown as IGameEvent,
  {
    id: 'evt-1',
    type: GameEventType.PhaseChanged,
    timestamp: '2026-09-17T00:00:01.000Z',
    sequence: 6,
    data: {},
  } as unknown as IGameEvent,
];

const EXPECTED_REQUEST = {
  matchId: 'match-1',
  wireToken: 'wire-token',
  targetRevision: 6,
  expectedBranchId: ROOT_EVENT_BRANCH_ID,
  expectedRevision: 7,
  expectedDigest: '',
  expectedGeneration: MATCH_BASELINE_FIRST_GENERATION,
};

const PREVIEW_ANSWER: GmRewindPreviewOutcome = {
  kind: 'preview',
  matchId: 'match-1',
  targetRevision: 6,
  priorHead: { branchId: 'root', revision: 7, effectiveGeneration: 1 },
  changedViewerIds: ['pid_host', 'pid_guest'],
  entries: [],
};

const COMMITTED = {
  kind: 'committed',
  matchId: 'match-1',
  activatedBranchId: 'candidate-1',
  priorBranchId: 'root',
  effectiveGeneration: 2,
  invalidations: [],
} as const;

function mountHook(overrides?: {
  readonly matchId?: string | null;
  readonly wireToken?: string | null;
}) {
  const preview = jest.fn(
    async (
      _request: IPreviewGmCombatRewindInput,
    ): Promise<GmRewindPreviewOutcome> => PREVIEW_ANSWER,
  );
  const commit = jest.fn(
    async (
      _request: IGmCorrectionCommitInput,
    ): Promise<GmCombatRewindCommitResult> => COMMITTED,
  );
  const rendered = renderHook(() =>
    useGmCorrectionProducers({
      matchId: overrides?.matchId === undefined ? 'match-1' : overrides.matchId,
      wireToken:
        overrides?.wireToken === undefined ? 'wire-token' : overrides.wireToken,
      mirrorEvents: MIRROR_EVENTS,
      preview,
      commit,
    }),
  );
  return { preview, commit, result: rendered.result };
}

// =============================================================================
// Rows
// =============================================================================

describe('useGmCorrectionProducers - the previewed request', () => {
  it('asks the injected preview for the same request the rewind flow builds', async () => {
    const { preview, result } = mountHook();

    await act(async () => {
      await result.current.onPreviewHostGmCorrection();
    });

    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview.mock.calls[0]?.[0]).toStrictEqual(EXPECTED_REQUEST);
  });

  it('answers unavailable, and asks nothing, without a match or a token', async () => {
    const { preview, result } = mountHook({ wireToken: null });

    let outcome: GmRewindPreviewOutcome | undefined;
    await act(async () => {
      outcome = await result.current.onPreviewHostGmCorrection();
    });

    expect(outcome).toStrictEqual({ kind: 'unavailable' });
    expect(preview).not.toHaveBeenCalled();
  });
});

describe('useGmCorrectionProducers - what approve commits', () => {
  it('commits the exact previewed request plus the captured reason', async () => {
    const { commit, result } = mountHook();

    await act(async () => {
      await result.current.onPreviewHostGmCorrection();
    });
    act(() => {
      result.current.setPrivateReason(PRIVATE_REASON);
    });
    await act(async () => {
      await result.current.onApproveHostGmCorrection();
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0]?.[0]).toStrictEqual({
      ...EXPECTED_REQUEST,
      reason: PRIVATE_REASON,
    });
  });

  it('commits no reason field at all when the GM typed nothing', async () => {
    const { commit, result } = mountHook();

    await act(async () => {
      await result.current.onPreviewHostGmCorrection();
    });
    await act(async () => {
      await result.current.onApproveHostGmCorrection();
    });

    const body = commit.mock.calls[0]?.[0];
    expect(body).toStrictEqual(EXPECTED_REQUEST);
    expect(body !== undefined && 'reason' in body).toBe(false);
  });

  it('treats a whitespace-only reason as no reason', async () => {
    const { commit, result } = mountHook();

    await act(async () => {
      await result.current.onPreviewHostGmCorrection();
    });
    act(() => {
      result.current.setPrivateReason('   ');
    });
    await act(async () => {
      await result.current.onApproveHostGmCorrection();
    });

    const body = commit.mock.calls[0]?.[0];
    expect(body !== undefined && 'reason' in body).toBe(false);
  });

  it('refuses to commit anything before a preview was asked for', async () => {
    const { commit, result } = mountHook();

    act(() => {
      result.current.setPrivateReason(PRIVATE_REASON);
    });
    await act(async () => {
      await expect(
        result.current.onApproveHostGmCorrection(),
      ).rejects.toBeInstanceOf(Error);
    });

    expect(commit).not.toHaveBeenCalled();
  });
});

describe('useGmCorrectionProducers - where the private reason is NOT', () => {
  it('keeps it out of the preview request, the returned values and web storage', async () => {
    const { preview, commit, result } = mountHook();

    act(() => {
      result.current.setPrivateReason(PRIVATE_REASON);
    });
    await act(async () => {
      await result.current.onPreviewHostGmCorrection();
    });
    await act(async () => {
      await result.current.onApproveHostGmCorrection();
    });

    // Every argument the hook emitted, except the commit body that is
    // supposed to carry it.
    const previewArgs = JSON.stringify(preview.mock.calls);
    expect(previewArgs).not.toContain(PRIVATE_REASON);

    // Everything the hook hands back to its caller.
    const surfaced = Object.keys(result.current);
    expect(surfaced.sort()).toStrictEqual(
      [
        'onApproveHostGmCorrection',
        'onPreviewHostGmCorrection',
        'setPrivateReason',
      ].sort(),
    );
    const surfacedValues = result.current as unknown as Record<string, unknown>;
    for (const key of surfaced) {
      expect(typeof surfacedValues[key]).toBe('function');
    }

    // Anything the hook could have written on its way through.
    expect(JSON.stringify(window.sessionStorage)).not.toContain(PRIVATE_REASON);
    expect(JSON.stringify(window.localStorage)).not.toContain(PRIVATE_REASON);
    expect(document.body.textContent ?? '').not.toContain(PRIVATE_REASON);

    // And the one place it IS allowed to be.
    expect(JSON.stringify(commit.mock.calls)).toContain(PRIVATE_REASON);
  });
});
