/**
 * D-1 (2026-06-09 audit) — campaign store persistence round-trip seam tests.
 *
 * The audit found `useCampaignStore.persistence.ts` silently destroys
 * campaign state on every reload:
 *
 *  - `serializeCampaign` never writes `unitCombatStates`, and
 *    `deserializeCampaign` hard-resets it to `{}` — every reload wipes
 *    unit battle damage.
 *  - `takeLoan` credits the principal as a `finances` transaction (which
 *    IS persisted) and appends to the `campaign.loans` command ledger
 *    (which is NOT persisted) — a reload keeps the borrowed cash and
 *    erases the debt.
 *  - The full-shape sweep found more silently-dropped fields:
 *    `finances.loans` (ILoan amortization ledger), `activePreset`,
 *    `currentSystemId`, `combatTeams`, `refitOrders`,
 *    `unitConfigurations`, `unitPrestige`, `moraleState`,
 *    `moraleTransitions`, `personnelMarket`, `contractMarket`.
 *
 * These tests exercise the WIRING (store action → clientSafeStorage →
 * fresh store → reload), not the module in isolation:
 *
 *  1. damage a unit + take a loan → saveCampaign → loadCampaign on a
 *     fresh store → damage AND ledger survive (RED pre-fix),
 *  2. the same survival through the zustand persist partialize → merge
 *     rehydrate cycle (the page-reload path; RED pre-fix),
 *  3. the full-shape sweep round-trip (RED pre-fix),
 *  4. backward compat: a pre-fix saved payload (no new fields) still
 *     loads — missing fields default sanely (GREEN pre- and post-fix),
 *  5. a compile-time drift guard: every `ICampaign` key must be carried
 *     by `SerializedCampaignState` or named as separately persisted.
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { ILoan } from '@/types/campaign/Loan';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MarketExperienceLevel } from '@/types/campaign/markets/marketTypes';
import { Money } from '@/types/campaign/Money';
import { MoraleState } from '@/types/campaign/Prestige';
import { RefitClass } from '@/types/campaign/Refit';
import { CombatRole } from '@/types/campaign/scenario/scenarioTypes';
import { createInitialCombatState } from '@/types/campaign/UnitCombatState';

import { takeLoan } from '../campaignCommandActions';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';
import { type SerializedCampaignState } from '../useCampaignStore.persistence';

// =============================================================================
// localStorage mock — clientSafeStorage delegates to window.localStorage;
// a deterministic in-memory store lets us snapshot/restore persisted blobs
// across simulated reloads within one Jest process (same pattern as
// criticalRoundTrip.test.ts).
// =============================================================================

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// =============================================================================
// Compile-time drift guard
//
// Every key of `ICampaign` must either round-trip through
// `SerializedCampaignState` or be explicitly named here as persisted by a
// separate store. If `ICampaign` gains a field that the serializer drops,
// `DroppedCampaignKeys` stops being `never` and `npx tsc --noEmit` fails —
// the same convention SerializedCampaign.ts (server path) documents for
// its CAMPAIGN_MAP_FIELDS / CAMPAIGN_DATE_FIELDS constants.
// =============================================================================

/** Keys persisted OUTSIDE SerializedCampaignState, with their owner. */
type SeparatelyPersistedKey =
  | 'forces' // useForcesStore (own zustand persist, keyed per campaign)
  | 'missions'; // useMissionsStore (own zustand persist, keyed per campaign)

type DroppedCampaignKeys = Exclude<
  keyof ICampaign,
  keyof SerializedCampaignState | SeparatelyPersistedKey
>;

/**
 * Fails the typecheck unless T is `never`. The `T extends never`
 * CONSTRAINT is the guard — instantiating with a non-never key union is
 * a compile error. The body is tuple-wrapped because a bare conditional
 * distributes over `never` and collapses to `never` instead of `true`.
 */
type AssertNever<T extends never> = [T] extends [never] ? true : false;

// =============================================================================
// Fixtures
// =============================================================================

/** A unit combat state carrying visible battle damage. */
function makeDamagedCombatState(): IUnitCombatState {
  return {
    ...createInitialCombatState({
      unitId: 'unit-alpha',
      armorPerLocation: { CT: 20, LT: 15 },
      structurePerLocation: { CT: 10, LT: 8 },
      ammoPerBin: { 'bin-lrm10': 12 },
    }),
    currentArmorPerLocation: { CT: 5, LT: 0 },
    currentStructurePerLocation: { CT: 7, LT: 3 },
    destroyedLocations: ['LT'],
    destroyedComponents: [
      {
        location: 'LT',
        slot: 2,
        componentType: 'weapon',
        name: 'Medium Laser',
        destroyedAt: 'match-001',
      },
    ],
    heatEnd: 4,
    ammoRemaining: { 'bin-lrm10': 2 },
    lastCombatOutcomeId: 'match-001',
    lastUpdated: '3025-02-01T00:00:00.000Z',
  };
}

/** An amortization-engine loan (`IFinances.loans` — Money + Date fields). */
function makeAmortizedLoan(): ILoan {
  return {
    id: 'iloan-001',
    principal: new Money(1_000_000),
    annualRate: 0.06,
    termMonths: 24,
    monthlyPayment: new Money(44_320),
    remainingPrincipal: new Money(920_000),
    startDate: new Date('3025-01-01T00:00:00.000Z'),
    nextPaymentDate: new Date('3025-03-01T00:00:00.000Z'),
    paymentsRemaining: 22,
    isDefaulted: false,
  };
}

/** Seed a campaign through the real store and return its id. */
function seedCampaign(): string {
  const store = useCampaignStore();
  return store.getState().createCampaign('Round Trip Co', 'mercenary');
}

/** Read the live campaign with command-extension fields visible. */
function currentCampaign(): ICampaignWithCommand {
  return useCampaignStore().getState().getCampaign() as ICampaignWithCommand;
}

// =============================================================================
// Tests
// =============================================================================

describe('D-1 — campaign persistence round-trip (save → reload seam)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorageMock.clear();
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetCampaignStore();
  });

  it('unit battle damage and the loan ledger survive saveCampaign → loadCampaign', () => {
    const id = seedCampaign();
    const store = useCampaignStore();

    // Damage a unit the way the post-battle pipeline does — by writing
    // the canonical unitCombatStates map onto the campaign.
    store.getState().updateCampaign({
      unitCombatStates: { 'unit-alpha': makeDamagedCombatState() },
    });

    // Take a loan through the REAL command action: credits the cash as a
    // finances transaction AND appends to the campaign.loans ledger.
    const loanResult = takeLoan({
      principal: 500_000,
      interestRate: 0.1,
      termDays: 100,
    });
    expect(loanResult.applied).toBe(true);
    const balanceAfterLoan = currentCampaign().finances.balance.amount;
    expect(currentCampaign().loans).toHaveLength(1);

    store.getState().saveCampaign();

    // Simulate a full reload: drop the singleton, stand up a fresh store,
    // and load the campaign record back from storage.
    resetCampaignStore();
    const fresh = useCampaignStore();
    expect(fresh.getState().loadCampaign(id)).toBe(true);
    const reloaded = fresh.getState().getCampaign() as ICampaignWithCommand;

    // The borrowed cash survives (it always did — that is the asymmetry
    // the audit flagged) ...
    expect(reloaded.finances.balance.amount).toBeCloseTo(balanceAfterLoan);

    // ... and now the DEBT must survive with it (RED pre-fix).
    expect(reloaded.loans).toBeDefined();
    expect(reloaded.loans).toHaveLength(1);
    expect(reloaded.loans![0].principal).toBe(500_000);
    expect(reloaded.loans![0].remainingBalance).toBeCloseTo(550_000);
    expect(reloaded.loans![0].status).toBe('active');

    // Unit battle damage must survive the reload (RED pre-fix).
    const combatState = reloaded.unitCombatStates['unit-alpha'];
    expect(combatState).toBeDefined();
    expect(combatState.currentArmorPerLocation).toEqual({ CT: 5, LT: 0 });
    expect(combatState.currentStructurePerLocation).toEqual({ CT: 7, LT: 3 });
    expect(combatState.destroyedLocations).toEqual(['LT']);
    expect(combatState.destroyedComponents).toHaveLength(1);
    expect(combatState.ammoRemaining).toEqual({ 'bin-lrm10': 2 });
    expect(combatState.heatEnd).toBe(4);
    expect(combatState.lastCombatOutcomeId).toBe('match-001');
  });

  it('unit battle damage and the loan ledger survive the zustand partialize → merge rehydrate (page-reload path)', () => {
    seedCampaign();
    const store = useCampaignStore();

    store.getState().updateCampaign({
      unitCombatStates: { 'unit-alpha': makeDamagedCombatState() },
    });
    takeLoan({ principal: 250_000, interestRate: 0.2, termDays: 50 });

    // The persist middleware auto-writes 'campaign-store' on every set();
    // a page reload re-creates the store, which rehydrates via merge().
    resetCampaignStore();
    const rehydrated = useCampaignStore()
      .getState()
      .getCampaign() as ICampaignWithCommand;

    expect(rehydrated).not.toBeNull();
    expect(rehydrated.unitCombatStates['unit-alpha']).toBeDefined();
    expect(
      rehydrated.unitCombatStates['unit-alpha'].currentArmorPerLocation,
    ).toEqual({ CT: 5, LT: 0 });
    expect(rehydrated.loans).toHaveLength(1);
    expect(rehydrated.loans![0].remainingBalance).toBeCloseTo(300_000);
  });

  it('every other silently-dropped campaign field survives the round-trip (full-shape sweep)', () => {
    const id = seedCampaign();
    const store = useCampaignStore();
    const base = currentCampaign();

    store.getState().updateCampaign({
      activePreset: 'pirate',
      currentSystemId: 'new-avalon',
      combatTeams: [
        { forceId: 'force-1', role: CombatRole.PATROL, battleChance: 60 },
      ],
      refitOrders: [
        {
          id: 'refit-001',
          unitId: 'unit-alpha',
          // Partial fixture — only round-trip identity matters here, not
          // construction validity (cast-through-unknown is deliberate).
          targetConfiguration: {
            name: 'Target Config',
          } as unknown as MechBuildConfig,
          refitClass: RefitClass.EquipmentSwap,
          estimatedCost: 120_000,
          estimatedHours: 40,
          hoursCompleted: 12,
          status: 'in-progress',
          createdAt: '3025-02-01T00:00:00.000Z',
        },
      ],
      unitConfigurations: {
        'unit-alpha': { name: 'Current Config' } as unknown as MechBuildConfig,
      },
      unitPrestige: [
        {
          unitId: 'unit-alpha',
          score: 62,
          history: [
            {
              matchId: 'match-001',
              delta: 12,
              scoreAfter: 62,
              reason: 'Victory',
              appliedAt: '3025-02-01T00:00:00.000Z',
            },
          ],
        },
      ],
      moraleState: MoraleState.High,
      moraleTransitions: [
        {
          from: MoraleState.Steady,
          to: MoraleState.High,
          direction: 'up',
          reason: 'Victory streak',
          occurredAt: '3025-02-01T00:00:00.000Z',
        },
      ],
      personnelMarket: [
        {
          id: 'pmo-001',
          name: 'Recruit One',
          role: CampaignPersonnelRole.PILOT,
          experienceLevel: MarketExperienceLevel.REGULAR,
          skills: { gunnery: 4, piloting: 5 },
          hireCost: 25_000,
          expirationDate: '3025-03-01T00:00:00.000Z',
        },
      ],
      contractMarket: { offers: [], declinedOfferIds: ['contract-77'] },
      finances: {
        transactions: base.finances.transactions,
        balance: base.finances.balance,
        loans: [makeAmortizedLoan()],
      },
    } as Partial<ICampaign>);

    store.getState().saveCampaign();
    resetCampaignStore();
    const fresh = useCampaignStore();
    expect(fresh.getState().loadCampaign(id)).toBe(true);
    const reloaded = fresh.getState().getCampaign() as ICampaignWithCommand;

    expect(reloaded.activePreset).toBe('pirate');
    expect(reloaded.currentSystemId).toBe('new-avalon');
    expect(reloaded.combatTeams).toEqual([
      { forceId: 'force-1', role: CombatRole.PATROL, battleChance: 60 },
    ]);
    expect(reloaded.refitOrders).toHaveLength(1);
    expect(reloaded.refitOrders![0].id).toBe('refit-001');
    expect(reloaded.refitOrders![0].hoursCompleted).toBe(12);
    expect(reloaded.unitConfigurations).toBeDefined();
    expect(reloaded.unitConfigurations!['unit-alpha']).toEqual({
      name: 'Current Config',
    });
    expect(reloaded.unitPrestige).toHaveLength(1);
    expect(reloaded.unitPrestige![0].score).toBe(62);
    expect(reloaded.unitPrestige![0].history).toHaveLength(1);
    expect(reloaded.moraleState).toBe(MoraleState.High);
    expect(reloaded.moraleTransitions).toHaveLength(1);
    expect(reloaded.moraleTransitions![0].to).toBe(MoraleState.High);
    expect(reloaded.personnelMarket).toHaveLength(1);
    expect(reloaded.personnelMarket![0].hireCost).toBe(25_000);
    expect(reloaded.contractMarket).toEqual({
      offers: [],
      declinedOfferIds: ['contract-77'],
    });

    // The amortization ledger must rehydrate with live Money / Date
    // instances — financialProcessor.processLoanPayments calls
    // Money.subtract and Date math on these.
    expect(reloaded.finances.loans).toHaveLength(1);
    const loan = reloaded.finances.loans![0];
    expect(loan.principal).toBeInstanceOf(Money);
    expect(loan.principal.amount).toBe(1_000_000);
    expect(loan.monthlyPayment).toBeInstanceOf(Money);
    expect(loan.remainingPrincipal.amount).toBe(920_000);
    expect(loan.startDate).toBeInstanceOf(Date);
    expect(loan.nextPaymentDate.toISOString()).toBe('3025-03-01T00:00:00.000Z');
    expect(loan.paymentsRemaining).toBe(22);
    expect(loan.isDefaulted).toBe(false);
  });

  it('a pre-fix saved payload (no new fields) still loads with sane defaults', () => {
    // Exactly the shape serializeCampaign produced BEFORE this fix —
    // no unitCombatStates, no loans, no finances.loans, none of the
    // swept optional fields.
    const legacy = {
      id: 'campaign-legacy-1',
      name: 'Legacy Campaign',
      currentDate: '3025-01-15T00:00:00.000Z',
      factionId: 'mercenary',
      rootForceId: 'force-legacy-root',
      finances: {
        transactions: [
          {
            id: 'tx-1',
            type: 'income',
            amount: 100_000,
            date: '3025-01-10T00:00:00.000Z',
            description: 'Contract payment',
          },
        ],
        balance: 1_500_000,
      },
      factionStandings: {},
      options: currentDefaultOptions(),
      campaignType: 'mercenary',
      campaignStartDate: '3025-01-01T00:00:00.000Z',
      pendingBattleOutcomes: [],
      processedBattleIds: [],
      reviewedBattleIds: {},
      dailyBattleAudit: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    } as unknown as SerializedCampaignState;

    localStorageMock.setItem(
      'campaign-campaign-legacy-1',
      JSON.stringify({ state: legacy }),
    );

    const fresh = useCampaignStore();
    expect(fresh.getState().loadCampaign('campaign-legacy-1')).toBe(true);
    const loaded = fresh.getState().getCampaign() as ICampaignWithCommand;

    expect(loaded.id).toBe('campaign-legacy-1');
    expect(loaded.finances.balance.amount).toBe(1_500_000);
    // Missing fields default sanely — no crash, no garbage.
    expect(loaded.unitCombatStates).toEqual({});
    expect(loaded.loans).toBeUndefined();
    expect(loaded.finances.loans).toBeUndefined();
    expect(loaded.refitOrders).toBeUndefined();
    expect(loaded.moraleState).toBeUndefined();
    expect(loaded.currentSystemId).toBeUndefined();
  });

  it('compile-time: SerializedCampaignState covers every ICampaign field (drift guard)', () => {
    // If a future ICampaign field is not added to SerializedCampaignState
    // (or to SeparatelyPersistedKey with an owning store), this constant
    // stops typechecking — `npx tsc --noEmit` fails the build.
    const persistedShapeCoversCampaign: AssertNever<DroppedCampaignKeys> = true;
    expect(persistedShapeCoversCampaign).toBe(true);
  });
});

/**
 * Default options snapshot for the legacy payload — read off a freshly
 * created campaign so the fixture always matches the live default shape.
 */
function currentDefaultOptions(): unknown {
  const id = useCampaignStore().getState().createCampaign('opts', 'mercenary');
  const options = useCampaignStore().getState().getCampaign()!.options;
  // Drop the helper campaign's persisted record so it can't leak into
  // other assertions.
  localStorageMock.removeItem(`campaign-${id}`);
  resetCampaignStore();
  return JSON.parse(JSON.stringify(options));
}
