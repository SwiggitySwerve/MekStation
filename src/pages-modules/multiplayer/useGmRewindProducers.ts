/**
 * WHY: the lobby page is at the file-size limit. These producers are
 * one cohesive unit: preview remembers the request, confirm forwards
 * that same body to commit. Extracting them keeps the route under
 * eslint max-lines without splitting the CAS binding across files.
 */

import { useCallback, useRef } from 'react';

import type { GmRewindPreviewOutcome } from '@/components/multiplayer/gmRewindPreviewPhrasing';
import type { IPreviewGmCombatRewindInput } from '@/lib/multiplayer/client/previewGmCombatRewind';
import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import {
  commitGmCombatRewind,
  GmCombatRewindTransportError,
} from '@/lib/multiplayer/client/commitGmCombatRewind';
import { previewGmCombatRewind } from '@/lib/multiplayer/client/previewGmCombatRewind';
import { MATCH_BASELINE_FIRST_GENERATION } from '@/lib/multiplayer/server/matchAuthorityBaseline';

export interface IUseGmRewindProducersInput {
  readonly matchId: string | null;
  readonly wireToken: string | null;
  readonly mirrorEvents: readonly IGameEvent[];
}

export interface IUseGmRewindProducers {
  readonly onPreviewRewind: () => Promise<GmRewindPreviewOutcome>;
  readonly onConfirmRewind: () => Promise<GmCombatRewindCommitResult>;
}

/**
 * The match reader names revision as sequence + 1. An empty mirror has
 * no last event, so the believed head is revision 0 rather than -1.
 */
function believedHeadRevision(mirrorEvents: readonly IGameEvent[]): number {
  let lastSequence = -1;
  for (const event of mirrorEvents) {
    if (event.sequence > lastSequence) lastSequence = event.sequence;
  }
  return lastSequence < 0 ? 0 : lastSequence + 1;
}

/**
 * The one request body both GM flows are built from. Exported because the
 * correction producers (`useGmCorrectionProducers`) must ask for the SAME
 * blast radius the rewind flow shows; two builders would be two CAS
 * bindings, and the GM would approve one having been shown the other.
 * `null` means the page has no match or no token yet, which every caller
 * reports as `unavailable` rather than by inventing a request.
 */
export function buildGmRewindRequest(
  input: IUseGmRewindProducersInput,
): IPreviewGmCombatRewindInput | null {
  if (!input.matchId || !input.wireToken) return null;
  const expectedRevision = believedHeadRevision(input.mirrorEvents);
  return {
    matchId: input.matchId,
    wireToken: input.wireToken,
    // WHY: this slice has no target picker. Rewind one behind the
    // believed head, floored at 0 so an empty mirror still names a
    // legal revision instead of -1.
    targetRevision: Math.max(0, expectedRevision - 1),
    // WHY: the reader cannot see the match baseline's 'main' branch
    // and naming it would be answered STALE_BRANCH. 'root' is the
    // journal genesis the preview compares against.
    expectedBranchId: ROOT_EVENT_BRANCH_ID,
    expectedRevision,
    // WHY: the client does not hold event_digest. The preview's
    // expected-head check compares branch/revision/generation only
    // (GmCombatRewindPreview.ts ~258-266). The route schema accepts
    // any string, including empty (rewind-preview.ts line 110), so
    // we send '' rather than invent a hash.
    expectedDigest: '',
    // WHY: the client cannot see generation after a correction. We
    // send the imported baseline's first generation (1); a later
    // correction is answered STALE_GENERATION, which the dialog
    // already phrases.
    expectedGeneration: MATCH_BASELINE_FIRST_GENERATION,
  };
}

export function useGmRewindProducers(
  input: IUseGmRewindProducersInput,
): IUseGmRewindProducers {
  const lastRewindRequestRef = useRef<IPreviewGmCombatRewindInput | null>(null);

  const { matchId, wireToken, mirrorEvents } = input;

  const onPreviewRewind =
    useCallback(async (): Promise<GmRewindPreviewOutcome> => {
      // WHY the fields are destructured above rather than the object
      // being a dependency: the page passes a fresh object literal every
      // render, so depending on it would rebuild this callback on every
      // render and defeat the memo the controls below it rely on.
      const request = buildGmRewindRequest({
        matchId,
        wireToken,
        mirrorEvents,
      });
      if (request === null) {
        return { kind: 'unavailable' };
      }
      // WHY: confirm must POST this exact body. Re-deriving from the
      // mirror (or from 0) at confirm time would apply a different CAS
      // binding than the blast radius the GM approved.
      lastRewindRequestRef.current = request;
      return previewGmCombatRewind(request);
    }, [matchId, mirrorEvents, wireToken]);

  const onConfirmRewind =
    useCallback(async (): Promise<GmCombatRewindCommitResult> => {
      const request = lastRewindRequestRef.current;
      if (request === null) {
        throw new GmCombatRewindTransportError();
      }
      return commitGmCombatRewind(request);
    }, []);

  return { onPreviewRewind, onConfirmRewind };
}
