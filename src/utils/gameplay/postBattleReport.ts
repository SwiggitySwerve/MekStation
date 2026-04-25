/**
 * Post-Battle Report Derivation
 *
 * Pure function that walks the session event log and derives the
 * after-action report (per-unit damage dealt/received, kills, heat
 * problems, MVP nomination). Schema is versioned so Phase 3 campaign
 * integration can extend it without losing stored Phase 1 records.
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md sec 4, sec 8
 */

import type {
  GameSide,
  IDamageAppliedPayload,
  IGameEndedPayload,
  IGameEvent,
  IGameSession,
  IPhysicalAttackResolvedPayload,
  IShutdownCheckPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import { GameEventType } from '@/types/gameplay';

/** Schema version literal -- bump on breaking changes to the report. */
export type PostBattleReportVersion = 1;

/**
 * Runtime constant carrying the current schema version. Persistence
 * layer + API routes compare against this value to reject stored
 * reports authored under a different version per spec scenarios
 * "Unversioned report rejected on read" and "Unknown-version report
 * rejected on read".
 */
export const POST_BATTLE_REPORT_VERSION: PostBattleReportVersion = 1;

/**
 * Per-unit summary captured in the after-action report.
 */
export interface IUnitReport {
  readonly unitId: string;
  readonly side: GameSide;
  readonly designation: string;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly kills: number;
  /**
   * Per add-victory-and-post-battle-summary design D3: count of
   * ShutdownCheck events for this unit during the match. Each
   * shutdown check fires when post-event heat required an
   * avoid-shutdown PSR (or a forced shutdown).
   */
  readonly heatProblems: number;
  /** Count of physical attacks declared by this unit. */
  readonly physicalAttacks: number;
  /** XP integration is Phase 3 -- placeholder flag for the UI. */
  readonly xpPending: true;
}

export interface IPostBattleReport {
  readonly version: PostBattleReportVersion;
  readonly matchId: string;
  readonly winner: GameSide | 'draw';
  readonly reason: 'destruction' | 'concede' | 'turn_limit' | 'objective';
  readonly turnCount: number;
  readonly units: readonly IUnitReport[];
  /** MVP unit id; null when no damage was dealt by the winner. */
  readonly mvpUnitId: string | null;
  /** Full event log so the screen can render a collapsible feed. */
  readonly log: readonly IGameEvent[];
}

/**
 * Per task 8 + design D6: MVP picker with deterministic tie-break.
 * Final tie-break is lexicographic unitId so duplicate-chassis sides
 * (two Atlas AS7-D) pick a stable winner regardless of input order.
 */
function pickMvp(
  units: readonly IUnitReport[],
  winner: GameSide | 'draw',
): string | null {
  if (winner === 'draw') return null;
  const candidates = units
    .filter((u) => u.side === winner && u.damageDealt > 0)
    .slice()
    .sort((a, b) => {
      if (b.damageDealt !== a.damageDealt) return b.damageDealt - a.damageDealt;
      if (a.damageReceived !== b.damageReceived) {
        return a.damageReceived - b.damageReceived;
      }
      const designationCompare = a.designation.localeCompare(b.designation);
      if (designationCompare !== 0) return designationCompare;
      return a.unitId.localeCompare(b.unitId);
    });
  return candidates[0]?.unitId ?? null;
}

/**
 * Derive the post-battle report from a session.
 */
export function derivePostBattleReport(
  session: IGameSession,
): IPostBattleReport {
  const reports = new Map<string, IUnitReport>();
  for (const unit of session.units) {
    reports.set(unit.id, {
      unitId: unit.id,
      side: unit.side,
      designation: unit.name,
      damageDealt: 0,
      damageReceived: 0,
      kills: 0,
      heatProblems: 0,
      physicalAttacks: 0,
      xpPending: true,
    });
  }

  const damageAttribution = new Map<string, string>();
  for (const event of session.events) {
    if (event.type === GameEventType.AttackResolved) {
      const p = event.payload as { attackerId: string; targetId: string };
      damageAttribution.set(p.targetId, p.attackerId);
      continue;
    }
    if (event.type === GameEventType.DamageApplied) {
      const p = event.payload as IDamageAppliedPayload;
      const target = reports.get(p.unitId);
      if (target) {
        reports.set(p.unitId, {
          ...target,
          damageReceived: target.damageReceived + p.damage,
        });
      }
      const attackerId = damageAttribution.get(p.unitId);
      if (attackerId) {
        const attacker = reports.get(attackerId);
        if (attacker) {
          reports.set(attackerId, {
            ...attacker,
            damageDealt: attacker.damageDealt + p.damage,
          });
        }
      }
      continue;
    }
    if (event.type === GameEventType.UnitDestroyed) {
      const p = event.payload as IUnitDestroyedPayload;
      const attackerId = damageAttribution.get(p.unitId);
      if (attackerId) {
        const attacker = reports.get(attackerId);
        if (attacker) {
          reports.set(attackerId, {
            ...attacker,
            kills: attacker.kills + 1,
          });
        }
      }
      continue;
    }
    if (event.type === GameEventType.ShutdownCheck) {
      const p = event.payload as IShutdownCheckPayload;
      const unit = reports.get(p.unitId);
      if (unit) {
        reports.set(p.unitId, {
          ...unit,
          heatProblems: unit.heatProblems + 1,
        });
      }
      continue;
    }
    if (event.type === GameEventType.PhysicalAttackResolved) {
      const p = event.payload as IPhysicalAttackResolvedPayload;
      const attacker = reports.get(p.attackerId);
      if (attacker) {
        reports.set(p.attackerId, {
          ...attacker,
          physicalAttacks: attacker.physicalAttacks + 1,
        });
      }
      continue;
    }
  }

  const ended = session.events.find((e) => e.type === GameEventType.GameEnded);
  const endedPayload = ended?.payload as IGameEndedPayload | undefined;
  const winner = endedPayload?.winner ?? 'draw';
  const reason = endedPayload?.reason ?? 'destruction';

  const unitReports = Array.from(reports.values());
  const mvpUnitId = pickMvp(unitReports, winner);

  return {
    version: 1,
    matchId: session.id,
    winner,
    reason,
    turnCount: session.currentState.turn,
    units: unitReports,
    mvpUnitId,
    log: session.events,
  };
}

/**
 * Per task 7: human-readable label for a victory reason.
 */
export function victoryReasonLabel(
  reason: IPostBattleReport['reason'],
  perspective: 'winner' | 'loser' = 'winner',
): string {
  switch (reason) {
    case 'destruction':
      return 'Last side standing';
    case 'concede':
      return perspective === 'loser' ? 'You conceded' : 'Opponent conceded';
    case 'turn_limit':
      return 'Turn limit reached';
    case 'objective':
      return 'Objective complete';
    default:
      return reason;
  }
}
