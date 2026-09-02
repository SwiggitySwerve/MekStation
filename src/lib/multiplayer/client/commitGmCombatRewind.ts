/**
 * Client adapter for `POST /api/matches/[id]/rewind-commit`.
 *
 * Sibling of `previewGmCombatRewind`. The POST body is the SAME five
 * fields the preview was made with. Confirming a different head than
 * the one the GM was shown would apply a rewind nobody approved.
 * This module therefore takes those fields as input and forwards them
 * verbatim — it does not read the mirror or invent expectedRevision.
 */

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';

import type { IPreviewGmCombatRewindInput } from './previewGmCombatRewind';

export type ICommitGmCombatRewindInput = IPreviewGmCombatRewindInput;

/**
 * A reply that is not the domain union. Preview maps transport noise
 * to `unavailable` so looking cannot throw as control flow. Commit
 * throws this class so a failed POST cannot be read as a successful
 * rewind.
 */
export class GmCombatRewindTransportError extends Error {
  public override readonly name = 'GmCombatRewindTransportError';
  public constructor(public readonly status?: number) {
    super(
      status === undefined
        ? 'GM combat rewind transport failed'
        : `GM combat rewind transport failed (${status})`,
    );
  }
}

function isCommittedOrRefused(
  body: unknown,
): body is GmCombatRewindCommitResult {
  if (typeof body !== 'object' || body === null) return false;
  if (!('kind' in body)) return false;
  return body.kind === 'committed' || body.kind === 'refused';
}

export async function commitGmCombatRewind(
  input: ICommitGmCombatRewindInput,
): Promise<GmCombatRewindCommitResult> {
  let response: Response;
  try {
    response = await fetch(
      `/api/matches/${encodeURIComponent(input.matchId)}/rewind-commit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.wireToken}`,
        },
        // WHY: these are the fields the preview request carried. Replacing
        // expectedRevision with 0 (or any freshly derived head) would
        // confirm a different CAS binding than the blast radius the GM saw.
        body: JSON.stringify({
          targetRevision: input.targetRevision,
          expectedBranchId: input.expectedBranchId,
          expectedRevision: input.expectedRevision,
          expectedDigest: input.expectedDigest,
          expectedGeneration: input.expectedGeneration,
        }),
      },
    );
  } catch {
    throw new GmCombatRewindTransportError();
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // Non-JSON 500 (and any other unreadable body) is transport, not a
    // domain refusal — there is no `kind` to narrow.
    throw new GmCombatRewindTransportError(response.status);
  }

  if (isCommittedOrRefused(body)) return body;
  throw new GmCombatRewindTransportError(response.status);
}
