import type { GamePhase } from '@/types/gameplay';

export interface IGameplayEventContext {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly phase: GamePhase;
  readonly unitId: string;
}

export type GameplayEventContextArgs = [
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
];
