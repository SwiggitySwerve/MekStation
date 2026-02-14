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

export function generateGameLog(session: IGameSession): string {
  const lines: string[] = [];

  for (const event of session.events) {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const prefix = `[Turn ${event.turn}/${event.phase}] ${timestamp}:`;

    switch (event.type) {
      case 'game_created':
        lines.push(`${prefix} Game created`);
        break;
      case 'game_started':
        lines.push(`${prefix} Game started`);
        break;
      case 'game_ended':
        lines.push(`${prefix} Game ended`);
        break;
      case 'phase_changed':
        lines.push(`${prefix} Phase changed to ${event.phase}`);
        break;
      case 'initiative_rolled':
        lines.push(`${prefix} Initiative rolled`);
        break;
      case 'movement_declared':
        lines.push(`${prefix} Unit ${event.actorId} moved`);
        break;
      case 'movement_locked':
        lines.push(`${prefix} Unit ${event.actorId} locked movement`);
        break;
      case 'attack_declared':
        lines.push(`${prefix} Unit ${event.actorId} declared attack`);
        break;
      case 'attack_resolved':
        lines.push(`${prefix} Attack resolved`);
        break;
      case 'damage_applied':
        lines.push(`${prefix} Damage applied`);
        break;
      case 'unit_destroyed':
        lines.push(`${prefix} Unit ${event.actorId} destroyed`);
        break;
      default:
        lines.push(`${prefix} ${event.type}`);
    }
  }

  return lines.join('\n');
}
