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
    expect(next).toMatchObject({
      saveState: 'saved',
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
