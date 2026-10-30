import { getWeaponData } from '@/engine/adapters/CompendiumAdapter.weaponData';
import {
  GameEventType,
  GameSide,
  RangeBracket,
  type IAttackDeclaredPayload,
  type IAttackResolvedPayload,
  type IGameSession,
  type IWeaponAttack,
} from '@/types/gameplay';

import { resolveAttack } from '../gameSessionAttackResolution';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  rollInitiative,
  startGame,
} from '../gameSessionCore';
import { buildWeaponAttacks } from '../weaponAttackBuilder';

const inventory = ['clan-srm-3', 'medium-laser', 'ac-10'].map((id) => {
  const weapon = getWeaponData(id);
  if (!weapon) throw new Error(`Missing catalog weapon: ${id}`);
  return weapon;
});
const attacks = buildWeaponAttacks(
  inventory.map((weapon) => weapon.id),
  inventory,
  'attacker',
);

function setup(designation: string, gunnery = 4): IGameSession {
  const units = ['attacker', 'target'].map((id, index) => ({
    id,
    name: id,
    side: index ? GameSide.Opponent : GameSide.Player,
    unitRef: id,
    pilotRef: id,
    gunnery,
    piloting: 5,
    ammoConstruction: index
      ? []
      : [
          {
            binId: 'srm',
            weaponType: inventory[0].name,
            location: 'right_torso',
            maxRounds: 10,
            damagePerRound: 6,
            isExplosive: true,
          },
        ],
  }));
  let session = createGameSession(
    {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units,
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 3);
  session = advancePhase(advancePhase(session));
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...session.currentState.units,
        attacker: {
          ...session.currentState.units.attacker,
          position: { q: 0, r: 0 },
          abilities: designation === 'none' ? [] : ['specialist'],
          designatedWeaponCategory: designation,
        },
        target: {
          ...session.currentState.units.target,
          position: { q: 1, r: 0 },
        },
      },
    },
  };
}

function declaration(
  session: IGameSession,
  weapons: readonly IWeaponAttack[],
  terrain = 0,
) {
  const updated = declareAttack(
    session,
    'attacker',
    'target',
    weapons,
    1,
    RangeBracket.Short,
    undefined,
    undefined,
    false,
    [],
    terrain
      ? { name: 'Target terrain', value: terrain, source: 'terrain' }
      : null,
  );
  const event = updated.events
    .slice(session.events.length)
    .find((candidate) => candidate.type === GameEventType.AttackDeclared);
  if (!event) throw new Error('Attack was not declared');
  return {
    session: updated,
    event,
    payload: event.payload as IAttackDeclaredPayload,
  };
}

function targets(payload: IAttackDeclaredPayload) {
  return Object.fromEntries(
    payload.weaponAttacks!.map((weapon) => [
      weapon.weaponId,
      weapon.toHitNumber ?? payload.toHitNumber,
    ]),
  );
}

/** @spec openspec/changes/establish-all-unit-data-parity/specs/spa-combat-integration/spec.md */
describe('declared Gunnery Specialist modifiers belong to each weapon', () => {
  it.each(['energy', 'missile', 'ballistic', 'none'])(
    'preserves isolated results in both mixed orders for %s',
    (designation) => {
      const session = setup(designation);
      const expected = Object.fromEntries(
        attacks.map((weapon) => [
          weapon.weaponId,
          declaration(session, [weapon]).payload.toHitNumber,
        ]),
      );
      for (const volley of [attacks, [...attacks].reverse()]) {
        const { payload } = declaration(session, volley);
        expect(targets(payload)).toEqual(expected);
        expect(payload.toHitNumber).toBe(expected[volley[0].weaponId]);
        for (const weapon of payload.weaponAttacks!) {
          const single = declaration(session, [
            volley.find((attack) => attack.weaponId === weapon.weaponId)!,
          ]).payload;
          expect(weapon.modifiers ?? payload.modifiers).toEqual(
            single.modifiers,
          );
        }
      }
    },
  );

  it.each(['energy', 'missile'])(
    'resolves and JSON replays a mixed volley using each %s target',
    (designation) => {
      for (const volley of [
        attacks.slice(0, 2),
        attacks.slice(0, 2).reverse(),
      ]) {
        const { session, event } = declaration(setup(designation), volley);
        const replayed = JSON.parse(JSON.stringify(event)) as typeof event;
        const resolved = resolveAttack(
          session,
          replayed,
          () => ({
            dice: [2, 2],
            total: 4,
            isSnakeEyes: false,
            isBoxcars: false,
          }),
          () => 3,
        );
        const payloads = resolved.events
          .slice(session.events.length)
          .filter(
            (candidate) => candidate.type === GameEventType.AttackResolved,
          )
          .map((candidate) => candidate.payload as IAttackResolvedPayload);
        expect(payloads).toHaveLength(2);
        for (const payload of payloads) {
          const isDesignated =
            payload.weaponId ===
            (designation === 'energy'
              ? attacks[1].weaponId
              : attacks[0].weaponId);
          expect(payload.toHitNumber).toBe(isDesignated ? 3 : 5);
          expect(payload.hit).toBe(isDesignated);
        }
      }
    },
  );

  it('recalculates before the impossible-shot clamp and then adds terrain', () => {
    const { payload } = declaration(
      setup('energy', 13),
      attacks.slice(0, 2),
      2,
    );
    expect(targets(payload)).toEqual({
      [attacks[0].weaponId]: 15,
      [attacks[1].weaponId]: 14,
    });
  });

  it('retains the strictest volley minimum range for every category', () => {
    const weapons = attacks
      .slice(0, 2)
      .map((weapon, index) => ({ ...weapon, minRange: index ? 0 : 6 }));
    const { payload } = declaration(setup('energy'), weapons);
    expect(targets(payload)).toEqual({
      [weapons[0].weaponId]: 11,
      [weapons[1].weaponId]: 9,
    });
  });

  it('does not add override fields to single or same-category declarations', () => {
    for (const weapons of [
      [attacks[0]],
      [attacks[0], { ...attacks[0], weaponId: 'second-missile' }],
    ]) {
      const { payload } = declaration(setup('missile'), weapons);
      for (const weapon of payload.weaponAttacks!) {
        expect(weapon).not.toHaveProperty('toHitNumber');
        expect(weapon).not.toHaveProperty('modifiers');
      }
    }
  });

  it('keeps the shared target fallback for old serialized declarations', () => {
    const { session, event, payload } = declaration(setup('energy'), [
      attacks[1],
    ]);
    const legacy = { ...event, payload: { ...payload, toHitNumber: 8 } };
    const resolved = resolveAttack(
      session,
      legacy,
      () => ({ dice: [2, 2], total: 4, isSnakeEyes: false, isBoxcars: false }),
      () => 3,
    );
    const attack = resolved.events
      .slice(session.events.length)
      .find((candidate) => candidate.type === GameEventType.AttackResolved)!
      .payload as IAttackResolvedPayload;
    expect(attack.toHitNumber).toBe(8);
    expect(attack.hit).toBe(false);
  });
});
