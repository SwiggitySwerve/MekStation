import { createHash } from 'node:crypto';

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  hasHistoryBranchStore,
  isHistoryBranchStoreReady,
} from '@/lib/events/storeCapabilityPorts';
import {
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import { isPhaseActivationEligible } from '@/utils/gameplay/gameSessionCore';
import { logger } from '@/utils/logger';

import type { IServerMatchHostIntentContext } from './ServerMatchHostIntent';

import { hasMatchStreamRebuildReader } from './IMatchStore';
import { isLivePathBranchId } from './matchAuthorityBaseline';
import { decideCommandBatch } from './ServerMatchHostDecision';
import { commitJournalAuthorityCommand } from './ServerMatchHostJournalAuthority';
import { errorMessage } from './ServerMatchHostPublication';

/** The activation order used by the engine's physical-action guard. */
function opposingActivation(session: IGameSession): string | null {
  const state = session.currentState;
  if (
    state.status !== GameStatus.Active ||
    ![
      GamePhase.Movement,
      GamePhase.WeaponAttack,
      GamePhase.PhysicalAttack,
    ].includes(state.phase)
  )
    return null;
  const first = state.firstMover ?? GameSide.Player;
  const eligible = session.units.filter((unit) =>
    isPhaseActivationEligible(state.units[unit.id]),
  );
  const a = eligible.filter((unit) => unit.side === first);
  const b = eligible.filter((unit) => unit.side !== first);
  const order = a.flatMap((unit, index) =>
    b[index] ? [unit, b[index]] : [unit],
  );
  order.push(...b.slice(a.length));
  const active = order[state.activationIndex];
  if (!active || active.side !== GameSide.Opponent) return null;
  const lock = state.units[active.id].lockState;
  return lock === LockState.Pending || lock === LockState.Planning
    ? active.id
    : null;
}

function acceptedHead(ctx: IServerMatchHostIntentContext) {
  const head =
    hasHistoryBranchStore(ctx.store) && isHistoryBranchStoreReady(ctx.store)
      ? ctx.store.readEffectiveHead({
          streamType: 'match',
          streamId: ctx.matchId,
        })
      : null;
  const branchId = head?.branchId ?? 'main';
  if (!isLivePathBranchId(branchId) && branchId !== ctx.servedBranchId) {
    throw new Error('opponent-command-stale');
  }
  if (
    hasMatchStreamRebuildReader(ctx.store) &&
    ctx.store.readMatchStreamRebuild(ctx.matchId)
  ) {
    throw new Error('opponent-command-stale');
  }
  return [
    branchId,
    ctx.session.getSession().events.length,
    head?.effectiveGeneration ?? 1,
  ] as const;
}

/** Called only while ServerMatchHost holds its existing intent chain. */
export async function driveCoopOpponent(input: {
  readonly context: () => IServerMatchHostIntentContext;
  readonly current: () => boolean;
  readonly connected: (playerId: string) => boolean;
  readonly bindCampaign: (sessionId: string) => Promise<void>;
  readonly halt: () => void;
}): Promise<readonly IServerMessage[]> {
  const initial = input.context();
  if (initial.closed || initial.isPaused || initial.rollbackBlockReason)
    return [];
  const messages: IServerMessage[] = [];
  try {
    const meta = await initial.store.getMatchMeta(initial.matchId);
    if (!meta.coopMission || meta.coopCampaign || meta.status !== 'active')
      return [];
    await input.bindCampaign(meta.coopMission.sessionId);
    const participants =
      meta.coopMission.deployingPlayerIds ??
      meta.sideAssignments.map((side) => side.playerId);
    const ready = () => input.current() && participants.every(input.connected);
    // No timers and no phase-loop: at most this phase's remaining units.
    for (
      let left = initial.session.getSession().units.length;
      left > 0 && ready();
      left -= 1
    ) {
      const ctx = input.context();
      if (ctx.closed || ctx.isPaused || ctx.rollbackBlockReason) break;
      const unitId = opposingActivation(ctx.session.getSession());
      if (unitId === null) break;
      const head = acceptedHead(ctx);
      const identity = JSON.stringify([ctx.matchId, ...head, unitId]);
      const digest = createHash('sha256').update(identity).digest('hex');
      const intentId = `coop-ai:${digest}`;
      const result = await commitJournalAuthorityCommand(
        ctx,
        {
          playerId: 'server:coop-opponent',
          intentId,
        },
        (deps) => {
          // Recheck after the receipt await, immediately before synchronous
          // DECIDE and the store's synchronous append transaction.
          if (
            !ready() ||
            input.context().session !== ctx.session ||
            JSON.stringify(acceptedHead(ctx)) !== JSON.stringify(head)
          ) {
            throw new Error('opponent-command-stale');
          }
          return decideCommandBatch(
            ctx.session,
            (scratch) => {
              scratch.runAITurn(GameSide.Opponent, unitId);
            },
            {
              ...deps,
              randomSeed: parseInt(digest.slice(0, 8), 16),
              diceSeed: parseInt(digest.slice(8, 16), 16),
              d6Roller: undefined,
            },
          );
        },
      );
      messages.push(...result.messages);
      if (result.recovery) input.halt();
      if (
        result.recovery ||
        result.messages.some((message) => message.kind === 'Error') ||
        input.context().session === ctx.session
      )
        break;
    }
  } catch (cause) {
    // Infrastructure details and hidden AI inputs never become wire reasons.
    const stale =
      cause instanceof Error && cause.message === 'opponent-command-stale';
    if (!stale) {
      logger.error('[CoopOpponentDriver] command failed', cause);
      input.halt();
    }
    const error = errorMessage(
      initial.matchId,
      stale ? 'STALE_BRANCH' : 'STORE_FAILURE',
      stale ? 'opponent-command-stale' : 'opponent-command-unavailable',
    );
    initial.broadcast(error);
    messages.push(error);
  }
  return messages;
}
