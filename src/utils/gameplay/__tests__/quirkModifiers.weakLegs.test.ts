import { GameEventType, GamePhase } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { hydrateGameSessionFromEvents } from '../gameSessionCore';
import { replayToSequence } from '../gameSessionReplay';
import { applyEvent } from '../gameState';
import {
  getWeakLegsCriticalLocations,
  QUIRK_CATALOG,
  UNIT_QUIRK_IDS,
} from '../quirkModifiers';
import {
  runnerWeakLegsEffects,
  sessionWeakLegsEffects,
  sourceWeakLegsQuirks,
  weakLegLocations,
  weakLegsCase,
  weakLegsCriticalLocations,
  weakLegsDice,
  weakLegsManifest,
} from './quirkModifiers.weakLegs.fixtures';

// @spec openspec/changes/establish-all-unit-data-parity/specs/quirk-combat-integration/spec.md
// MegaMek48fcb2f64 TWGameManager.java:12869-12872,17207-17217.
describe('native Weak Legs physical critical checks', () => {
  it('registers native Weak Legs as a critical/physical quirk', () => {
    expect(UNIT_QUIRK_IDS.WEAK_LEGS).toBe('weak_legs');
    expect(QUIRK_CATALOG.weak_legs).toMatchObject({
      pipelines: ['physical', 'crit'],
      isPositive: false,
    });
  });
  it.each(['left_leg', 'right_leg', 'center_torso'] as const)(
    'uses the actual kick location %s',
    (hitLocation) => {
      expect(
        getWeakLegsCriticalLocations(['weak_legs'], {
          attackType: 'kick',
          role: 'target',
          hit: true,
          hitLocation,
        }),
      ).toEqual([hitLocation]);
    },
  );
  it('does not count duplicate flags or accept near ids/other explicit families', () => {
    const context = {
      attackType: 'kick' as const,
      role: 'target' as const,
      hit: true,
      hitLocation: 'left_leg' as const,
    };
    expect(
      getWeakLegsCriticalLocations(['weak_legs', 'weak_legs'], context),
    ).toEqual(['left_leg']);
    for (const quirks of [[], ['WEAK_LEGS'], ['weak_legs_extra']])
      expect(getWeakLegsCriticalLocations(quirks, context)).toEqual([]);
    expect(
      getWeakLegsCriticalLocations(['weak_legs'], {
        ...context,
        unitType: UnitType.VEHICLE,
      }),
    ).toEqual([]);
  });
  it.each([false, true])(
    'DFA checks biped/quad isQuad=%s in native order',
    (isQuad) => {
      expect(
        getWeakLegsCriticalLocations(['weak_legs'], {
          attackType: 'dfa',
          role: 'attacker',
          hit: true,
          isQuad,
        }),
      ).toEqual(isQuad ? weakLegLocations : weakLegLocations.slice(0, 2));
    },
  );
  it.each(['left_leg', 'right_leg', 'center_torso'] as const)(
    'armored kick damages and checks %s in both consumers',
    (location) => {
      const c = weakLegsCase({ location });
      const session = sessionWeakLegsEffects(c),
        runner = runnerWeakLegsEffects(c);
      expect(session.currentState.units.target.armor[location]).toBe(25);
      expect(session.currentState.units.target.structure[location]).toBe(30);
      expect(weakLegsCriticalLocations(session.events)).toEqual([location]);
      expect(weakLegsCriticalLocations(runner.events)).toEqual([location]);
      expect(
        session.currentState.units.target.componentDamage?.heatSinksDestroyed,
      ).toBe(1);
      expect(
        runner.state.units.target.componentDamage?.heatSinksDestroyed,
      ).toBe(1);
      expect(
        session.events
          .filter((e) => e.type === GameEventType.CriticalHitResolved)
          .every((e) => e.phase === GamePhase.PhysicalAttack),
      ).toBe(true);
    },
  );
  it('uses a normal determination: seven means no critical, not a forced single', () => {
    const c = weakLegsCase();
    const sessionDice = jest.fn(weakLegsDice(7)),
      runnerDice = jest.fn(weakLegsDice(7));
    expect(
      weakLegsCriticalLocations(sessionWeakLegsEffects(c, sessionDice).events),
    ).toEqual([]);
    expect(
      weakLegsCriticalLocations(runnerWeakLegsEffects(c, runnerDice).events),
    ).toEqual([]);
    expect(sessionDice).toHaveBeenCalledTimes(2);
    expect(runnerDice).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])(
    'successful DFA checks attacker locations and order, quad=%s',
    (isQuad) => {
      const c = weakLegsCase({ attackType: 'dfa', role: 'attacker', isQuad });
      const expected = isQuad ? weakLegLocations : weakLegLocations.slice(0, 2);
      expect(
        weakLegsCriticalLocations(sessionWeakLegsEffects(c).events),
      ).toEqual(expected);
      expect(
        weakLegsCriticalLocations(runnerWeakLegsEffects(c).events),
      ).toEqual(expected);
    },
  );
  it.each([
    { attackType: 'kick' as const, hit: false },
    { attackType: 'kick' as const, role: 'attacker' as const },
    {
      attackType: 'dfa' as const,
      hit: false,
      role: 'attacker' as const,
      isQuad: true,
    },
    { attackType: 'dfa' as const, role: 'target' as const },
    { attackType: 'punch' as const },
    { quirks: [] },
    { quirks: ['weak_legs_extra'] },
  ])('adds no checks outside the source branch: %j', (options) => {
    const c = weakLegsCase(options),
      sessionDice = jest.fn(() => 1),
      runnerDice = jest.fn(() => 1);
    expect(
      weakLegsCriticalLocations(sessionWeakLegsEffects(c, sessionDice).events),
    ).toEqual([]);
    expect(
      weakLegsCriticalLocations(runnerWeakLegsEffects(c, runnerDice).events),
    ).toEqual([]);
    expect(sessionDice).not.toHaveBeenCalled();
    expect(runnerDice).not.toHaveBeenCalled();
  });
  it('retains actual Firebee source metadata and critical damage through serialized replay', () => {
    expect(sourceWeakLegsQuirks).toContain('weak_legs');
    const c = weakLegsCase({ quirks: sourceWeakLegsQuirks });
    const last = c.session.events.at(-1);
    if (!last) throw new Error('Expected GameCreated-backed log');
    const serialized = hydrateGameSessionFromEvents(
      c.session.id,
      JSON.parse(JSON.stringify(c.session.events)),
    );
    for (const session of [
      c.session,
      serialized,
      {
        ...c.session,
        currentState: replayToSequence(c.session, last.sequence),
      },
    ]) {
      const resolved = sessionWeakLegsEffects({ ...c, session });
      const replayed = hydrateGameSessionFromEvents(
        resolved.id,
        JSON.parse(JSON.stringify(resolved.events)),
      );
      expect(weakLegsCriticalLocations(replayed.events)).toEqual(['left_leg']);
      expect(replayed.currentState).toEqual(resolved.currentState);
      expect(
        replayed.currentState.units.target.criticalSlotManifest?.left_leg[0]
          .destroyed,
      ).toBe(true);
    }
  });
  it('a limb-blown-off determination changes limb state and replays, rather than forcing a single slot hit', () => {
    const c = weakLegsCase();
    const session = sessionWeakLegsEffects(c, weakLegsDice(12)),
      runner = runnerWeakLegsEffects(c, weakLegsDice(12));
    for (const state of [session.currentState, runner.state]) {
      expect(state.units.target.destroyedLocations).toContain('left_leg');
      expect(state.units.target.armor.left_leg).toBe(0);
      expect(state.units.target.structure.left_leg).toBe(0);
    }
    expect(
      hydrateGameSessionFromEvents(
        session.id,
        JSON.parse(JSON.stringify(session.events)),
      ).currentState,
    ).toEqual(session.currentState);
  });

  it.each([false, true])(
    'DFA source state, native check order and component effects survive serialization, quad=%s',
    (isQuad) => {
      const c = weakLegsCase({
        attackType: 'dfa',
        role: 'attacker',
        isQuad,
        quirks: sourceWeakLegsQuirks,
      });
      const last = c.session.events.at(-1);
      if (!last) throw new Error('Expected GameCreated-backed log');
      const hydrated = hydrateGameSessionFromEvents(
        c.session.id,
        JSON.parse(JSON.stringify(c.session.events)),
      );
      for (const session of [
        c.session,
        hydrated,
        {
          ...c.session,
          currentState: replayToSequence(c.session, last.sequence),
        },
      ]) {
        const candidate = { ...c, session };
        const resolved = sessionWeakLegsEffects(candidate);
        const runner = runnerWeakLegsEffects(candidate);
        const expected = isQuad
          ? weakLegLocations
          : weakLegLocations.slice(0, 2);
        expect(weakLegsCriticalLocations(resolved.events)).toEqual(expected);
        expect(weakLegsCriticalLocations(runner.events)).toEqual(expected);
        expect(
          hydrateGameSessionFromEvents(
            resolved.id,
            JSON.parse(JSON.stringify(resolved.events)),
          ).currentState,
        ).toEqual(resolved.currentState);
        const runnerReplay = (
          JSON.parse(JSON.stringify(runner.events)) as typeof runner.events
        ).reduce(applyEvent, session.currentState);
        for (const id of ['attacker', 'target']) {
          expect(runnerReplay.units[id].componentDamage).toEqual(
            runner.state.units[id].componentDamage,
          );
          expect(runnerReplay.units[id].criticalSlotManifest).toEqual(
            runner.state.units[id].criticalSlotManifest,
          );
          expect(runnerReplay.units[id].destroyedLocations).toEqual(
            runner.state.units[id].destroyedLocations,
          );
        }
      }
    },
  );

  it('reuses fatal head-critical events in the physical phase and preserves replay', () => {
    const c = weakLegsCase({ location: 'head' });
    // A head hit can first consume consciousness dice; hold every later roll at12.
    const resolved = sessionWeakLegsEffects(c, () => 6);
    const runner = runnerWeakLegsEffects(c, () => 6);
    for (const state of [resolved.currentState, runner.state]) {
      expect(state.units.target.destroyed).toBe(true);
      expect(state.units.target.pilotWounds).toBe(6);
      expect(state.units.target.destroyedLocations).toContain('head');
    }
    for (const events of [resolved.events, runner.events]) {
      const destroyed = events.filter(
        (event) => event.type === GameEventType.UnitDestroyed,
      );
      expect(destroyed).toHaveLength(1);
      expect(destroyed[0].phase).toBe(GamePhase.PhysicalAttack);
    }
    expect(
      hydrateGameSessionFromEvents(
        resolved.id,
        JSON.parse(JSON.stringify(resolved.events)),
      ).currentState,
    ).toEqual(resolved.currentState);
  });

  it('preserves the critical owner weapon mount identity through runtime and replay', () => {
    const manifest = {
      ...weakLegsManifest(),
      left_leg: [
        {
          slotIndex: 0,
          componentType: 'weapon' as const,
          componentName: 'Medium Laser',
          weaponId: 'laser-runtime-2',
          destroyed: false,
        },
      ],
    };
    const c = weakLegsCase({ manifest });
    const session = sessionWeakLegsEffects(c),
      runner = runnerWeakLegsEffects(c);
    for (const state of [session.currentState, runner.state]) {
      expect(state.units.target.componentDamage?.weaponsDestroyed).toEqual([
        'laser-runtime-2',
      ]);
    }
    const replay = (
      JSON.parse(JSON.stringify(runner.events)) as typeof runner.events
    ).reduce(applyEvent, c.session.currentState);
    expect(replay.units.target.componentDamage).toEqual(
      runner.state.units.target.componentDamage,
    );
    expect(
      hydrateGameSessionFromEvents(
        session.id,
        JSON.parse(JSON.stringify(session.events)),
      ).currentState,
    ).toEqual(session.currentState);
  });
});
