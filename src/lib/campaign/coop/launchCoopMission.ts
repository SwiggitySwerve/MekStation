import type { CreateCoopMissionMatchBody } from '@/lib/api/securitySchemas';
import type { IExpectedBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IEncounter } from '@/types/encounter';

import { readCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { assertOwnedForcesCurrent } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter.ownedForces';
import { readCampaignLaunchHead } from '@/lib/campaign/encounter/readCampaignLaunchHead';
/**
 * Co-op mission launch path (CO2).
 *
 * Per design D1, a co-op campaign mission launch is *composition* (build
 * one encounter from two rosters) plus *routing* (send it through the
 * existing `ServerMatchHost` server-authoritative combat loop) — NOT a
 * new combat path. This module is the routing step:
 *
 *   1. compose the co-op encounter from both players' force
 *      contributions via `composeCoopEncounter` — this is where a
 *      zero-`deploy` launch is BLOCKED (design D2);
 *   2. launch the composed encounter through the existing
 *      `add-campaign-combat-loop` launch path (`launchCampaignEncounter`
 *      → `EncounterService.launchEncounter` → `ServerMatchHost`), so the
 *      co-op encounter runs on the same authoritative combat host any
 *      campaign encounter uses (design D1 / spec "Co-op encounter runs
 *      through the existing combat host").
 *
 * The composed `ICoopEncounterComposition` is returned alongside the
 * launch result so the caller can route each deploying player to the
 * map and each `command-hq` player to the campaign-management surfaces
 * (design D2 / spec "Per-Mission Participation Choice").
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D1, D2)
 * @module lib/campaign/coop/launchCoopMission
 */
import { resolveLaunchForces } from '@/lib/campaign/encounter/requestLaunchAuthority';
import { fetchCanonicalCatalogSnapshot } from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import {
  type CampaignLaunchExpectedIdentity,
  type CampaignLaunchSelectionUnit,
  type CampaignLaunchSnapshot,
  admitCampaignLaunch,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import {
  selectUnitReadiness,
  type ISelectUnitReadinessInput,
} from '@/lib/campaign/readiness/selectUnitReadiness';

import type {
  ICampaignEncounterLauncherService,
  ICampaignEncounterLaunchProgress,
} from '../encounter/launchCampaignEncounter';
import type {
  CoopCompositionRejection,
  ICoopEncounterComposition,
  ICoopForceContribution,
} from './composeCoopEncounter';

import { createEncounterApiLauncher } from '../encounter/encounterApiLauncher';
import { launchCampaignEncounter } from '../encounter/launchCampaignEncounter';
import { composeCoopEncounter } from './composeCoopEncounter';
import {
  readRecordedCoopEncounter,
  type CoopMissionLaunchOperation,
} from './coopMissionLaunchAttempt';

export interface LaunchCoopMissionAdmission {
  readonly snapshot: CampaignLaunchSnapshot;
  readonly expected: CampaignLaunchExpectedIdentity;
  readonly selectedUnits?: readonly CampaignLaunchSelectionUnit[];
  readonly mission?: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly expectedHead: IExpectedBranchHead;
    readonly fetchImpl?: typeof fetch;
  };
}

/** Transient receipt only: never serialized into a campaign. */
export interface ICoopMissionLaunchProgress extends ICampaignEncounterLaunchProgress {
  missionMatchId?: string;
}

// =============================================================================
// Result
// =============================================================================

/**
 * The outcome of a co-op mission launch — a discriminated union over
 * `ok`. A blocked composition (no deploying player) carries the typed
 * `CoopCompositionRejection`; a launch failure carries the encounter
 * service's error string.
 */
export type LaunchCoopMissionResult =
  | {
      readonly ok: true;
      /** The durable shared mission id; absent only on the injected legacy test seam. */
      readonly missionMatchId: string | undefined;
      /** The id of the existing local encounter session, not the shared id. */
      readonly gameSessionId: string | undefined;
      /** The materialised encounter id. */
      readonly encounterId: string | undefined;
      /** The composed co-op encounter — drives map vs HQ routing. */
      readonly composition: ICoopEncounterComposition;
    }
  | {
      readonly ok: false;
      /** Set when the composition itself was rejected (design D2). */
      readonly compositionRejection?: CoopCompositionRejection;
      /** Human-readable failure reason. */
      readonly error: string;
      /** An uncertain remote response or local failure can resume the captured request. */
      readonly retryable?: boolean;
    };

// =============================================================================
// Launch
// =============================================================================

/**
 * Launch a co-op campaign mission with both players' forces.
 *
 * @param baseEncounter - the single-force encounter from the
 *   `add-campaign-combat-loop` mission→encounter bridge
 *   (`buildEncounterFromScenario`)
 * @param contributions - one `ICoopForceContribution` per player,
 *   carrying the force and the player's `deploy` / `command-hq` choice
 * @param service - explicit service (defaults to the browser HTTP adapter)
 */
export async function launchCoopMission(
  baseEncounter: IEncounter,
  contributions: readonly ICoopForceContribution[],
  service?: ICampaignEncounterLauncherService,
  admission?: LaunchCoopMissionAdmission,
  progress?: ICoopMissionLaunchProgress,
): Promise<LaunchCoopMissionResult> {
  const deployingUnitIds = contributions.flatMap((contribution) =>
    contribution.participation === 'deploy' ? contribution.force.unitIds : [],
  );
  const selectedById = new Map(
    (admission?.selectedUnits ?? []).map((unit) => [unit.unitId, unit]),
  );
  const gate = admitCampaignLaunch({
    snapshot: admission?.snapshot,
    expected: admission?.expected ?? {
      campaignId: baseEncounter.campaignMeta?.campaignId ?? '',
    },
    selectedUnits: deployingUnitIds.map(
      (unitId) => selectedById.get(unitId) ?? { unitId, unitName: unitId },
    ),
  });
  if (!gate.admitted) {
    return { ok: false, error: gate.blocker.message };
  }

  // Step 1 — compose the co-op encounter. A zero-`deploy` launch is
  // BLOCKED here with a typed rejection; no encounter is created
  // (design D2 / spec "Mission with no deploying player is blocked").
  const composed = composeCoopEncounter(baseEncounter, contributions);
  if (!composed.ok) {
    return {
      ok: false,
      compositionRejection: composed.reason,
      error: rejectionMessage(composed.reason),
    };
  }

  const mission = admission?.mission;
  let missionMatchId = progress?.missionMatchId;
  if (mission && !missionMatchId) {
    const token = readCoopCampaignToken(mission.sessionId);
    if (!token) {
      return {
        ok: false,
        error: 'Co-op campaign authorization is unavailable',
      };
    }
    const selectedUnits = new Map(
      (admission.selectedUnits ?? []).map((unit) => [unit.unitId, unit]),
    );
    const unitBootstrap = composed.composition.coopSeats.map((seat) => {
      const selected = selectedUnits.get(seat.unitId);
      if (!selected?.unitRef) {
        throw new Error(
          `Co-op mission unit ${seat.unitId} has no unit reference`,
        );
      }
      return {
        unitId: seat.unitId,
        unitRef: selected.unitRef,
        side: 'player' as const,
      };
    });
    const body: CreateCoopMissionMatchBody = {
      config: {
        mapRadius: baseEncounter.mapConfig.radius,
        turnLimit:
          baseEncounter.victoryConditions.find(
            (condition) => condition.turnLimit !== undefined,
          )?.turnLimit ?? 20,
        fogOfWar: false,
        optionalRules: [...baseEncounter.optionalRules],
        contractId: baseEncounter.campaignMeta?.contractId,
        scenarioId: baseEncounter.campaignMeta?.scenarioId,
        encounterId: baseEncounter.id,
      },
      layout: '1v1',
      unitBootstrap,
      coopCampaign: {
        campaignId: mission.campaignId,
        sessionId: mission.sessionId,
        missionId: mission.missionId,
        expectedHead: mission.expectedHead,
        contributions: contributions.map((contribution) => ({
          forceId: contribution.force.id,
          choice: contribution.participation,
          unitIds: [...contribution.force.unitIds],
        })),
      },
    };
    let response: Response;
    try {
      response = await (mission.fetchImpl ?? fetch)(
        '/api/multiplayer/matches',
        {
          method: 'POST',
          signal: AbortSignal.timeout(15_000),
          headers: {
            Authorization: `Bearer ${token.wireToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
    } catch (error) {
      return {
        ok: false,
        ...(progress ? { retryable: true } : {}),
        error:
          error instanceof Error ? error.message : 'Mission creation failed',
      };
    }
    const reply = (await response.json().catch(() => ({}))) as {
      readonly missionMatchId?: unknown;
      readonly code?: unknown;
      readonly error?: unknown;
    };
    if (!response.ok) {
      const reason =
        typeof reply.code === 'string'
          ? reply.code
          : typeof reply.error === 'string'
            ? reply.error
            : 'Mission creation failed';
      return {
        ok: false,
        ...(progress ? { retryable: response.status >= 500 } : {}),
        error: `Mission creation refused (${response.status} ${reason})`,
      };
    }
    if (typeof reply.missionMatchId !== 'string') {
      return {
        ok: false,
        ...(progress ? { retryable: true } : {}),
        error: 'Mission creation returned no shared match id',
      };
    }
    missionMatchId = reply.missionMatchId;
    if (progress) progress.missionMatchId = missionMatchId;
  } else if (!mission && !service) {
    // The real page omits both only when no accepted head exists. An explicitly
    // injected service keeps older local-only admission tests usable without
    // granting the browser path an unauthenticated fallback.
    return {
      ok: false,
      error: 'Co-op mission creation context is unavailable',
    };
  }

  // Remote creation is deliberately first. A stale/create refusal leaves no
  // local artifact; if local launch later fails, retrying this byte-identical
  // payload relies on the route's durable idempotency before trying local again.
  const launched = await launchCampaignEncounter(
    composed.composition.encounter,
    service ?? createEncounterApiLauncher(),
    progress,
  );
  if (!launched.success) {
    return {
      ok: false,
      ...(progress ? { retryable: true } : {}),
      error: launched.error ?? 'Failed to launch co-op encounter',
    };
  }

  return {
    ok: true,
    missionMatchId,
    gameSessionId: launched.gameSessionId,
    encounterId: launched.encounterId,
    composition: composed.composition,
  };
}

/**
 * Map a composition rejection to a clear, human-readable launch error.
 */
function rejectionMessage(reason: CoopCompositionRejection): string {
  switch (reason) {
    case 'no-deploying-player':
      return 'Co-op mission cannot launch: at least one player must deploy onto the map. A mission with both players in command HQ has no one to fight it.';
    case 'no-contributions':
      return 'Co-op mission cannot launch: no player forces were contributed.';
    case 'duplicate-unit':
      return 'Co-op mission cannot launch: the same unit was contributed by both players. A co-op campaign shares one roster, so two players can pick the same lance - each unit can only deploy once, under one owner.';
    case 'duplicate-player':
      return 'Co-op mission cannot launch: a player contributed a force more than once.';
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return 'Co-op mission cannot launch.';
    }
  }
}

interface IPrepareCoopMissionLaunchInput {
  readonly campaign: ICampaign;
  readonly missionKey: string;
  readonly matchId: string;
  readonly encounter: IEncounter;
  readonly contributions: readonly ICoopForceContribution[];
  readonly selectedUnits: readonly CampaignLaunchSelectionUnit[];
  readonly roster: {
    readonly units: readonly IRosterUnitProjection[];
    readonly pilots: ISelectUnitReadinessInput['pilots'];
  };
  readonly beforeLaunch: () => void;
  readonly launch: typeof launchCoopMission;
}

/** Capture authority and selected identities once; uncertain retries reuse them. */
export async function prepareCoopMissionLaunch({
  campaign,
  missionKey,
  matchId,
  encounter,
  contributions,
  selectedUnits,
  roster,
  beforeLaunch,
  launch,
}: IPrepareCoopMissionLaunchInput): Promise<CoopMissionLaunchOperation> {
  if (!campaign.missions.has(missionKey))
    throw new Error('The mission is no longer available. Resync the campaign.');
  const recorded = await readRecordedCoopEncounter(
    campaign.missions.get(missionKey)?.scenarioIds ?? [],
  );
  if (recorded)
    return async () => ({
      ok: true as const,
      encounterId: recorded,
      gameSessionId: undefined,
      missionMatchId: undefined,
    });
  const progress: ICoopMissionLaunchProgress = {};
  const catalog = await fetchCanonicalCatalogSnapshot();
  const launchHead = await readCampaignLaunchHead(campaign.id);
  const ownedForces = await resolveLaunchForces({
    campaignId: campaign.id,
    missionId: missionKey,
    launchHead,
    sessionId: matchId,
  });
  assertOwnedForcesCurrent(ownedForces);
  const byId = new Map(roster.units.map((unit) => [unit.unitId, unit]));
  for (const contribution of contributions.filter(
    (entry) => entry.participation === 'deploy',
  )) {
    for (const unitId of contribution.force.unitIds) {
      const unit = byId.get(unitId);
      if (!unit)
        throw new Error('Deploying unit is missing from the campaign roster.');
      const readiness = selectUnitReadiness({
        unit,
        campaign,
        pilots: roster.pilots,
        authority: launchHead.readinessAuthority,
      });
      const blocker = readiness.reasons.find(
        (reason) => reason.severity === 'blocker',
      );
      if (blocker) throw new Error(blocker.message);
    }
  }

  const revision = launchHead.kind === 'head' ? launchHead.revision : undefined;
  return () => {
    beforeLaunch();
    return launch(
      encounter,
      contributions,
      undefined,
      {
        snapshot: {
          campaignId: campaign.id,
          matchId,
          revision,
          catalog,
        },
        expected: { campaignId: campaign.id, matchId, revision },
        selectedUnits,
        ...(launchHead.kind === 'head'
          ? {
              mission: {
                campaignId: campaign.id,
                sessionId: matchId,
                missionId: missionKey,
                expectedHead: {
                  branchId: launchHead.branchId,
                  revision: launchHead.revision,
                  effectiveGeneration: launchHead.effectiveGeneration,
                },
              },
            }
          : {}),
      },
      progress,
    );
  };
}
