import type { IInstanceProvenance } from './InstanceProvenance';

/**
 * One snapshot of a play container plus kernel-owned instance
 * provenance. `snapshot` is opaque plugin state.
 */
export interface ISaveEnvelope {
  readonly envelopeId: string;
  readonly gameId: string;
  readonly schemaId: string;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly snapshot: unknown;
  readonly journalHighWater: number;
  readonly instances: readonly IInstanceProvenance[];
}

export type SaveEnvelopeWriteResult =
  | { readonly kind: 'ok'; readonly envelope: ISaveEnvelope }
  | {
      readonly kind: 'conflict';
      readonly expectedRevision: number;
      readonly actualRevision: number;
    };
