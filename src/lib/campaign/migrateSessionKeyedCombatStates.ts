/**
 * Legacy migration for session-keyed combat states (T1).
 *
 * Before the launch manifest, `postBattleProcessor` wrote
 * `unitCombatStates[<session unit id>]` (`player-1-atlas-as7-d`), a key no
 * reader looks up; opponents got entries too. Pure and idempotent: once no
 * session-keyed entry is left it returns null.
 *
 * Legacy damage is never attributed to a roster unit (owner ruling
 * PARITY-PLAN §186.4). Nothing is rebuilt or mapped: every player entry is
 * removed from the payload, its original goes to a quarantine record the
 * caller stores outside the campaign payload, and it is flagged. Opponent
 * entries are pruned.
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ILegacyCombatStateFlag,
  ILegacyCombatStateRecord,
} from '@/types/campaign/LegacyCombatStateMigration';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';

import {
  LEGACY_NOT_ATTRIBUTED_NOTE,
  legacyCombatStateFlagKey,
} from '@/types/campaign/LegacyCombatStateMigration';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

const SESSION_UNIT_ID = /^(player|opponent)-\d+-.+$/;

export function isSessionKeyedUnitId(key: string): boolean {
  return SESSION_UNIT_ID.test(key);
}

export interface ISessionKeyedCombatStateMigration {
  /** Campaign with no session-keyed entries, and the new flags. */
  readonly campaign: ICampaign;
  /** Every player original; must be stored before `campaign` is adopted. */
  readonly quarantine: readonly ILegacyCombatStateRecord[];
  readonly flags: readonly ILegacyCombatStateFlag[];
  readonly prunedOpponentKeys: readonly string[];
}

export function migrateSessionKeyedCombatStates({
  campaign,
  migratedAt,
  deviceId,
}: {
  readonly campaign: ICampaign;
  readonly migratedAt: string;
  /**
   * The device the quarantine is written on. The caller adopts the result
   * only after that write succeeds, so the flags may name it as confirmed.
   */
  readonly deviceId?: string;
}): ISessionKeyedCombatStateMigration | null {
  const states = campaign.unitCombatStates ?? {};
  const sessionKeys = Object.keys(states).filter(isSessionKeyedUnitId);
  if (sessionKeys.length === 0) return null;

  const outcomes = campaign.recentlyAppliedOutcomes ?? [];
  const playerKeys = sessionKeys.filter((key) => key.startsWith('player-'));
  const prunedOpponentKeys = sessionKeys.filter((key) =>
    key.startsWith('opponent-'),
  );

  const nextStates: Record<string, IUnitCombatState> = { ...states };
  for (const key of sessionKeys) delete nextStates[key];

  const flags = playerKeys.map(
    (key): ILegacyCombatStateFlag => ({
      kind: 'combat-state',
      ...(deviceId === undefined ? {} : { quarantinedOnDeviceId: deviceId }),
      sessionUnitId: key,
      reason: 'legacy-not-attributed',
      candidateRosterUnitIds: [],
      // The retained battles that carry this session unit (display only).
      matchIds: [
        ...new Set(
          outcomes
            .filter((outcome) =>
              outcome.unitDeltas.some(
                (delta) =>
                  delta.unitId === key && delta.side === GameSide.Player,
              ),
            )
            .map((outcome) => outcome.matchId),
        ),
      ],
    }),
  );
  const flagKeys = new Set(flags.map(legacyCombatStateFlagKey));
  const legacyCombatStateFlags = [
    ...(campaign.legacyCombatStateFlags ?? []).filter(
      (flag) => !flagKeys.has(legacyCombatStateFlagKey(flag)),
    ),
    ...flags,
  ];

  const quarantine: ILegacyCombatStateRecord[] = playerKeys.map(
    (key, index) => ({
      source: 'combat-state',
      campaignId: campaign.id,
      sessionUnitId: key,
      original: states[key],
      resolution: {
        kind: 'not-attributed',
        note: LEGACY_NOT_ATTRIBUTED_NOTE,
        flag: flags[index],
      },
      migratedAt,
    }),
  );

  return {
    campaign: {
      ...campaign,
      unitCombatStates: nextStates,
      ...(legacyCombatStateFlags.length > 0 ? { legacyCombatStateFlags } : {}),
    },
    quarantine,
    flags,
    prunedOpponentKeys,
  };
}
