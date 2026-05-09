import {
  IEncounter,
  IMapConfiguration,
  IVictoryCondition,
  IOpForConfig,
  IForceReference,
  EncounterStatus,
  ScenarioTemplateType,
} from '@/types/encounter';

interface EncounterRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  template: string | null;
  player_force_json: string | null;
  opponent_force_json: string | null;
  opfor_config_json: string | null;
  map_config_json: string;
  victory_conditions_json: string;
  optional_rules_json: string;
  game_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToEncounter(row: EncounterRow): IEncounter {
  const playerForce = row.player_force_json
    ? (JSON.parse(row.player_force_json) as IForceReference)
    : undefined;
  const opponentForce = row.opponent_force_json
    ? (JSON.parse(row.opponent_force_json) as IForceReference)
    : undefined;
  const opForConfig = row.opfor_config_json
    ? (JSON.parse(row.opfor_config_json) as IOpForConfig)
    : undefined;
  const mapConfig = JSON.parse(row.map_config_json) as IMapConfiguration;
  const victoryConditions = JSON.parse(
    row.victory_conditions_json,
  ) as IVictoryCondition[];
  const optionalRules = JSON.parse(row.optional_rules_json) as string[];

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status as EncounterStatus,
    template: row.template as ScenarioTemplateType | undefined,
    playerForce,
    opponentForce,
    opForConfig,
    mapConfig,
    victoryConditions,
    optionalRules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gameSessionId: row.game_session_id ?? undefined,
  };
}

/**
 * Encounter paired with raw stored force ids.
 *
 * Defined inline (rather than imported from EncounterRepository.ts) to avoid
 * a helpers→repository circular import while still keeping the row-shaped
 * extractor co-located with `rowToEncounter`.
 */
export interface IEncounterWithRawForceIdsHelper {
  readonly encounter: IEncounter;
  readonly rawForceIds: {
    readonly playerForceId: string | null;
    readonly opponentForceId: string | null;
  };
}

/**
 * Pull the raw `forceId` strings out of the JSON columns BEFORE hydration.
 * Returns null when the column is null OR the JSON does not contain a
 * `forceId` key (defensive — a malformed row should not crash the read).
 */
export function extractRawForceIds(
  row: EncounterRow,
): IEncounterWithRawForceIdsHelper {
  const encounter = rowToEncounter(row);
  const playerForceId = readForceIdFromJson(row.player_force_json);
  const opponentForceId = readForceIdFromJson(row.opponent_force_json);
  return {
    encounter,
    rawForceIds: { playerForceId, opponentForceId },
  };
}

function readForceIdFromJson(json: string | null): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { forceId?: unknown };
    return typeof parsed.forceId === 'string' ? parsed.forceId : null;
  } catch {
    return null;
  }
}
