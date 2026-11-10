/**
 * The pending-write marker and its load decision (the section 3 table).
 *
 * "Newer" is the server row `version` against the marker's `baseVersion`.
 * No row in this file reads a timestamp, and the first group pins that: the
 * decision input has no clock to read.
 *
 * @spec openspec/changes/adopt-pending-campaign-write/specs/campaign-persistence/spec.md
 */

import {
  decidePendingWrite,
  derivePendingWrite,
  parsePendingWrite,
  pendingWritesEqual,
  type IPendingWrite,
  type IPendingWriteDecisionInput,
  type IPendingWriteSource,
} from '../campaignPendingWrite';

const CAMPAIGN = 'campaign-1';
const INSTANCE = 'host-a';
const FLUSH_DIGEST = 'digest-of-our-flush';

const marker: IPendingWrite = {
  campaignId: CAMPAIGN,
  baseVersion: 7,
  editSeq: 3,
};

const flushed: IPendingWrite = {
  ...marker,
  flush: { baseVersion: 7, editSeq: 3, digest: FLUSH_DIGEST },
};

function decide(
  overrides: Partial<IPendingWriteDecisionInput> & {
    version?: number;
    instanceId?: string | null;
    recordCampaignId?: string;
  } = {},
) {
  const digestOf = overrides.digestOf ?? jest.fn(() => FLUSH_DIGEST);
  const decision = decidePendingWrite({
    marker,
    liveCampaignId: CAMPAIGN,
    liveIsCoop: false,
    cachedInstanceId: INSTANCE,
    editedBeforeLoad: false,
    ...overrides,
    digestOf,
    record: {
      campaignId: overrides.recordCampaignId ?? CAMPAIGN,
      version: overrides.version ?? 7,
      instanceId:
        overrides.instanceId === undefined ? INSTANCE : overrides.instanceId,
    },
  });
  return { decision, digestOf };
}

describe('decidePendingWrite', () => {
  describe('nothing owed: existing behaviour', () => {
    it('has no marker', () => {
      expect(decide({ marker: null }).decision).toEqual({ kind: 'none' });
    });

    it("ignores another campaign's marker", () => {
      expect(
        decide({ marker: { ...marker, campaignId: 'someone-else' } }).decision,
      ).toEqual({ kind: 'none' });
    });

    it('ignores a marker when the live copy is another campaign', () => {
      expect(decide({ liveCampaignId: 'someone-else' }).decision).toEqual({
        kind: 'none',
      });
      expect(decide({ liveCampaignId: null }).decision).toEqual({
        kind: 'none',
      });
    });

    it('ignores a marker on a co-op copy, whose writer is the session', () => {
      expect(decide({ liveIsCoop: true }).decision).toEqual({ kind: 'none' });
    });
  });

  describe('the server is still where the edits were built (local is newer)', () => {
    it('keeps the local copy and pushes at the marker token', () => {
      expect(decide({ version: 7 }).decision).toEqual({
        kind: 'keep-local',
        viaFlush: false,
      });
    });

    it('does so even when a flush was issued that never landed', () => {
      expect(decide({ marker: flushed, version: 7 }).decision).toEqual({
        kind: 'keep-local',
        viaFlush: false,
      });
    });
  });

  describe('our flush landed', () => {
    it('adopts clean when the flush carried every edit', () => {
      const { decision, digestOf } = decide({ marker: flushed, version: 8 });
      expect(decision).toEqual({ kind: 'adopt-flushed' });
      expect(digestOf).toHaveBeenCalledTimes(1);
    });

    it('keeps local and dirty when edits came after the flush', () => {
      const edited = { ...flushed, editSeq: 4 };
      expect(decide({ marker: edited, version: 8 }).decision).toEqual({
        kind: 'keep-local',
        viaFlush: true,
      });
    });

    it('keeps local when this document edited before its first read landed', () => {
      expect(
        decide({ marker: flushed, version: 8, editedBeforeLoad: true })
          .decision,
      ).toEqual({ kind: 'keep-local', viaFlush: true });
    });
  });

  describe('anything else is a conflict: no push and no replace', () => {
    it('refuses a version that merely LOOKS like our flush (digest mismatch)', () => {
      const { decision } = decide({
        marker: flushed,
        version: 8,
        digestOf: () => 'another-writers-envelope',
      });
      expect(decision).toEqual({
        kind: 'conflict',
        cause: 'version-moved',
        localBaseVersion: 7,
      });
    });

    it('refuses a version ahead of the base when no flush was issued', () => {
      expect(decide({ version: 8 }).decision).toMatchObject({
        kind: 'conflict',
        cause: 'version-moved',
      });
    });

    it('refuses a server that moved on by several writes', () => {
      expect(decide({ marker: flushed, version: 12 }).decision).toMatchObject({
        kind: 'conflict',
        cause: 'version-moved',
      });
    });

    it('refuses a rollback or restore (server version below the base)', () => {
      expect(decide({ version: 5 }).decision).toMatchObject({
        kind: 'conflict',
        cause: 'version-moved',
      });
    });

    it('refuses a different instance even at the very same version', () => {
      expect(decide({ version: 7, instanceId: 'host-b' }).decision).toEqual({
        kind: 'conflict',
        cause: 'instance-unproven',
        localBaseVersion: 7,
      });
    });

    it('refuses a copy that cannot say which instance it was built on', () => {
      expect(decide({ cachedInstanceId: null }).decision).toMatchObject({
        kind: 'conflict',
        cause: 'instance-unproven',
      });
      expect(decide({ instanceId: null }).decision).toMatchObject({
        kind: 'conflict',
        cause: 'instance-unproven',
      });
    });

    it('proves the instance before it trusts a matching digest', () => {
      const { decision, digestOf } = decide({
        marker: flushed,
        version: 8,
        instanceId: 'host-b',
      });
      expect(decision).toMatchObject({ cause: 'instance-unproven' });
      expect(digestOf).not.toHaveBeenCalled();
    });
  });

  it('only digests when a flush could have landed', () => {
    const { digestOf } = decide({ marker: flushed, version: 7 });
    expect(digestOf).not.toHaveBeenCalled();
    expect(decide({ version: 8 }).digestOf).not.toHaveBeenCalled();
  });
});

describe('derivePendingWrite', () => {
  const source: IPendingWriteSource = {
    dirty: true,
    campaignId: CAMPAIGN,
    baseVersion: 7,
    editSeq: 3,
    legacyUnadopted: false,
    liveCampaignId: CAMPAIGN,
    liveIsCoop: false,
  };

  it('writes {campaignId, baseVersion, editSeq} while dirty', () => {
    expect(derivePendingWrite(source, null)).toEqual(marker);
  });

  it('clears when the copy is clean', () => {
    expect(derivePendingWrite({ ...source, dirty: false }, flushed)).toBeNull();
  });

  it.each([
    ['co-op host or guest', { liveIsCoop: true }],
    ['unadopted legacy copy', { legacyUnadopted: true }],
    ['another campaign live', { liveCampaignId: 'someone-else' }],
    ['no campaign at all', { campaignId: null, liveCampaignId: null }],
  ])('writes none for a %s', (_name, patch) => {
    expect(derivePendingWrite({ ...source, ...patch }, marker)).toBeNull();
  });

  it('leaves the stored marker alone until the document has read a row', () => {
    // A fresh document is dirty at baseVersion 0 until its first load lands;
    // deriving then would overwrite the previous document's real marker.
    expect(derivePendingWrite({ ...source, baseVersion: 0 }, marker)).toBe(
      undefined,
    );
  });

  it('infers the campaign from the live copy when the state has no id yet', () => {
    expect(derivePendingWrite({ ...source, campaignId: null }, null)).toEqual(
      marker,
    );
  });

  it('keeps flush evidence across later edits at the same base', () => {
    expect(derivePendingWrite({ ...source, editSeq: 4 }, flushed)).toEqual({
      ...flushed,
      editSeq: 4,
    });
  });

  it('drops flush evidence once a save or proven flush moved the base', () => {
    expect(derivePendingWrite({ ...source, baseVersion: 8 }, flushed)).toEqual({
      ...marker,
      baseVersion: 8,
    });
  });

  it('attaches the flush it is handed', () => {
    const flush = { baseVersion: 7, editSeq: 3, digest: FLUSH_DIGEST };
    expect(derivePendingWrite(source, null, flush)).toEqual(flushed);
  });
});

describe('parsePendingWrite', () => {
  it('round-trips a marker, with and without flush evidence', () => {
    expect(parsePendingWrite(JSON.parse(JSON.stringify(marker)))).toEqual(
      marker,
    );
    expect(parsePendingWrite(JSON.parse(JSON.stringify(flushed)))).toEqual(
      flushed,
    );
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['no campaign id', { baseVersion: 1, editSeq: 1 }],
    ['an empty campaign id', { campaignId: '', baseVersion: 1, editSeq: 1 }],
    ['a fractional base', { campaignId: 'c', baseVersion: 1.5, editSeq: 1 }],
    [
      'a negative edit counter',
      { campaignId: 'c', baseVersion: 1, editSeq: -1 },
    ],
    ['a non-numeric base', { campaignId: 'c', baseVersion: '1', editSeq: 1 }],
  ])('treats %s as absent, not repaired', (_name, value) => {
    expect(parsePendingWrite(value)).toBeNull();
  });

  it('drops a malformed flush but keeps the marker (less evidence, never more)', () => {
    expect(
      parsePendingWrite({ ...marker, flush: { baseVersion: 7, digest: '' } }),
    ).toEqual(marker);
  });
});

describe('pendingWritesEqual', () => {
  it('compares every field including flush evidence', () => {
    expect(pendingWritesEqual(null, null)).toBe(true);
    expect(pendingWritesEqual(marker, null)).toBe(false);
    expect(pendingWritesEqual(marker, { ...marker })).toBe(true);
    expect(pendingWritesEqual(marker, flushed)).toBe(false);
    expect(
      pendingWritesEqual(flushed, {
        ...flushed,
        flush: { ...flushed.flush!, digest: 'other' },
      }),
    ).toBe(false);
  });
});
