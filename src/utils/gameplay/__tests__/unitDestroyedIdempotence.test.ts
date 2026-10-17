/**
 * L0-05 (v2.1.0 L0, match c4d9496e): one destroyed Hunchback logged three
 * UnitDestroyed events (seq 270/274/281) and the report showed "Kills 3".
 * Emission is now idempotent per unit, and the report credits each destroyed
 * unit once so stored logs with duplicates replay to kills: 1.
 *
 * @spec openspec/specs/combat-analytics/spec.md (Kill Credit Tracking)
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay';
import { createPilotHitEvent } from '@/utils/gameplay/gameEvents';
import { createGameSession } from '@/utils/gameplay/gameSession';
import { appendUnitDestroyedEvent } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import { appendEvent } from '@/utils/gameplay/gameSessionCore';
import { emitHeatCriticalEvents } from '@/utils/gameplay/gameSessionHeat.criticalEvents';
import { derivePostBattleReport } from '@/utils/gameplay/postBattleReport';

const unit = (id: string, side: GameSide) => ({
  ...{ id, name: id, side, unitRef: id, pilotRef: id },
  ...{ gunnery: 4, piloting: 5 },
});
const config = { mapRadius: 8, turnLimit: 10, optionalRules: [] };
const newSession = (...units: ReturnType<typeof unit>[]) =>
  createGameSession({ ...config, victoryConditions: ['destruction'] }, units);
const destroy = { turn: 7, phase: GamePhase.WeaponAttack, unitId: 'hbk' };

function append(s: IGameSession, type: GameEventType, payload: unknown) {
  const event = {
    id: `e-${s.events.length}`,
    gameId: s.id,
    sequence: s.events.length,
    timestamp: '2026-10-17T00:00:00.000Z',
    type,
    turn: 7,
    phase: GamePhase.WeaponAttack,
    payload,
  } as IGameEvent;
  return appendEvent(s, event);
}

/** Three SHD hits on the HBK; `onDestroyed` runs after each hit (L0 shape). */
function battle(onDestroyed: (s: IGameSession) => IGameSession) {
  let s = newSession(
    unit('hbk', GameSide.Player),
    unit('shd', GameSide.Opponent),
  );
  for (const weaponId of ['ac-5', 'srm-2', 'medium-laser']) {
    s = append(s, GameEventType.AttackResolved, {
      ...{ attackerId: 'shd', targetId: 'hbk', weaponId, hit: true },
    });
    s = append(s, GameEventType.DamageApplied, {
      ...{ unitId: 'hbk', location: 'left_torso', damage: 5 },
      ...{ armorRemaining: 0, structureRemaining: 0, locationDestroyed: false },
    });
    s = onDestroyed(s);
  }
  return s;
}

const destroyedCount = (s: IGameSession) =>
  s.events.filter((e) => e.type === GameEventType.UnitDestroyed).length;
const kills = (s: IGameSession, id: string) =>
  derivePostBattleReport(s).units.find((u) => u.unitId === id)?.kills;

describe('L0-05 one destroyed unit is one kill', () => {
  it('appendUnitDestroyedEvent emits once when later hits re-report destruction', () => {
    const s = battle((x) =>
      appendUnitDestroyedEvent(x, { ...destroy, cause: 'damage' }),
    );
    expect(destroyedCount(s)).toBe(1);
    expect(kills(s, 'shd')).toBe(1);
  });

  it('still emits after a fatal PilotHit already marked the unit destroyed', () => {
    let s = newSession(unit('hbk', GameSide.Player));
    s = appendEvent(
      s,
      createPilotHitEvent(
        s.id,
        s.events.length,
        7,
        GamePhase.WeaponAttack,
        'hbk',
        6,
        6,
        'head_hit',
        false,
      ),
    );
    expect(s.currentState.units.hbk.destroyed).toBe(true);
    s = appendUnitDestroyedEvent(s, { ...destroy, cause: 'pilot_death' });
    expect(destroyedCount(s)).toBe(1);
  });

  it('heat-phase critical destruction does not re-destroy a destroyed unit', () => {
    const s = battle((x) =>
      appendUnitDestroyedEvent(x, { ...destroy, cause: 'damage' }),
    );
    const heat = emitHeatCriticalEvents(
      s,
      [{ type: 'unit_destroyed', payload: { unitId: 'hbk', cause: 'damage' } }],
      7,
      'hbk',
    );
    expect(destroyedCount(heat)).toBe(1);
  });

  it('replays a v2.1.0 log with three UnitDestroyed events for one unit as kills: 1', () => {
    const s = battle((x) =>
      append(x, GameEventType.UnitDestroyed, {
        unitId: 'hbk',
        cause: 'damage',
      }),
    );
    expect(destroyedCount(s)).toBe(3);
    expect(kills(s, 'shd')).toBe(1);
    expect(kills(s, 'hbk')).toBe(0);
  });
});
