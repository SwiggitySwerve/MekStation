/**
 * Combat runner for the headless campaign fast-forward suites: per
 * bridged scenario, materialize through the real API handlers, build
 * combat units through the real catalog-adapted construction path,
 * resolve the battle through the real `GameEngine`, and publish the
 * derived outcome through the production combat-outcome bus.
 *
 * Design D2 (`openspec/changes/add-campaign-fast-forward-api/design.md`,
 * "council-sketch drift resolved"): `campaign.bridgedEncounters`' only
 * production consumer is `launchCampaignEncounter`, a direct-call path
 * that never reaches `GameEngine`. The ONLY production chain that runs
 * `GameEngine.runToCompletion` end-to-end is the SP auto-resolve hook
 * (`usePreBattleLaunch.ts`: `buildPreparedBattleData` → `new GameEngine`
 * → `runToCompletion` → `deriveCombatOutcome` → `publishCombatOutcome`).
 * This runner mirrors that chain step for step, synthesizing a
 * `CampaignMissionSource` one-mission view per bridged scenario and
 * driving `materializeCampaignMissionEncounter` UNCHANGED through the
 * in-process router (design D3). Trade-off recorded (D2): the
 * materializer stamps its own deterministic OpFor/map/victory config —
 * NOT the bridge's BV-matched `opForConfig` or scenario-derived
 * conditions — so fast-forwarded battles are campaign-linkage-faithful
 * (true `contractId`/`scenarioId` flow into the outcome) but not
 * scenario-composition-faithful. Acceptable for this capability's
 * purpose: economy/XP/maintenance invariants and the damage guard need
 * real combat with real linkage, not OpFor fidelity.
 *
 * Design D5 rule 2 ("the runner never applies outcomes directly"): this
 * module calls `deriveCombatOutcome` + `publishCombatOutcome` from the
 * lib/engine layer — NEVER from `usePreBattleLaunch.ts` (the component
 * layer) — and never writes to `campaign.pendingBattleOutcomes`. The
 * published outcome rides the production bus; the campaign store's own
 * subscription (touched by the caller, e.g. `fastForwardCampaign`)
 * enqueues it, and the NEXT `advanceDay()` applies it through
 * `postBattleProcessor` — which is where task 3.2's D9 pilot-attribution
 * fix takes effect.
 *
 * @module lib/campaign/fastForward/fastForwardCombatRunner
 */

import type { IInteractiveSessionLinkage } from '@/engine/InteractiveSession.types';
import type { FastForwardBattleRunner } from '@/lib/campaign/fastForward/fastForwardCampaign';
import type { ICampaignWithBridgeState } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IEncounter } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IGameSession } from '@/types/gameplay';
import type { IPilot } from '@/types/pilot';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { publishCombatOutcome } from '@/engine/combatOutcomeBus';
import { GameEngine } from '@/engine/GameEngine';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { resolveCampaignSeed } from '@/lib/campaign/utils/campaignRng';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { getPilotRepository } from '@/services/pilots/PilotRepository';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { createMission } from '@/types/campaign/Mission';
import { PilotType } from '@/types/pilot';

import type { FastForwardBridgedScenarioHandoff } from './fastForwardCampaign';

import { deriveBattleSeed } from './deriveBattleSeed';
import { createInProcessApiFetch } from './inProcessApiRouter';

type FetchImpl = typeof fetch;

export interface FastForwardCombatRunnerOptions {
  /** Defaults to a fresh `createInProcessApiFetch()` (design D3). */
  readonly fetchImpl?: FetchImpl;
}

/**
 * Full detail of one fast-forward battle — a superset of the narrow
 * `FastForwardBattleRunResult` shape `fastForwardCampaign`'s
 * `runBridgedScenario` callback returns. Colocated + capstone tests use
 * this to assert on the actual SQLite rows created and the resolved
 * session, rather than re-deriving them.
 */
export interface FastForwardBattleRunDetail {
  readonly matchId: string;
  readonly seed: number;
  readonly encounterId: string;
  readonly playerForceId: string;
  readonly opponentForceId: string;
  readonly session: IGameSession;
}

interface ForceApiGetResponse {
  readonly force: IForce;
}

interface EncounterApiGetResponse {
  readonly encounter: IEncounter;
}

// =============================================================================
// Router read-back helpers (design D2 task 3.3(c): read created forces
// back through the router rather than trusting the materializer's own
// narrow result shape, which carries only the encounter id).
// =============================================================================

async function readJson<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    throw new Error(
      `fastForwardCombatRunner: ${context} failed with status ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

async function readEncounter(
  fetchImpl: FetchImpl,
  encounterId: string,
): Promise<IEncounter> {
  const response = await fetchImpl(
    `/api/encounters/${encodeURIComponent(encounterId)}`,
  );
  const payload = await readJson<EncounterApiGetResponse>(
    response,
    `GET /api/encounters/${encounterId}`,
  );
  return payload.encounter;
}

async function readForce(
  fetchImpl: FetchImpl,
  forceId: string,
): Promise<IForce> {
  const response = await fetchImpl(
    `/api/forces/${encodeURIComponent(forceId)}`,
  );
  const payload = await readJson<ForceApiGetResponse>(
    response,
    `GET /api/forces/${forceId}`,
  );
  return payload.force;
}

// =============================================================================
// Roster resolution (task 3.3(a))
// =============================================================================

/**
 * Resolve "the roster units assigned to a bridged scenario's team": the
 * scenario's bridged encounter carries `playerForce.forceId` (the
 * combat team's force id — `buildEncounterFromScenario.ts:209-223`);
 * `campaign.forces.get(forceId).unitIds` names the roster-projection
 * `unitId`s assigned to that force. Intersecting against
 * `useCampaignRosterStore().units` yields the real roster subset.
 */
function resolveTeamRoster(
  campaign: ICampaignWithBridgeState,
  bridged: IEncounter,
): readonly IRosterUnitProjection[] {
  const teamForceId = bridged.playerForce?.forceId;
  if (!teamForceId) {
    return [];
  }
  const teamForce = campaign.forces.get(teamForceId);
  if (!teamForce) {
    throw new Error(
      `fastForwardCombatRunner: bridged encounter ${bridged.id}'s player force ${teamForceId} is not present in campaign.forces`,
    );
  }
  const memberUnitIds = new Set(teamForce.unitIds);
  const roster = useCampaignRosterStore
    .getState()
    .units.filter((unit) => memberUnitIds.has(unit.unitId));
  if (roster.length === 0) {
    throw new Error(
      `fastForwardCombatRunner: no roster units resolve for force ${teamForceId} (unitIds: ${teamForce.unitIds.join(', ')}) — fixture/roster linkage mismatch`,
    );
  }
  return roster;
}

/**
 * Ensure every roster unit's `pilotId` resolves to a real SQLite
 * `PilotRepository` row.
 *
 * Verified during authoring: `PUT /api/forces/assignments/:id` →
 * `ForceService.assignPilotAndUnit` validates the assignment body's
 * `pilotId` against `getPilotRepository().getById(pilotId)` and rejects
 * with "Pilot not found" otherwise — the fixture's roster-store pilot
 * ids (`vault-pilot-NNN`) are a Zustand-only concept with no SQLite row
 * behind them, so materialization would fail without this step.
 *
 * Creates a real pilot row through the SAME repository the assignment
 * handler reads (`getPilotRepository().create`) — the exact precedent
 * `forceMultiAssignment.real.test.ts`'s `createPersistentPilot` helper
 * uses, cited by design D3 — then renames the roster store's pilotId
 * (both the roster entry AND the roster-unit projection) from the
 * fixture's placeholder id to the real SQLite-assigned one, so every
 * downstream lookup — the materializer's assignment body, task 3.2's D9
 * pilot-attribution resolution — references the SAME id consistently.
 * Idempotent: a roster unit whose `pilotId` already resolves in SQLite
 * (a prior call already remapped it) is left untouched.
 */
function ensureRealPilotIds(
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
        `fastForwardCombatRunner: failed to bootstrap a real SQLite pilot for roster unit ${unit.unitId} (fixture pilotId ${pilotId}): ${created.error ?? 'unknown error'}`,
      );
    }
    remap.set(pilotId, created.id);
  }

  if (remap.size === 0) {
    return rosterUnits;
  }

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
// Runner
// =============================================================================

/**
 * Fight one bridged scenario end-to-end and publish the outcome.
 *
 * Returns `null` (never throws) for a `Draft`-status bridged encounter
 * with no resolvable player force — left to the runner's judgment per
 * design Open Questions, since the bridge itself could not resolve a
 * force to fight with.
 *
 * Reads the LIVE campaign from `useCampaignStore()` rather than
 * accepting one as a parameter: the driver (`fastForwardCampaign`)
 * already owns subscription liveness (design D5 rule 1) and the
 * current-day campaign snapshot by the time it offers a bridged
 * scenario to this function, so re-reading the store here keeps this
 * function's signature matching `FastForwardBattleRunner` when narrowed
 * by `createFastForwardCombatRunner`.
 */
export async function runFastForwardBattle(
  handoff: FastForwardBridgedScenarioHandoff,
  options: FastForwardCombatRunnerOptions = {},
): Promise<FastForwardBattleRunDetail | null> {
  const fetchImpl = options.fetchImpl ?? createInProcessApiFetch();

  // `useCampaignStore` follows Zustand's `use*` naming convention but is
  // a plain lazy-init function (not a React hook) — safe to call from a
  // headless runner (same precedent as `fastForwardCampaign.ts`).
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  const campaign = useCampaignStore()
    .getState()
    .getCampaign() as ICampaignWithBridgeState | null;
  if (!campaign) {
    throw new Error(
      'fastForwardCombatRunner: no campaign loaded in the store — the caller must switchCampaign() before offering a bridged scenario to the runner',
    );
  }

  const bridged = campaign.bridgedEncounters?.[handoff.scenarioId];
  if (!bridged) {
    throw new Error(
      `fastForwardCombatRunner: scenario ${handoff.scenarioId} has no bridged encounter on the current campaign snapshot`,
    );
  }
  if (!bridged.playerForce?.forceId) {
    // Draft-status bridged encounter — no resolvable force to fight
    // with. Skip rather than fabricate a force the bridge itself
    // couldn't resolve (design Open Questions).
    return null;
  }

  const rosterUnits = ensureRealPilotIds(resolveTeamRoster(campaign, bridged));

  // Design D2: synthesize a one-mission `CampaignMissionSource` view
  // (`Pick<ICampaign, 'id' | 'name' | 'missions'>`) keyed by the
  // scenario id, satisfied structurally without importing the
  // materializer's private type alias.
  const missionId = handoff.scenarioId;
  const missionView = createMission({
    id: missionId,
    name: bridged.name,
    // Empty on purpose: `materializeCampaignMissionEncounter`'s
    // existing-encounter reuse check reads `mission.scenarioIds`, and
    // this is always a fresh materialization for a newly bridged
    // scenario — no reuse should ever trigger here.
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

  // Task 3.3(c): read the created forces back through the router rather
  // than trusting a narrower result shape.
  const materializedEncounter = await readEncounter(
    fetchImpl,
    materialized.encounterId,
  );
  const playerForceId = materializedEncounter.playerForce?.forceId;
  const opponentForceId = materializedEncounter.opponentForce?.forceId;
  if (!playerForceId || !opponentForceId) {
    throw new Error(
      `fastForwardCombatRunner: materialized encounter ${materialized.encounterId} is missing an attached force (player=${playerForceId ?? 'none'}, opponent=${opponentForceId ?? 'none'})`,
    );
  }
  const [playerForce, opponentForce] = await Promise.all([
    readForce(fetchImpl, playerForceId),
    readForce(fetchImpl, opponentForceId),
  ]);

  // Task 3.3(d): real catalog-adapted construction — the same path the
  // live SP auto-resolve launch uses.
  const pilots: readonly IPilot[] = usePilotStore.getState().pilots;
  const prepared = await buildPreparedBattleData({
    playerForce,
    opponentForce,
    pilots,
  });

  // Design D4: deterministic per-battle seed, keyed on the scenario's
  // stable identity — never the day the battle is fought.
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

  // Task 3.3(e): resolve combat via the real engine.
  const session = engine.runToCompletion(
    prepared.playerAdapted,
    prepared.opponentAdapted,
    prepared.gameUnits,
    linkage,
  );

  // Task 3.3(f): derive + publish through the lib/engine layer (design
  // D5) — never through `usePreBattleLaunch` (the component layer).
  const outcome = deriveCombatOutcome(session, {
    contractId: handoff.contractId,
    scenarioId: handoff.scenarioId,
  });
  const delivered = publishCombatOutcome({ matchId: outcome.matchId, outcome });
  if (!delivered) {
    throw new Error(
      `fastForwardCombatRunner: publishCombatOutcome for match ${outcome.matchId} reached no subscriber — the campaign store's bus subscription must be live before any battle (design D5 rule 1)`,
    );
  }

  return {
    matchId: outcome.matchId,
    seed,
    encounterId: materialized.encounterId,
    playerForceId,
    opponentForceId,
    session,
  };
}

/**
 * Adapt `runFastForwardBattle` to the `FastForwardBattleRunner` shape
 * `fastForwardCampaign`'s `runBridgedScenario` callback expects (task
 * 3.3: "wire the group-2 callback to the real runner").
 */
export function createFastForwardCombatRunner(
  options: FastForwardCombatRunnerOptions = {},
): FastForwardBattleRunner {
  return async (handoff) => {
    const detail = await runFastForwardBattle(handoff, options);
    if (!detail) {
      return null;
    }
    return { matchId: detail.matchId, seed: detail.seed };
  };
}
