/**
 * A settled contract must stay settled across every save and load path.
 *
 * `saveCampaign` rebuilds `campaign.missions` from the child missions store.
 * Retrying a failed outcome (and the review page's manual apply) settles the
 * contract on `campaign.missions` only, so the next save used to write the
 * stale ACTIVE copy back, and the next battle for that contract settled it
 * and paid it a second time.
 */
import { toast } from '@/components/shared/Toast';
import { applyPostBattle } from '@/lib/campaign/processors/postBattleProcessor';
import { resetEventStore } from '@/services/events';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import { MissionStatus } from '@/types/campaign/enums';
import { createContract, type IContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { resetSequence } from '@/utils/events/eventFactory';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const CONTRACT_ID = 'contract-settle-once';
// base 400 + success 600 = 1000; base 400 + failure 50 = 450.
const SUCCESS_PAYOUT = 1000;

function activeContract(): IContract {
  return createContract({
    id: CONTRACT_ID,
    name: 'Settle Once',
    employerId: 'davion',
    targetId: 'liao',
    status: MissionStatus.ACTIVE,
    endDate: '3099-01-01',
    paymentTerms: createPaymentTerms({
      basePayment: new Money(400),
      failurePayment: new Money(50),
      successPayment: new Money(600),
    }),
  });
}

function outcome(matchId: string, winner: GameSide): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: CONTRACT_ID,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    capturedAt: '2026-04-25T00:00:00.000Z',
    report: {
      version: 1,
      matchId,
      winner,
      reason: 'destruction',
      turnCount: 3,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
  };
}

/** A campaign whose missions store and `campaign.missions` both hold the ACTIVE contract. */
function startCampaign() {
  const store = createCampaignStore();
  const id = store.getState().createCampaign('Settled Contract', 'mercenary');
  const campaign = store.getState().campaign!;
  store.getState().switchCampaign({
    ...campaign,
    missions: new Map([[CONTRACT_ID, activeContract()]]),
  });
  return { store, id };
}

function balance(store: ReturnType<typeof createCampaignStore>): number {
  return store.getState().campaign!.finances.balance.amount;
}

function statusIn(
  store: ReturnType<typeof createCampaignStore>,
  where: 'campaign' | 'missionsStore',
): MissionStatus | undefined {
  return where === 'campaign'
    ? store.getState().campaign!.missions.get(CONTRACT_ID)?.status
    : store.getState().missionsStore!.getState().getMission(CONTRACT_ID)
        ?.status;
}

beforeEach(() => {
  jest.mocked(toast).mockClear();
  localStorageMock.clear();
  resetEventStore();
  resetSequence(0);
});

afterEach(() => jest.restoreAllMocks());

describe('a settled contract survives the save that follows an apply', () => {
  it('retry: a later battle neither reopens nor pays the contract again', () => {
    const { store } = startCampaign();
    const before = balance(store);

    store.getState().enqueueOutcome(outcome('match-win', GameSide.Player));
    store.getState().retryOutcomeApplication('match-win');
    const afterFirst = {
      campaign: statusIn(store, 'campaign'),
      missionsStore: statusIn(store, 'missionsStore'),
      paid: balance(store) - before,
    };

    store.getState().enqueueOutcome(outcome('match-loss', GameSide.Opponent));
    store.getState().retryOutcomeApplication('match-loss');
    const afterSecond = {
      campaign: statusIn(store, 'campaign'),
      missionsStore: statusIn(store, 'missionsStore'),
      paid: balance(store) - before,
    };

    // One snapshot so a failure shows the status and the money together.
    expect({ afterFirst, afterSecond }).toEqual({
      afterFirst: {
        campaign: MissionStatus.SUCCESS,
        missionsStore: MissionStatus.SUCCESS,
        paid: SUCCESS_PAYOUT,
      },
      afterSecond: {
        campaign: MissionStatus.SUCCESS,
        missionsStore: MissionStatus.SUCCESS,
        paid: SUCCESS_PAYOUT,
      },
    });
  });

  it('manual apply: a later save and battle neither reopen nor pay the contract again', () => {
    const { store } = startCampaign();
    const before = balance(store);

    // Exactly what the review page's handleApply does.
    const state = store.getState();
    const result = applyPostBattle(
      outcome('match-win', GameSide.Player),
      state.campaign!,
    );
    state.updateCampaign(result.campaign);
    state.markBattleReviewed('match-win');
    expect(balance(store)).toBe(before + SUCCESS_PAYOUT);

    store.getState().saveCampaign();
    expect(statusIn(store, 'campaign')).toBe(MissionStatus.SUCCESS);

    store.getState().enqueueOutcome(outcome('match-loss', GameSide.Opponent));
    store.getState().retryOutcomeApplication('match-loss');

    expect(statusIn(store, 'campaign')).toBe(MissionStatus.SUCCESS);
    expect(balance(store)).toBe(before + SUCCESS_PAYOUT);
  });

  it('reload: the stale missions-store blob does not beat the saved campaign', () => {
    const { store, id } = startCampaign();
    const state = store.getState();
    const result = applyPostBattle(
      outcome('match-win', GameSide.Player),
      state.campaign!,
    );
    state.updateCampaign(result.campaign);
    state.markBattleReviewed('match-win');
    // Precondition: the separately persisted missions store still says ACTIVE.
    expect(localStorageMock.getItem(`missions-${id}`)).toContain('Active');

    const reloaded = createCampaignStore();
    expect(reloaded.getState().loadCampaign(id)).toBe(true);

    expect(statusIn(reloaded, 'campaign')).toBe(MissionStatus.SUCCESS);
  });

  it('keeps a missions-store copy that is ahead of a stale campaign copy', () => {
    const { store } = startCampaign();
    const live = store.getState().campaign!;
    const settled = {
      ...live.missions.get(CONTRACT_ID)!,
      status: MissionStatus.FAILED,
    };
    // The store settled it; campaign.missions still holds ACTIVE.
    store.getState().missionsStore!.getState().addMission(settled);

    store.getState().saveCampaign();

    expect(statusIn(store, 'campaign')).toBe(MissionStatus.FAILED);
  });
});
