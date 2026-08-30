/**
 * Combat command decision seam (adopt-combat-event-journal-authority
 * task 2.2 / design D1).
 *
 * Builds a scratch InteractiveSession from the live session's current
 * event log, threads the same seeds the host was bootstrapped with,
 * dispatches through the existing `dispatchToEngine` table, and returns
 * the ordered new events plus a post-state digest. The live session is
 * not advanced, appended to, or given a capture.
 *
 * Callable and proven here; not wired into production dispatch. Task
 * 2.3 owns routing the host through append-at-revision.
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type {
  IGameEvent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent } from '@/types/multiplayer/Protocol';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameStatus } from '@/types/gameplay/GameSessionInterfaces';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import { RollCapture, SeededDiceRoller } from './RollCapture';
import { dispatchToEngine } from './ServerMatchHostEngineDispatch';
import { stampRollsOnNewEvents } from './ServerMatchHostEvents';

export interface IDecideCommandBatchDeps {
  readonly randomSeed: number;
  readonly diceSeed: number;
  readonly playerUnits?: readonly IAdaptedUnit[];
  readonly opponentUnits?: readonly IAdaptedUnit[];
  /**
   * When set, the scratch session consumes this roller instead of
   * re-seeding from `diceSeed`. The journal-authority host passes the
   * live capture so decide continues the match dice cursor (L1).
   */
  readonly d6Roller?: D6Roller;
}

export interface ICommandDecision {
  readonly events: readonly IGameEvent[];
  readonly postStateDigest: string;
  /** Present only when this command's decided post-state is terminal. */
  readonly terminalOutcome?: ICombatOutcome;
}

/**
 * Digest of the derived post-state. Field set matches the 2.1 command
 * digest lock: status/turn/phase/activation/initiative/units, with
 * `gameId` and `updatedAt` excluded.
 */
export function digestCommandPostState(session: IGameSession): string {
  const state = session.currentState;
  const normalized = JSON.parse(
    JSON.stringify({
      status: state.status,
      turn: state.turn,
      phase: state.phase,
      activationIndex: state.activationIndex,
      initiativeWinner: state.initiativeWinner ?? null,
      firstMover: state.firstMover ?? null,
      units: state.units,
    }),
  ) as unknown;
  return digestReplayCheckpointState(normalized);
}

export function decideCommandBatch(
  liveSession: InteractiveSession,
  intent: IIntent['intent'],
  deps: IDecideCommandBatchDeps,
): ICommandDecision {
  const live = liveSession.getSession();
  const head = live.events.length;
  const clonedEvents = JSON.parse(JSON.stringify(live.events)) as IGameEvent[];
  const hydrated = hydrateGameSessionFromEvents(live.id, clonedEvents);

  const capture = new RollCapture(
    deps.d6Roller != null
      ? {
          d6: () => deps.d6Roller!(),
          asD6Roller: () => deps.d6Roller!,
        }
      : new SeededDiceRoller(new SeededRandom(deps.diceSeed)),
  );
  const engineCallback: D6Roller = () => capture.d6();
  const scratch = InteractiveSession.fromHydratedSession(hydrated, {
    random: new SeededRandom(deps.randomSeed),
    d6Roller: engineCallback,
    playerUnits: deps.playerUnits,
    opponentUnits: deps.opponentUnits,
    // A decide scratch is never the live session: a game-ending command
    // must not announce an outcome the live path has not committed.
    suppressOutcomePublication: true,
  });

  dispatchToEngine(scratch, intent);
  const produced = scratch.getSession().events.slice(head);
  const postState = scratch.getSession();
  return {
    events: stampRollsOnNewEvents(capture, produced),
    postStateDigest: digestCommandPostState(postState),
    ...(postState.currentState.status === GameStatus.Completed
      ? {
          terminalOutcome: deriveCombatOutcome(postState, {
            contractId: postState.config.contractId ?? undefined,
            scenarioId: postState.config.scenarioId ?? undefined,
          }),
        }
      : {}),
  };
}
