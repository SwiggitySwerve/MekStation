import type { GameSide, IGameEvent } from '@/types/gameplay';

export interface IFileSummary {
  readonly gameCreated: IGameEvent | null;
  readonly gameEnded: IGameEvent | null;
  readonly lines: readonly string[];
}

export interface IDerivedBaseFields {
  readonly path: string;
  readonly createdAt: string;
  readonly turns: number;
  readonly winner: GameSide | null;
  readonly bvTotal: number;
}
