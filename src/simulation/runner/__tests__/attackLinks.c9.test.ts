import { GamePhase, type IGameEvent } from '@/types/gameplay';
import { linkedPair } from '@/utils/gameplay/__tests__/attackLinks.fixtures';
import { applyEvent } from '@/utils/gameplay/gameState/eventDispatch';

import { SeededRandom } from '../../core/SeededRandom';
import { applyAmmoExplosionPilotDamage } from '../phases/ammoExplosionPilotDamage';
import { applyImpossibleDisplacementDestruction } from '../phases/physicalAttackEvents';
import { applyDfaMissFallPilotDamage } from '../phases/physicalAttackState';
import { commitHeatPhaseUnit } from '../phases/postCombatHeatLifecycle';
import { runPSRPhase } from '../phases/postCombatPsr';
import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';

describe('C9 runner commits', () => {
  it('releases both participants at the shared damage commit', () => {
    const before = linkedPair();
    const after = applyDamageResultToState(
      before,
      'a',
      { ...buildDamageState(before.units.a), destroyed: true },
      { unitDestroyed: true, locationDamages: [], destructionCause: 'damage' },
    );
    expect(after.units.a.destroyed).toBe(true);
    expect(after.units.a.grappledUnitId).toBeUndefined();
    expect(after.units.b.grappledUnitId).toBeUndefined();
    expect(after.units.unrelated).toBe(before.units.unrelated);
  });

  it.each(['ammo', 'DFA', 'displacement'] as const)(
    'clears at the %s destruction commit and in its event fold',
    (source) => {
      const base = linkedPair();
      const before = {
        ...base,
        units: { ...base.units, a: { ...base.units.a, pilotWounds: 5 } },
      };
      const events: IGameEvent[] = [];
      const common = {
        state: before,
        events,
        gameId: before.gameId,
        unitId: 'a',
        d6Roller: () => 6,
      };
      const after =
        source === 'ammo'
          ? applyAmmoExplosionPilotDamage({
              currentState: before,
              events,
              gameId: before.gameId,
              targetId: 'a',
              sourceUnitId: 'b',
              phase: GamePhase.Heat,
              totalExplosionDamage: 10,
              caseProtection: 'none',
              d6Roller: () => 6,
            }).currentState
          : source === 'DFA'
            ? applyDfaMissFallPilotDamage({ ...common, pilotDamage: 1 })
            : applyImpossibleDisplacementDestruction({
                ...common,
                turn: 1,
                destroyedUnitId: 'a',
                attackerId: 'b',
                targetId: 'a',
              });
      expect(after.units.a.destroyed).toBe(true);
      expect(after.units.b.grappledUnitId).toBeUndefined();
      expect(
        events.reduce(applyEvent, before).units.b.grappledUnitId,
      ).toBeUndefined();
    },
  );

  it('clears at the heat unit commit without changing heat or shutdown', () => {
    const before = linkedPair();
    const after = commitHeatPhaseUnit({
      state: before,
      unitId: 'a',
      unit: { ...before.units.a, destroyed: true },
      heat: 30,
      shutdown: true,
    });
    expect(after.units.a).toMatchObject({
      destroyed: true,
      heat: 30,
      shutdown: true,
    });
    expect(after.units.b.grappledUnitId).toBeUndefined();
  });

  it('clears lethal PSR fall links before the next unit acts', () => {
    const base = linkedPair();
    const before = {
      ...base,
      units: {
        ...base.units,
        a: {
          ...base.units.a,
          pilotWounds: 5,
          pendingPSRs: [
            {
              entityId: 'a',
              reason: 'fatal-fall',
              additionalModifier: 100,
              triggerSource: 'damage' as const,
            },
          ],
        },
      },
    };
    const events: IGameEvent[] = [];
    const after = runPSRPhase({
      state: before,
      events,
      gameId: before.gameId,
      random: new SeededRandom(42),
    });
    expect(after.units.a.destroyed).toBe(true);
    expect(after.units.b.grappledUnitId).toBeUndefined();
    expect(
      events.reduce(applyEvent, before).units.b.grappledUnitId,
    ).toBeUndefined();
  });
});
