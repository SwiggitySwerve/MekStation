import { VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS } from '@/lib/events/replay/__fixtures__/CombatLifecycleBaselineSchemaPack.fixture';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameCreatedPayload,
  type IGameEvent,
} from '@/types/gameplay';
import { deriveState } from '@/utils/gameplay/gameState';

import { filterEventForPlayer, filterEventForSpectator } from '../fogOfWar';

/** Hidden per-slot layout seeded into GameCreated (PR #2211 review B1). */
const manifest = (owner: string) => ({
  right_torso: [
    {
      slotIndex: 0,
      componentType: 'weapon',
      componentName: `${owner}-construction-slot`,
      destroyed: false,
    },
  ],
});

function fixture() {
  const baseline = JSON.parse(
    JSON.stringify(VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS.game_created),
  ) as IGameCreatedPayload;
  const event = {
    id: 'creation',
    gameId: 'custom-fog',
    sequence: 0,
    timestamp: '2026-09-09T00:00:00.000Z',
    type: GameEventType.GameCreated,
    turn: 0,
    phase: GamePhase.Initiative,
    payload: {
      ...baseline,
      units: [
        {
          ...baseline.units[0],
          id: 'owner-unit',
          side: GameSide.Player,
          unitRef: 'custom-owner',
          customUnitDefinition: {
            id: 'custom-owner',
            privateMarker: 'owner-construction',
          },
          criticalSlotManifest: manifest('owner'),
        },
        {
          ...baseline.units[0],
          id: 'opponent-unit',
          side: GameSide.Opponent,
          unitRef: 'custom-opponent',
          customUnitDefinition: {
            id: 'custom-opponent',
            privateMarker: 'opponent-construction',
          },
          criticalSlotManifest: manifest('opponent'),
        },
      ],
    },
  } as unknown as IGameEvent;
  const state = {
    ...deriveState(event.gameId, [event]),
    sideOwners: { [GameSide.Player]: 'owner', [GameSide.Opponent]: 'opponent' },
  };
  return { event, state };
}

describe('custom construction visibility', () => {
  it.each(['owner', 'opponent'])(
    'reveals only %s construction even when the other unit is visible',
    (viewer) => {
      const { event, state } = fixture();
      const original = JSON.stringify(event);
      const filtered = filterEventForPlayer(event, viewer, state, {
        fogOfWar: true,
        canSeeUnit: () => true,
      });
      expect(JSON.stringify(filtered)).toContain(`${viewer}-construction`);
      expect(JSON.stringify(filtered)).not.toContain(
        `${viewer === 'owner' ? 'opponent' : 'owner'}-construction`,
      );
      const units = (filtered?.payload as IGameCreatedPayload).units;
      expect(units.map((unit) => unit.id)).toEqual([
        'owner-unit',
        'opponent-unit',
      ]);
      // The viewer keeps its own critical layout; the other side's is gone.
      const own = viewer === 'owner' ? 0 : 1;
      expect(units[own].criticalSlotManifest).toBeDefined();
      expect(units[1 - own].criticalSlotManifest).toBeUndefined();
      expect(JSON.stringify(event)).toBe(original);
    },
  );

  it('redacts both snapshots for spectator and unknown audiences', () => {
    const { event, state } = fixture();
    const spectator = filterEventForSpectator(event, state, { fogOfWar: true });
    const unknown = filterEventForPlayer(event, 'unknown', state, {
      fogOfWar: true,
    });
    for (const projected of [spectator, unknown]) {
      expect(projected).not.toBeNull();
      expect(JSON.stringify(projected)).not.toContain('customUnitDefinition');
      expect(JSON.stringify(projected)).not.toContain('criticalSlotManifest');
      expect((projected?.payload as IGameCreatedPayload).units).toHaveLength(2);
    }
  });

  it('replays a fogged log with no enemy manifest without errors', () => {
    const { event, state } = fixture();
    const created = filterEventForPlayer(event, 'owner', state, {
      fogOfWar: true,
    }) as IGameEvent;
    const crit = {
      ...event,
      id: 'crit',
      sequence: 1,
      type: GameEventType.CriticalHitResolved,
      phase: GamePhase.WeaponAttack,
      payload: {
        unitId: 'opponent-unit',
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'weapon',
        componentName: 'Weapon',
        effect: 'Weapon destroyed',
        destroyed: true,
      },
    } as IGameEvent;
    const replayed = deriveState(event.gameId, [created, crit]);
    expect(
      replayed.units['opponent-unit'].criticalSlotManifest,
    ).toBeUndefined();
    expect(replayed.units['owner-unit'].criticalSlotManifest).toBeDefined();
  });

  it('preserves the existing full-visibility contract when fog is off', () => {
    const { event, state } = fixture();
    expect(
      filterEventForPlayer(event, 'owner', state, { fogOfWar: false }),
    ).toBe(event);
    expect(filterEventForSpectator(event, state, { fogOfWar: false })).toBe(
      event,
    );
  });
});
