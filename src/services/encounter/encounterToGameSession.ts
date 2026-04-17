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
import { GameSide, type IGameConfig, type IGameUnit } from '@/types/gameplay';

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
 * Build an IGameConfig from an encounter's map/victory/optional-rules fields.
 * Pure and sync — no force lookups required.
 */
export function buildGameConfigFromEncounter(
  encounter: IEncounter,
): IGameConfig {
  return {
    mapRadius: encounter.mapConfig.radius,
    turnLimit: deriveTurnLimit(encounter.victoryConditions),
    victoryConditions: encounter.victoryConditions.map(
      victoryConditionToString,
    ),
    optionalRules: [...encounter.optionalRules],
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
