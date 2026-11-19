import type { IGameCreatedPayload, IGameEvent } from '@/types/gameplay';

import { replayBvTotal } from '@/replay-library/eventMetadata';

/**
 * Writer tests need canonical units and recorded BV metadata. Pure metadata
 * tests keep their legacy BV-in-units fixtures to exercise that fallback.
 */
export function toRecordableGameCreatedFixture(event: IGameEvent): IGameEvent {
  const payload = event.payload as IGameCreatedPayload;
  return {
    ...event,
    payload: {
      ...payload,
      units: payload.units.map((entry) => ({
        id: entry.id,
        name: entry.name,
        side: entry.side,
        unitRef: entry.id,
        pilotRef: `${entry.id}-pilot`,
        gunnery: 4,
        piloting: 5,
      })),
      quickMeta: { bvTotal: replayBvTotal(event) ?? 0 },
    },
  };
}
