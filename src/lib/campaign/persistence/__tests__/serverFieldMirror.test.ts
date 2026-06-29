/**
 * W3.1 follow-on (T3, 2026-06-09 audit remediation) — server-side campaign
 * serialization field mirror.
 *
 * W3.1 fixed the STORE persistence path (`useCampaignStore.persistence.ts`)
 * to round-trip 13 previously-dropped campaign fields. The SERVER path
 * (`serializeCampaign` -> `SerializedCampaignBody`, consumed by the
 * autosave / `useCampaignPersistenceStore` flow via
 * `buildSerializedCampaign`) still dropped: `combatTeams`, `refitOrders`,
 * `unitConfigurations`, `unitPrestige`, `moraleState`, `moraleTransitions`,
 * `currentSystemId`, `coopSession`, the command-extension fields
 * (`personnelMarket`, `contractMarket`, `activeContract`, `unitMarket`), and
 * `finances.loans` (the amortization ledger — Money + Date instances that
 * need the same flattening the store path applies via
 * `SerializedAmortizedLoan`).
 *
 * These tests prove:
 *  1. every dropped field survives a serialize -> JSON -> deserialize
 *     round trip (RED pre-fix),
 *  2. `finances.loans` rehydrates with live `Money` / `Date` instances
 *     (RED pre-fix),
 *  3. a pre-fix-shaped payload (none of the new fields) still loads with
 *     sane defaults (GREEN pre- and post-fix — the fields are optional,
 *     so no schema bump / migration rung is needed),
 *  4. a compile-time drift guard: every key of `ICampaignWithCommand`
 *     must be carried by `SerializedCampaignBody` — the same convention
 *     the store test (campaignPersistenceRoundTrip.test.ts) uses over
 *     `SerializedCampaignState`.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 *   - Requirement: Campaign Serialization Round-Trip
 * Tracker: docs/audits/2026-06-09-remediation-tracker.md (parallel track T3)
 */

import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { ILoan } from '@/types/campaign/Loan';
import type { SerializedCampaignBody } from '@/types/campaign/SerializedCampaign';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { createCampaignLoan } from '@/types/campaign/CampaignLoan';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import {
  MarketExperienceLevel,
  UnitMarketRarity,
  UnitMarketType,
} from '@/types/campaign/markets/marketTypes';
import { Money } from '@/types/campaign/Money';
import { MoraleState } from '@/types/campaign/Prestige';
import { RefitClass } from '@/types/campaign/Refit';
import { CombatRole } from '@/types/campaign/scenario/scenarioTypes';

import {
  deserializeCampaignBody,
  serializeCampaign,
} from '../serializeCampaign';
import { buildPopulatedCampaign } from './campaignFixture';

// =============================================================================
// Compile-time drift guard
//
// Every key of `ICampaignWithCommand` (= `ICampaign` + the command-tier
// extension fields the server serializer widens to) must be carried by
// `SerializedCampaignBody`. If the campaign gains a field the server
// serializer drops, `DroppedCampaignKeys` stops being `never` and
// `npx tsc --noEmit` fails — the same convention the store-path test
// (campaignPersistenceRoundTrip.test.ts) enforces over
// `SerializedCampaignState`. Unlike the store path, the server body
// carries `forces` / `missions` inline (as pair arrays), so there is no
// separately-persisted-key escape hatch.
// =============================================================================

type DroppedCampaignKeys = Exclude<
  keyof ICampaignWithCommand,
  keyof SerializedCampaignBody
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

/**
 * Extend the populated fixture campaign with every field the pre-fix
 * server serializer dropped — the full-shape sweep input.
 */
function buildExtendedCampaign(): ICampaignWithCommand {
  const base = buildPopulatedCampaign();
  return {
    ...base,
    combatTeams: [
      { forceId: 'force-sub-1', role: CombatRole.PATROL, battleChance: 60 },
    ],
    refitOrders: [
      {
        id: 'refit-001',
        unitId: 'unit-a',
        // Partial fixture — only round-trip identity matters here, not
        // construction validity (cast-through-unknown is deliberate;
        // same convention as the store-path test).
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
      'unit-a': { name: 'Current Config' } as unknown as MechBuildConfig,
    },
    unitPrestige: [
      {
        unitId: 'unit-a',
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
    currentSystemId: 'new-avalon',
    coopSession: { mode: 'host', roomCode: 'ROOM-42' },
    gmInterventionEvents: [
      {
        type: 'gm.campaign.funds_transaction_corrected',
        domain: 'economy',
        family: 'funds-transaction',
        transactionId: 'gm-event-001',
        changedStateRefs: ['campaign:campaign-001:finances'],
        publicSummary: 'Merchant charge corrected by -2,500.00 C-bills.',
        before: {
          balanceCents: 38_000_000,
          transactionIds: ['tx-1'],
        },
        after: {
          balanceCents: 37_750_000,
          transaction: {
            id: 'gm-event-001',
            type: TransactionType.PartPurchase,
            amountCents: -250_000,
            date: '3025-02-01T00:00:00.000Z',
            description: 'GM merchant charge reversal',
          },
        },
      },
    ],
    timeCascadeEvents: [
      {
        type: 'gm.campaign.time_cascade_applied',
        domain: 'time',
        family: 'time-advance',
        interventionId: 'gm-time-event-001',
        days: 2,
        before: {
          currentDate: '3025-02-01T00:00:00.000Z',
          updatedAt: base.updatedAt,
          currentSystemId: 'new-avalon',
        },
        after: {
          currentDate: '3025-02-03T00:00:00.000Z',
          updatedAt: '3025-02-03T00:00:00.000Z',
          currentSystemId: 'new-avalon',
        },
        afterCampaign: {
          ...base,
          currentDate: new Date('3025-02-03T00:00:00.000Z'),
          updatedAt: '3025-02-03T00:00:00.000Z',
          currentSystemId: 'new-avalon',
        },
        daySummaries: [],
        generatedEvents: [],
        changedStateRefs: [
          'campaign:campaign-001:currentDate',
          'campaign:campaign-001:repairQueue',
        ],
        externalEffects: [],
        publicSummary: 'Campaign time corrected by 2 days.',
      },
    ],
    loans: [
      createCampaignLoan({
        id: 'loan-1',
        principal: 500_000,
        interestRate: 0.1,
        termDays: 100,
        takenOnDate: '3025-01-01T00:00:00.000Z',
      }),
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
    activeContract: {
      id: 'contract-active-001',
      name: 'Active Server Contract',
      employerFactionId: 'davion',
      deadlineDay: 18,
      objectivesCompleted: 2,
      objectivesTotal: 4,
    },
    unitMarket: [
      {
        id: 'umo-001',
        unitId: 'unit-atlas-as7d',
        unitName: 'Atlas AS7-D',
        rarity: UnitMarketRarity.RARE,
        marketType: UnitMarketType.OPEN,
        quality: 'C',
        pricePercent: 105,
        baseCost: 9_626_000,
        expirationDate: '3025-08-01T00:00:00.000Z',
      },
    ],
    finances: {
      ...base.finances,
      loans: [makeAmortizedLoan()],
    },
  };
}

/**
 * Round-trip helper: serialize, force through real JSON (the wire/storage
 * step — this is what actually drops undefined-valued keys), deserialize.
 */
function roundTrip(campaign: ICampaignWithCommand): ICampaignWithCommand {
  const body = serializeCampaign(campaign);
  const wire = JSON.parse(JSON.stringify(body)) as SerializedCampaignBody;
  return deserializeCampaignBody(wire) as ICampaignWithCommand;
}

// =============================================================================
// Tests
// =============================================================================

describe('T3 — server-side campaign serialization field mirror', () => {
  it('every previously-dropped campaign field survives the serialize -> JSON -> deserialize round trip', () => {
    const restored = roundTrip(buildExtendedCampaign());

    expect(restored.combatTeams).toEqual([
      { forceId: 'force-sub-1', role: CombatRole.PATROL, battleChance: 60 },
    ]);
    expect(restored.refitOrders).toHaveLength(1);
    expect(restored.refitOrders![0].id).toBe('refit-001');
    expect(restored.refitOrders![0].hoursCompleted).toBe(12);
    expect(restored.unitConfigurations).toBeDefined();
    expect(restored.unitConfigurations!['unit-a']).toEqual({
      name: 'Current Config',
    });
    expect(restored.unitPrestige).toHaveLength(1);
    expect(restored.unitPrestige![0].score).toBe(62);
    expect(restored.unitPrestige![0].history).toHaveLength(1);
    expect(restored.moraleState).toBe(MoraleState.High);
    expect(restored.moraleTransitions).toHaveLength(1);
    expect(restored.moraleTransitions![0].to).toBe(MoraleState.High);
    expect(restored.currentSystemId).toBe('new-avalon');
    expect(restored.coopSession).toEqual({ mode: 'host', roomCode: 'ROOM-42' });
    expect(restored.gmInterventionEvents).toHaveLength(1);
    expect(restored.gmInterventionEvents![0]).toMatchObject({
      type: 'gm.campaign.funds_transaction_corrected',
      family: 'funds-transaction',
      transactionId: 'gm-event-001',
    });
    expect(restored.timeCascadeEvents).toHaveLength(1);
    expect(restored.timeCascadeEvents![0]).toMatchObject({
      type: 'gm.campaign.time_cascade_applied',
      family: 'time-advance',
      interventionId: 'gm-time-event-001',
      days: 2,
    });
    expect(restored.personnelMarket).toHaveLength(1);
    expect(restored.personnelMarket![0].hireCost).toBe(25_000);
    expect(restored.contractMarket).toEqual({
      offers: [],
      declinedOfferIds: ['contract-77'],
    });
    expect(restored.activeContract).toMatchObject({
      id: 'contract-active-001',
      name: 'Active Server Contract',
      employerFactionId: 'davion',
      deadlineDay: 18,
      objectivesCompleted: 2,
      objectivesTotal: 4,
    });
    expect(restored.unitMarket).toHaveLength(1);
    expect(restored.unitMarket![0].unitName).toBe('Atlas AS7-D');
  });

  it('the amortization ledger rehydrates with live Money / Date instances', () => {
    const restored = roundTrip(buildExtendedCampaign());

    // financialProcessor.processLoanPayments does Money math and Date
    // comparisons on these — scalars are not enough.
    expect(restored.finances.loans).toHaveLength(1);
    const loan = restored.finances.loans![0];
    expect(loan.principal).toBeInstanceOf(Money);
    expect(loan.principal.amount).toBe(1_000_000);
    expect(loan.monthlyPayment).toBeInstanceOf(Money);
    expect(loan.monthlyPayment.amount).toBe(44_320);
    expect(loan.remainingPrincipal.amount).toBe(920_000);
    expect(loan.startDate).toBeInstanceOf(Date);
    expect(loan.nextPaymentDate).toBeInstanceOf(Date);
    expect(loan.nextPaymentDate.toISOString()).toBe('3025-03-01T00:00:00.000Z');
    expect(loan.paymentsRemaining).toBe(22);
    expect(loan.isDefaulted).toBe(false);
  });

  it('flattens the ledger on the wire — Money as C-bill scalars, Dates as ISO strings', () => {
    const body = serializeCampaign(buildExtendedCampaign());
    const wire = JSON.parse(JSON.stringify(body)) as Record<string, unknown> &
      SerializedCampaignBody;

    expect(wire.finances.loans).toHaveLength(1);
    const wireLoan = wire.finances.loans![0];
    expect(typeof wireLoan.principal).toBe('number');
    expect(wireLoan.principal).toBe(1_000_000);
    expect(typeof wireLoan.startDate).toBe('string');
    expect(wireLoan.startDate).toBe('3025-01-01T00:00:00.000Z');
  });

  it('a pre-fix-shaped payload (none of the new fields) still loads with sane defaults', () => {
    // A campaign without any extension fields serializes to exactly the
    // pre-fix body shape: the new keys are undefined and real JSON drops
    // them — indistinguishable from a payload written by the old
    // serializer. That equivalence is why the fields are optional and no
    // schemaVersion bump / migration rung is needed.
    const body = serializeCampaign(buildPopulatedCampaign());
    const wire = JSON.parse(JSON.stringify(body)) as SerializedCampaignBody;
    expect('refitOrders' in wire).toBe(false);
    expect('moraleState' in wire).toBe(false);
    expect('loans' in wire.finances).toBe(false);

    const restored = deserializeCampaignBody(wire) as ICampaignWithCommand;
    expect(restored.id).toBe(body.id);
    expect(restored.finances.balance.amount).toBe(380000);
    // Missing fields default sanely — no crash, no garbage.
    expect(restored.finances.loans).toBeUndefined();
    expect(restored.refitOrders).toBeUndefined();
    expect(restored.unitPrestige).toBeUndefined();
    expect(restored.moraleState).toBeUndefined();
    expect(restored.currentSystemId).toBeUndefined();
    expect(restored.coopSession).toBeUndefined();
    expect(restored.gmInterventionEvents).toBeUndefined();
    expect(restored.timeCascadeEvents).toBeUndefined();
    expect(restored.personnelMarket).toBeUndefined();
    expect(restored.contractMarket).toBeUndefined();
    expect(restored.activeContract).toBeUndefined();
    expect(restored.unitMarket).toBeUndefined();
  });

  it('compile-time: SerializedCampaignBody covers every ICampaignWithCommand field (drift guard)', () => {
    // If a future campaign field is not added to SerializedCampaignBody,
    // this constant stops typechecking — `npx tsc --noEmit` fails.
    const serverShapeCoversCampaign: AssertNever<DroppedCampaignKeys> = true;
    expect(serverShapeCoversCampaign).toBe(true);
  });
});
