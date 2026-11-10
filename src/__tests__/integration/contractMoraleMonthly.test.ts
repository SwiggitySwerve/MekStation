import type { ICampaign } from '@/types/campaign/Campaign';

/**
 * The monthly contract (enemy) morale check, through the real store and day pipeline.
 *
 * Pin: MekHQ e7adc2c. On the 1st of the month `CampaignNewDayManager.processNewDayATB`
 * calls `MHQMorale.checkMorale` for every active contract (`CampaignNewDayManager.java:1264-1271`);
 * that method runs only when StratCon is on (`:475-477`), which MekStation's analogue is the
 * `useAtBScenarios` option. The rules are M1's `performMoraleCheck` (`MHQMorale.java:167-189, 263-299`).
 *
 * Expected values are computed here from M1's pure rules and the campaign's seeded stream, never from the
 * processor under test. Dates are in-game dates (year 3025); battles are real `deriveCombatOutcome` results
 * with their wall-clock `capturedAt`. Only a WITHDRAWAL leaves a contract ACTIVE (every other end reason
 * settles it, `postBattleProcessor.helpers.ts:333-351`), so the battles that reach a check are withdrawals.
 *
 * @spec openspec/changes/add-contract-morale-monthly-check/specs/mission-contracts/spec.md
 */
import { toast } from '@/components/shared/Toast';
import { buildOutcomePaymentTerms } from '@/lib/campaign/contracts/contractPayment';
import { DayPipelineRegistry, DayPhase } from '@/lib/campaign/dayPipeline';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { contractMoraleProcessor } from '@/lib/campaign/processors/contractMoraleProcessor';
import { createScenarioGenerationProcessor } from '@/lib/campaign/processors/scenarioGenerationProcessor';
import {
  DEFAULT_MORALE_MODIFIERS,
  performMoraleCheck,
  type IMoraleScenario,
} from '@/lib/campaign/scenario/contractMorale';
import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { resetEventStore } from '@/services/events';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract, type IContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import {
  AtBMoraleLevel as L,
  CombatRole,
} from '@/types/campaign/scenario/scenarioTypes';
import {
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { resetSequence } from '@/utils/events/eventFactory';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { endGame } from '@/utils/gameplay/gameSessionCore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// ---- storage ---------------------------------------------------------------
const mem = { data: {} as Record<string, string> };
const localStorageMock = {
  getItem: (k: string) => (k in mem.data ? mem.data[k] : null),
  setItem: (k: string, v: string) => {
    mem.data[k] = v;
  },
  removeItem: (k: string) => {
    delete mem.data[k];
  },
  clear: () => {
    mem.data = {};
  },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ---- dates (in-game; noon UTC so the local calendar day matches in every zone) ----
const at = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
const localDay = (d: Date) =>
  `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---- the seeded stream, mirrored independently of the processor ------------
/** The 2d6 the campaign stream gives `contractId` on `date` (two d6 draws). */
function rollFor(seed: number, date: Date, contractId: string): number {
  const random = createDailyRandom(
    { id: 'seed-probe', rngSeed: seed } as unknown as ICampaign,
    date,
    `contract-morale:${contractId}`,
  );
  return Math.floor(random() * 6) + 1 + Math.floor(random() * 6) + 1;
}
/** A seed whose rolls are `wanted[i]` for `(date_i, contractId_i)` pairs. */
function seedFor(
  wanted: ReadonlyArray<readonly [Date, string, number]>,
): number {
  for (let seed = 1; seed < 200_000; seed++) {
    if (wanted.every(([d, id, roll]) => rollFor(seed, d, id) === roll)) {
      return seed;
    }
  }
  throw new Error(`no seed gives ${JSON.stringify(wanted)}`);
}

// ---- battles ----------------------------------------------------------------
let matchSeq = 0;
/** A real derived outcome (wall-clock capturedAt), ended by WITHDRAWAL so the contract stays ACTIVE. */
function battle(
  contractId: string,
  winner: 'player' | 'opponent' | 'draw',
): ICombatOutcome {
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
  matchSeq += 1;
  const derived = deriveCombatOutcome(
    { ...session, id: `m2-${matchSeq}` },
    { contractId },
  );
  return {
    ...derived,
    endReason: CombatEndReason.Withdrawal,
    report: {
      ...derived.report,
      winner:
        winner === 'player'
          ? GameSide.Player
          : winner === 'opponent'
            ? GameSide.Opponent
            : 'draw',
    },
  };
}

// ---- world ------------------------------------------------------------------
function makeContract(id: string, over: Partial<IContract> = {}): IContract {
  return {
    ...createContract({
      id,
      name: `Contract ${id}`,
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      startDate: '3025-01-01',
      endDate: '3026-12-31',
      paymentTerms: buildOutcomePaymentTerms(new Money(1_320_000), 50),
    }),
    ...over,
  };
}

interface IWorld {
  readonly store: ReturnType<typeof createCampaignStore>;
}

function startWorld(opts: {
  readonly start: Date;
  readonly seed: number;
  readonly contracts?: readonly IContract[];
  readonly atb?: boolean;
}): IWorld {
  jest.mocked(toast).mockClear();
  localStorageMock.clear();
  resetEventStore();
  resetSequence(0);
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
  const store = createCampaignStore();
  store.getState().createCampaign('Monthly morale', 'mercenary', {
    useAtBScenarios: opts.atb ?? true,
  });
  const contracts = opts.contracts ?? [makeContract('c1')];
  for (const c of contracts) {
    store.getState().missionsStore!.getState().addMission(c);
  }
  store.getState().updateCampaign({
    currentDate: opts.start,
    rngSeed: opts.seed,
    missions: new Map(contracts.map((c) => [c.id, c])),
    finances: { transactions: [], balance: new Money(50_000_000) },
  });
  store.getState().saveCampaign();
  return { store };
}

function advance(store: IWorld['store'], days: number): void {
  for (let i = 0; i < days; i++) {
    expect(store.getState().advanceDay()).not.toBeNull();
  }
}
/** Advance until the campaign date is `day` (the next pass will process it). */
function advanceTo(store: IWorld['store'], day: string): void {
  let guard = 0;
  while (localDay(store.getState().campaign!.currentDate) !== day) {
    advance(store, 1);
    if (++guard > 400) throw new Error(`never reached ${day}`);
  }
}
function contractOf(store: IWorld['store'], id = 'c1'): IContract {
  return store.getState().campaign!.missions.get(id) as IContract;
}
function levelOf(store: IWorld['store'], id = 'c1'): L | undefined {
  return contractOf(store, id).moraleLevel;
}

/** What M1 says the level becomes, from the same roll and the recorded battles. */
function expectedLevel(
  level: L | undefined,
  roll: number,
  checkDay: string,
  scenarios: readonly IMoraleScenario[] = [],
): L {
  return performMoraleCheck({
    level: level ?? L.STALEMATE,
    today: checkDay,
    roll,
    reliability: 0,
    scenarios,
    modifiers: DEFAULT_MORALE_MODIFIERS,
  }).level;
}
const win = (date: string): IMoraleScenario => ({
  date,
  status: {
    decisiveDefeat: false,
    refusedEngagement: false,
    decisiveVictory: false,
    pyrrhicVictory: false,
    fleetInBeing: false,
    overallVictory: true,
    overallDefeat: false,
  },
});
const loss = (date: string): IMoraleScenario => ({
  date,
  status: {
    decisiveDefeat: false,
    refusedEngagement: false,
    decisiveVictory: false,
    pyrrhicVictory: false,
    fleetInBeing: false,
    overallVictory: false,
    overallDefeat: true,
  },
});

// The 1st checked in most rows.
const JULY_1 = '3025-07-01';
const JULY_1_DATE = at(JULY_1);

// Math.random must never be consulted by the check.
let realRandom: () => number;
beforeEach(() => {
  realRandom = Math.random;
  jest.spyOn(Math, 'random').mockImplementation(() => {
    if ((new Error().stack ?? '').includes('contractMoraleProcessor')) {
      throw new Error('the monthly morale check must not use Math.random');
    }
    return realRandom();
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  useCampaignRosterStore.getState().reset();
});

describe('row 1: nothing happens except on the 1st', () => {
  it('leaves the contract untouched on every other day, and a held check adds no field', () => {
    const seed = seedFor([[JULY_1_DATE, 'c1', 7]]); // a hold on the 1st
    const { store } = startWorld({ start: at('3025-06-28'), seed });
    const before = contractOf(store);
    advance(store, 3); // processes 06-28, 06-29, 06-30
    expect(contractOf(store)).toBe(before);
    advance(store, 1); // processes 07-01: roll 7, no battles: UNCHANGED
    expect(contractOf(store)).toStrictEqual(before);
    expect('moraleLevel' in contractOf(store)).toBe(false);
    advance(store, 1); // 07-02
    expect('moraleLevel' in contractOf(store)).toBe(false);
  });

  it('does not run on the 2nd of the month', () => {
    const second = at('3025-07-02');
    const seed = seedFor([[second, 'c1', 10]]); // would waver if it ran on the 2nd
    const { store } = startWorld({ start: second, seed });
    advance(store, 1);
    expect(levelOf(store)).toBeUndefined();
  });
});

describe('row 2: on the 1st the level moves exactly as the pinned rules say', () => {
  it.each([
    [4, L.ADVANCING],
    [7, undefined],
    [10, L.WEAKENED],
  ])('a roll of %i from STALEMATE gives %s', (roll, expected) => {
    const seed = seedFor([[JULY_1_DATE, 'c1', roll]]);
    const { store } = startWorld({ start: JULY_1_DATE, seed });
    advance(store, 1);
    expect(levelOf(store)).toBe(expected);
    expect(expected ?? L.STALEMATE).toBe(
      expectedLevel(undefined, roll, JULY_1),
    );
  });

  it('rallies and wavers from a mid-table level', () => {
    const seed = seedFor([[JULY_1_DATE, 'c1', 10]]);
    const { store } = startWorld({
      start: JULY_1_DATE,
      seed,
      contracts: [makeContract('c1', { moraleLevel: L.ADVANCING })],
    });
    advance(store, 1);
    expect(levelOf(store)).toBe(expectedLevel(L.ADVANCING, 10, JULY_1));
    expect(levelOf(store)).toBe(L.STALEMATE);
  });
});

describe("row 3: this month's battles push the roll", () => {
  const FIFTEENTH = at('3025-06-15');
  const seed7 = () => seedFor([[JULY_1_DATE, 'c1', 7]]);

  function monthWith(
    outcomeOf: (id: string) => ICombatOutcome,
    onContract = 'c1',
  ) {
    const { store } = startWorld({
      start: FIFTEENTH,
      seed: seed7(),
      contracts: [makeContract('c1'), makeContract('c2')],
    });
    store.getState().enqueueOutcome(outcomeOf(onContract));
    advanceTo(store, JULY_1);
    expect(levelOf(store)).toBeUndefined(); // before the check (it has not run yet)
    advance(store, 1);
    return store;
  }

  it('a victory (roll 7 + decisive victory 2 = 9) wavers the enemy', () => {
    const store = monthWith((id) => battle(id, 'player'));
    expect(levelOf(store)).toBe(L.WEAKENED);
    expect(levelOf(store)).toBe(
      expectedLevel(undefined, 7, JULY_1, [win('3025-06-15')]),
    );
    expect(contractOf(store).status).toBe(MissionStatus.ACTIVE);
  });

  it('a defeat (roll 7 + decisive defeat -3 = 4) rallies the enemy', () => {
    const store = monthWith((id) => battle(id, 'opponent'));
    expect(levelOf(store)).toBe(L.ADVANCING);
    expect(levelOf(store)).toBe(
      expectedLevel(undefined, 7, JULY_1, [loss('3025-06-15')]),
    );
  });

  it('a draw does not move the roll', () => {
    const store = monthWith((id) => battle(id, 'draw'));
    expect(levelOf(store)).toBeUndefined();
  });

  it("another contract's battle does not count for this one", () => {
    const store = monthWith((id) => battle(id, 'player'), 'c2');
    expect(levelOf(store, 'c1')).toBeUndefined();
  });

  it('a battle applied on the day of the check counts that same day', () => {
    const { store } = startWorld({ start: JULY_1_DATE, seed: seed7() });
    store.getState().enqueueOutcome(battle('c1', 'player'));
    advance(store, 1); // post-battle (350) applies it, then the check (410) sees it
    expect(levelOf(store)).toBe(L.WEAKENED);
  });
});

describe('row 4: the window is the previous calendar month', () => {
  const AUG_1 = '3025-08-01'; // July has 31 days
  const AUG_1_DATE = at(AUG_1);

  /** Both checks (1 July, then 1 August) with roll 7, the battle applied on `battleDay`. */
  function twoChecks(battleDay: string) {
    const seed = seedFor([
      [JULY_1_DATE, 'c1', 7],
      [AUG_1_DATE, 'c1', 7],
    ]);
    const { store } = startWorld({ start: at(battleDay), seed });
    store.getState().enqueueOutcome(battle('c1', 'player'));
    advanceTo(store, JULY_1);
    advance(store, 1);
    const afterJuly = levelOf(store);
    advanceTo(store, AUG_1);
    advance(store, 1);
    const sc = [win(battleDay)];
    const july = expectedLevel(undefined, 7, JULY_1, sc);
    return {
      afterJuly,
      afterAugust: levelOf(store),
      expectedJuly: july,
      expectedAugust: expectedLevel(july, 7, AUG_1, sc),
    };
  }

  it('counts a battle applied on the first day of the window (07-01) at the 1 August check', () => {
    const r = twoChecks('3025-07-01');
    expect(r.afterJuly).toBe(r.expectedJuly);
    expect(r.afterAugust).toBe(r.expectedAugust);
    // WEAKENED on 1 July, and the same battle still counts on 1 August: CRITICAL.
    expect(r.afterAugust).toBe(L.CRITICAL);
  });

  it('does not count one applied a day before the window (06-30) at the 1 August check', () => {
    const r = twoChecks('3025-06-30');
    expect(r.afterJuly).toBe(L.WEAKENED); // counted on 1 July
    expect(r.afterAugust).toBe(r.expectedAugust);
    expect(r.afterAugust).toBe(L.WEAKENED); // roll 7, battle now outside the window: held
  });

  it('does not count one applied long before (40 days) at the 1 August check', () => {
    const r = twoChecks('3025-06-22');
    expect(r.afterAugust).toBe(r.expectedAugust);
    expect(r.afterAugust).toBe(L.WEAKENED);
  });
});

describe('row 5: reaching ROUTED sets only the level', () => {
  it('leaves status, dates, payment terms, wallet entries and every other field alone', () => {
    const seed = seedFor([[JULY_1_DATE, 'c1', 10]]);
    const original = makeContract('c1', { moraleLevel: L.CRITICAL });
    const { store } = startWorld({
      start: JULY_1_DATE,
      seed,
      contracts: [original],
    });
    advance(store, 1);
    const after = contractOf(store);
    expect(after.moraleLevel).toBe(L.ROUTED);
    expect({
      ...after,
      moraleLevel: undefined,
      updatedAt: undefined,
    }).toStrictEqual({
      ...original,
      moraleLevel: undefined,
      updatedAt: undefined,
    });
    expect(after.status).toBe(MissionStatus.ACTIVE);
    expect(after).not.toHaveProperty('routedEarlyEnd');
    const txs = store.getState().campaign!.finances.transactions;
    expect(
      txs.filter(
        (t) => /contract/i.test(t.id) || /contract/i.test(t.description),
      ),
    ).toEqual([]);
  });
});

describe('row 6: only an ACTIVE contract in an AtB campaign is checked', () => {
  const wavering = () => seedFor([[JULY_1_DATE, 'c1', 10]]);

  it('does nothing when useAtBScenarios is off', () => {
    const { store } = startWorld({
      start: JULY_1_DATE,
      seed: wavering(),
      atb: false,
    });
    advance(store, 1);
    expect(levelOf(store)).toBeUndefined();
  });

  it.each([
    ['PENDING', MissionStatus.PENDING],
    ['SUCCESS', MissionStatus.SUCCESS],
    ['FAILED', MissionStatus.FAILED],
  ])('does nothing to a %s contract', (_name, status) => {
    const { store } = startWorld({
      start: JULY_1_DATE,
      seed: wavering(),
      contracts: [makeContract('c1', { status })],
    });
    advance(store, 1);
    expect(levelOf(store)).toBeUndefined();
  });

  it('does nothing to a contract whose end date has passed', () => {
    const { store } = startWorld({
      start: JULY_1_DATE,
      seed: wavering(),
      contracts: [makeContract('c1', { endDate: '3025-06-30' })],
    });
    advance(store, 1);
    expect(levelOf(store)).toBeUndefined();
  });
});

describe('row 7: determinism, and one stream per contract', () => {
  it('replaying the same day from the same saved state gives the same level', () => {
    const seed = seedFor([[JULY_1_DATE, 'c1', 10]]);
    const { store } = startWorld({ start: JULY_1_DATE, seed });
    const saved = { ...mem.data };
    advance(store, 1);
    const first = levelOf(store);
    mem.data = { ...saved };
    const replay = createCampaignStore();
    advance(replay, 1);
    expect(levelOf(replay)).toBe(first);
    expect(first).toBe(L.WEAKENED);
  });

  it('gives each contract its own roll, whatever the contract order', () => {
    const seed = seedFor([
      [JULY_1_DATE, 'c1', 4],
      [JULY_1_DATE, 'c2', 10],
    ]);
    for (const order of [
      ['c1', 'c2'],
      ['c2', 'c1'],
    ]) {
      const { store } = startWorld({
        start: JULY_1_DATE,
        seed,
        contracts: order.map((id) => makeContract(id)),
      });
      advance(store, 1);
      expect(levelOf(store, 'c1')).toBe(L.ADVANCING);
      expect(levelOf(store, 'c2')).toBe(L.WEAKENED);
    }
  });
});

describe('row 8: the level survives a restart and the next month continues from it', () => {
  it('persists, then moves again from the persisted level', () => {
    const AUG_1_DATE = at('3025-08-01');
    const seed = seedFor([
      [JULY_1_DATE, 'c1', 10],
      [AUG_1_DATE, 'c1', 10],
    ]);
    const { store } = startWorld({ start: JULY_1_DATE, seed });
    advance(store, 1);
    expect(levelOf(store)).toBe(L.WEAKENED);

    const restarted = createCampaignStore(); // rehydrate the saved campaign
    expect(levelOf(restarted)).toBe(L.WEAKENED);

    advanceTo(restarted, '3025-08-01');
    advance(restarted, 1);
    expect(levelOf(restarted)).toBe(
      expectedLevel(L.WEAKENED, 10, '3025-08-01'),
    );
    expect(levelOf(restarted)).toBe(L.CRITICAL);
  });
});

describe('row 9: the new level reaches scenario generation on the same day', () => {
  // Monday 2025-09-01.
  const MONDAY_1ST = at('2025-09-01');

  function pipelineWith(level: L | undefined, seed: number) {
    const registry = new DayPipelineRegistry();
    registry.register(contractMoraleProcessor);
    registry.register(createScenarioGenerationProcessor(() => 0)); // the battle roll always hits
    const contract = makeContract(
      'c1',
      level !== undefined ? { moraleLevel: level } : {},
    );
    const campaign = {
      id: 'campaign-pipeline',
      name: 'Pipeline',
      currentDate: MONDAY_1ST,
      factionId: 'mercenary',
      forces: new Map(),
      rootForceId: 'force-root',
      missions: new Map([['c1', contract]]),
      finances: { transactions: [], balance: new Money(0) },
      factionStandings: {},
      combatTeams: [
        { forceId: 'force-001', role: CombatRole.MANEUVER, battleChance: 40 },
      ],
      options: {
        ...createDefaultCampaignOptions(),
        useAtBScenarios: true,
        difficultyMultiplier: 1.0,
      },
      campaignType: CampaignType.MERCENARY,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      unitCombatStates: {},
      rngSeed: seed,
    } as unknown as ICampaign;
    const result = registry.processDay(campaign);
    return {
      scenarios: result.events.filter((e) => e.type === 'scenario_generated'),
      changed: result.events.filter(
        (e) => e.type === 'contract_morale_changed',
      ),
      level: (result.campaign.missions.get('c1') as IContract).moraleLevel,
    };
  }

  it('orders the check before scenario generation', () => {
    expect(contractMoraleProcessor.phase).toBeLessThan(DayPhase.EVENTS);
  });

  it('ROUTED written this morning means no scenario today', () => {
    const seed = seedFor([[MONDAY_1ST, 'c1', 10]]);
    const r = pipelineWith(L.CRITICAL, seed);
    expect(r.level).toBe(L.ROUTED);
    expect(r.changed).toHaveLength(1);
    expect(r.scenarios).toHaveLength(0);
  });

  it('an unrouted level written this morning still generates a scenario', () => {
    const seed = seedFor([[MONDAY_1ST, 'c1', 10]]);
    const r = pipelineWith(L.OVERWHELMING, seed); // wavers to DOMINATING
    expect(r.level).toBe(L.DOMINATING);
    expect(r.scenarios).toHaveLength(1);
  });

  it('OVERWHELMING written this morning generates the same scenario STALEMATE does', () => {
    const rally = seedFor([[MONDAY_1ST, 'c1', 4]]);
    const overwhelming = pipelineWith(L.DOMINATING, rally); // rallies to OVERWHELMING
    expect(overwhelming.level).toBe(L.OVERWHELMING);
    const stalemate = pipelineWith(L.WEAKENED, rally); // rallies to STALEMATE
    expect(stalemate.level).toBe(L.STALEMATE);
    expect(overwhelming.scenarios).toHaveLength(1);
    expect(overwhelming.scenarios[0].data?.scenarioType).toBe(
      stalemate.scenarios[0].data?.scenarioType,
    );
    expect(overwhelming.scenarios[0].data?.isAttacker).toBe(
      stalemate.scenarios[0].data?.isAttacker,
    );
  });

  it('a held ROUTED check on the 1st keeps today routed: no scenario', () => {
    const seed = seedFor([[MONDAY_1ST, 'c1', 7]]);
    const r = pipelineWith(L.ROUTED, seed);
    expect(r.level).toBe(L.ROUTED);
    expect(r.scenarios).toHaveLength(0);
  });

  it('a ROUTED enemy that rallies on the 1st generates a scenario that day', () => {
    const seed = seedFor([[MONDAY_1ST, 'c1', 4]]);
    const r = pipelineWith(L.ROUTED, seed);
    expect(r.level).toBe(L.CRITICAL);
    expect(r.scenarios).toHaveLength(1);
  });
});

describe('row 10: an era-dated campaign with a wall-clock battle counts', () => {
  it('counts a battle whose capturedAt is the real clock in a campaign dated 3025', () => {
    const seed = seedFor([[JULY_1_DATE, 'c1', 7]]);
    const { store } = startWorld({ start: at('3025-06-20'), seed });
    const outcome = battle('c1', 'player');
    expect(Date.parse(outcome.capturedAt)).toBeGreaterThan(
      Date.parse('2026-01-01'),
    );
    store.getState().enqueueOutcome(outcome);
    advanceTo(store, JULY_1);
    advance(store, 1);
    expect(levelOf(store)).toBe(L.WEAKENED);
  });
});
