import type { BotPlayer } from '@/simulation/ai/BotPlayer';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  IGameConfig,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import type { IInteractiveSessionLinkage } from './InteractiveSession.types';

export interface IInteractiveSessionRuntimeContext {
  readonly gameConfig: IGameConfig;
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly movementByUnit: Map<string, IMovementCapability>;
  readonly gunneryByUnit: Map<string, number>;
  readonly pilotingByUnit: Map<string, number>;
  readonly tonnageByUnit: Map<string, number>;
  readonly grid: IHexGrid;
  readonly botPlayer: BotPlayer;
  readonly d6Roller: D6Roller | undefined;
  readonly startedAt: string;
  readonly linkage: IInteractiveSessionLinkage;
  readonly getSession: () => IGameSession;
  readonly setSession: (session: IGameSession) => void;
  readonly getOutcomePublished: () => boolean;
  readonly setOutcomePublished: (published: boolean) => void;
  readonly markMatchLogDiverged: () => void;
  readonly hasMatchLogDiverged: () => boolean;
}
