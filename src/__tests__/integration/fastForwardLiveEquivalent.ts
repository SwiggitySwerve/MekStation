/**
 * Discrete-step live-equivalent day loop for the live-parity acceptance
 * (task 5.3, design D7). NOT a `.test.ts`/`.spec.ts` file — see
 * `fastForwardTestSupport.ts`'s module doc for the `testMatch` glob note.
 *
 * Design D7 anti-tautology rule 1 ("Independence of the code under
 * test"): this module MUST NOT import `fastForwardCampaign` or
 * `fastForwardCombatRunner` (or any other fast-forward orchestration
 * helper) — its day stepping, battle election, and fight-then-apply
 * sequencing are hand-inlined directly against the production primitives
 * (store `advanceDay`, `materializeCampaignMissionEncounter`,
 * `buildPreparedBattleData`, `GameEngine`, `deriveCombatOutcome` +
 * `publishCombatOutcome`). Shared surface is limited to exactly three
 * modules (design D7 rule 1): the fixture builder (an identical fixture is
 * the comparison's premise, imported by the TEST FILE, not here), the
 * in-process API router (`createInProcessApiFetch` — transport, unit-tested
 * per-route in group 1), and `deriveBattleSeed` (identical seeds are the
 * premise — re-deriving the formula independently would just be the same
 * code twice, buying nothing). `assertSessionInflictedDamage` is also used
 * here — it is NOT fast-forward orchestration, it is the group-4 damage
 * guard (its own module, its own dedicated test suite), reused so the
 * live-equivalent's battles are held to the same standing tripwire a real
 * player session would be.
 *
 * `fastForwardLiveParity.test.ts`'s own "the live-equivalent does not reuse
 * the code under test" check greps THIS FILE's source for an import of
 * either banned module and asserts zero matches — the grep target is this
 * module specifically (not the test file, which legitimately imports the
 * fast-forward driver for the OTHER side of the comparison).
 *
 * This is a deliberate, line-for-line-independent duplication of the
 * per-battle sequence `fastForwardCombatRunner.ts`'s `runFastForwardBattle`
 * implements — see that module for the production chain being mirrored
 * (design D2: materializer's REST surface, not `launchCampaignEncounter`).
 * Divergence between the two implementations over time is the risk this
 * whole acceptance exists to catch, per design D7's anti-tautology framing.
 *
 * @module __tests__/integration/fastForwardLiveEquivalent
 */

import type { IInteractiveSessionLinkage } from '@/engine/InteractiveSession.types';
import type { ICampaignWithBridgeState } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IEncounter } from '@/types/encounter';
import type { IForce } from '@/types/force';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { publishCombatOutcome } from '@/engine/combatOutcomeBus';
import { GameEngine } from '@/engine/GameEngine';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { assertSessionInflictedDamage } from '@/lib/campaign/fastForward/assertSessionInflictedDamage';
import { deriveBattleSeed } from '@/lib/campaign/fastForward/deriveBattleSeed';
import { resolveCampaignSeed } from '@/lib/campaign/utils/campaignRng';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { getPilotRepository } from '@/services/pilots/PilotRepository';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { createMission } from '@/types/campaign/Mission';
import { PilotType } from '@/types/pilot';

import type { CapturedBattleOutcome } from './fastForwardTestSupport';

type FetchImpl = typeof fetch;

/** A newly bridged scenario, awaiting a fight decision (identical shape to `FastForwardBridgedScenarioHandoff`, hand-declared — not imported). */
export interface LiveEquivalentHandoff {
  readonly scenarioId: string;
  readonly contractId: string;
  readonly encounterId: string;
}

// =============================================================================
// Roster resolution + real-pilot-id bootstrap (independent re-implementation
// of `fastForwardCombatRunner.ts`'s `resolveTeamRoster` / `ensureRealPilotIds`)
// =============================================================================

function resolveTeamRosterLiveEquivalent(
  campaign: ICampaignWithBridgeState,
  bridged: IEncounter,
): readonly IRosterUnitProjection[] {
  const teamForceId = bridged.playerForce?.forceId;
  if (!teamForceId) return [];
  const teamForce = campaign.forces.get(teamForceId);
  if (!teamForce) {
    throw new Error(
      `live-equivalent: bridged encounter ${bridged.id}'s player force ${teamForceId} is not present in campaign.forces`,
    );
  }
  const memberUnitIds = new Set(teamForce.unitIds);
  const roster = useCampaignRosterStore
    .getState()
    .units.filter((unit) => memberUnitIds.has(unit.unitId));
  if (roster.length === 0) {
    throw new Error(
      `live-equivalent: no roster units resolve for force ${teamForceId} (unitIds: ${teamForce.unitIds.join(', ')})`,
    );
  }
  return roster;
}

function ensureRealPilotIdsLiveEquivalent(
  rosterUnits: readonly IRosterUnitProjection[],
): readonly IRosterUnitProjection[] {
  const repo = getPilotRepository();
  const remap = new Map<string, string>();

  for (const unit of rosterUnits) {
    const pilotId = unit.pilotId;
    if (!pilotId || repo.exists(pilotId)) continue;
    const created = repo.create({
      identity: { name: unit.unitName },
      type: PilotType.Persistent,
      skills: { gunnery: 4, piloting: 5 },
    });
    if (!created.success || !created.id) {
      throw new Error(
        `live-equivalent: failed to bootstrap a real SQLite pilot for roster unit ${unit.unitId} (fixture pilotId ${pilotId}): ${created.error ?? 'unknown error'}`,
      );
    }
    remap.set(pilotId, created.id);
  }

  if (remap.size === 0) return rosterUnits;

  const rosterState = useCampaignRosterStore.getState();
  useCampaignRosterStore.setState({
    pilots: rosterState.pilots.map((entry) => {
      const nextId = remap.get(entry.pilotId);
      return nextId ? { ...entry, pilotId: nextId } : entry;
    }),
    units: rosterState.units.map((unit) => {
      const nextId = unit.pilotId ? remap.get(unit.pilotId) : undefined;
      return nextId ? { ...unit, pilotId: nextId } : unit;
    }),
  });

  return rosterUnits.map((unit) => {
    const nextId = unit.pilotId ? remap.get(unit.pilotId) : undefined;
    return nextId ? { ...unit, pilotId: nextId } : unit;
  });
}

// =============================================================================
// One battle, hand-inlined against the production primitives
// =============================================================================

/**
 * Fight one bridged scenario end-to-end via the production primitives,
 * independently of `fastForwardCombatRunner.ts`. Returns `null` (never
 * throws) for a Draft-status bridged encounter with no resolvable player
 * force — the same judgment call `runFastForwardBattle` makes.
 */
export async function fightBridgedScenarioLiveEquivalent(
  handoff: LiveEquivalentHandoff,
  fetchImpl: FetchImpl,
  sink: CapturedBattleOutcome[],
): Promise<void> {
  const campaign = useCampaignStore()
    .getState()
    .getCampaign() as ICampaignWithBridgeState | null;
  if (!campaign) {
    throw new Error(
      'live-equivalent: no campaign loaded in the store — switchCampaign() must run before fighting a bridged scenario',
    );
  }
  const bridged = campaign.bridgedEncounters?.[handoff.scenarioId];
  if (!bridged) {
    throw new Error(
      `live-equivalent: scenario ${handoff.scenarioId} has no bridged encounter on the current campaign snapshot`,
    );
  }
  if (!bridged.playerForce?.forceId) {
    return; // Draft-status — nothing to fight (mirrors the runner's own judgment call).
  }

  const rosterUnits = ensureRealPilotIdsLiveEquivalent(
    resolveTeamRosterLiveEquivalent(campaign, bridged),
  );

  const missionId = handoff.scenarioId;
  const missionView = createMission({
    id: missionId,
    name: bridged.name,
    scenarioIds: [],
  });
  const campaignView = {
    id: campaign.id,
    name: campaign.name,
    missions: new Map([[missionId, missionView]]),
  };

  const materialized = await materializeCampaignMissionEncounter({
    campaign: campaignView,
    missionId,
    rosterUnits,
    fetchImpl,
  });

  const encounterResponse = await fetchImpl(
    `/api/encounters/${encodeURIComponent(materialized.encounterId)}`,
  );
  if (!encounterResponse.ok) {
    throw new Error(
      `live-equivalent: GET /api/encounters/${materialized.encounterId} failed with status ${encounterResponse.status}`,
    );
  }
  const encounterPayload = (await encounterResponse.json()) as {
    readonly encounter: IEncounter;
  };
  const playerForceId = encounterPayload.encounter.playerForce?.forceId;
  const opponentForceId = encounterPayload.encounter.opponentForce?.forceId;
  if (!playerForceId || !opponentForceId) {
    throw new Error(
      `live-equivalent: materialized encounter ${materialized.encounterId} is missing an attached force (player=${playerForceId ?? 'none'}, opponent=${opponentForceId ?? 'none'})`,
    );
  }

  const [playerForceResponse, opponentForceResponse] = await Promise.all([
    fetchImpl(`/api/forces/${encodeURIComponent(playerForceId)}`),
    fetchImpl(`/api/forces/${encodeURIComponent(opponentForceId)}`),
  ]);
  if (!playerForceResponse.ok || !opponentForceResponse.ok) {
    throw new Error(
      `live-equivalent: force read-back failed (player status ${playerForceResponse.status}, opponent status ${opponentForceResponse.status})`,
    );
  }
  const playerForce = (
    (await playerForceResponse.json()) as { readonly force: IForce }
  ).force;
  const opponentForce = (
    (await opponentForceResponse.json()) as {
      readonly force: IForce;
    }
  ).force;

  const pilots = usePilotStore.getState().pilots;
  const prepared = await buildPreparedBattleData({
    playerForce,
    opponentForce,
    pilots,
  });

  // Shared surface item 3 (design D7 rule 1): the SAME deterministic seed
  // derivation as the fast-forward side — identical seeds are the premise
  // of the comparison, not something under test here.
  const seed = deriveBattleSeed(
    resolveCampaignSeed(campaign),
    handoff.scenarioId,
  );
  const engine = new GameEngine({ seed });

  const linkage: IInteractiveSessionLinkage = {
    campaignId: bridged.campaignMeta?.campaignId ?? campaign.id,
    contractId: handoff.contractId,
    scenarioId: handoff.scenarioId,
    encounterId: materialized.encounterId,
  };

  const session = engine.runToCompletion(
    prepared.playerAdapted,
    prepared.opponentAdapted,
    prepared.gameUnits,
    linkage,
  );

  const outcome = deriveCombatOutcome(session, {
    contractId: handoff.contractId,
    scenarioId: handoff.scenarioId,
  });

  assertSessionInflictedDamage(session, outcome);

  const delivered = publishCombatOutcome({ matchId: outcome.matchId, outcome });
  if (!delivered) {
    throw new Error(
      `live-equivalent: publishCombatOutcome for match ${outcome.matchId} reached no subscriber`,
    );
  }

  sink.push({
    scenarioId: handoff.scenarioId,
    contractId: handoff.contractId,
    outcome,
  });
}

// =============================================================================
// Discrete-step day loop
// =============================================================================

interface PendingFight extends LiveEquivalentHandoff {
  readonly detectedOnDay: number;
}

export interface RunLiveEquivalentParams {
  readonly campaign: ICampaign;
  readonly fetchImpl: FetchImpl;
  /** Scheduled in-fiction days to advance before draining. */
  readonly scheduledDays: number;
  /**
   * Player-realism knob (design D7 rule 3): 0 fights a bridged scenario
   * the same day it bridges (mirrors the fast-forward driver's own
   * immediate-fight behavior — "identical ordering"); >=1 defers the fight
   * by that many additional day-advances within the same total day
   * window ("deferred ordering").
   */
  readonly deferFightsByDays: number;
  readonly maxDrainDays: number;
}

export interface RunLiveEquivalentResult {
  /** Total day-advances performed, scheduled + drain (design D7 rule 4's day-count pin). */
  readonly totalDays: number;
  readonly finalDate: Date;
  readonly battleOutcomes: readonly CapturedBattleOutcome[];
}

/**
 * The discrete-step live-equivalent loop itself (design D7): advance one
 * day; materialize and fight each bridged scenario ready to fight this
 * step; advance to apply; repeat — hand-inlined, no shortcuts, no
 * batching. Mirrors a player-paced session's ordering, never the
 * fast-forward driver's own code.
 */
export async function runLiveEquivalent(
  params: RunLiveEquivalentParams,
): Promise<RunLiveEquivalentResult> {
  // Subscription liveness — the SAME production requirement the
  // fast-forward driver documents (design D5 rule 1), hand-satisfied here
  // rather than delegated to the driver.
  const store = useCampaignStore();
  store.getState().switchCampaign(params.campaign);

  const battleOutcomes: CapturedBattleOutcome[] = [];
  let seenScenarioIds = new Set<string>(
    (params.campaign as ICampaignWithBridgeState).bridgedScenarioIds ?? [],
  );
  let pendingFights: PendingFight[] = [];
  let daysAdvanced = 0;

  async function advanceOneDay(): Promise<void> {
    const dayReport = await store.getState().advanceDay();
    daysAdvanced += 1;
    if (!dayReport) {
      throw new Error('live-equivalent: advanceDay() returned null');
    }
    const extended = dayReport.campaign as ICampaignWithBridgeState;
    const nextIds = extended.bridgedScenarioIds ?? [];
    const newIds = nextIds.filter((id) => !seenScenarioIds.has(id));
    seenScenarioIds = new Set(nextIds);
    for (const scenarioId of newIds) {
      const encounter = extended.bridgedEncounters?.[scenarioId];
      if (!encounter?.campaignMeta) {
        throw new Error(
          `live-equivalent: bridged scenario ${scenarioId} has no campaignMeta`,
        );
      }
      pendingFights.push({
        scenarioId,
        contractId: encounter.campaignMeta.contractId,
        encounterId: encounter.id,
        detectedOnDay: daysAdvanced,
      });
    }
  }

  async function fightReadyBattles(): Promise<void> {
    const ready = pendingFights.filter(
      (fight) => daysAdvanced - fight.detectedOnDay >= params.deferFightsByDays,
    );
    if (ready.length === 0) return;
    pendingFights = pendingFights.filter(
      (fight) => daysAdvanced - fight.detectedOnDay < params.deferFightsByDays,
    );
    for (const fight of ready) {
      await fightBridgedScenarioLiveEquivalent(
        fight,
        params.fetchImpl,
        battleOutcomes,
      );
    }
  }

  for (let day = 0; day < params.scheduledDays; day += 1) {
    await advanceOneDay();
    await fightReadyBattles();
  }

  let drainDays = 0;
  while (
    pendingFights.length > 0 ||
    store.getState().getPendingOutcomeCount() > 0
  ) {
    if (drainDays >= params.maxDrainDays) {
      throw new Error(
        `live-equivalent: ${pendingFights.length} deferred fight(s) and ${store.getState().getPendingOutcomeCount()} pending outcome(s) still unresolved after ${params.maxDrainDays} drain day(s)`,
      );
    }
    await advanceOneDay();
    await fightReadyBattles();
    drainDays += 1;
  }

  const finalCampaign = store.getState().getCampaign();
  if (!finalCampaign) {
    throw new Error('live-equivalent: no campaign in the store after the run');
  }

  return {
    totalDays: daysAdvanced,
    finalDate: finalCampaign.currentDate,
    battleOutcomes,
  };
}
