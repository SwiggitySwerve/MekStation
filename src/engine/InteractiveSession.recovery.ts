import type {
  IGameCreatedPayload,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';
import { applyTerrainOverridesToGrid } from '@/utils/gameplay/terrainState';

import type { IAdaptedUnit } from './types';

import { adaptUnit } from './adapters/CompendiumAdapter';
import { createGridFromHexTerrain } from './GameEngine.helpers';

export function createRecoveredGridFromSession(
  session: IGameSession,
): IHexGrid {
  const created = session.events.find(
    (event) => event.type === GameEventType.GameCreated,
  );
  const initialTerrain =
    (created?.payload as IGameCreatedPayload | undefined)?.hexTerrain ?? [];

  return applyTerrainOverridesToGrid(
    createGridFromHexTerrain(session.config.mapRadius, initialTerrain),
    session.currentState.terrainOverrides,
  );
}

export async function deriveAdaptedUnitsFromSession(
  session: IGameSession,
): Promise<IAdaptedUnit[]> {
  const adapted: IAdaptedUnit[] = [];
  for (const gameUnit of session.units) {
    const adaptedUnit = await adaptUnit(gameUnit.unitRef, {
      side: gameUnit.side,
    });
    if (adaptedUnit === null) {
      // eslint-disable-next-line no-console
      console.warn(
        `[InteractiveSession.fromSessionAsync] unit '${gameUnit.id}' ` +
          `(unitRef '${gameUnit.unitRef}') not found in the canonical ` +
          `catalog - skipping. The recovered host will not have adapted ` +
          `state for this unit and any action targeting it will fail.`,
      );
      continue;
    }
    adapted.push({ ...adaptedUnit, id: gameUnit.id });
  }
  return adapted;
}
