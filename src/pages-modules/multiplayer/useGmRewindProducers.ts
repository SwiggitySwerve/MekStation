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

import {
  commitGmCombatRewind,
  GmCombatRewindTransportError,
} from '@/lib/multiplayer/client/commitGmCombatRewind';
import { previewGmCombatRewind } from '@/lib/multiplayer/client/previewGmCombatRewind';
import { readGmRewindHead } from '@/lib/multiplayer/client/readGmRewindHead';

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
 * The one request body both GM flows are built from. Exported because the
 * correction producers (`useGmCorrectionProducers`) must ask for the SAME
 * blast radius the rewind flow shows; two builders would be two CAS
 * bindings, and the GM would approve one having been shown the other.
 * `null` means the page has no match, token, available server head, or a
 * head that names a digest, which every caller reports as `unavailable`.
 */
export async function buildGmRewindRequest(
  input: Pick<IUseGmRewindProducersInput, 'matchId' | 'wireToken'>,
): Promise<IPreviewGmCombatRewindInput | null> {
  if (!input.matchId || !input.wireToken) return null;
  const outcome = await readGmRewindHead({
    matchId: input.matchId,
    wireToken: input.wireToken,
  });
  if (outcome.kind !== 'head') return null;
  const { head } = outcome;
  // WHY read as possibly absent: the adapter's head type carries `digest`
  // today, but a head that reaches here without one is the pre-digest
  // shape, and an empty digest is not a claim the server can honour - the
  // correction lease compares expectedDigest against the journal head and
  // refuses an empty one as correction-lease-held. A head we cannot name a
  // digest for is a head this producer has no request for, so it reports
  // unavailable rather than post a commit the lease will refuse.
  const digest: string | undefined = head.digest;
  if (typeof digest !== 'string' || digest.length === 0) return null;
  return {
    matchId: input.matchId,
    wireToken: input.wireToken,
    // WHY: this slice has no target picker. Rewind one behind the
    // server head, floored at 0 to keep the target revision legal.
    targetRevision: Math.max(0, head.revision - 1),
    expectedBranchId: head.branchId,
    expectedRevision: head.revision,
    // WHY verbatim: the digest is the server's own, read back through the
    // GM head route. The client never computes or adjusts it - it names
    // the head it was told about, and nothing else.
    expectedDigest: digest,
    expectedGeneration: head.generation,
  };
}

export function useGmRewindProducers(
  input: IUseGmRewindProducersInput,
): IUseGmRewindProducers {
  const lastRewindRequestRef = useRef<IPreviewGmCombatRewindInput | null>(null);

  const { matchId, wireToken } = input;

  const onPreviewRewind =
    useCallback(async (): Promise<GmRewindPreviewOutcome> => {
      // WHY the fields are destructured above rather than the object
      // being a dependency: the page passes a fresh object literal every
      // render, so depending on it would rebuild this callback on every
      // render and defeat the memo the controls below it rely on.
      const request = await buildGmRewindRequest({
        matchId,
        wireToken,
      });
      if (request === null) {
        return { kind: 'unavailable' };
      }
      // WHY: confirm must POST this exact body. Re-deriving from the
      // mirror (or from 0) at confirm time would apply a different CAS
      // binding than the blast radius the GM approved.
      lastRewindRequestRef.current = request;
      return previewGmCombatRewind(request);
    }, [matchId, wireToken]);

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
