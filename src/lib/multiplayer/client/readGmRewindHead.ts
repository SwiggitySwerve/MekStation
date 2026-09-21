import type { IViewerLineageEffectiveHead } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';

export interface IReadGmRewindHeadInput {
  readonly matchId: string;
  readonly wireToken: string;
}

export type GmRewindHeadOutcome =
  | { readonly kind: 'head'; readonly head: IViewerLineageEffectiveHead }
  | { readonly kind: 'no-head' }
  | { readonly kind: 'unavailable' };

const UNAVAILABLE: GmRewindHeadOutcome = Object.freeze({ kind: 'unavailable' });

export async function readGmRewindHead(
  input: IReadGmRewindHeadInput,
): Promise<GmRewindHeadOutcome> {
  try {
    const response = await fetch(
      `/api/matches/${encodeURIComponent(input.matchId)}/timeline`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${input.wireToken}` },
      },
    );
    if (response.status !== 200) return UNAVAILABLE;
    const body: unknown = await response.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('lineage' in body) ||
      typeof body.lineage !== 'object' ||
      body.lineage === null ||
      !('effectiveHead' in body.lineage)
    ) {
      return UNAVAILABLE;
    }
    const head = body.lineage.effectiveHead;
    if (head === null) return { kind: 'no-head' };
    if (
      typeof head !== 'object' ||
      !('branchId' in head) ||
      typeof head.branchId !== 'string' ||
      !('revision' in head) ||
      typeof head.revision !== 'number' ||
      !('generation' in head) ||
      typeof head.generation !== 'number'
    ) {
      return UNAVAILABLE;
    }
    return {
      kind: 'head',
      head: {
        branchId: head.branchId,
        revision: head.revision,
        generation: head.generation,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
