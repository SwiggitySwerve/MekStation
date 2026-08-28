import type { ISaveEnvelope, SaveEnvelopeWriteResult } from '@/kernel/ledger';

import { InMemorySaveEnvelopeRepository } from '@/kernel/ledger';

import { TOY_CARD_PLUGIN } from '../../plugins/toyCardPlugin';

const ENVELOPE_ID = 'table-run-1';

function envelope(revision: number, snapshot: unknown = null): ISaveEnvelope {
  return {
    envelopeId: ENVELOPE_ID,
    gameId: TOY_CARD_PLUGIN.gameId,
    schemaId: TOY_CARD_PLUGIN.schemaId,
    schemaVersion: TOY_CARD_PLUGIN.schemaVersion,
    revision,
    snapshot,
    journalHighWater: 0,
    instances: [],
  };
}

function expectSaved(result: SaveEnvelopeWriteResult): ISaveEnvelope {
  if (result.kind !== 'ok') {
    throw new Error(`Expected a successful save, got ${result.kind}`);
  }
  return result.envelope;
}

describe('InMemorySaveEnvelopeRepository', () => {
  it('returns null for an envelope that was never saved', async () => {
    const snapshots = new InMemorySaveEnvelopeRepository();

    expect(await snapshots.get(ENVELOPE_ID)).toBeNull();
  });

  it('stores a first envelope at expectedRevision 0', async () => {
    const snapshots = new InMemorySaveEnvelopeRepository();

    const saved = expectSaved(await snapshots.save(envelope(1), 0));

    expect(saved.revision).toBe(1);
    expect(await snapshots.get(ENVELOPE_ID)).toEqual(saved);
  });

  it('advances the envelope when expectedRevision matches the stored revision', async () => {
    const snapshots = new InMemorySaveEnvelopeRepository();
    await snapshots.save(envelope(1), 0);

    const saved = expectSaved(
      await snapshots.save(envelope(2, { tapped: true }), 1),
    );

    expect(saved.revision).toBe(2);
    expect((await snapshots.get(ENVELOPE_ID))?.snapshot).toEqual({
      tapped: true,
    });
  });

  it('rejects a stale expectedRevision and leaves the stored envelope intact', async () => {
    const snapshots = new InMemorySaveEnvelopeRepository();
    await snapshots.save(envelope(1, { tapped: false }), 0);

    const conflict = await snapshots.save(envelope(2, { tapped: true }), 0);

    expect(conflict).toEqual({
      kind: 'conflict',
      expectedRevision: 0,
      actualRevision: 1,
    });
    const stored = await snapshots.get(ENVELOPE_ID);
    expect(stored?.revision).toBe(1);
    expect(stored?.snapshot).toEqual({ tapped: false });
  });

  it('rejects a first save that expects a revision the envelope does not have', async () => {
    const snapshots = new InMemorySaveEnvelopeRepository();

    const conflict = await snapshots.save(envelope(1), 3);

    expect(conflict).toEqual({
      kind: 'conflict',
      expectedRevision: 3,
      actualRevision: 0,
    });
    expect(await snapshots.get(ENVELOPE_ID)).toBeNull();
  });

  it('keeps envelopes isolated by envelopeId', async () => {
    const snapshots = new InMemorySaveEnvelopeRepository();
    await snapshots.save(envelope(1), 0);

    const other = expectSaved(
      await snapshots.save({ ...envelope(1), envelopeId: 'table-run-2' }, 0),
    );

    expect(other.envelopeId).toBe('table-run-2');
    expect((await snapshots.get(ENVELOPE_ID))?.revision).toBe(1);
  });
});
