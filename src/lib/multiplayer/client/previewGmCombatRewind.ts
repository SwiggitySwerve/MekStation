/**
 * Client adapter for `POST /api/matches/[id]/rewind-preview`.
 *
 * Presentational components must not fetch (src/components/AGENTS.md).
 * The lobby page binds this producer; the surface only consumes the
 * outcome. Status is unused: a body with `kind` 'preview' or 'refused'
 * is the domain union verbatim, and anything else — including a thrown
 * fetch — is `{ kind: 'unavailable' }` with no error text attached.
 */

import type { GmRewindPreviewOutcome } from '@/components/multiplayer/gmRewindPreviewPhrasing';

export interface IPreviewGmCombatRewindInput {
  readonly matchId: string;
  readonly wireToken: string;
  readonly targetRevision: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
}

const UNAVAILABLE: GmRewindPreviewOutcome = Object.freeze({
  kind: 'unavailable',
});

function isPreviewOrRefused(
  body: unknown,
): body is Extract<GmRewindPreviewOutcome, { kind: 'preview' | 'refused' }> {
  if (typeof body !== 'object' || body === null) return false;
  if (!('kind' in body)) return false;
  return body.kind === 'preview' || body.kind === 'refused';
}

export async function previewGmCombatRewind(
  input: IPreviewGmCombatRewindInput,
): Promise<GmRewindPreviewOutcome> {
  try {
    const response = await fetch(
      `/api/matches/${encodeURIComponent(input.matchId)}/rewind-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.wireToken}`,
        },
        body: JSON.stringify({
          targetRevision: input.targetRevision,
          expectedBranchId: input.expectedBranchId,
          expectedRevision: input.expectedRevision,
          expectedDigest: input.expectedDigest,
          expectedGeneration: input.expectedGeneration,
        }),
      },
    );
    const body: unknown = await response.json();
    if (isPreviewOrRefused(body)) return body;
    return UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}
