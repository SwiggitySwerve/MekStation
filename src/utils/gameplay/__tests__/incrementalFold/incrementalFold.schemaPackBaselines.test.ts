/**
 * P1 proof, committed-capture half of the D-8 corpus: every stored combat
 * payload form the baseline schema packs pin (replay-safety PRs 4-11) is
 * folded as one game, incrementally through appendEvent and by deriveState
 * from event 0, compared at every event. A second lane folds the JSON image
 * of the same events, which is what a stored log replays.
 */
import { isDeepStrictEqual } from 'node:util';

import { COMBAT_BATTLE_ARMOR_EVENT_TYPES } from '@/lib/events/replay/CombatBattleArmorBaselineSchemaPack';
import { COMBAT_DAMAGE_EVENT_TYPES } from '@/lib/events/replay/CombatDamageBaselineSchemaPack';
import { COMBAT_LIFECYCLE_EVENT_TYPES } from '@/lib/events/replay/CombatLifecycleBaselineSchemaPack';
import { COMBAT_MISSION_EVENT_TYPES } from '@/lib/events/replay/CombatMissionBaselineSchemaPack';
import { COMBAT_MOVEMENT_EVENT_TYPES } from '@/lib/events/replay/CombatMovementBaselineSchemaPack';
import { COMBAT_PHYSICAL_EVENT_TYPES } from '@/lib/events/replay/CombatPhysicalBaselineSchemaPack';
import { COMBAT_RANGED_EVENT_TYPES } from '@/lib/events/replay/CombatRangedBaselineSchemaPack';
import { COMBAT_VEHICLE_EVENT_TYPES } from '@/lib/events/replay/CombatVehicleBaselineSchemaPack';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay';
import { appendEvent } from '@/utils/gameplay/gameSession';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';

import { VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS } from '../../../../lib/events/replay/__fixtures__/CombatBattleArmorBaselineSchemaPack.fixture';
import {
  REDACTED_UNIT_DESTROYED_PAYLOAD,
  VALID_COMBAT_DAMAGE_EVENT_PAYLOADS,
} from '../../../../lib/events/replay/__fixtures__/CombatDamageBaselineSchemaPack.fixture';
import { VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS } from '../../../../lib/events/replay/__fixtures__/CombatLifecycleBaselineSchemaPack.fixture';
import { VALID_COMBAT_MISSION_EVENT_PAYLOADS } from '../../../../lib/events/replay/__fixtures__/CombatMissionBaselineSchemaPack.fixture';
import {
  LEGACY_MOVEMENT_DECLARED_PAYLOAD,
  VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS,
} from '../../../../lib/events/replay/__fixtures__/CombatMovementBaselineSchemaPack.fixture';
import { VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS } from '../../../../lib/events/replay/__fixtures__/CombatPhysicalBaselineSchemaPack.fixture';
import {
  REDACTED_ATTACK_RESOLVED_PAYLOAD,
  VALID_COMBAT_RANGED_EVENT_PAYLOADS,
} from '../../../../lib/events/replay/__fixtures__/CombatRangedBaselineSchemaPack.fixture';
import { VALID_COMBAT_VEHICLE_EVENT_PAYLOADS } from '../../../../lib/events/replay/__fixtures__/CombatVehicleBaselineSchemaPack.fixture';

const GAME_ID = 'schema-pack-baseline-game';

/** Pack order; `game_created` opens the game and is not repeated. */
const STORED_PAYLOADS: readonly (readonly [string, unknown])[] = [
  ...Object.entries(VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS),
  ...Object.entries(VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS),
  ['movement_declared', LEGACY_MOVEMENT_DECLARED_PAYLOAD],
  ...Object.entries(VALID_COMBAT_RANGED_EVENT_PAYLOADS),
  ['attack_resolved', REDACTED_ATTACK_RESOLVED_PAYLOAD],
  ...Object.entries(VALID_COMBAT_DAMAGE_EVENT_PAYLOADS),
  ['unit_destroyed', REDACTED_UNIT_DESTROYED_PAYLOAD],
  ...Object.entries(VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS),
  ...Object.entries(VALID_COMBAT_VEHICLE_EVENT_PAYLOADS),
  ...Object.entries(VALID_COMBAT_MISSION_EVENT_PAYLOADS),
  ...Object.entries(VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS),
];

function baselineEvents(): IGameEvent[] {
  const created = STORED_PAYLOADS.find(
    ([type]) => type === GameEventType.GameCreated,
  );
  const rest = STORED_PAYLOADS.filter(
    ([type]) => type !== GameEventType.GameCreated,
  );
  return [created!, ...rest].map(
    ([type, payload], sequence) =>
      ({
        id: `schema-pack-event-${sequence}`,
        gameId: GAME_ID,
        sequence,
        timestamp: '2026-11-01T00:00:00.000Z',
        type: type as GameEventType,
        turn: 1,
        phase: GamePhase.Movement,
        payload,
      }) as IGameEvent,
  );
}

function assertIncrementalEqualsFullFold(events: readonly IGameEvent[]): void {
  let session: IGameSession = hydrateGameSessionFromEvents(GAME_ID, [
    events[0],
  ]);
  for (let index = 0; index < events.length; index += 1) {
    if (index > 0) session = appendEvent(session, events[index]);
    const full = deriveState(GAME_ID, events.slice(0, index + 1));
    if (!isDeepStrictEqual(session.currentState, full)) {
      expect({
        index,
        type: events[index].type,
        state: session.currentState,
      }).toStrictEqual({
        index,
        type: events[index].type,
        state: full,
      });
    }
  }
}

describe('incremental fold == full fold, schema-pack baseline payloads', () => {
  it('covers every combat discriminant the packs pin, plus the redacted and legacy forms', () => {
    const packTypes = [
      ...COMBAT_LIFECYCLE_EVENT_TYPES,
      ...COMBAT_MOVEMENT_EVENT_TYPES,
      ...COMBAT_RANGED_EVENT_TYPES,
      ...COMBAT_DAMAGE_EVENT_TYPES,
      ...COMBAT_PHYSICAL_EVENT_TYPES,
      ...COMBAT_VEHICLE_EVENT_TYPES,
      ...COMBAT_MISSION_EVENT_TYPES,
      ...COMBAT_BATTLE_ARMOR_EVENT_TYPES,
    ];
    const events = baselineEvents();
    expect(new Set(events.map((event) => event.type))).toEqual(
      new Set(packTypes),
    );
    expect(events).toHaveLength(packTypes.length + 3);
  });

  it('live events: equal at every event', () => {
    assertIncrementalEqualsFullFold(baselineEvents());
  });

  it('stored JSON image: equal at every event', () => {
    const stored = JSON.parse(JSON.stringify(baselineEvents())) as IGameEvent[];
    assertIncrementalEqualsFullFold(stored);
  });

  /**
   * TODO(D-8 legacy + writer captures): when C4's branches merge, add here,
   * through assertIncrementalEqualsFullFold:
   *   - src/lib/events/replay/__fixtures__/legacy-psr-unfixed/ (deep-swamp-*,
   *     80 events; fix/replay-legacy-psr-read-rule),
   *   - the writer-contract captures of ReplayLaunchPaths, ReplaySwampLaunch
   *     and ReplayHostedSwamp (C4's writer-fix branch).
   * They are not on main yet; this names the hook rather than skipping a test.
   */
});
