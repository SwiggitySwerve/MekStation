/**
 * Fast-Forward Mint Mode (tasks 5.1/5.2/5.3) — the mint-from-fast-forward
 * minter (design D7 layer 1), and its own always-on regression coverage
 * (task 5.1's acceptance).
 *
 * Two roles in one file, mirroring `e2e/scenario-pack-minting.spec.ts`'s
 * env-gated-write pattern but on the jest side (design: "run a W3 fixture
 * through `fastForwardCampaign()` in jest"):
 *
 *  1. **Always-on regression suite** (no env gate — collected by the
 *     default `unit` project on every CI run): proves the mint mode itself
 *     is sound — round-trips `campaignPackSchema`, carries no cross-store
 *     references, and mints deterministically (two mints of the identical
 *     fixture agree on W3's enumerated invariant-level field set — the
 *     SAME `SEAM_INVARIANT_FIELDS` `comparableRunState.ts` uses for W3's
 *     own determinism/live-parity suites — and carry byte-identical
 *     canonical id graphs, since `canonicalizePackPayload` is pure).
 *  2. **Env-gated mint-and-write** (`MEKSTATION_MINT_FASTFORWARD_PACK_ID`,
 *     the jest-side twin of `scenario-pack-minting.spec.ts`'s
 *     `MEKSTATION_MINT_PACK_ID`): `it.skip`ped unless the env var names
 *     this exact pack, so a bare `npx jest --selectProjects unit --ci`
 *     never writes anything — invoked via
 *     `node scripts/qc/mint-scenario-pack.mjs <pack-id>`, which spawns
 *     jest with the env var set for exactly this file.
 *
 * Two fixture shapes (task 5.1's parenthetical):
 *  - **economy**: `combatTeamCount: 1` (the capstone test's own choice,
 *    `fastForwardCampaign.test.ts` — avoids the documented same-day
 *    multi-team-vs-one-contract double-payout gap, R9) with the fixture's
 *    contract's `paymentTerms` overridden to nonzero `Money` amounts
 *    (`createDefaultPaymentTerms()`/the fixture's own `createContract`
 *    call stamp an all-zero contract — verified empirically during
 *    authoring: a zero-payment contract closure technically satisfies "a
 *    contract paid" but produces a $0 transaction, a weak economy-pack
 *    demonstration) — one clean contract closure (income) + daily salary
 *    expenses (`useRoleBasedSalaries: false`) yields ≥1 contract paid,
 *    mixed transaction types.
 *  - **maintenance**: `combatTeamCount: 8` with a manually-driven
 *    bridge/fight/drain loop (NOT the all-in-one `fastForwardCampaign()`
 *    helper) so `campaign.unitMaxStates` can be injected BETWEEN the fight
 *    day and the drain day (verified empirically during authoring:
 *    production has no writer for `unitMaxStates` on the fast-forward
 *    path, `fastForwardCampaign.test.ts`'s own doc comment; without it,
 *    `repairQueueBuilderProcessor` early-exits on every damaged unit,
 *    `combatReady === false` write-offs get no tickets at all, and — the
 *    load-bearing finding — `repairQueueBuilderProcessor` is COUPLED to
 *    the SAME day `recentlyAppliedOutcomes`/`pendingBattleOutcomes` is
 *    populated: injecting `unitMaxStates` on any LATER day never
 *    retroactively builds tickets from pre-existing `unitCombatStates`).
 *    The minted payload's tickets are captured `status: 'parts-needed'`
 *    (no `partsInventory` present yet in the day the tickets were built);
 *    a matching `partsInventory` is stitched onto the campaign
 *    AFTER the drain (never consumed at mint time) so the loader's
 *    `advance-day` post-load action (design D8) is what causes
 *    `repairProgressProcessor` to apply the FIRST day of real progress —
 *    the causal dependency task 5.3's acceptance requires
 *    ("removing the post-load action makes the repair-bay assertion
 *    fail") is therefore real, not simulated.
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D7 layer 1, D11)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type {
  FastForwardBattleRunner,
  FastForwardBridgedScenarioHandoff,
} from '@/lib/campaign/fastForward/fastForwardCampaign';
import type { ICampaignWithBridgeState } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract } from '@/types/campaign/Mission';
import type { IPartsInventory } from '@/types/campaign/PartsInventory';
import type { IUnitMaxState } from '@/types/campaign/UnitCombatState';

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
import { Money } from '@/types/campaign/Money';
import { GameSide } from '@/types/gameplay';

import type { CapturedBattleOutcome } from '../../../__tests__/integration/fastForwardTestSupport';

import {
  CANONICAL_COMBAT_SHEETS,
  createCapturingRunner,
  makeAdaptedUnit,
  resetWorld,
} from '../../../__tests__/integration/fastForwardTestSupport';
import { dumpAndCanonicalizeFastForwardCampaign } from '../mintFastForwardPack';
import { campaignPackSchema, type CampaignPackPayload } from '../packSchemas';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

function primeWorld(): void {
  resetWorld();
  initializeInProcessApiDatabase();
  adaptUnitMock.mockReset();
  adaptUnitMock.mockImplementation(async (unitRef, options) =>
    makeAdaptedUnit(unitRef, options?.side ?? GameSide.Player),
  );
}

// =============================================================================
// Economy fixture (task 5.1/5.2) — combatTeamCount: 1, paid contract
// =============================================================================

const ECONOMY_PACK_ID = 'economy-midcampaign';

/**
 * The fixture's own `createContract` call stamps an all-zero
 * `paymentTerms` — verified empirically during authoring (see module
 * doc). Overridden here to nonzero `Money` amounts so the pack's ledger
 * demonstrates a real payout, not a $0 line item.
 */
function buildPaidEconomyFixtureCampaign(): {
  readonly campaign: ICampaign;
  readonly contractId: string;
} {
  const fixture = buildFastForwardFixture({
    useRoleBasedSalaries: false,
    combatTeamCount: 1,
  });
  const rawContract = fixture.campaign.missions.get(fixture.contractId);
  if (!rawContract || rawContract.type !== 'contract') {
    throw new Error(
      'buildPaidEconomyFixtureCampaign: fixture contract missing from campaign.missions, or not a contract-type mission',
    );
  }
  const contract = rawContract as IContract;
  const paidContract = {
    ...contract,
    paymentTerms: {
      ...contract.paymentTerms,
      basePayment: new Money(200_000),
      successPayment: new Money(500_000),
      partialPayment: new Money(250_000),
      failurePayment: new Money(100_000),
    },
  };
  return {
    campaign: {
      ...fixture.campaign,
      missions: new Map([[contract.id, paidContract]]),
    },
    contractId: fixture.contractId,
  };
}

interface EconomyMintResult {
  readonly campaign: ICampaign;
  readonly startingBalanceCents: number;
  readonly battleOutcomes: readonly {
    readonly scenarioId: string;
    readonly outcome: CapturedBattleOutcome['outcome'];
  }[];
}

/** Runs the economy fixture through the ALL-IN-ONE `fastForwardCampaign()` helper — no mid-run injection needed for this shape. */
async function runEconomyFastForward(): Promise<EconomyMintResult> {
  const { campaign } = buildPaidEconomyFixtureCampaign();
  const store = useCampaignStore();
  const startingBalanceCents = campaign.finances.balance.centsValue;
  const captured: CapturedBattleOutcome[] = [];

  await fastForwardCampaign(campaign, {
    days: 2,
    runBridgedScenario: createCapturingRunner(captured),
    expectations: { minScenariosBridged: 1, minBattles: 1 },
  });

  const finalCampaign = store.getState().getCampaign();
  if (!finalCampaign) {
    throw new Error(
      'runEconomyFastForward: no campaign in the store after the run',
    );
  }
  return {
    campaign: finalCampaign,
    startingBalanceCents,
    battleOutcomes: captured.map((c) => ({
      scenarioId: c.scenarioId,
      outcome: c.outcome,
    })),
  };
}

// =============================================================================
// Maintenance fixture (task 5.1/5.3) — manual bridge/inject/drain loop
// =============================================================================

const MAINTENANCE_PACK_ID = 'maintenance-repairbay';

interface MaintenanceMintResult {
  readonly campaign: ICampaign;
  readonly startingBalanceCents: number;
  readonly battleOutcomes: readonly {
    readonly scenarioId: string;
    readonly outcome: CapturedBattleOutcome['outcome'];
  }[];
  /** The tickets' aggregate `partsRequired`, stitched into `campaign.partsInventory` — recorded so the parity spec/provenance can name it. */
  readonly partsInventory: IPartsInventory;
}

/** `${side}-${slotIndex+1}-${unitRef}` (`preBattleSessionBuilder.ts`'s `buildSessionUnitId`) — strips the side+slot prefix to recover the catalog `unitRef` `CANONICAL_COMBAT_SHEETS` is keyed by. */
function unitRefFromSessionUnitId(sessionUnitId: string): string {
  return sessionUnitId.replace(/^[a-z]+-\d+-/, '');
}

/**
 * Drives the maintenance fixture through a manual bridge -> inject
 * `unitMaxStates` -> drain loop (module doc's "load-bearing finding") so
 * `repairQueueBuilderProcessor` builds real tickets during minting, then
 * stitches a matching `partsInventory` onto the (already-drained,
 * already-ticketed) campaign — never consumed at mint time, present only
 * so the loader's post-load `advance-day` action has something to work
 * with on first use.
 */
async function runMaintenanceFastForward(): Promise<MaintenanceMintResult> {
  const fixture = buildFastForwardFixture({
    useRoleBasedSalaries: false,
    combatTeamCount: 8,
  });
  const store = useCampaignStore();
  store.getState().switchCampaign(fixture.campaign);
  const startingBalanceCents = fixture.campaign.finances.balance.centsValue;

  const captured: CapturedBattleOutcome[] = [];
  const runner: FastForwardBattleRunner = createCapturingRunner(captured);
  let seenScenarioIds = new Set<string>(
    (fixture.campaign as unknown as ICampaignWithBridgeState)
      .bridgedScenarioIds ?? [],
  );

  async function advanceOneDayAndBridge(): Promise<void> {
    const outcome = await store.getState().advanceDay();
    if (!outcome) {
      throw new Error(
        'runMaintenanceFastForward: advanceDay() returned null — the campaign failed to commit',
      );
    }
    const extended = outcome.campaign as ICampaignWithBridgeState;
    const nextIds = extended.bridgedScenarioIds ?? [];
    const newIds = nextIds.filter((id) => !seenScenarioIds.has(id));
    seenScenarioIds = new Set(nextIds);
    for (const scenarioId of newIds) {
      const encounter = extended.bridgedEncounters?.[scenarioId];
      if (!encounter?.campaignMeta) continue;
      const handoff: FastForwardBridgedScenarioHandoff = {
        scenarioId,
        contractId: encounter.campaignMeta.contractId,
        encounterId: encounter.id,
      };
      await runner(handoff);
    }
  }

  const MAX_BRIDGE_DAYS = 5;
  let bridgeDay = 0;
  while (captured.length === 0 && bridgeDay < MAX_BRIDGE_DAYS) {
    await advanceOneDayAndBridge();
    bridgeDay += 1;
  }
  if (captured.length === 0) {
    throw new Error(
      `runMaintenanceFastForward: no battle bridged+fought within ${MAX_BRIDGE_DAYS} days — the fixture's battle-chance roll(s) came up empty this seed`,
    );
  }

  // Inject unitMaxStates for every player-side unit that fought — BEFORE
  // the drain (module doc: repairQueueBuilderProcessor is same-day-coupled
  // to the outcome's apply, so injecting later never retroactively builds
  // tickets).
  const unitMaxStates: Record<string, IUnitMaxState> = {};
  for (const c of captured) {
    for (const delta of c.outcome.unitDeltas) {
      if (delta.side !== GameSide.Player) continue;
      const unitRef = unitRefFromSessionUnitId(delta.unitId);
      const sheet = CANONICAL_COMBAT_SHEETS[unitRef];
      if (!sheet) continue;
      unitMaxStates[delta.unitId] = {
        unitId: delta.unitId,
        maxArmorPerLocation: { ...sheet.armor },
        maxStructurePerLocation: { ...sheet.structure },
        maxAmmoPerBin: {},
      };
    }
  }
  if (Object.keys(unitMaxStates).length === 0) {
    throw new Error(
      'runMaintenanceFastForward: no player-side unit delta resolved against CANONICAL_COMBAT_SHEETS — cannot seed unitMaxStates',
    );
  }
  await store.getState().updateCampaign({
    ...({ unitMaxStates } as unknown as Record<string, unknown>),
  } as never);

  // Drain — repairQueueBuilderProcessor creates tickets THIS pass
  // (status: 'parts-needed', no partsInventory yet).
  const MAX_DRAIN_DAYS = 5;
  let drainDay = 0;
  while (
    store.getState().getPendingOutcomeCount() > 0 &&
    drainDay < MAX_DRAIN_DAYS
  ) {
    await advanceOneDayAndBridge();
    drainDay += 1;
  }
  if (store.getState().getPendingOutcomeCount() > 0) {
    throw new Error(
      `runMaintenanceFastForward: ${store.getState().getPendingOutcomeCount()} outcome(s) still pending after ${MAX_DRAIN_DAYS} drain day(s)`,
    );
  }

  const afterDrain = store.getState().getCampaign();
  if (!afterDrain) {
    throw new Error(
      'runMaintenanceFastForward: no campaign in the store after the drain',
    );
  }
  const mintedRepairQueue =
    (
      afterDrain as unknown as {
        readonly repairQueue?: readonly {
          readonly partsRequired: readonly {
            readonly partId: string;
            readonly quantity: number;
          }[];
        }[];
      }
    ).repairQueue ?? [];
  if (mintedRepairQueue.length === 0) {
    throw new Error(
      'runMaintenanceFastForward: drain completed but campaign.repairQueue is empty — no damaged, combat-ready player unit resolved this seed (a write-off unit produces no tickets, buildTicketsFromUnitState.ts)',
    );
  }

  // Stitch a matching partsInventory onto the (already-ticketed) campaign
  // — never consumed at mint time (no further advance happens here); the
  // loader's post-load advance-day action is the FIRST day it is read.
  const partsNeeded = new Map<string, number>();
  for (const ticket of mintedRepairQueue) {
    for (const requirement of ticket.partsRequired) {
      partsNeeded.set(
        requirement.partId,
        (partsNeeded.get(requirement.partId) ?? 0) + requirement.quantity,
      );
    }
  }
  const partsInventory: IPartsInventory = Array.from(partsNeeded.entries()).map(
    ([partId, quantity], index) => ({
      inventoryId: `${MAINTENANCE_PACK_ID}-parts-${index}`,
      partId,
      partName: partId,
      quantity,
      source: 'acquisition' as const,
      acquiredAt: afterDrain.currentDate.toISOString(),
    }),
  );
  await store.getState().updateCampaign({
    ...({ partsInventory } as unknown as Record<string, unknown>),
  } as never);

  const finalCampaign = store.getState().getCampaign();
  if (!finalCampaign) {
    throw new Error(
      'runMaintenanceFastForward: no campaign in the store after stitching partsInventory',
    );
  }
  return {
    campaign: finalCampaign,
    startingBalanceCents,
    battleOutcomes: captured.map((c) => ({
      scenarioId: c.scenarioId,
      outcome: c.outcome,
    })),
    partsInventory,
  };
}

// =============================================================================
// Shared: dump -> ComparableRunState (for the determinism/parity checks)
// =============================================================================

function snapshotComparableRunState(
  result: EconomyMintResult | MaintenanceMintResult,
): ComparableRunState {
  return buildComparableRunState({
    campaign: result.campaign,
    startingBalanceCents: result.startingBalanceCents,
    battleOutcomes: result.battleOutcomes,
    rosterUnits: useCampaignRosterStore.getState().units,
    rosterPilots: useCampaignRosterStore.getState().pilots,
  });
}

/** Asserts a canonicalized payload's campaign-id-family fields are byte-identical between two mints — the pure/deterministic half of design D11's "true id-templates" property. */
function assertIdenticalCanonicalIdGraph(
  a: CampaignPackPayload,
  b: CampaignPackPayload,
): void {
  expect(a.campaignId).toBe(b.campaignId);
  expect(a.body.id).toBe(b.body.id);
  expect(a.body.rosterProjection?.campaignId).toBe(
    b.body.rosterProjection?.campaignId,
  );
  expect((a.body.rosterProjection?.missions ?? []).map((m) => m.id)).toEqual(
    (b.body.rosterProjection?.missions ?? []).map((m) => m.id),
  );
}

/** No `encounterId`/`gameSessionId` on any roster mission record, and no dangling `matchId`-shaped field the canonicalizer strips (design D11.2, packStamping.ts's `stripDanglingMatchReferences`). */
function assertNoCrossStoreReferences(payload: CampaignPackPayload): void {
  for (const mission of payload.body.rosterProjection?.missions ?? []) {
    expect(mission.encounterId).toBeUndefined();
    expect(mission.gameSessionId).toBeUndefined();
  }
  const unitCombatStates = payload.body.unitCombatStates as Record<
    string,
    { lastCombatOutcomeId?: string | null }
  >;
  for (const state of Object.values(unitCombatStates ?? {})) {
    if (state.lastCombatOutcomeId !== undefined) {
      expect(state.lastCombatOutcomeId).toBeNull();
    }
  }
  const repairQueue = payload.body as unknown as {
    readonly repairQueue?: readonly { readonly matchId?: string | null }[];
  };
  for (const ticket of repairQueue.repairQueue ?? []) {
    if (ticket.matchId !== undefined) {
      expect(ticket.matchId).toBeNull();
    }
  }
}

// =============================================================================
// Always-on regression suite (task 5.1 acceptance — no env gate)
// =============================================================================

describe('mint-from-fast-forward — economy fixture (task 5.1/5.2 acceptance)', () => {
  beforeEach(() => primeWorld());
  afterEach(() => {
    resetWorld();
    adaptUnitMock.mockReset();
  });

  it('mints a payload that round-trips campaignPackSchema and carries no cross-store references', async () => {
    const result = await runEconomyFastForward();
    const { payload } = dumpAndCanonicalizeFastForwardCampaign(
      result.campaign,
      { packId: ECONOMY_PACK_ID },
    );
    expect(() => campaignPackSchema.parse(payload)).not.toThrow();
    assertNoCrossStoreReferences(payload);

    // Sanity: the shape task 5.1's parenthetical names — a real contract
    // payout (nonzero income) alongside a different transaction type
    // (salary expense).
    const types = new Set(
      payload.body.finances.transactions.map((t) => t.type),
    );
    expect(types.size).toBeGreaterThanOrEqual(2);
    expect(
      payload.body.finances.transactions.some(
        (t) => t.type === 'income' && t.amount > 0,
      ),
    ).toBe(true);
  });

  it('two mints of the identical fixture agree on the seam invariant set and carry an identical canonical id graph', async () => {
    const runA = await runEconomyFastForward();
    const snapshotA = snapshotComparableRunState(runA);
    const { payload: payloadA } = dumpAndCanonicalizeFastForwardCampaign(
      runA.campaign,
      { packId: ECONOMY_PACK_ID },
    );

    primeWorld();

    const runB = await runEconomyFastForward();
    const snapshotB = snapshotComparableRunState(runB);
    const { payload: payloadB } = dumpAndCanonicalizeFastForwardCampaign(
      runB.campaign,
      { packId: ECONOMY_PACK_ID },
    );

    assertRunStatesEqual(snapshotA, snapshotB, {
      labelA: 'economy mint 1',
      labelB: 'economy mint 2',
      consequenceMessage:
        'A non-wall-clock divergence here is a W3 determinism-contract bug to report (design 5.1 acceptance) — never absorbed by widening the comparator.',
    });
    assertIdenticalCanonicalIdGraph(payloadA, payloadB);

    // Structural payload equality is explicitly NOT asserted (design D7)
    // — `savedAt`/`body.createdAt` etc. legitimately differ per mint.
  });
});

describe('mint-from-fast-forward — maintenance fixture (task 5.1/5.3 acceptance)', () => {
  beforeEach(() => primeWorld());
  afterEach(() => {
    resetWorld();
    adaptUnitMock.mockReset();
  });

  it('mints a payload that round-trips campaignPackSchema, carries no cross-store references, and queues untouched (parts-needed) tickets', async () => {
    const result = await runMaintenanceFastForward();
    const { payload } = dumpAndCanonicalizeFastForwardCampaign(
      result.campaign,
      { packId: MAINTENANCE_PACK_ID },
    );
    expect(() => campaignPackSchema.parse(payload)).not.toThrow();
    assertNoCrossStoreReferences(payload);

    const repairQueue =
      (
        payload.body as unknown as {
          readonly repairQueue?: readonly { readonly status: string }[];
        }
      ).repairQueue ?? [];
    expect(repairQueue.length).toBeGreaterThan(0);
    // Minted state is UNTOUCHED — the post-load advance-day action (design
    // D8) is what applies the first day of progress, never the mint.
    expect(repairQueue.every((t) => t.status === 'parts-needed')).toBe(true);
  });

  it('two mints of the identical fixture agree on the seam invariant set and carry an identical canonical id graph', async () => {
    const runA = await runMaintenanceFastForward();
    const snapshotA = snapshotComparableRunState(runA);
    const { payload: payloadA } = dumpAndCanonicalizeFastForwardCampaign(
      runA.campaign,
      { packId: MAINTENANCE_PACK_ID },
    );

    primeWorld();

    const runB = await runMaintenanceFastForward();
    const snapshotB = snapshotComparableRunState(runB);
    const { payload: payloadB } = dumpAndCanonicalizeFastForwardCampaign(
      runB.campaign,
      { packId: MAINTENANCE_PACK_ID },
    );

    assertRunStatesEqual(snapshotA, snapshotB, {
      labelA: 'maintenance mint 1',
      labelB: 'maintenance mint 2',
      consequenceMessage:
        'A non-wall-clock divergence here is a W3 determinism-contract bug to report (design 5.1 acceptance) — never absorbed by widening the comparator.',
    });
    assertIdenticalCanonicalIdGraph(payloadA, payloadB);
  });

  it('a second day advance — WITH the stitched partsInventory now present — applies real progress (proves the post-load action dependency, task 5.3 acceptance)', async () => {
    const result = await runMaintenanceFastForward();
    const store = useCampaignStore();
    const before = (
      store.getState().getCampaign() as unknown as {
        readonly repairQueue?: readonly {
          readonly ticketId: string;
          readonly status: string;
        }[];
      }
    ).repairQueue!;
    expect(before.every((t) => t.status === 'parts-needed')).toBe(true);

    await store.getState().advanceDay();

    const after = (
      store.getState().getCampaign() as unknown as {
        readonly repairQueue?: readonly {
          readonly ticketId: string;
          readonly status: string;
        }[];
      }
    ).repairQueue!;
    // At least one ticket moved off its minted 'parts-needed' status —
    // this is the exact causal link the parity spec's post-load
    // `advance-day` action relies on; removing the action (never calling
    // `advanceDay()` again) leaves every ticket at 'parts-needed'
    // (proven above, `before`).
    expect(after.some((t) => t.status !== 'parts-needed')).toBe(true);
  });
});

// =============================================================================
// Env-gated mint-and-write (tasks 5.2/5.3 — invoked via
// `node scripts/qc/mint-scenario-pack.mjs <pack-id>`)
// =============================================================================

const MINT_PACK_ID = process.env.MEKSTATION_MINT_FASTFORWARD_PACK_ID ?? null;
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

interface MintProvenance {
  readonly genesisSource: string;
  readonly mintedAt: string;
  readonly baseCommit: string;
  /** The invariant summary the parity spec's route-rendered assertions are checked against (design 5.2's "the invariant summary recorded at mint"). */
  readonly invariantSummary: ComparableRunState;
}

function writePackPayload(
  packId: string,
  payload: CampaignPackPayload,
  genesisSource: string,
  invariantSummary: ComparableRunState,
): void {
  const payloadDir = path.join(REPO_ROOT, 'e2e', 'scenario-packs', 'campaign');
  fs.mkdirSync(payloadDir, { recursive: true });
  const payloadPath = path.join(payloadDir, `${packId}.campaign.json`);
  fs.writeFileSync(
    payloadPath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );

  const baseCommit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT })
    .toString()
    .trim();
  const provenance: MintProvenance = {
    genesisSource,
    mintedAt: new Date().toISOString(),
    baseCommit,
    invariantSummary,
  };
  const provenancePath = path.join(payloadDir, `${packId}.provenance.json`);
  fs.writeFileSync(
    provenancePath,
    `${JSON.stringify(provenance, null, 2)}\n`,
    'utf8',
  );

  // eslint-disable-next-line no-console -- minter CLI feedback, mirrors mint-scenario-pack.mjs's own console.log usage
  console.log(
    `[mint-fast-forward-pack] wrote ${path.relative(REPO_ROOT, payloadPath)}`,
  );
}

describe('scenario pack minting: fast-forward mode (tasks 5.2/5.3, env-gated write)', () => {
  beforeEach(() => primeWorld());
  afterEach(() => {
    resetWorld();
    adaptUnitMock.mockReset();
  });

  const shouldMintEconomy = MINT_PACK_ID === ECONOMY_PACK_ID;
  (shouldMintEconomy ? it : it.skip)(
    `mint ${ECONOMY_PACK_ID}`,
    async () => {
      const result = await runEconomyFastForward();
      const { payload } = dumpAndCanonicalizeFastForwardCampaign(
        result.campaign,
        { packId: ECONOMY_PACK_ID },
      );
      campaignPackSchema.parse(payload);
      writePackPayload(
        ECONOMY_PACK_ID,
        payload,
        `fast-forward:${ECONOMY_PACK_ID}`,
        snapshotComparableRunState(result),
      );
    },
    30_000,
  );

  const shouldMintMaintenance = MINT_PACK_ID === MAINTENANCE_PACK_ID;
  (shouldMintMaintenance ? it : it.skip)(
    `mint ${MAINTENANCE_PACK_ID}`,
    async () => {
      const result = await runMaintenanceFastForward();
      const { payload } = dumpAndCanonicalizeFastForwardCampaign(
        result.campaign,
        { packId: MAINTENANCE_PACK_ID },
      );
      campaignPackSchema.parse(payload);
      writePackPayload(
        MAINTENANCE_PACK_ID,
        payload,
        `fast-forward:${MAINTENANCE_PACK_ID}`,
        snapshotComparableRunState(result),
      );
    },
    30_000,
  );
});
