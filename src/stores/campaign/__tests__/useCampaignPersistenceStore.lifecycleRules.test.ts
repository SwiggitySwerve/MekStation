/**
 * S1b client half of the contract-rules reader gate: every campaign request
 * that serves or accepts a body declares this build's reader level, and a
 * refusal (426, or 422 for an unreadable version) is shown with the server's
 * sentence, keeps the unsaved changes, and does not retry.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { LIFECYCLE_RULES_REQUEST_HEADER } from '@/types/campaign/ContractLifecycleRules';

import {
  INITIAL_CAMPAIGN_SAVE_STATE,
  reduceCampaignSaveState,
} from '../campaignSaveState';
import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  useCampaignPersistenceStore,
} from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

interface MockCampaignStore {
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}
type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const SENTENCE =
  'This campaign uses contract rules newer than this copy of MekStation reads (it needs rules 2; this copy reads rules 1). Reload this page to update, then try again. Nothing was changed.';

function refusal426(): Response {
  return jsonResponse(426, {
    kind: 'refused',
    code: 'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED',
    reason: 'lifecycle-rules-unsupported',
    error: SENTENCE,
    requiredLifecycleRules: 2,
    readerLifecycleRules: 1,
    source: 'stored',
  });
}

function headerOf(call: unknown[]): unknown {
  const init = call[1] as RequestInit | undefined;
  return (init?.headers as Record<string, string> | undefined)?.[
    LIFECYCLE_RULES_REQUEST_HEADER
  ];
}

describe('campaign persistence store: reader gate (S1b)', () => {
  let campaign: ICampaign;
  let mockStore: StoreApi<MockCampaignStore>;

  function seedStore(rehydratedCampaignId: string | null = null): void {
    mockStore = createStore<MockCampaignStore>((set, get) => ({
      campaign,
      rehydratedCampaignId,
      updateCampaign: (updates) => {
        const current = get().campaign;
        set({
          campaign: current
            ? { ...current, ...updates }
            : (updates as ICampaign),
        });
      },
      switchCampaign: (next) => set({ campaign: next }),
    }));
    registerCampaignStoreAccessor(
      () => mockStore as unknown as ReturnType<MockAccessor>,
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
    campaign = buildPopulatedCampaign();
    seedStore();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('declares the reader level on every gated request', () => {
    it('the save PUT', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          jsonResponse(200, buildSerializedCampaign(campaign, 'device-x', 1)),
        );
      await useCampaignPersistenceStore.getState().saveCampaign();
      expect(headerOf(fetchMock.mock.calls[0])).toBe('1');
      // The ordinary headers are still there beside it.
      expect(
        (fetchMock.mock.calls[0][1]?.headers as Record<string, string>)[
          'Content-Type'
        ],
      ).toBe('application/json');
    });

    it('the load GET', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          jsonResponse(200, buildSerializedCampaign(campaign, 'device-x', 1)),
        );
      await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
      expect(headerOf(fetchMock.mock.calls[0])).toBe('1');
    });

    it('the adoption POST', async () => {
      seedStore(campaign.id);
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(jsonResponse(404, {}))
        .mockResolvedValueOnce(
          jsonResponse(201, buildSerializedCampaign(campaign, 'device-x', 1)),
        );
      await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
      await useCampaignPersistenceStore.getState().adoptLegacyCampaign();
      expect(fetchMock.mock.calls[1][0]).toBe(
        `/api/campaigns/${campaign.id}/adopt`,
      );
      expect(headerOf(fetchMock.mock.calls[1])).toBe('1');
    });

    it('the keepalive flush', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(jsonResponse(200, {}));
      useCampaignPersistenceStore.getState().markDirty();
      useCampaignPersistenceStore.getState().flushPendingMutations();
      const flush = fetchMock.mock.calls.find(
        (call) => (call[1] as RequestInit | undefined)?.keepalive === true,
      );
      expect(flush).toBeDefined();
      expect(headerOf(flush as unknown[])).toBe('1');
    });
  });

  describe('a refusal', () => {
    it('on the save PUT is shown, keeps the unsaved change, and is not retried', async () => {
      const persisted = buildSerializedCampaign(campaign, 'device-x', 1);
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(jsonResponse(200, persisted));
      await useCampaignPersistenceStore.getState().saveCampaign();
      useCampaignPersistenceStore.getState().markDirty();
      fetchMock.mockResolvedValue(refusal426());

      const result = await useCampaignPersistenceStore
        .getState()
        .saveCampaign();

      const state = useCampaignPersistenceStore.getState();
      expect(result).toMatchObject({ status: 'error' });
      expect(state.saveState).toBe('error');
      expect(state.saveRefusal).toEqual({
        code: 'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED',
        reason: 'lifecycle-rules-unsupported',
        message: SENTENCE,
      });
      expect(state.errorMessage).toBe(SENTENCE);
      expect(state.dirty).toBe(true);
      expect(state.baseVersion).toBe(1);
      // Retrying cannot succeed, so nothing re-arms.
      const puts = fetchMock.mock.calls.length;
      jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS * 5);
      await Promise.resolve();
      expect(fetchMock.mock.calls.length).toBe(puts);
    });

    it('on the save PUT for an unreadable version (422) is shown the same way', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        jsonResponse(422, {
          kind: 'refused',
          code: 'CAMPAIGN_LIFECYCLE_RULES_UNREADABLE',
          reason: 'lifecycle-rules-unreadable',
          error: 'unreadable',
          requiredLifecycleRules: null,
          readerLifecycleRules: 1,
          source: 'stored',
        }),
      );
      useCampaignPersistenceStore.getState().markDirty();
      await useCampaignPersistenceStore.getState().saveCampaign();
      expect(useCampaignPersistenceStore.getState().saveRefusal).toMatchObject({
        code: 'CAMPAIGN_LIFECYCLE_RULES_UNREADABLE',
      });
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('on the load GET shows the server sentence, not "server responded 426", and leaves the live copy', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(refusal426());
      const loaded = await useCampaignPersistenceStore
        .getState()
        .loadCampaign(campaign.id);
      const state = useCampaignPersistenceStore.getState();
      expect(loaded).toBe(false);
      expect(state.saveState).toBe('error');
      expect(state.errorMessage).toBe(SENTENCE);
      expect(state.saveRefusal?.code).toBe(
        'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED',
      );
      expect(mockStore.getState().campaign).toBe(campaign);
    });

    it('on adoption keeps the copy labelled legacy and shows the sentence', async () => {
      seedStore(campaign.id);
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(jsonResponse(404, {}))
        .mockResolvedValueOnce(refusal426());
      await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
      const ok = await useCampaignPersistenceStore
        .getState()
        .adoptLegacyCampaign();
      const state = useCampaignPersistenceStore.getState();
      expect(ok).toBe(false);
      expect(state.legacyUnadopted).toBe(true);
      expect(state.errorMessage).toBe(SENTENCE);
      expect(state.saveRefusal?.code).toBe(
        'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED',
      );
    });

    it('falls back to the status text for a 426 that is not our refusal', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(jsonResponse(426, { something: 'else' }));
      await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
      const state = useCampaignPersistenceStore.getState();
      expect(state.errorMessage).toBe('server responded 426');
      expect(state.saveRefusal).toBeNull();
    });
  });

  it('reduces load-refused to the same error state a refused save reaches', () => {
    const refusal = {
      code: 'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED',
      reason: 'lifecycle-rules-unsupported',
      message: SENTENCE,
    };
    const next = reduceCampaignSaveState(INITIAL_CAMPAIGN_SAVE_STATE, {
      type: 'load-refused',
      refusal,
    });
    expect(next).toEqual(
      reduceCampaignSaveState(INITIAL_CAMPAIGN_SAVE_STATE, {
        type: 'save-refused',
        refusal,
      }),
    );
    expect(next).toMatchObject({
      saveState: 'error',
      errorMessage: SENTENCE,
      saveRefusal: refusal,
    });
  });
});
