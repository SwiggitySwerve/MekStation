/**
 * Fast-Forward Determinism Integration Test (task 5.2)
 *
 * Runs the IDENTICAL fixture + day count TWICE, with a full singleton +
 * SQLite reset between runs, and asserts invariant-level equality on the
 * seam invariant set (design D4): unit survival sets, per-unit
 * armor/structure deltas, balance delta, transaction types+amounts, XP
 * counters, scenario/contract statuses, repair-ticket counts/kinds — with
 * wall-clock-bearing fields (and the non-wall-clock-but-still-random
 * `matchId`/SQLite-`pilotId` identifiers, see `comparableRunState.ts`'s
 * module doc) excluded by construction.
 *
 * No golden values: this suite never asserts an expected literal outcome
 * for the pinned seed — only that two independent runs of it agree with
 * each other. A divergence is read as a determinism bug to trace (design
 * R3), never as license to widen the comparator's exclusion list.
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { fastForwardCampaign } from '@/lib/campaign/fastForward/fastForwardCampaign';
import { buildFastForwardFixture } from '@/lib/campaign/fastForward/fastForwardFixture';
import { initializeInProcessApiDatabase } from '@/lib/campaign/fastForward/inProcessApiRouter';
import {
  assertRunStatesEqual,
  buildComparableRunState,
  type ComparableRunState,
} from '@/lib/campaign/fastForward/invariants/comparableRunState';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { GameSide } from '@/types/gameplay';

import type { CapturedBattleOutcome } from './fastForwardTestSupport';

import {
  createCapturingRunner,
  makeAdaptedUnit,
  resetWorld,
} from './fastForwardTestSupport';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

/** Fresh world + mock wiring, identical every call — the "full singleton + DB reset between runs" the task text requires. */
function primeWorld(): void {
  resetWorld();
  initializeInProcessApiDatabase();
  adaptUnitMock.mockReset();
  adaptUnitMock.mockImplementation(async (unitRef, options) =>
    makeAdaptedUnit(unitRef, options?.side ?? GameSide.Player),
  );
}

/**
 * Run the group-1 fixture through `fastForwardCampaign()` once and reduce
 * the result to a `ComparableRunState`. Fixture options are identical on
 * every call (no per-run randomization) — the "identical fixture" design
 * D4 requires.
 */
async function runOnceAndSnapshot(): Promise<ComparableRunState> {
  const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
  const store = useCampaignStore();
  const startingBalanceCents = fixture.campaign.finances.balance.centsValue;
  const captured: CapturedBattleOutcome[] = [];

  await fastForwardCampaign(fixture.campaign, {
    days: 2,
    runBridgedScenario: createCapturingRunner(captured),
    expectations: { minScenariosBridged: 1, minBattles: 1 },
  });

  const finalCampaign = store.getState().getCampaign();
  if (!finalCampaign) {
    throw new Error(
      'fastForwardCampaign: no campaign in the store after the run',
    );
  }

  return buildComparableRunState({
    campaign: finalCampaign,
    startingBalanceCents,
    battleOutcomes: captured,
    rosterUnits: useCampaignRosterStore.getState().units,
    rosterPilots: useCampaignRosterStore.getState().pilots,
  });
}

describe('fastForwardCampaign — determinism: run-twice invariant-level equality', () => {
  beforeEach(() => {
    primeWorld();
  });

  afterEach(() => {
    resetWorld();
    adaptUnitMock.mockReset();
  });

  it('two independent runs of the identical fixture + day count produce equal invariant-level end states', async () => {
    const snapshotA = await runOnceAndSnapshot();

    primeWorld();

    const snapshotB = await runOnceAndSnapshot();

    // A degenerate "both runs did nothing" pass would prove nothing about
    // determinism — confirm real combat + economy activity happened
    // before trusting the equality check below.
    expect(snapshotA.battles.length).toBeGreaterThan(0);
    expect(snapshotA.transactions.length).toBeGreaterThan(0);

    assertRunStatesEqual(snapshotA, snapshotB, {
      labelA: 'run 1',
      labelB: 'run 2',
      consequenceMessage:
        'A non-wall-clock divergence here is a real determinism bug to trace to the offending RNG consumer (design R3) — never mask it by widening the comparator.',
    });
  });
});
