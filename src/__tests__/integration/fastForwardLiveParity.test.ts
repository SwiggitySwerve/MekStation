/**
 * Fast-Forward Live-Parity Acceptance (task 5.3, design D7)
 *
 * Runs the identical fixture + derived seeds through BOTH
 * `fastForwardCampaign()` and the independently hand-inlined discrete-step
 * live-equivalent loop (`fastForwardLiveEquivalent.ts`), asserting equality
 * on the seam invariant set for both identical-ordering and a
 * deferred-fight ordering variation.
 *
 * Anti-tautology rules enforced here (design D7):
 *  1. Independence — `fastForwardLiveEquivalent.ts` never imports the
 *     fast-forward driver or combat runner; the third test in this file
 *     proves it by grep against that module's own source.
 *  2. Honest coverage claim — see this file's + `fastForwardLiveEquivalent
 *     .ts`'s doc comments: a bug INSIDE a shared primitive (fixture
 *     builder, router, `deriveBattleSeed`) would pass both sides
 *     identically; this suite certifies the fast-forward ORCHESTRATION,
 *     not those primitives' own correctness (owned by their own suites).
 *  3. Ordering variation — the second test defers fighting a bridged
 *     scenario by one extra day-advance within the SAME total day window,
 *     using the SAME generation-day-stable seed (design D4), so any
 *     divergence would be orchestration-order-sensitivity, not dice.
 *  4. Day-count pin — both tests assert equal total days (scheduled +
 *     drain) and equal final in-fiction dates BEFORE comparing invariants,
 *     so a day-count mismatch can never masquerade as a balance
 *     divergence.
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { fastForwardCampaign } from '@/lib/campaign/fastForward/fastForwardCampaign';
import { buildFastForwardFixture } from '@/lib/campaign/fastForward/fastForwardFixture';
import {
  createInProcessApiFetch,
  initializeInProcessApiDatabase,
} from '@/lib/campaign/fastForward/inProcessApiRouter';
import {
  assertRunStatesEqual,
  buildComparableRunState,
  type ComparableRunState,
} from '@/lib/campaign/fastForward/invariants/comparableRunState';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { GameSide } from '@/types/gameplay';

import type { CapturedBattleOutcome } from './fastForwardTestSupport';

import { runLiveEquivalent } from './fastForwardLiveEquivalent';
import {
  createCapturingRunner,
  makeAdaptedUnit,
  resetWorld,
} from './fastForwardTestSupport';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

/**
 * Both scheduled sides use the SAME total day window: day 1 (the fixture's
 * Monday) bridges the scenario(s); day 2 gives the identical-ordering side
 * room to apply an immediately-fought battle AND gives the deferred side
 * room to fight (after day 2) what it held back from day 1; day 3 applies
 * the deferred side's outcome. Verified empirically to need zero extra
 * drain days for either ordering against the pinned fixture defaults.
 */
const SCHEDULED_DAYS = 3;
const MAX_DRAIN_DAYS = 5;

const COUNCIL_CONSEQUENCE =
  'Per the 2026-07-09 council decision (open risk 1): a seam-invariant divergence here keeps scenario packs (W4) triage-only permanently — this is the load-bearing check this whole change ultimately exists to make honest.';

function primeWorld(): void {
  resetWorld();
  initializeInProcessApiDatabase();
  adaptUnitMock.mockReset();
  adaptUnitMock.mockImplementation(async (unitRef, options) =>
    makeAdaptedUnit(unitRef, options?.side ?? GameSide.Player),
  );
}

interface RunResult {
  readonly totalDays: number;
  readonly finalDate: Date;
  readonly snapshot: ComparableRunState;
}

/** The fast-forward side of the comparison — legitimately imports the driver under test. */
async function runFastForwardSide(): Promise<RunResult> {
  const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
  const store = useCampaignStore();
  const startingBalanceCents = fixture.campaign.finances.balance.centsValue;
  const captured: CapturedBattleOutcome[] = [];

  const report = await fastForwardCampaign(fixture.campaign, {
    days: SCHEDULED_DAYS,
    runBridgedScenario: createCapturingRunner(captured),
    expectations: { minScenariosBridged: 1, minBattles: 1 },
    maxDrainDays: MAX_DRAIN_DAYS,
  });

  const finalCampaign = store.getState().getCampaign();
  if (!finalCampaign) {
    throw new Error('fastForward side: no campaign in the store after the run');
  }

  return {
    totalDays: report.daysAdvanced + report.drainDays,
    finalDate: finalCampaign.currentDate,
    snapshot: buildComparableRunState({
      campaign: finalCampaign,
      startingBalanceCents,
      battleOutcomes: captured,
      rosterUnits: useCampaignRosterStore.getState().units,
      rosterPilots: useCampaignRosterStore.getState().pilots,
    }),
  };
}

/** The discrete-step live-equivalent side — never imports the driver or runner. */
async function runLiveEquivalentSide(
  deferFightsByDays: number,
): Promise<RunResult> {
  const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
  const startingBalanceCents = fixture.campaign.finances.balance.centsValue;
  const fetchImpl = createInProcessApiFetch();

  const result = await runLiveEquivalent({
    campaign: fixture.campaign,
    fetchImpl,
    scheduledDays: SCHEDULED_DAYS,
    deferFightsByDays,
    maxDrainDays: MAX_DRAIN_DAYS,
  });

  // Same roll-budget guarantee the fast-forward side's `expectations`
  // enforces (design D8) — asserted by hand here since the live-equivalent
  // has no expectations mechanism of its own.
  expect(result.battleOutcomes.length).toBeGreaterThan(0);

  const finalCampaign = useCampaignStore().getState().getCampaign();
  if (!finalCampaign) {
    throw new Error(
      'live-equivalent side: no campaign in the store after the run',
    );
  }

  return {
    totalDays: result.totalDays,
    finalDate: result.finalDate,
    snapshot: buildComparableRunState({
      campaign: finalCampaign,
      startingBalanceCents,
      battleOutcomes: result.battleOutcomes,
      rosterUnits: useCampaignRosterStore.getState().units,
      rosterPilots: useCampaignRosterStore.getState().pilots,
    }),
  };
}

describe('fastForwardCampaign — live-parity acceptance on seam invariants (design D7)', () => {
  beforeEach(() => {
    primeWorld();
  });

  afterEach(() => {
    resetWorld();
    adaptUnitMock.mockReset();
  });

  it('parity holds between fast-forward and the identical-ordering discrete-step live-equivalent', async () => {
    const fastForwardSide = await runFastForwardSide();

    primeWorld();

    const liveSide = await runLiveEquivalentSide(0);

    // D7 rule 4: day counts (and the in-fiction date they land on) must
    // match BEFORE the invariant comparison — a mismatch here is a
    // guaranteed spurious balance divergence, never a real one.
    expect(liveSide.totalDays).toBe(fastForwardSide.totalDays);
    expect(liveSide.finalDate.toISOString()).toBe(
      fastForwardSide.finalDate.toISOString(),
    );

    assertRunStatesEqual(fastForwardSide.snapshot, liveSide.snapshot, {
      labelA: 'fastForwardCampaign()',
      labelB: 'live-equivalent (identical ordering)',
      consequenceMessage: COUNCIL_CONSEQUENCE,
    });
  });

  it('a deferred-fight ordering variation stays on the seam invariant set', async () => {
    const fastForwardSide = await runFastForwardSide();

    primeWorld();

    // Defers fighting the fixture Monday's bridged scenario(s) by one
    // extra day-advance within the SAME total day window (design D7 rule
    // 3) — the deferral-stable seed (design D4) means this tests
    // orchestration-order-sensitivity only, never dice.
    const deferredSide = await runLiveEquivalentSide(1);

    expect(deferredSide.totalDays).toBe(fastForwardSide.totalDays);
    expect(deferredSide.finalDate.toISOString()).toBe(
      fastForwardSide.finalDate.toISOString(),
    );

    assertRunStatesEqual(fastForwardSide.snapshot, deferredSide.snapshot, {
      labelA: 'fastForwardCampaign()',
      labelB: 'live-equivalent (deferred by 1 day)',
      consequenceMessage: COUNCIL_CONSEQUENCE,
    });
  });

  it('the live-equivalent does not reuse the code under test', () => {
    const source = readFileSync(
      path.join(__dirname, 'fastForwardLiveEquivalent.ts'),
      'utf8',
    );
    // Grep target is `fastForwardLiveEquivalent.ts`'s OWN source — this
    // test file itself legitimately imports `fastForwardCampaign` above,
    // for the OTHER side of the comparison (design D7 rule 1 bans the
    // import from the live-equivalent module, not from the test that
    // drives both sides).
    expect(source).not.toMatch(
      /from ['"]@\/lib\/campaign\/fastForward\/fastForwardCampaign['"]/,
    );
    expect(source).not.toMatch(
      /from ['"]@\/lib\/campaign\/fastForward\/fastForwardCombatRunner['"]/,
    );
  });
});
