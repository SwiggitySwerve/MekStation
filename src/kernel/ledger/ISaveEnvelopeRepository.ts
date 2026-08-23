import type { ISaveEnvelope, SaveEnvelopeWriteResult } from './SaveEnvelope';

export interface ISaveEnvelopeRepository {
  get(envelopeId: string): Promise<ISaveEnvelope | null>;
  save(
    envelope: ISaveEnvelope,
    expectedRevision: number,
  ): Promise<SaveEnvelopeWriteResult>;
}
