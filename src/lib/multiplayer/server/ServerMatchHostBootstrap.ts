import type { IAdaptedUnit } from '@/engine/types';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';

import { CryptoDiceRoller, type IServerDiceRoller } from './CryptoDiceRoller';
import { RollCapture, SeededDiceRoller } from './RollCapture';

export interface IMatchHostBootstrap {
  readonly mapRadius: number;
  readonly turnLimit: number;
  readonly random: SeededRandom;
  readonly grid: IHexGrid;
  readonly playerUnits: readonly IAdaptedUnit[];
  readonly opponentUnits: readonly IAdaptedUnit[];
  readonly gameUnits: readonly IGameUnit[];
  readonly diceSeed?: number;
}

export function buildHostSession(bootstrap: IMatchHostBootstrap): {
  readonly session: InteractiveSession;
  readonly sourceRoller: IServerDiceRoller;
  readonly captureRef: { current: RollCapture };
} {
  const sourceRoller: IServerDiceRoller =
    bootstrap.diceSeed != null
      ? new SeededDiceRoller(new SeededRandom(bootstrap.diceSeed))
      : new CryptoDiceRoller();
  const captureRef = { current: new RollCapture(sourceRoller) };
  const engineCallback: D6Roller = () => captureRef.current.d6();
  return {
    sourceRoller,
    captureRef,
    session: new InteractiveSession(
      bootstrap.mapRadius,
      bootstrap.turnLimit,
      bootstrap.random,
      bootstrap.grid,
      bootstrap.playerUnits,
      bootstrap.opponentUnits,
      bootstrap.gameUnits,
      {},
      engineCallback,
    ),
  };
}
