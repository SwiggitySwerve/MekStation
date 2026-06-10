/**
 * D-2 seam tests — production registration of the financial, turnover,
 * faction-standing, and vocational-training day processors.
 *
 * The 2026-06-09 audit (finding D-2) showed these four processors were
 * shipped and unit-tested but never registered by
 * `registerBuiltinProcessors()` — the only registration path production
 * uses (`useCampaignStore.advanceDay`). Per-module unit tests call the
 * processors directly, so the wiring gap was invisible to them.
 *
 * These tests exercise the WIRING: they register the builtins exactly the
 * way production does and drive a full `processDay`, asserting each
 * processor's observable day-advance effect (salary posted on payday,
 * departure applied on a failed turnover roll, regard decayed, vocational
 * timer advanced) — not the module logic in isolation.
 */
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import { CampaignType } from '@/types/campaign/CampaignType';
import {
  CampaignPersonnelRole,
  ForceRole,
  FormationLevel,
} from '@/types/campaign/enums';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { FactionStandingLevel } from '@/types/campaign/factionStanding/IFactionStanding';
import { IForce } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';
import { IPilot, PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import { getDayPipeline, _resetDayPipeline } from '../../dayPipeline';
import {
  registerBuiltinProcessors,
  _resetBuiltinRegistration,
} from '../processorRegistration';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal roster entry for store seeding (mirrors processors.test.ts). */
function makeRosterEntry(
  id: string,
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: `Pilot ${id}`,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 100,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3020-01-01'),
    injuries: [],
    ...overrides,
  };
}

/** Minimal vault pilot so the processors' NPC-null guards pass. */
function makeVaultPilot(id: string): IPilot {
  return {
    id,
    name: `Pilot ${id}`,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
  };
}

function makeForce(id: string, unitIds: string[] = []): IForce {
  return {
    id,
    name: `Force ${id}`,
    parentForceId: undefined,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makeCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'campaign-seam-1',
    name: 'Seam Test Campaign',
    currentDate: new Date('3025-07-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map<string, IForce>(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1_000_000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides.unitCombatStates ?? {},
  };
}

/** Seeds roster + vault stores with matched entries so lookups resolve. */
function seedStores(entries: ICampaignRosterEntry[]): void {
  useCampaignRosterStore.setState({
    campaignId: 'campaign-seam-1',
    units: [],
    pilots: entries,
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({
    pilots: entries.map((e) => makeVaultPilot(e.pilotId)),
  });
}

function clearStores(): void {
  useCampaignRosterStore.setState({
    campaignId: null,
    units: [],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [] });
}

// Payday: 1st of month fires the monthly financial block + monthly turnover.
const PAYDAY = new Date('3025-07-01T00:00:00Z');
// Mid-month: only the daily paths (regard decay, vocational timer) fire.
const MID_MONTH = new Date('3025-07-15T00:00:00Z');

const D2_PROCESSOR_IDS = [
  'financial',
  'turnover',
  'faction-standing',
  'vocational-training',
] as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('D-2 seam — production registration of financial/turnover/faction-standing/vocational-training', () => {
  beforeEach(() => {
    _resetDayPipeline();
    _resetBuiltinRegistration();
    clearStores();
  });

  afterEach(() => {
    _resetDayPipeline();
    _resetBuiltinRegistration();
    clearStores();
    jest.restoreAllMocks();
  });

  it('registerBuiltinProcessors registers all four D-2 processors', () => {
    registerBuiltinProcessors();
    const ids = getDayPipeline()
      .getProcessors()
      .map((p) => p.id);

    expect(ids).toEqual(expect.arrayContaining([...D2_PROCESSOR_IDS]));
  });

  it('payday seam: a day-advance on the 1st posts a role-based salary transaction and reduces the balance', () => {
    // Force every 2d6 roll high so turnover passes (no departure noise)
    // and the assertion isolates the financial processor's effect.
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    seedStores([makeRosterEntry('p1')]);
    const campaign = makeCampaign({
      currentDate: PAYDAY,
      options: {
        ...createDefaultCampaignOptions(),
        // Role-based finance path active; legacy dailyCosts no-ops.
        useRoleBasedSalaries: true,
        // Taxes off so the balance delta traces to salary/overhead only.
        useTaxes: false,
      },
    });

    registerBuiltinProcessors();
    const result = getDayPipeline().processDay(campaign);

    // The financial processor ran exactly once and posted monthly salary.
    expect(
      result.processorsRun.filter((id) => id === 'financial'),
    ).toHaveLength(1);
    const salaryTxs = result.campaign.finances.transactions.filter(
      (t) => t.type === TransactionType.Salary,
    );
    expect(salaryTxs).toHaveLength(1);
    expect(result.campaign.finances.balance.amount).toBeLessThan(1_000_000);
  });

  it('turnover seam: a failed monthly check on the 1st departs the pilot via roster patch and emits turnover_departure', () => {
    // Force every 2d6 roll to snake-eyes (roll = 2) so the check fails
    // against the default base target of 3 (+1 skill desirability) and
    // the departure lands as "retired" (2 >= target - 4).
    jest.spyOn(Math, 'random').mockReturnValue(0);

    seedStores([makeRosterEntry('t1')]);
    const campaign = makeCampaign({ currentDate: PAYDAY });

    registerBuiltinProcessors();
    const result = getDayPipeline().processDay(campaign);

    expect(result.processorsRun.filter((id) => id === 'turnover')).toHaveLength(
      1,
    );

    // The departure was applied to the roster store (wiring proof: the
    // processor's store side effect happened during the day-advance).
    const entry = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === 't1');
    expect(entry?.departureReason).toBe('retired');

    // The day surfaced the departure event and the retirement payout.
    expect(result.events.some((e) => e.type === 'turnover_departure')).toBe(
      true,
    );
    expect(
      result.campaign.finances.transactions.some((t) =>
        t.description.startsWith('Retirement payout'),
      ),
    ).toBe(true);
  });

  it('faction-standing seam: a mid-month day-advance decays nonzero regard toward zero', () => {
    const campaign = makeCampaign({
      currentDate: MID_MONTH,
      factionStandings: {
        'faction-pos': {
          factionId: 'faction-pos',
          regard: 30,
          level: FactionStandingLevel.LEVEL_2,
          accoladeLevel: 0,
          censureLevel: 0,
          history: [],
        },
        'faction-neg': {
          factionId: 'faction-neg',
          regard: -20,
          level: FactionStandingLevel.LEVEL_5,
          accoladeLevel: 0,
          censureLevel: 0,
          history: [],
        },
      },
    });

    registerBuiltinProcessors();
    const result = getDayPipeline().processDay(campaign);

    expect(
      result.processorsRun.filter((id) => id === 'faction-standing'),
    ).toHaveLength(1);
    expect(result.campaign.factionStandings['faction-pos'].regard).toBeLessThan(
      30,
    );
    expect(
      result.campaign.factionStandings['faction-neg'].regard,
    ).toBeGreaterThan(-20);
  });

  it('vocational seam: a day-advance increments the timer, and the 30th day awards XP on a successful roll', () => {
    // High roll (12 >= TN 7) so the 30th-day check succeeds.
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    seedStores([
      // Fresh pilot — timer should advance 0 → 1.
      makeRosterEntry('v1'),
      // Pilot one day from the 30-day check — XP awarded, timer reset.
      makeRosterEntry('v2', {
        traits: { vocationalXPTimer: 29 },
      }),
    ]);
    const campaign = makeCampaign({ currentDate: MID_MONTH });

    registerBuiltinProcessors();
    const result = getDayPipeline().processDay(campaign);

    expect(
      result.processorsRun.filter((id) => id === 'vocational-training'),
    ).toHaveLength(1);

    const pilots = useCampaignRosterStore.getState().pilots;
    const v1 = pilots.find((p) => p.pilotId === 'v1');
    const v2 = pilots.find((p) => p.pilotId === 'v2');

    expect(v1?.traits?.vocationalXPTimer).toBe(1);
    expect(v1?.xp).toBe(100);

    expect(v2?.traits?.vocationalXPTimer).toBe(0);
    expect(v2?.xp).toBe(101);
    expect(v2?.campaignXpEarned).toBe(1);
  });

  it('idempotency: double registration does not duplicate, and one day-advance runs each D-2 processor exactly once', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    seedStores([makeRosterEntry('p1')]);
    const campaign = makeCampaign({ currentDate: PAYDAY });

    registerBuiltinProcessors();
    registerBuiltinProcessors();

    const ids = getDayPipeline()
      .getProcessors()
      .map((p) => p.id);
    for (const id of D2_PROCESSOR_IDS) {
      expect(ids.filter((i) => i === id)).toHaveLength(1);
    }

    const result = getDayPipeline().processDay(campaign);
    for (const id of D2_PROCESSOR_IDS) {
      expect(result.processorsRun.filter((i) => i === id)).toHaveLength(1);
    }
  });

  it('double-deduction guard: with useRoleBasedSalaries=false the legacy dailyCosts path owns finances and the financial processor no-ops', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    seedStores([makeRosterEntry('p1')]);
    const forces = new Map<string, IForce>();
    forces.set('force-root', makeForce('force-root', ['unit-1']));
    // Default options: useRoleBasedSalaries=false, payForMaintenance=true.
    const campaign = makeCampaign({ currentDate: PAYDAY, forces });

    registerBuiltinProcessors();
    const result = getDayPipeline().processDay(campaign);

    const txs = result.campaign.finances.transactions;

    // Exactly ONE maintenance charge — from dailyCosts. A second one
    // would mean the financial processor double-charged maintenance.
    expect(
      txs.filter((t) => t.type === TransactionType.Maintenance),
    ).toHaveLength(1);

    // No role-based monthly salary — the financial block must not fire
    // in legacy mode even on the 1st.
    expect(txs.filter((t) => t.type === TransactionType.Salary)).toHaveLength(
      0,
    );

    // Sanity: the legacy daily salary (Expense) DID post, so finances
    // were processed exactly once by the legacy path.
    expect(txs.some((t) => t.description.startsWith('Daily salaries'))).toBe(
      true,
    );
  });
});
