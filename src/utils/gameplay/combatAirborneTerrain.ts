import type {
  IGameCreatedPayload,
  IGameSession,
  IHexCoordinate,
} from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { GameEventType } from '@/types/gameplay';

import { coordToKey } from './hexMath';
import { terrainFeaturesFromString } from './terrainEncoding';

/** Read existing replayable terrain without adding a parallel terrain state. */
export function airborneTerrainFeaturesFromSession(
  session: Pick<IGameSession, 'events' | 'currentState'>,
  position: IHexCoordinate,
): readonly ITerrainFeature[] {
  const changed = session.currentState.terrainOverrides?.[coordToKey(position)];
  if (changed) return terrainFeaturesFromString(changed.terrain);
  const created = session.events.find(
    (event) => event.type === GameEventType.GameCreated,
  );
  const payload = created?.payload as IGameCreatedPayload | undefined;
  return (
    payload?.hexTerrain?.find(
      (hex) =>
        hex.coordinate.q === position.q && hex.coordinate.r === position.r,
    )?.features ?? []
  );
}
