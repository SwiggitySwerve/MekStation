/**
 * Encounter → GameSession bridge
 *
 * Pure helpers that translate an IEncounter (with resolved forces + pilots)
 * into the shapes expected by the gameplay layer (IGameConfig, IGameUnit[]).
 *
 * Kept sync and side-effect-free so EncounterService.launchEncounter can
 * compose it without adopting async. Force and pilot lookups are threaded in
 * as dependencies rather than imported, which keeps the helper trivially
 * testable without mocking service singletons.
 */

import type { IEncounter, IVictoryCondition } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';

import { VictoryConditionType } from '@/types/encounter';
import {
  GameSide,
  type IEncounterMeta,
  type IGameConfig,
  type IGameUnit,
} from '@/types/gameplay';

/** Default pilot skills when no pilot is assigned (standard regular pilot). */
const DEFAULT_GUNNERY = 4;
const DEFAULT_PILOTING = 5;

/**
 * Convert a single IVictoryCondition into the plain-string form that
 * IGameConfig.victoryConditions carries. The game engine later parses these
 * strings back into behaviour, so we encode enough context (turn count,
 * threshold) for downstream consumers.
 */
function victoryConditionToString(condition: IVictoryCondition): string {
  switch (condition.type) {
    case VictoryConditionType.DestroyAll:
      return 'destroy_all';
    case VictoryConditionType.Retreat:
      return 'retreat';
    case VictoryConditionType.TurnLimit:
      return `turn_limit:${condition.turnLimit ?? 0}`;
    case VictoryConditionType.Cripple:
      return `cripple:${condition.threshold ?? 50}`;
    case VictoryConditionType.Custom:
      return condition.description
        ? `custom:${condition.description}`
        : 'custom';
    default:
      return 'custom';
  }
}

/**
 * Derive turn limit from victory conditions. If no TurnLimit condition is
 * present, the engine's 0 means "no limit".
 */
function deriveTurnLimit(conditions: readonly IVictoryCondition[]): number {
  const turnCondition = conditions.find(
    (c) => c.type === VictoryConditionType.TurnLimit,
  );
  return turnCondition?.turnLimit ?? 0;
}

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5: optional campaign
 * linkage threaded through `EncounterService.launchEncounter` into the
 * resulting `IGameSession.config`. The engine itself never looks at
 * these — they're carried so `InteractiveSession.getOutcome()` can stamp
 * the `ICombatOutcome` with contract/scenario IDs the campaign store
 * uses to route the post-battle pipeline.
 */
export interface IEncounterLinkage {
  readonly campaignId?: string | null;
  readonly contractId?: string | null;
  readonly scenarioId?: string | null;
}

/**
 * Build an IGameConfig from an encounter's map/victory/optional-rules fields.
 * Pure and sync — no force lookups required.
 *
 * The optional `linkage` argument carries Wave 5 round-trip identifiers
 * (contractId, scenarioId). The encounter's own id is always written to
 * `config.encounterId` so consumers never need to chase it through the
 * encounter repository.
 */
export function buildGameConfigFromEncounter(
  encounter: IEncounter,
  linkage: IEncounterLinkage = {},
): IGameConfig {
  return {
    mapRadius: encounter.mapConfig.radius,
    turnLimit: deriveTurnLimit(encounter.victoryConditions),
    victoryConditions: encounter.victoryConditions.map(
      victoryConditionToString,
    ),
    optionalRules: [...encounter.optionalRules],
    encounterId: encounter.id,
    campaignId: linkage.campaignId ?? null,
    contractId: linkage.contractId ?? null,
    scenarioId: linkage.scenarioId ?? null,
  };
}

/** Resolvers injected by the service layer for force/pilot lookup. */
export interface IEncounterResolvers {
  readonly getForceById: (id: string) => IForce | null;
  readonly getPilotById: (id: string) => IPilot | null;
}

interface IBuildGameUnitsResult {
  readonly units: readonly IGameUnit[];
  readonly errors: readonly string[];
}

/**
 * Build IGameUnit[] from an encounter's resolved forces + pilot assignments.
 * Returns both the built units and any structural errors (missing force,
 * force with no assignments, etc.) so the caller can report them cleanly.
 *
 * If an opForConfig is present instead of an explicit opponent force, the
 * opponent side is returned empty and the caller is expected to generate
 * the OpFor separately — this stays compatible with the existing
 * generate-OpFor-later flow in the UI.
 */
export function buildGameUnitsFromEncounter(
  encounter: IEncounter,
  resolvers: IEncounterResolvers,
): IBuildGameUnitsResult {
  const errors: string[] = [];

  if (!encounter.playerForce) {
    errors.push('Encounter has no player force assigned');
    return { units: [], errors };
  }

  const playerForce = resolvers.getForceById(encounter.playerForce.forceId);
  if (!playerForce) {
    errors.push(
      `Player force ${encounter.playerForce.forceId} could not be resolved`,
    );
    return { units: [], errors };
  }

  const playerUnits = assignmentsToGameUnits(
    playerForce,
    GameSide.Player,
    resolvers.getPilotById,
  );
  if (playerUnits.length === 0) {
    errors.push('Player force has no assigned units');
  }

  let opponentUnits: readonly IGameUnit[] = [];
  if (encounter.opponentForce) {
    const opponentForce = resolvers.getForceById(
      encounter.opponentForce.forceId,
    );
    if (!opponentForce) {
      errors.push(
        `Opponent force ${encounter.opponentForce.forceId} could not be resolved`,
      );
    } else {
      opponentUnits = assignmentsToGameUnits(
        opponentForce,
        GameSide.Opponent,
        resolvers.getPilotById,
      );
      if (opponentUnits.length === 0) {
        errors.push('Opponent force has no assigned units');
      }
    }
  } else if (!encounter.opForConfig) {
    errors.push('Encounter has neither an opponent force nor an OpFor config');
  }

  return {
    units: [...playerUnits, ...opponentUnits],
    errors,
  };
}

function assignmentsToGameUnits(
  force: IForce,
  side: GameSide,
  getPilotById: (id: string) => IPilot | null,
): readonly IGameUnit[] {
  const units: IGameUnit[] = [];

  for (const assignment of force.assignments) {
    if (!assignment.unitId) continue;

    const pilot = assignment.pilotId ? getPilotById(assignment.pilotId) : null;
    units.push({
      id: `${force.id}:${assignment.id}`,
      name: pilot?.callsign ?? pilot?.name ?? assignment.id,
      side,
      unitRef: assignment.unitId,
      pilotRef: assignment.pilotId ?? '',
      gunnery: pilot?.skills.gunnery ?? DEFAULT_GUNNERY,
      piloting: pilot?.skills.piloting ?? DEFAULT_PILOTING,
    });
  }

  return units;
}

/**
 * Per `link-encounters-to-replays` PR 3: build the snapshot stamped onto
 * the `GameCreated` event payload at session creation. Pure / sync — no
 * resolver lookups (the encounter is already hydrated by
 * `EncounterService.hydrateEncounter` before this function runs, so
 * `playerForce` / `opponentForce` carry their `totalBV` + `unitCount`
 * already).
 *
 * Snapshot semantics:
 *   - When `playerForce` is non-null: `"<forceName> (<totalBV> BV, <unitCount> units)"`.
 *   - When `playerForce` is `null` (broken — Change A territory):
 *     `"<forceId> (missing force)"` — the raw stored id is recovered
 *     from the encounter row's `playerForceId` field via the resolver
 *     argument because the hydrated `playerForce` slot drops the id.
 *   - Opponent: same shape for explicit force; when `opForConfig` is
 *     set instead, `"Generated <type> (~<targetBV> BV)"` — the targetBV
 *     prefers the absolute value, falls back to the percent-of-player
 *     when only the percent is set, and finally to a literal `"?"`
 *     when neither is filled out.
 *
 * `templateType` is the encounter's stored template (`Duel` / `Skirmish`
 * / `Battle` / `Custom`) or `null` for free-form encounters that never
 * had a template applied.
 *
 * Why a string-shape contract instead of structured fields: per
 * design.md decision "playerForceSummary / opponentSummary as strings,
 * not structured objects" — the Library row renders text directly, the
 * source forces may have been deleted by the time the user opens the
 * replay, and keeping the snapshot self-contained means the row never
 * fails to render.
 *
 * The `rawForceIds` argument is optional and only used to recover the
 * stored force id when the hydrated slot is `null`. Callers that don't
 * have access to the raw ids (e.g. tests) can omit it; the broken-force
 * branch then falls back to the literal `"(missing force)"`.
 */
export function buildEncounterMeta(
  encounter: IEncounter,
  rawForceIds?: {
    readonly playerForceId?: string | null;
    readonly opponentForceId?: string | null;
  },
): IEncounterMeta {
  return {
    encounterId: encounter.id,
    encounterName: encounter.name,
    templateType: encounter.template ?? null,
    playerForceSummary: derivePlayerSummary(
      encounter,
      rawForceIds?.playerForceId ?? null,
    ),
    opponentSummary: deriveOpponentSummary(
      encounter,
      rawForceIds?.opponentForceId ?? null,
    ),
  };
}

function derivePlayerSummary(
  encounter: IEncounter,
  rawPlayerForceId: string | null,
): string {
  const force = encounter.playerForce;
  if (force) {
    return `${force.forceName} (${force.totalBV} BV, ${force.unitCount} units)`;
  }
  // Hydrated to null — the encounter has a stored playerForceId whose
  // resolver came back empty (force was deleted). Fall back to the
  // raw id so the manifest row at least pins which force used to be
  // there. Without a raw id (legacy callers), fall back to a literal.
  if (rawPlayerForceId) {
    return `${rawPlayerForceId} (missing force)`;
  }
  return '(missing force)';
}

function deriveOpponentSummary(
  encounter: IEncounter,
  rawOpponentForceId: string | null,
): string {
  const force = encounter.opponentForce;
  if (force) {
    return `${force.forceName} (${force.totalBV} BV, ${force.unitCount} units)`;
  }
  // OpForConfig path — opponent force is generated at launch time, not
  // assigned. Render the config snapshot so the Library row tells the
  // user "this was a Generated Lance vs your Alpha Lance" without
  // resolving anything.
  if (encounter.opForConfig) {
    const cfg = encounter.opForConfig;
    const bv =
      cfg.targetBV !== undefined && cfg.targetBV !== null
        ? `~${cfg.targetBV}`
        : cfg.targetBVPercent !== undefined && cfg.targetBVPercent !== null
          ? `~${cfg.targetBVPercent}%`
          : '?';
    // The opForConfig has no explicit "type" today; describe by faction
    // or unit-types when available, otherwise generic "OpFor".
    const label = cfg.faction ?? cfg.era ?? 'OpFor';
    return `Generated ${label} (${bv} BV)`;
  }
  // Hydrated to null with no opForConfig — same broken-force pattern as
  // playerForce. Fall back to the raw id so the row pins history.
  if (rawOpponentForceId) {
    return `${rawOpponentForceId} (missing force)`;
  }
  return '(no opponent)';
}
