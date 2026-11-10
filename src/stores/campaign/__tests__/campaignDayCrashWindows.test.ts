/**
 * A day that is interrupted between two storage writes loses no money and
 * pays none twice, on the reload a restarted app actually performs.
 *
 * The real campaign store runs a real day (`advanceDay` -> the day pipeline ->
 * `applyDayToStores` -> `saveCampaign`) in which a won battle flips its
 * contract to SUCCESS and the existing post-battle closure pays it. Storage is
 * frozen after the Nth `setItem` of that day (write N lands, every later write
 * is dropped, as when the process dies), for every N, and a new store is then
 * created from the frozen storage: the zustand rehydrate of the `campaign-store`
 * blob, which is the only local reload path in production. Five more real days
 * are advanced, and the contract must be SUCCESS with the closure credit paid
 * exactly once, whichever write the crash followed.
 *
 * Why this holds: every `campaign-store` write is one complete serialized
 * campaign (missions, finances, date, ledger), so any prefix of the day's
 * writes is a self-consistent snapshot. Writing the campaign in two steps
 * (a mission flipped in one write and the wallet in another) tears it; that is
 * the mutant this test is built to catch.
 *
 * @spec openspec/changes/remove-local-load-campaign/specs/campaign-persistence/spec.md
 */
import { toast } from '@/components/shared/Toast';
import { buildOutcomePaymentTerms } from '@/lib/campaign/contracts/contractPayment';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { resetEventStore } from '@/services/events';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { resetSequence } from '@/utils/events/eventFactory';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { endGame } from '@/utils/gameplay/gameSessionCore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// ---- recording, freezable storage -------------------------------------------
const mem = {
  data: {} as Record<string, string>,
  count: 0,
  frozenAfter: null as number | null,
  landed: [] as string[],
  arm(frozenAfter: number | null) {
    this.count = 0;
    this.frozenAfter = frozenAfter;
    this.landed = [];
  },
};
const localStorageMock = {
  getItem: (key: string) => (key in mem.data ? mem.data[key] : null),
  setItem: (key: string, value: string) => {
    mem.count += 1;
    if (mem.frozenAfter !== null && mem.count > mem.frozenAfter) return;
    mem.data[key] = value;
    mem.landed.push(key);
  },
  removeItem: (key: string) => {
    delete mem.data[key];
  },
  clear: () => {
    mem.data = {};
  },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ---- the world ----------------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000;
const START = new Date('3025-05-01T00:00:00.000Z');
const CONTRACT_START = new Date(START.getTime() - 45 * DAY).toISOString();
const CONTRACT_END = new Date(START.getTime() + 135 * DAY).toISOString();

function freshWorld(): void {
  jest.mocked(toast).mockClear();
  localStorageMock.clear();
  mem.arm(null);
  resetEventStore();
  resetSequence(0);
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
}

/** A finished player win linked to the contract, derived as production does. */
function winForContract(contractId: string) {
  let session = createGameSession(
    {
      mapRadius: 10,
      turnLimit: 10,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    [
      {
        id: 'a',
        name: 'A',
        side: GameSide.Player,
        unitRef: 'hbk-4g',
        pilotRef: 'p1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'b',
        name: 'B',
        side: GameSide.Opponent,
        unitRef: 'mad-3r',
        pilotRef: 'p2',
        gunnery: 4,
        piloting: 5,
      },
    ],
  );
  session = startGame(session, GameSide.Player);
  session = endGame(session, GameSide.Player, 'destruction');
  return deriveCombatOutcome(
    { ...session, id: 'crash-window-win' },
    { contractId },
  );
}

/** Storage after the setup save: an ACTIVE contract and a won battle waiting to be applied. */
function buildStart(): Record<string, string> {
  freshWorld();
  const store = createCampaignStore();
  store.getState().createCampaign('Crash windows', 'mercenary');
  const contract = createContract({
    id: 'c1',
    name: 'Crash window contract',
    employerId: 'davion',
    targetId: 'liao',
    status: MissionStatus.ACTIVE,
    startDate: CONTRACT_START,
    endDate: CONTRACT_END,
    paymentTerms: buildOutcomePaymentTerms(new Money(1_320_000), 50),
  });
  // `saveCampaign` saves the missions held by the missions store.
  store.getState().missionsStore!.getState().addMission(contract);
  store.getState().updateCampaign({
    currentDate: START,
    missions: new Map([['c1', contract]]),
    finances: { transactions: [], balance: new Money(0) },
  });
  store.getState().enqueueOutcome(winForContract('c1'));
  store.getState().saveCampaign();
  return { ...mem.data };
}

interface IProbe {
  readonly status: string | undefined;
  readonly balance: number;
  readonly closureCredits: number;
}

function probe(store: ReturnType<typeof createCampaignStore>): IProbe {
  const campaign = store.getState().campaign!;
  return {
    status: campaign.missions.get('c1')?.status,
    balance: campaign.finances.balance.amount,
    closureCredits: campaign.finances.transactions.filter((tx) =>
      tx.id.startsWith('tx-contract-close-c1-'),
    ).length,
  };
}

/** Run the day with storage frozen after write `n` (null: no fault), then restart the app and play on. */
function dayWithCrashAfter(start: Record<string, string>, n: number | null) {
  freshWorld();
  mem.data = { ...start };
  const live = createCampaignStore(); // rehydrate the setup save
  mem.arm(n);
  expect(live.getState().advanceDay()).not.toBeNull();
  const writes = [...mem.landed];
  mem.arm(null); // the process is gone: nothing more from `live` reaches storage

  const restarted = createCampaignStore(); // zustand rehydrate of the frozen storage
  const atRestart = probe(restarted);
  for (let day = 0; day < 5; day++) {
    expect(restarted.getState().advanceDay()).not.toBeNull();
  }
  return { writes, atRestart, finalState: probe(restarted) };
}

describe('a day interrupted between two storage writes (live reload path)', () => {
  jest.setTimeout(120_000);

  afterEach(() => {
    useCampaignRosterStore.getState().reset();
  });

  it('pays the closure credit exactly once after a crash at every write boundary', () => {
    const start = buildStart();

    const clean = dayWithCrashAfter(start, null);
    const expected = clean.finalState.balance;
    expect(expected).toBeGreaterThan(0);
    expect(clean.finalState).toMatchObject({
      status: MissionStatus.SUCCESS,
      closureCredits: 1,
    });
    // Non-vacuous: the day really makes several separate writes to cut between.
    expect(clean.writes.length).toBeGreaterThanOrEqual(5);

    const outcomes: string[] = [];
    const restartStatuses = new Set<string | undefined>();
    for (let n = 0; n <= clean.writes.length; n++) {
      const { atRestart, finalState } = dayWithCrashAfter(start, n);
      outcomes.push(
        `after write ${n} (${clean.writes[n - 1] ?? 'none'}): ` +
          `${atRestart.status}/${atRestart.balance} -> ${finalState.status}/${finalState.balance}`,
      );
      restartStatuses.add(atRestart.status);
      // Status and wallet are never torn on restart: SUCCESS comes with the credit.
      if (atRestart.status === MissionStatus.SUCCESS) {
        expect(atRestart.balance).toBe(expected);
        expect(atRestart.closureCredits).toBe(1);
      } else {
        expect(atRestart.balance).toBe(0);
        expect(atRestart.closureCredits).toBe(0);
      }
      // And whatever was cut, the contract ends SUCCESS, paid once.
      expect(finalState.status).toBe(MissionStatus.SUCCESS);
      expect(finalState.balance).toBe(expected);
      expect(finalState.closureCredits).toBe(1);
    }
    expect(outcomes.length).toBe(clean.writes.length + 1);
    // Non-vacuous: the cuts really fall on both sides of the day, so some
    // restarts see the contract still ACTIVE and some see it already paid.
    expect(restartStatuses).toEqual(
      new Set([MissionStatus.ACTIVE, MissionStatus.SUCCESS]),
    );
  });
});
