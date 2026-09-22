import type { IViewerLineageEffectiveHead } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';

export interface IReadGmRewindHeadInput {
  readonly matchId: string;
  readonly wireToken: string;
}

export type GmRewindHeadOutcome =
  | {
      readonly kind: 'head';
      readonly head: IViewerLineageEffectiveHead & { readonly digest: string };
    }
  | { readonly kind: 'no-head' }
  | { readonly kind: 'unavailable' };

const UNAVAILABLE: GmRewindHeadOutcome = Object.freeze({ kind: 'unavailable' });

export async function readGmRewindHead(
  input: IReadGmRewindHeadInput,
): Promise<GmRewindHeadOutcome> {
  try {
    const response = await fetch(
      `/api/matches/${encodeURIComponent(input.matchId)}/head`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${input.wireToken}` },
      },
    );
    if (response.status !== 200 && response.status !== 404) return UNAVAILABLE;
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return UNAVAILABLE;
    if (response.status === 404) {
      return 'error' in body && body.error === 'no head'
        ? { kind: 'no-head' }
        : UNAVAILABLE;
    }
    const head = body;
    if (
      !('branchId' in head) ||
      typeof head.branchId !== 'string' ||
      !('revision' in head) ||
      typeof head.revision !== 'number' ||
      !('effectiveGeneration' in head) ||
      typeof head.effectiveGeneration !== 'number' ||
      !('digest' in head) ||
      typeof head.digest !== 'string' ||
      head.digest.length !== 64 ||
      !/^[0-9a-f]{64}$/.test(head.digest)
    ) {
      return UNAVAILABLE;
    }
    return {
      kind: 'head',
      head: {
        branchId: head.branchId,
        revision: head.revision,
        generation: head.effectiveGeneration,
        digest: head.digest,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
