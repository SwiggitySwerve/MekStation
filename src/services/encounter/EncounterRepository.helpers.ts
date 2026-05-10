import {
  IEncounter,
  ICreateEncounterInput,
  IMapConfiguration,
  IVictoryCondition,
  IOpForConfig,
  IForceReference,
  IUpdateEncounterInput,
  EncounterStatus,
  ScenarioTemplateType,
  TerrainPreset,
  SCENARIO_TEMPLATES,
} from '@/types/encounter';

import { getSQLiteService } from '../persistence/SQLiteService';

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

export function buildEncounterUpdateParts(
  existing: IEncounter,
  input: IUpdateEncounterInput,
  now: string,
): { updates: string[]; params: (string | null)[] } {
  const updates: string[] = ['updated_at = ?'];
  const params: (string | null)[] = [now];

  if (input.name !== undefined) {
    updates.push('name = ?');
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description ?? null);
  }
  if (input.playerForceId !== undefined) {
    updates.push('player_force_json = ?');
    params.push(serializeForceReference(input.playerForceId));
  }
  if (input.opponentForceId !== undefined) {
    updates.push('opponent_force_json = ?');
    params.push(serializeForceReference(input.opponentForceId));
  }
  if (input.opForConfig !== undefined) {
    updates.push('opfor_config_json = ?');
    params.push(input.opForConfig ? JSON.stringify(input.opForConfig) : null);
  }
  if (input.mapConfig !== undefined) {
    updates.push('map_config_json = ?');
    params.push(JSON.stringify({ ...existing.mapConfig, ...input.mapConfig }));
  }
  if (input.victoryConditions !== undefined) {
    updates.push('victory_conditions_json = ?');
    params.push(JSON.stringify(input.victoryConditions));
  }
  if (input.optionalRules !== undefined) {
    updates.push('optional_rules_json = ?');
    params.push(JSON.stringify(input.optionalRules));
  }

  return { updates, params };
}

function serializeForceReference(forceId: string | null): string | null {
  if (!forceId) return null;
  return JSON.stringify({
    forceId,
    forceName: '',
    totalBV: 0,
    unitCount: 0,
  } satisfies IForceReference);
}

export function clearEncounterForceReferenceRows(
  forceId: string,
  recalculateStatus: (id: string) => void,
): { affectedEncounterIds: readonly string[] } {
  const db = getSQLiteService().getDatabase();
  const now = new Date().toISOString();

  const playerSlotMatches = db
    .prepare(
      `SELECT id FROM encounters
       WHERE json_extract(player_force_json, '$.forceId') = ?`,
    )
    .all(forceId) as { id: string }[];
  const opponentSlotMatches = db
    .prepare(
      `SELECT id FROM encounters
       WHERE json_extract(opponent_force_json, '$.forceId') = ?`,
    )
    .all(forceId) as { id: string }[];

  const affectedSet = new Set<string>();
  for (const row of playerSlotMatches) affectedSet.add(row.id);
  for (const row of opponentSlotMatches) affectedSet.add(row.id);

  if (affectedSet.size === 0) {
    return { affectedEncounterIds: [] };
  }

  const affectedIds: readonly string[] = Array.from(affectedSet);
  const txn = db.transaction((fid: string) => {
    db.prepare(
      `UPDATE encounters
       SET player_force_json = NULL, updated_at = ?
       WHERE json_extract(player_force_json, '$.forceId') = ?`,
    ).run(now, fid);
    db.prepare(
      `UPDATE encounters
       SET opponent_force_json = NULL, updated_at = ?
       WHERE json_extract(opponent_force_json, '$.forceId') = ?`,
    ).run(now, fid);

    for (const id of affectedIds) {
      recalculateStatus(id);
    }
  });

  txn(forceId);

  return { affectedEncounterIds: affectedIds };
}

const DEFAULT_MAP_CONFIG: IMapConfiguration = {
  radius: 6,
  terrain: TerrainPreset.Clear,
  playerDeploymentZone: 'south',
  opponentDeploymentZone: 'north',
};

export function insertEncounterRow(
  input: ICreateEncounterInput,
  id: string,
  now: string,
): void {
  const db = getSQLiteService().getDatabase();
  let mapConfig = DEFAULT_MAP_CONFIG;
  let victoryConditions: readonly IVictoryCondition[] = [];

  if (input.template) {
    const template = SCENARIO_TEMPLATES.find((t) => t.type === input.template);
    if (template) {
      mapConfig = template.defaultMapConfig;
      victoryConditions = template.defaultVictoryConditions;
    }
  }

  db.prepare(
    `INSERT INTO encounters (
      id, name, description, status, template,
      player_force_json, opponent_force_json, opfor_config_json,
      map_config_json, victory_conditions_json, optional_rules_json,
      game_session_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.description ?? null,
    EncounterStatus.Draft,
    input.template ?? null,
    null,
    null,
    null,
    JSON.stringify(mapConfig),
    JSON.stringify(victoryConditions),
    JSON.stringify([]),
    null,
    now,
    now,
  );
}

export function recalculateEncounterStatus(
  id: string,
  getEncounterById: (id: string) => IEncounter | null,
): void {
  const encounter = getEncounterById(id);
  if (!encounter) return;
  if (encounter.status === EncounterStatus.Completed) return;

  if (encounter.status === EncounterStatus.Launched) {
    if (!encounter.playerForce && !encounter.opponentForce) {
      updateEncounterStatus(id, EncounterStatus.Draft);
    }
    return;
  }

  const hasPlayerForce = !!encounter.playerForce;
  const hasOpponent = !!encounter.opponentForce || !!encounter.opForConfig;
  const hasVictoryConditions =
    encounter.victoryConditions && encounter.victoryConditions.length > 0;
  const newStatus =
    hasPlayerForce && hasOpponent && hasVictoryConditions
      ? EncounterStatus.Ready
      : EncounterStatus.Draft;

  if (newStatus !== encounter.status) {
    updateEncounterStatus(id, newStatus);
  }
}

function updateEncounterStatus(id: string, status: EncounterStatus): void {
  const db = getSQLiteService().getDatabase();
  db.prepare(
    'UPDATE encounters SET status = ?, updated_at = ? WHERE id = ?',
  ).run(status, new Date().toISOString(), id);
}
