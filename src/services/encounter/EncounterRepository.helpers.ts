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
