import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';

/** @spec openspec/changes/extract-campaign-save-reducer/specs/campaign-persistence/spec.md */
import type {
  CampaignSaveSnapshot,
  CampaignSaveEvent,
} from '../campaignSaveState';

import {
  CampaignSaveTransitionError,
  INITIAL_CAMPAIGN_SAVE_STATE,
  reduceCampaignSaveState,
} from '../campaignSaveState';

describe('campaign save reducer', () => {
  const campaign = buildPopulatedCampaign();
  const record = buildSerializedCampaign(campaign, 'reducer-device', 3);
  const launchConflict = {
    code: 'STALE_REVISION',
    reason: 'Moved',
    activeHead: { branchId: 'main', revision: 9, effectiveGeneration: 2 },
    resyncAction: 'resync-to-active-head',
  };
  const conflict = {
    reason: 'base-state-unavailable',
    recoveryAction: 'resync-to-active-head',
    conflictingFields: [],
    currentVersion: 3,
  };
  const refusal = {
    code: 'HOST_TOKEN_REQUIRED',
    reason: 'missing-host-token',
    message: 'Sign in as host',
  };

  function reduce(...events: CampaignSaveEvent[]): CampaignSaveSnapshot {
    return events.reduce(reduceCampaignSaveState, INITIAL_CAMPAIGN_SAVE_STATE);
  }

  it('keeps later edits pending and does not mutate its input', () => {
    const saving = reduce(
      { type: 'edited', liveCampaignId: campaign.id },
      { type: 'operation-started', operation: 'save' },
      { type: 'edited', liveCampaignId: campaign.id },
    );
    Object.freeze(saving);
    const next = reduceCampaignSaveState(saving, {
      type: 'save-acknowledged',
      record,
      campaign,
      savedEditSeq: 1,
    });
    expect(next).toMatchObject({
      saveState: 'idle',
      dirty: true,
      editSeq: 2,
      baseVersion: 3,
      metadata: { version: 3 },
    });
    expect(saving).toMatchObject({
      saveState: 'saving',
      dirty: true,
      baseVersion: 0,
    });
    expect(
      reduceCampaignSaveState(next, {
        type: 'save-acknowledged',
        record,
        campaign,
        savedEditSeq: 2,
      }),
    ).toMatchObject({ saveState: 'saved', dirty: false, editSeq: 2 });
  });

  it.each([true, false])(
    'settles an older ACK without changing newer evidence (dirty=%s)',
    (dirty) => {
      const loaded = reduce({
        type: 'record-loaded',
        campaignId: campaign.id,
        record,
        campaign,
      });
      const current = { ...loaded, dirty };
      const next = reduceCampaignSaveState(current, {
        type: 'older-save-acknowledged',
      });
      expect(next).toEqual({
        ...current,
        saveState: dirty ? 'idle' : 'saved',
        errorMessage: null,
      });
      expect(next.metadata).toBe(loaded.metadata);
      expect(next.lastPersistedCampaign).toBe(campaign);
    },
  );

  it('preserves the distinct effects of load, save and adoption starts on refusal evidence', () => {
    const refused = reduce({ type: 'save-refused', refusal });
    for (const operation of ['load', 'adopt'] as const) {
      expect(
        reduceCampaignSaveState(refused, {
          type: 'operation-started',
          operation,
        }),
      ).toMatchObject({
        saveState: 'saving',
        errorMessage: null,
        saveRefusal: refusal,
      });
    }
    expect(
      reduceCampaignSaveState(refused, {
        type: 'operation-started',
        operation: 'save',
      }),
    ).toMatchObject({
      saveState: 'saving',
      errorMessage: null,
      saveRefusal: null,
    });
  });

  it('clears refusal on failed reads/adoption while a generic save failure keeps the current evidence', () => {
    const refused = reduce({ type: 'save-refused', refusal });
    for (const operation of ['load', 'adopt'] as const) {
      expect(
        reduceCampaignSaveState(refused, {
          type: 'operation-failed',
          operation,
          message: 'failed',
        }),
      ).toMatchObject({
        saveState: 'error',
        errorMessage: 'failed',
        saveRefusal: null,
      });
    }
    expect(
      reduceCampaignSaveState(refused, {
        type: 'operation-failed',
        operation: 'save',
        message: 'failed',
      }).saveRefusal,
    ).toBe(refusal);
  });

  it('keeps conflict evidence through edits and co-op rollback, then clears it on adoption', () => {
    const conflicted = reduce({ type: 'save-conflicted', record, conflict });
    const edited = reduceCampaignSaveState(conflicted, {
      type: 'edited',
      liveCampaignId: campaign.id,
    });
    const rolledBack = reduceCampaignSaveState(edited, {
      type: 'coop-rollback-settled',
    });
    expect(rolledBack).toMatchObject({
      saveState: 'conflict',
      dirty: false,
      saveConflict: conflict,
      conflictServerRecord: record,
    });
    expect(
      reduceCampaignSaveState(rolledBack, {
        type: 'conflict-record-taken',
        record,
        campaign,
      }),
    ).toMatchObject({
      saveState: 'saved',
      dirty: false,
      saveConflict: null,
      conflictServerRecord: null,
    });
  });

  it('retains legacy eligibility on take-server but clears it on ordinary load or explicit adoption', () => {
    const legacy = reduce({ type: 'record-missing', adoptable: true });
    expect(legacy).toMatchObject({
      saveState: 'idle',
      errorMessage: null,
      legacyUnadopted: true,
    });
    expect(
      reduceCampaignSaveState(legacy, {
        type: 'conflict-record-taken',
        record,
        campaign,
      }).legacyUnadopted,
    ).toBe(true);
    expect(
      reduceCampaignSaveState(legacy, {
        type: 'record-loaded',
        campaignId: campaign.id,
        record,
        campaign,
      }).legacyUnadopted,
    ).toBe(false);
    expect(
      reduceCampaignSaveState(legacy, { type: 'legacy-adopted' })
        .legacyUnadopted,
    ).toBe(false);
    expect(reduce({ type: 'record-missing', adoptable: false })).toMatchObject({
      saveState: 'idle',
      errorMessage: 'campaign not found',
      legacyUnadopted: false,
    });
  });

  it('updates co-op rollback evidence without replacing the held campaign id or status', () => {
    const current = reduce(
      { type: 'edited', liveCampaignId: 'held-campaign' },
      { type: 'operation-started', operation: 'save' },
    );
    expect(
      reduceCampaignSaveState(current, {
        type: 'coop-rollback-record-installed',
        record,
        campaign,
      }),
    ).toMatchObject({
      campaignId: 'held-campaign',
      saveState: 'saving',
      dirty: true,
      baseVersion: 3,
      lastPersistedCampaign: campaign,
    });
  });

  it('keeps flush diagnostics across acknowledgments and still owes an ordinary save after reconciliation', () => {
    const diagnostic = {
      reason: 'envelope-over-keepalive-cap' as const,
      campaignId: campaign.id,
      byteLength: 70000,
      capBytes: 65536,
    };
    const next = reduce(
      { type: 'flush-skipped', diagnostic },
      { type: 'save-acknowledged', record, campaign },
      { type: 'flush-acknowledgement-owed' },
    );
    // Owing an acknowledged save is unsaved work, so the status is idle: a
    // `saved` status with `dirty` set would tell the player the server holds
    // work it does not.
    expect(next).toMatchObject({
      saveState: 'idle',
      dirty: true,
      baseVersion: 3,
      flushSkip: diagnostic,
    });
    expect(reduceCampaignSaveState(next, { type: 'reset' })).toEqual(
      INITIAL_CAMPAIGN_SAVE_STATE,
    );
  });

  it('preserves launch evidence independently of save error/conflict transitions', () => {
    const reported = reduce(
      { type: 'launch-conflict-reported', conflict: launchConflict },
      { type: 'save-refused', refusal },
    );
    const cleared = reduceCampaignSaveState(reported, {
      type: 'error-cleared',
    });
    expect(cleared).toMatchObject({
      saveState: 'idle',
      errorMessage: null,
      saveRefusal: null,
      launchConflict,
    });
    expect(reduceCampaignSaveState(cleared, { type: 'error-cleared' })).toBe(
      cleared,
    );
    expect(
      reduceCampaignSaveState(cleared, { type: 'launch-conflict-cleared' })
        .launchConflict,
    ).toBeNull();
  });

  it('carries the exact source replay fence read from the server', () => {
    const fenced = { ...record, sourceReplayFence: { rootPublicRevision: 5 } };
    expect(
      reduce({
        type: 'record-loaded',
        campaignId: campaign.id,
        record,
        campaign,
      }).sourceReplayFence,
    ).toBeNull();
    expect(
      reduce({
        type: 'record-loaded',
        campaignId: campaign.id,
        record: fenced,
        campaign,
      }).sourceReplayFence,
    ).toBe(fenced.sourceReplayFence);
  });

  it('rejects an unknown runtime event with the domain transition error', () => {
    expect(() =>
      Reflect.apply(reduceCampaignSaveState, undefined, [
        INITIAL_CAMPAIGN_SAVE_STATE,
        { type: 'unknown-event' },
      ]),
    ).toThrow(CampaignSaveTransitionError);
  });
});

describe('campaign save reducer: unsaved edits are never "saved"', () => {
  const campaign = buildPopulatedCampaign();
  const record = buildSerializedCampaign(campaign, 'reducer-device', 3);
  const refusal = { code: 'HOST', reason: 'missing', message: 'Sign in' };
  const diagnostic = {
    reason: 'envelope-over-keepalive-cap' as const,
    campaignId: campaign.id,
    byteLength: 70000,
    capBytes: 65536,
  };

  /** Keyed by type so a new event cannot be added without being swept here. */
  const EVENTS: Record<CampaignSaveEvent['type'], CampaignSaveEvent> = {
    'operation-started': { type: 'operation-started', operation: 'save' },
    'save-acknowledged': { type: 'save-acknowledged', record, campaign },
    'older-save-acknowledged': { type: 'older-save-acknowledged' },
    'save-conflicted': { type: 'save-conflicted', record, conflict: null },
    'save-refused': { type: 'save-refused', refusal },
    'operation-failed': {
      type: 'operation-failed',
      operation: 'save',
      message: 'down',
    },
    'record-missing': { type: 'record-missing', adoptable: true },
    'record-loaded': {
      type: 'record-loaded',
      campaignId: campaign.id,
      record,
      campaign,
    },
    'conflict-record-taken': {
      type: 'conflict-record-taken',
      record,
      campaign,
    },
    'coop-rollback-record-installed': {
      type: 'coop-rollback-record-installed',
      record,
      campaign,
    },
    'coop-rollback-settled': { type: 'coop-rollback-settled' },
    'legacy-adopted': { type: 'legacy-adopted' },
    'flush-skipped': { type: 'flush-skipped', diagnostic },
    'flush-acknowledgement-owed': { type: 'flush-acknowledgement-owed' },
    'pending-write-adopted': {
      type: 'pending-write-adopted',
      campaignId: campaign.id,
      editSeq: 4,
      record,
      campaign,
    },
    'pending-write-conflicted': {
      type: 'pending-write-conflicted',
      record,
      localBaseVersion: 2,
    },
    edited: { type: 'edited', liveCampaignId: campaign.id },
    'error-cleared': { type: 'error-cleared' },
    'launch-conflict-reported': {
      type: 'launch-conflict-reported',
      conflict: {
        code: 'STALE',
        reason: 'moved',
        activeHead: { branchId: 'main', revision: 9, effectiveGeneration: 2 },
        resyncAction: 'resync-to-active-head',
      },
    },
    'launch-conflict-cleared': { type: 'launch-conflict-cleared' },
    'created-campaign-initialized': {
      type: 'created-campaign-initialized',
      campaignId: campaign.id,
    },
    'rollback-dirty-restored': { type: 'rollback-dirty-restored' },
    'creation-cleanup-restored': {
      type: 'creation-cleanup-restored',
      snapshot: INITIAL_CAMPAIGN_SAVE_STATE,
    },
    reset: { type: 'reset' },
  };
  const CATALOGUE: CampaignSaveEvent[] = [
    ...Object.values(EVENTS),
    // The two acknowledgements whose dirty result depends on a captured seq.
    { type: 'save-acknowledged', record, campaign, savedEditSeq: 0 },
    { type: 'save-acknowledged', record, campaign, savedEditSeq: 1 },
    { type: 'operation-started', operation: 'load' },
  ];

  it('holds saveState === "saved" => dirty === false over every event sequence up to length 4', () => {
    let visited = 0;
    const walk = (state: CampaignSaveSnapshot, depth: number): void => {
      visited += 1;
      if (state.saveState === 'saved') {
        expect(state.dirty).toBe(false);
      }
      if (depth === 0) return;
      for (const event of CATALOGUE) {
        walk(reduceCampaignSaveState(state, event), depth - 1);
      }
    };
    walk(INITIAL_CAMPAIGN_SAVE_STATE, 4);
    // 26^0..26^4: the sweep really ran.
    expect(visited).toBeGreaterThan(400_000);
  });

  it('moves saved to idle on an edit and keeps the statuses that already say "not saved"', () => {
    const saved = reduce(EVENTS['record-loaded']);
    expect(saved.saveState).toBe('saved');
    const edit = EVENTS.edited;
    expect(reduceCampaignSaveState(saved, edit)).toMatchObject({
      saveState: 'idle',
      dirty: true,
    });
    for (const state of ['save-refused', 'operation-failed'] as const) {
      expect(
        reduceCampaignSaveState(reduce(EVENTS[state]), edit).saveState,
      ).toBe('error');
    }
    expect(
      reduceCampaignSaveState(reduce(EVENTS['save-conflicted']), edit)
        .saveState,
    ).toBe('conflict');
    expect(
      reduceCampaignSaveState(reduce(EVENTS['operation-started']), edit)
        .saveState,
    ).toBe('saving');
  });

  it('moves saved to idle when a proven flush leaves an acknowledgement owed', () => {
    expect(
      reduce(EVENTS['record-loaded'], EVENTS['flush-acknowledgement-owed']),
    ).toMatchObject({ saveState: 'idle', dirty: true });
  });

  function reduce(...events: CampaignSaveEvent[]): CampaignSaveSnapshot {
    return events.reduce(reduceCampaignSaveState, INITIAL_CAMPAIGN_SAVE_STATE);
  }

  describe('pending-write-adopted', () => {
    it('keeps the local copy dirty, adopts the row, continues the edit counter and marks it recovered', () => {
      const next = reduce(
        { type: 'edited', liveCampaignId: campaign.id },
        EVENTS['pending-write-adopted'],
      );
      expect(next).toMatchObject({
        saveState: 'idle',
        dirty: true,
        campaignId: campaign.id,
        baseVersion: 3,
        metadata: { version: 3 },
        editSeq: 4,
        recoveredPendingWrite: true,
        conflictServerRecord: null,
        saveConflict: null,
      });
      expect(next.lastPersistedCampaign).not.toBeNull();
    });

    it('never lowers an edit counter the document already advanced', () => {
      const edited = reduce(
        ...Array.from({ length: 6 }, () => EVENTS.edited),
        EVENTS['pending-write-adopted'],
      );
      expect(edited.editSeq).toBe(6);
    });

    it('stops reading as recovered once any acknowledged record lands', () => {
      const adopted = reduce(EVENTS['pending-write-adopted']);
      expect(
        reduceCampaignSaveState(adopted, EVENTS['save-acknowledged'])
          .recoveredPendingWrite,
      ).toBe(false);
      expect(
        reduceCampaignSaveState(adopted, EVENTS['conflict-record-taken'])
          .recoveredPendingWrite,
      ).toBe(false);
      expect(
        reduceCampaignSaveState(adopted, EVENTS.reset).recoveredPendingWrite,
      ).toBe(false);
    });
  });

  describe('pending-write-conflicted', () => {
    const conflicted = reduce(EVENTS['pending-write-conflicted']);

    it('holds a conflict with the server record and the local base, dirty, and adopts no token', () => {
      expect(conflicted).toMatchObject({
        saveState: 'conflict',
        dirty: true,
        baseVersion: 0,
        conflictServerRecord: record,
        saveConflict: {
          reason: 'local-edits-predate-server',
          currentVersion: 3,
          localBaseVersion: 2,
        },
      });
      // A stray save at this token cannot match any stored row (a row's
      // version is at least 1), so it can only be refused.
      expect(conflicted.baseVersion).toBe(0);
      expect(conflicted.metadata.version).toBe(0);
    });

    it('is left only by taking the server version, which discards the local flag', () => {
      expect(
        reduceCampaignSaveState(conflicted, EVENTS['conflict-record-taken']),
      ).toMatchObject({
        saveState: 'saved',
        dirty: false,
        saveConflict: null,
        conflictServerRecord: null,
      });
    });

    it('survives further local edits, still a conflict', () => {
      expect(reduceCampaignSaveState(conflicted, EVENTS.edited)).toMatchObject({
        saveState: 'conflict',
        dirty: true,
      });
    });
  });
});
