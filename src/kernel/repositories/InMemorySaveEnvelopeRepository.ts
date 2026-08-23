import type {
  ISaveEnvelope,
  SaveEnvelopeWriteResult,
} from '../types/SaveEnvelope';
import type { ISaveEnvelopeRepository } from './ISaveEnvelopeRepository';

export class InMemorySaveEnvelopeRepository implements ISaveEnvelopeRepository {
  private readonly envelopes = new Map<string, ISaveEnvelope>();

  public async get(envelopeId: string): Promise<ISaveEnvelope | null> {
    return this.envelopes.get(envelopeId) ?? null;
  }

  public async save(
    envelope: ISaveEnvelope,
    expectedRevision: number,
  ): Promise<SaveEnvelopeWriteResult> {
    const current = this.envelopes.get(envelope.envelopeId);
    const actualRevision = current?.revision ?? 0;
    if (actualRevision !== expectedRevision) {
      return {
        kind: 'conflict',
        expectedRevision,
        actualRevision,
      };
    }
    this.envelopes.set(envelope.envelopeId, envelope);
    return { kind: 'ok', envelope };
  }
}
