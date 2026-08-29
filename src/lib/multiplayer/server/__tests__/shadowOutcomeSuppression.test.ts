/**
 * Shadow-scratch outcome-bus suppression (4.5 reviewer blocker).
 *
 * A scratch session built for decide/shadow comparison must never
 * publish CombatOutcomeReady: on the ending tick it would duplicate the
 * live publish, and on a DIVERGENT scratch that reaches game-over when
 * the live match did not, it would announce an outcome for an
 * unfinished match. Suppression skips only the bus publish - the
 * endGame state work still runs, so decided events and digests stay in
 * parity with the live path.
 */

import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent } from '@/types/multiplayer/Protocol';

import {
  _resetCombatOutcomeBus,
  subscribeToCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, GameStatus } from '@/types/gameplay';

import { buildHostSession } from '../ServerMatchHostBootstrap';
import { decideCommandBatch } from '../ServerMatchHostDecision';

const CONCEDE: IIntent['intent'] = { kind: 'Concede', side: GameSide.Player };

function roster(): IGameUnit[] {
  return [
    {
      id: 'sup-player',
      name: 'sup-player',
      side: GameSide.Player,
      unitRef: 'sup-player',
      pilotRef: 'sup-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'sup-opponent',
      name: 'sup-opponent',
      side: GameSide.Opponent,
      unitRef: 'sup-opponent',
      pilotRef: 'sup-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function bootSession(): InteractiveSession {
  const { session } = buildHostSession({
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(7),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: roster(),
    diceSeed: 7,
  });
  return session;
}

describe('shadow-scratch outcome suppression', () => {
  let published: ICombatOutcomeReadyEvent[];
  let unsubscribe: () => void;

  beforeEach(() => {
    _resetCombatOutcomeBus();
    published = [];
    unsubscribe = subscribeToCombatOutcome((event) => {
      published.push(event);
    });
  });

  afterEach(() => {
    unsubscribe();
    _resetCombatOutcomeBus();
  });

  it('a suppressed hydrated session completes without publishing', () => {
    const live = bootSession();
    const scratch = InteractiveSession.fromHydratedSession(
      JSON.parse(JSON.stringify(live.getSession())),
      {
        random: new SeededRandom(7),
        suppressOutcomePublication: true,
      },
    );

    scratch.concede(GameSide.Player);

    // Falsification: drop the option pass-through and this publishes.
    expect(scratch.getSession().currentState.status).toBe(GameStatus.Completed);
    expect(published).toHaveLength(0);
  });

  it('control: the same conceding session without the flag publishes once', () => {
    const live = bootSession();
    live.concede(GameSide.Player);

    expect(live.getSession().currentState.status).toBe(GameStatus.Completed);
    expect(published).toHaveLength(1);
  });

  it('a suppressed decide of a game-ending command stays off the bus', () => {
    const live = bootSession();
    // No dep needed: a decide scratch suppresses unconditionally.
    const decided = decideCommandBatch(live, CONCEDE, {
      randomSeed: 7,
      diceSeed: 7,
    });

    // Falsification: stop forwarding the dep and the scratch publishes.
    expect(decided.events.length).toBeGreaterThan(0);
    expect(published).toHaveLength(0);
    // The live session was never touched, so no publish is pending.
    expect(live.getSession().currentState.status).toBe(GameStatus.Active);
  });
});
