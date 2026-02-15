import { v4 as uuidv4 } from 'uuid';

import type { IKillRecord, IMissionRecord, IPilot } from '@/types/pilot';

import { getSQLiteService } from '../persistence/SQLiteService';
import { PilotErrorCode, type IPilotOperationResult } from './PilotRepository';

export function recordKill(
  pilotId: string,
  kill: Omit<IKillRecord, 'date'>,
  exists: (id: string) => boolean,
): IPilotOperationResult {
  const db = getSQLiteService().getDatabase();
  const now = new Date().toISOString();

  if (!exists(pilotId)) {
    return {
      success: false,
      error: `Pilot ${pilotId} not found`,
      errorCode: PilotErrorCode.NotFound,
    };
  }

  try {
    db.prepare(`
      INSERT INTO pilot_kills (id, pilot_id, target_id, target_name, weapon_used, kill_date, game_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      pilotId,
      kill.targetId,
      kill.targetName,
      kill.weaponUsed,
      now,
      kill.gameId,
    );

    db.prepare(`
      UPDATE pilots SET total_kills = total_kills + 1, updated_at = ? WHERE id = ?
    `).run(now, pilotId);

    return { success: true, id: pilotId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to record kill: ${message}`,
      errorCode: PilotErrorCode.DatabaseError,
    };
  }
}

export function recordMission(
  pilotId: string,
  mission: Omit<IMissionRecord, 'date'>,
  exists: (id: string) => boolean,
): IPilotOperationResult {
  const db = getSQLiteService().getDatabase();
  const now = new Date().toISOString();

  if (!exists(pilotId)) {
    return {
      success: false,
      error: `Pilot ${pilotId} not found`,
      errorCode: PilotErrorCode.NotFound,
    };
  }

  try {
    db.prepare(`
      INSERT INTO pilot_missions (id, pilot_id, game_id, mission_name, mission_date, outcome, xp_earned, kills)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      pilotId,
      mission.gameId,
      mission.missionName,
      now,
      mission.outcome,
      mission.xpEarned,
      mission.kills,
    );

    const outcomeField =
      mission.outcome === 'victory'
        ? 'victories'
        : mission.outcome === 'defeat'
          ? 'defeats'
          : 'draws';

    db.prepare(`
      UPDATE pilots SET 
        missions_completed = missions_completed + 1,
        ${outcomeField} = ${outcomeField} + 1,
        xp = xp + ?,
        total_xp_earned = total_xp_earned + ?,
        updated_at = ?
      WHERE id = ?
    `).run(mission.xpEarned, mission.xpEarned, now, pilotId);

    return { success: true, id: pilotId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to record mission: ${message}`,
      errorCode: PilotErrorCode.DatabaseError,
    };
  }
}

export function addXp(
  pilotId: string,
  amount: number,
  exists: (id: string) => boolean,
): IPilotOperationResult {
  const db = getSQLiteService().getDatabase();
  const now = new Date().toISOString();

  if (!exists(pilotId)) {
    return {
      success: false,
      error: `Pilot ${pilotId} not found`,
      errorCode: PilotErrorCode.NotFound,
    };
  }

  try {
    db.prepare(`
      UPDATE pilots SET 
        xp = xp + ?,
        total_xp_earned = total_xp_earned + ?,
        updated_at = ?
      WHERE id = ?
    `).run(amount, amount, now, pilotId);

    return { success: true, id: pilotId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to add XP: ${message}`,
      errorCode: PilotErrorCode.DatabaseError,
    };
  }
}

export function spendXp(
  pilotId: string,
  amount: number,
  getById: (id: string) => IPilot | null,
): IPilotOperationResult {
  const db = getSQLiteService().getDatabase();
  const now = new Date().toISOString();

  const pilot = getById(pilotId);
  if (!pilot) {
    return {
      success: false,
      error: `Pilot ${pilotId} not found`,
      errorCode: PilotErrorCode.NotFound,
    };
  }

  if (!pilot.career || pilot.career.xp < amount) {
    return {
      success: false,
      error: `Insufficient XP. Have ${pilot.career?.xp || 0}, need ${amount}`,
      errorCode: PilotErrorCode.InsufficientXp,
    };
  }

  try {
    db.prepare(`
      UPDATE pilots SET xp = xp - ?, updated_at = ? WHERE id = ?
    `).run(amount, now, pilotId);

    return { success: true, id: pilotId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to spend XP: ${message}`,
      errorCode: PilotErrorCode.DatabaseError,
    };
  }
}
