/**
 * The host GM's correction producers for the lobby route (roadmap U5b,
 * E2E-25's client half).
 *
 * Sibling of `useGmRewindProducers`, and deliberately built on the SAME
 * request: `buildGmRewindRequest` is the single body both flows ask with,
 * so the correction the GM approves is the one whose blast radius the
 * rewind dialog on the same surface describes. Two builders would be two
 * CAS bindings and the GM would approve one having been shown the other.
 *
 * WHAT IS NEW HERE is the private reason. E2E-25 says the GM finalizes a
 * correction with a private reason and that only the GM private record
 * holds that detail. This hook is the capture end of that sentence, and
 * the rule it keeps is narrow and total: the reason lives in a ref and
 * appears in exactly ONE place, the `commit` call's own argument object.
 * It is never React state, never a store, never part of the preview
 * request, never rendered, and never put on the wire by anything here.
 *
 * WHERE THE REASON GOES AFTER THIS HOOK. `commitGmCombatRewind` posts the
 * five CAS fields (targetRevision, expectedBranchId, expectedRevision,
 * expectedDigest, expectedGeneration) and adds `reason` when the trimmed
 * reason is not empty. The rewind-commit route takes it as the optional
 * `reason` of `IRewindCommitBody`, answers 400 unless its trimmed length
 * is 1 to 2000 UTF-16 code units, and, when the rewind commits, writes it
 * to the GM private record. The history commit itself still carries the
 * route's `REWIND_COMMIT_REASON` constant as its reason; the GM's text is
 * stored only in that private record.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import { useCallback, useRef } from 'react';

import type { GmRewindPreviewOutcome } from '@/components/multiplayer/gmRewindPreviewPhrasing';
import type { ICommitGmCombatRewindInput } from '@/lib/multiplayer/client/commitGmCombatRewind';
import type { IPreviewGmCombatRewindInput } from '@/lib/multiplayer/client/previewGmCombatRewind';
import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  commitGmCombatRewind,
  GmCombatRewindTransportError,
} from '@/lib/multiplayer/client/commitGmCombatRewind';
import { previewGmCombatRewind } from '@/lib/multiplayer/client/previewGmCombatRewind';
import { buildGmRewindRequest } from '@/pages-modules/multiplayer/useGmRewindProducers';

/**
 * The commit body plus the GM's private reason. `reason` is ABSENT, not
 * empty, when the GM typed nothing: an empty string is a value a server
 * would have to decide what to do with, and there is nothing to decide.
 */
export type IGmCorrectionCommitInput = ICommitGmCombatRewindInput & {
  readonly reason?: string;
};

export interface IUseGmCorrectionProducersInput {
  readonly matchId: string | null;
  readonly wireToken: string | null;
  readonly mirrorEvents: readonly IGameEvent[];
  /** Injectable so the producer contract is testable without a socket. */
  readonly preview?: (
    request: IPreviewGmCombatRewindInput,
  ) => Promise<GmRewindPreviewOutcome>;
  /** Injectable for the same reason; this is the ONLY carrier of the reason. */
  readonly commit?: (
    request: IGmCorrectionCommitInput,
  ) => Promise<GmCombatRewindCommitResult>;
}

export interface IUseGmCorrectionProducers {
  /** Asks for the blast radius of the correction, committing nothing. */
  readonly onPreviewHostGmCorrection: () => Promise<GmRewindPreviewOutcome>;
  /** Remembers what the GM typed. Writes nowhere else, by construction. */
  readonly setPrivateReason: (reason: string) => void;
  /** Applies the previewed correction, carrying the reason if there is one. */
  readonly onApproveHostGmCorrection: () => Promise<GmCombatRewindCommitResult>;
}

export function useGmCorrectionProducers(
  input: IUseGmCorrectionProducersInput,
): IUseGmCorrectionProducers {
  const { matchId, wireToken } = input;
  const preview = input.preview ?? previewGmCombatRewind;
  const commit = input.commit ?? commitGmCombatRewind;

  const lastRequestRef = useRef<IPreviewGmCombatRewindInput | null>(null);
  // WHY a ref and not state: a re-render must not be able to publish this,
  // and nothing outside `onApproveHostGmCorrection` may read it. A state
  // value is a value the surface can render by accident; a ref is not.
  const privateReasonRef = useRef<string>('');

  // WHY the producers are kept out of the dependency arrays: a page that
  // passes them inline would otherwise rebuild both callbacks every
  // render. They are read through refs that always hold the latest value.
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const onPreviewHostGmCorrection =
    useCallback(async (): Promise<GmRewindPreviewOutcome> => {
      const request = await buildGmRewindRequest({
        matchId,
        wireToken,
      });
      if (request === null) {
        return { kind: 'unavailable' };
      }
      // WHY pinned: approve must carry the body the preview answered for.
      // Re-deriving at approve time would commit a different head than the
      // one whose blast radius the GM was shown.
      lastRequestRef.current = request;
      return previewRef.current(request);
    }, [matchId, wireToken]);

  const setPrivateReason = useCallback((reason: string): void => {
    privateReasonRef.current = reason;
  }, []);

  const onApproveHostGmCorrection =
    useCallback(async (): Promise<GmCombatRewindCommitResult> => {
      const request = lastRequestRef.current;
      if (request === null) {
        // Same refusal shape as the rewind confirm arm: approving without
        // a preview has no body to approve, and inventing one would apply
        // a correction nobody looked at.
        throw new GmCombatRewindTransportError();
      }
      const reason = privateReasonRef.current.trim();
      return commitRef.current(
        reason.length > 0 ? { ...request, reason } : request,
      );
    }, []);

  return {
    onPreviewHostGmCorrection,
    setPrivateReason,
    onApproveHostGmCorrection,
  };
}
