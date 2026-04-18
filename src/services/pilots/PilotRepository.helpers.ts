import {
  IPilot,
  IPilotCareer,
  IPilotAbilityRef,
  PilotType,
  PilotStatus,
} from '@/types/pilot';

import { getSQLiteService } from '../persistence/SQLiteService';

export interface PilotRow {
  id: string;
  name: string;
  callsign: string | null;
  affiliation: string | null;
  portrait: string | null;
  background: string | null;
  type: string;
  status: string;
  gunnery: number;
  piloting: number;
  wounds: number;
  missions_completed: number;
  victories: number;
  defeats: number;
  draws: number;
  total_kills: number;
  xp: number;
  total_xp_earned: number;
  rank: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotAbilityRow {
  id: string;
  pilot_id: string;
  ability_id: string;
  acquired_date: string;
  acquired_game_id: string | null;
  // Phase 5 Wave 2a — nullable on legacy rows.
  designation_kind: string | null;
  designation_value: string | null;
  xp_spent: number | null;
}

export interface PilotKillRow {
  id: string;
  pilot_id: string;
  target_id: string;
  target_name: string;
  weapon_used: string;
  kill_date: string;
  game_id: string;
}

export interface PilotMissionRow {
  id: string;
  pilot_id: string;
  game_id: string;
  mission_name: string;
  mission_date: string;
  outcome: string;
  xp_earned: number;
  kills: number;
}

export function rowToPilot(row: PilotRow): IPilot {
  const db = getSQLiteService().getDatabase();

  const abilityRows = db
    .prepare('SELECT * FROM pilot_abilities WHERE pilot_id = ?')
    .all(row.id) as PilotAbilityRow[];

  const abilities: IPilotAbilityRef[] = abilityRows.map((a) => ({
    abilityId: a.ability_id,
    acquiredDate: a.acquired_date,
    acquiredGameId: a.acquired_game_id || undefined,
    designation:
      a.designation_kind && a.designation_value
        ? { kind: a.designation_kind, value: a.designation_value }
        : undefined,
    xpSpent: a.xp_spent ?? undefined,
  }));

  let career: IPilotCareer | undefined;
  if (row.type === PilotType.Persistent) {
    const killRows = db
      .prepare(
        'SELECT * FROM pilot_kills WHERE pilot_id = ? ORDER BY kill_date DESC',
      )
      .all(row.id) as PilotKillRow[];

    const missionRows = db
      .prepare(
        'SELECT * FROM pilot_missions WHERE pilot_id = ? ORDER BY mission_date DESC',
      )
      .all(row.id) as PilotMissionRow[];

    career = {
      missionsCompleted: row.missions_completed,
      victories: row.victories,
      defeats: row.defeats,
      draws: row.draws,
      totalKills: row.total_kills,
      killRecords: killRows.map((k) => ({
        targetId: k.target_id,
        targetName: k.target_name,
        weaponUsed: k.weapon_used,
        date: k.kill_date,
        gameId: k.game_id,
      })),
      missionHistory: missionRows.map((m) => ({
        gameId: m.game_id,
        missionName: m.mission_name,
        date: m.mission_date,
        outcome: m.outcome as 'victory' | 'defeat' | 'draw',
        xpEarned: m.xp_earned,
        kills: m.kills,
      })),
      xp: row.xp,
      totalXpEarned: row.total_xp_earned,
      rank: row.rank || 'MechWarrior',
    };
  }

  return {
    id: row.id,
    name: row.name,
    callsign: row.callsign || undefined,
    affiliation: row.affiliation || undefined,
    portrait: row.portrait || undefined,
    background: row.background || undefined,
    type: row.type as PilotType,
    status: row.status as PilotStatus,
    skills: {
      gunnery: row.gunnery,
      piloting: row.piloting,
    },
    wounds: row.wounds,
    career,
    abilities,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
