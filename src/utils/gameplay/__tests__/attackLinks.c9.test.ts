import { type IGameState, type IUnitGameState } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { clearAttackLinks } from '../attackLinks';
import {
  SAMPLE_AERO_INIT,
  baseGameUnit,
} from '../gameState/__tests__/initialization.combatState.fixtures';
import {
  applyDamageApplied,
  applyPilotHit,
  applyUnitDestroyed,
} from '../gameState/damageResolution';
import { createInitialUnitState } from '../gameState/initialization';
import { applyShutdownCheck } from '../gameState/statusReplay';
import {
  applyUnitEjected,
  applyUnitRetreated,
  applyRetreatTriggered,
} from '../gameState/unitExitState';
import {
  linkedPair,
  linkState,
  linkUnit,
  swarmSquad,
} from './attackLinks.fixtures';

const EXITS: readonly [
  string,
  (state: IGameState, id: string) => IGameState,
][] = [
  [
    'destroyed',
    (state, unitId) => applyUnitDestroyed(state, { unitId, cause: 'damage' }),
  ],
  [
    'ejected',
    (state, unitId) =>
      applyUnitEjected(state, {
        unitId,
        turn: state.turn,
        reason: 'player_declared',
      }),
  ],
  [
    'retreated',
    (state, unitId) =>
      applyUnitRetreated(state, {
        unitId,
        turn: state.turn,
        retreatEdge: 'north',
      }),
  ],
];

function expectReleased(unit: IUnitGameState) {
  expect(unit.grappledUnitId).toBeUndefined();
  expect(unit.isGrappleAttacker).toBeUndefined();
  expect(unit.grappleSide).toBeUndefined();
  expect(unit.grappledThisRound).toBe(false);
  expect(unit.isChainWhipGrappled).toBe(false);
}

describe.each(EXITS)('C9 %s exit', (_kind, exit) => {
  it.each(['a', 'b'])(
    'releases both grapple participants when %s exits',
    (id) => {
      const before = linkedPair();
      const after = exit(before, id);
      expectReleased(after.units.a);
      expectReleased(after.units.b);
      expect(after.units.unrelated).toBe(before.units.unrelated);
      expect(before.units.a.grappledUnitId).toBe('b');
      expect(exit(after, id).units.b).toEqual(after.units.b);
    },
  );

  it.each(['host', 'squad'])('detaches the squad when %s exits', (id) => {
    const before = linkState(
      linkUnit('host'),
      linkUnit('squad', {
        isSwarming: true,
        combatState: swarmSquad('host'),
      }),
    );
    const after = exit(before, id);
    expect(after.units.squad.isSwarming).toBe(false);
    const squad = after.units.squad.combatState;
    if (squad?.kind !== 'squad') throw new Error('expected squad');
    expect(squad.state).not.toHaveProperty('swarmingUnitId');
    expect(squad.state.mimeticActiveThisTurn).toBe(true);
    expect(before.units.squad.combatState).toEqual(swarmSquad('host'));
  });

  it.each(['a', 'b'])(
    'releases displacement references when %s exits',
    (id) => {
      const before = linkState(
        linkUnit('a', {
          displacementAttackTargetId: 'b',
          isPushing: true,
          isMakingDisplacementAttack: true,
          isMakingDFA: true,
        }),
        linkUnit('b', { targetedByDisplacementAttackerId: 'a' }),
      );
      const after = exit(before, id);
      expect(after.units.a.displacementAttackTargetId).toBeUndefined();
      expect(after.units.a.isPushing).toBe(false);
      expect(after.units.a.isMakingDisplacementAttack).toBe(false);
      expect(after.units.a.isMakingDFA).toBe(false);
      expect(after.units.b.targetedByDisplacementAttackerId).toBeUndefined();
    },
  );

  it('clears inbound-only references while preserving unrelated outgoing links', () => {
    const before = linkState(
      linkUnit('a'),
      linkUnit('b', { grappledUnitId: 'a', grappledThisRound: true }),
      linkUnit('c', {
        targetedByDisplacementAttackerId: 'a',
        displacementAttackTargetId: 'd',
        isPushing: true,
      }),
      linkUnit('d', { targetedByDisplacementAttackerId: 'c' }),
    );
    const after = exit(before, 'a');
    expectReleased(after.units.b);
    expect(after.units.c.targetedByDisplacementAttackerId).toBeUndefined();
    expect(after.units.c.displacementAttackTargetId).toBe('d');
    expect(after.units.c.isPushing).toBe(true);
    expect(after.units.d).toBe(before.units.d);
  });

  it('tolerates missing partners and unknown units', () => {
    const before = linkState(
      linkUnit('a', { grappledUnitId: 'missing', isSwarming: true }),
    );
    expectReleased(exit(before, 'a').units.a);
    expect(exit(before, 'a').units.a.isSwarming).toBe(false);
    expect(exit(before, 'missing')).toBe(before);
  });
});

it('C9 releases links on lethal PilotHit before UnitDestroyed', () => {
  const after = applyPilotHit(linkedPair(), {
    unitId: 'a',
    wounds: 1,
    totalWounds: 6,
    source: 'fall',
    consciousnessCheckRequired: false,
  });
  expect(after.units.a.destroyed).toBe(true);
  expectReleased(after.units.b);
});

it('C9 releases links on aerospace DamageApplied destruction', () => {
  const aero = createInitialUnitState(
    baseGameUnit({
      id: 'host',
      unitType: UnitType.AEROSPACE,
      aerospaceInit: SAMPLE_AERO_INIT,
    }),
    { q: 0, r: 0 },
  );
  if (aero.combatState?.kind !== 'aero') throw new Error('expected aero');
  const before = linkState(
    aero,
    linkUnit('squad', { isSwarming: true, combatState: swarmSquad('host') }),
  );
  const after = applyDamageApplied(before, {
    unitId: 'host',
    location: 'nose',
    damage: 8,
    armorRemaining: 0,
    structureRemaining: 0,
    locationDestroyed: true,
    aerospaceState: {
      ...aero.combatState.state,
      currentSI: 0,
      destroyed: true,
    },
  });
  expect(after.units.host.destroyed).toBe(true);
  expect(after.units.squad.isSwarming).toBe(false);
});

it('C9 retains links for shutdown, unconsciousness and retreat declaration', () => {
  const before = linkedPair();
  const retreating = applyRetreatTriggered(before, {
    unitId: 'a',
    edge: 'north',
    reason: 'structural_threshold',
  });
  const shutdown = applyShutdownCheck(retreating, {
    unitId: 'a',
    heatLevel: 30,
    targetNumber: 0,
    roll: 0,
    automatic: true,
    shutdownOccurred: true,
  });
  const after = applyPilotHit(shutdown, {
    unitId: 'a',
    wounds: 1,
    totalWounds: 1,
    source: 'fall',
    consciousnessCheckRequired: true,
    consciousnessCheckPassed: false,
  });
  expect(after.units.a.grappledUnitId).toBe('b');
  expect(after.units.b).toBe(before.units.b);
  expect(clearAttackLinks(after, 'a')).toBe(after);
});

it('C9 cleanup is idempotent and does not allocate for unrelated exits', () => {
  const before = linkedPair();
  const after = applyUnitDestroyed(before, { unitId: 'a', cause: 'damage' });
  expect(clearAttackLinks(after, 'a')).toBe(after);
  expect(clearAttackLinks(before, 'missing')).toBe(before);
  const noLinks = linkState(
    linkUnit('gone', { destroyed: true }),
    before.units.unrelated,
  );
  expect(clearAttackLinks(noLinks, 'gone')).toBe(noLinks);
});

it('C9 clears one-sided outgoing grapple ownership without erasing another pair', () => {
  const before = linkState(
    linkUnit('a', { grappledUnitId: 'b' }),
    linkUnit('b', { isGrappleAttacker: false, grappledThisRound: true }),
    linkUnit('c', { grappledUnitId: 'd' }),
    linkUnit('d', { grappledUnitId: 'c' }),
  );
  const after = applyUnitDestroyed(before, { unitId: 'a', cause: 'damage' });
  expectReleased(after.units.b);
  expect(after.units.c).toBe(before.units.c);
  expect(after.units.d).toBe(before.units.d);
});
