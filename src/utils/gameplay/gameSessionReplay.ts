import { IGameSession, IGameState } from '@/types/gameplay';

import { deriveState } from './gameState';

export function replayToSequence(
  session: IGameSession,
  sequence: number,
): IGameState {
  const eventsUpTo = session.events.filter(
    (event) => event.sequence <= sequence,
  );
  return deriveState(session.id, eventsUpTo);
}

export function replayToTurn(session: IGameSession, turn: number): IGameState {
  const eventsUpTo = session.events.filter((event) => event.turn <= turn);
  return deriveState(session.id, eventsUpTo);
}

const gameLogMessages: Record<string, string | ((actorId?: string) => string)> =
  {
    game_created: 'Game created',
    game_started: 'Game started',
    game_ended: 'Game ended',
    phase_changed: (_actorId) => 'Phase changed',
    initiative_rolled: 'Initiative rolled',
    initiative_order_set: 'Initiative order set',
    movement_declared: (actorId) => `Unit ${actorId} moved`,
    movement_locked: (actorId) => `Unit ${actorId} locked movement`,
    attack_declared: (actorId) => `Unit ${actorId} declared attack`,
    attacks_revealed: 'Attacks revealed',
    attack_resolved: 'Attack resolved',
    damage_applied: 'Damage applied',
    unit_destroyed: (actorId) => `Unit ${actorId} destroyed`,
  };

function formatGameLogMessage(event: IGameSession['events'][number]): string {
  if (event.type === 'phase_changed') {
    return `Phase changed to ${event.phase}`;
  }

  const message = gameLogMessages[event.type];
  if (typeof message === 'function') {
    return message(event.actorId);
  }
  return message ?? event.type;
}

export function generateGameLog(session: IGameSession): string {
  const lines: string[] = [];

  for (const event of session.events) {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const prefix = `[Turn ${event.turn}/${event.phase}] ${timestamp}:`;
    lines.push(`${prefix} ${formatGameLogMessage(event)}`);
  }

  return lines.join('\n');
}
