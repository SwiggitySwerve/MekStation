/**
 * Mission status guard
 *
 * The one place a mission's `status` is allowed to change. Post-battle,
 * contract expiry, contract acceptance and the store merge all route
 * through `transitionMissionStatus`, which consults `MISSION_TRANSITIONS`.
 * A refusal is a value, not an exception: the caller keeps the mission it
 * had and carries on (a stale result for a settled contract is dropped,
 * not fatal).
 *
 * @module lib/campaign/missionStatusMachine
 */

import type { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import type { IMission } from '@/types/campaign/Mission';

import {
  canTransitionMissionStatus,
  isTerminalMissionStatus,
} from '@/types/campaign/enums/MissionStatus';
import { logger } from '@/utils/logger';

/** Who asked for the change; only used to explain a refusal in the log. */
export type MissionTransitionCause =
  | 'post-battle'
  | 'expiry'
  | 'accept'
  | 'repair-merge';

export type MissionTransitionResult<T extends IMission> =
  | {
      readonly ok: true;
      /** A copy carrying the new status and a fresh `updatedAt`. */
      readonly mission: T;
      /** False when the mission was already in the requested status. */
      readonly changed: boolean;
    }
  | {
      readonly ok: false;
      /** The input, untouched. */
      readonly mission: T;
      readonly reason: 'terminal' | 'not-allowed';
    };

/**
 * Why a move from `from` to `to` is refused, or `null` if it is allowed.
 *
 * - A terminal status refuses every request, including its own.
 * - A live status may re-request itself (a withdrawal leaves a contract
 *   ACTIVE).
 * - Any other move must be an edge in `MISSION_TRANSITIONS`.
 */
export function missionTransitionRefusal(
  from: MissionStatus,
  to: MissionStatus,
): 'terminal' | 'not-allowed' | null {
  if (isTerminalMissionStatus(from)) return 'terminal';
  if (from !== to && !canTransitionMissionStatus(from, to)) {
    return 'not-allowed';
  }
  return null;
}

/**
 * Two copies of one mission disagree (the child missions store and
 * `campaign.missions`, or a saved campaign and the separately persisted
 * missions store). Keep `kept`, the copy that normally wins, unless `other`
 * is a legal move forward from it: ACTIVE -> SUCCESS takes the settled copy,
 * while SUCCESS -> ACTIVE is refused, so a stale unsettled copy can never
 * reopen a settled contract and let a later battle pay it again.
 */
export function reconcileMissionCopy<T extends IMission>(
  kept: T,
  other: T | undefined,
): T {
  if (other === undefined || other.status === kept.status) return kept;
  return missionTransitionRefusal(kept.status, other.status) === null
    ? other
    : kept;
}

/**
 * Move `mission` to `to` if the table allows it, stamping `updatedAt`.
 * The input is never mutated; on refusal it comes back unchanged.
 */
export function transitionMissionStatus<T extends IMission>(
  mission: T,
  to: MissionStatus,
  cause: MissionTransitionCause,
): MissionTransitionResult<T> {
  const from = mission.status;
  const reason = missionTransitionRefusal(from, to);

  if (reason !== null) {
    logger.debug(
      `[missionStatus] ${cause}: "${mission.id}" ${from} -> ${to} refused (${reason}).`,
    );
    return { ok: false, mission, reason };
  }

  return {
    ok: true,
    mission: { ...mission, status: to, updatedAt: new Date().toISOString() },
    changed: from !== to,
  };
}
