import sourceFixture from '@/services/conversion/__tests__/fixtures/weaponQuirks.pinned.json';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  createConfig,
  createGameUnit,
  createPpc,
  createRunnerHeatState,
  createRunnerPpc,
  createRunnerUnit,
  fixedD6,
  fixedRoller,
} from '@/simulation/runner/__tests__/heatEnvironmentParity.behavior.test-helpers';
import { runHeatPhase } from '@/simulation/runner/phases/postCombat';
import {
  GameEventType,
  GameSide,
  type IGameEvent,
  type IHeatPayload,
  RangeBracket,
} from '@/types/gameplay';

import {
  advancePhase,
  createGameSession,
  declareAttack,
  lockAttack,
  resolveHeatPhase,
  rollInitiative,
  startGame,
} from '../gameSession';
import { hydrateGameSessionFromEvents } from '../gameSessionCore';
import {
  getWeaponCoolingHeatModifier,
  getWeaponQuirks,
  parseWeaponQuirksFromMTF,
} from '../quirkModifiers';

// MegaMek 48fcb2f64 WeaponMounted.java:167-178: independent ordered checks;
// WeaponQuirks.java:81-83 and OptionsConstants.java:106-108 name native ids.
const cases = [
  [[], 10],
  [['imp_cooling'], 9],
  [['improved_cooling'], 9],
  [['imp_cooling', 'improved_cooling', 'imp_cooling'], 9],
  [['poor_cooling'], 11],
  [['no_cooling'], 12],
  [['poor_cooling', 'no_cooling'], 13],
  [['imp_cooling', 'poor_cooling'], 10],
  [['imp_cooling', 'no_cooling'], 11],
  [['imp_cooling', 'poor_cooling', 'no_cooling'], 12],
  [['improved_cooling', 'poor_cooling', 'no_cooling'], 12],
  [['improved_cooling', 'poor_cooling', 'poor_cooling', 'no_cooling'], 12],
  [['imp_cooling_extra', 'accurate', 'stable_weapon'], 10],
] as const;

function sessionWithShots(quirks: readonly string[]) {
  let session = createGameSession(createConfig(), [
    {
      ...createGameUnit('player-1', GameSide.Player),
      weaponQuirks: { 'ppc-1': quirks },
    },
    createGameUnit('opponent-1', GameSide.Opponent),
  ]);
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, fixedD6);
  session = advancePhase(advancePhase(session));
  session = declareAttack(
    session,
    'player-1',
    'opponent-1',
    [createPpc('ppc-1'), createPpc('ppc-2')],
    6,
    RangeBracket.Short,
  );
  session = lockAttack(session, 'player-1');
  session = advancePhase(advancePhase(session));
  return hydrateGameSessionFromEvents(session.id, session.events);
}

describe('native weapon cooling effects', () => {
  it('carries the pinned Enforcer source identity into the existing heat owner', () => {
    const row = sourceFixture.mtf.lines.find(
      (entry) => entry[2] === 'imp_cooling',
    );
    if (!row || typeof row[0] !== 'string' || typeof row[1] !== 'string') {
      throw new Error('Missing pinned Improved Cooling source fixture');
    }
    expect(row).toEqual([
      'weaponquirk:imp_cooling:RA:3:Autocannon/10',
      'RA:3:Autocannon/10',
      'imp_cooling',
      'meks/3025 CCE/Medium/Enforcer ENF-5A Enforcer II.mtf',
      32,
    ]);
    const quirks = getWeaponQuirks(parseWeaponQuirksFromMTF([row[0]]), row[1]);
    expect(3 + getWeaponCoolingHeatModifier(quirks, 3)).toBe(2);
  });

  it.each(cases)('applies %j once to heat10, yielding %s', (quirks, heat) => {
    expect(10 + getWeaponCoolingHeatModifier(quirks, 10)).toBe(heat);
  });

  it.each([0, 1, 2])(
    'floors Improved Cooling before independent additions at heat%s',
    (baseHeat) => {
      expect(
        baseHeat + getWeaponCoolingHeatModifier(['imp_cooling'], baseHeat),
      ).toBe(1);
      expect(
        baseHeat +
          getWeaponCoolingHeatModifier(
            ['imp_cooling', 'poor_cooling', 'no_cooling'],
            baseHeat,
          ),
      ).toBe(4);
    },
  );

  it.each(cases)(
    'resolves replayed firing heat for %j as %s plus the other mount',
    (quirks, heat) => {
      const session = sessionWithShots(quirks);
      expect(session.currentState.units['player-1'].weaponQuirks).toEqual({
        'ppc-1': quirks,
      });
      const next = resolveHeatPhase(session, fixedRoller);
      const generated = next.events
        .filter(
          (event) =>
            event.type === GameEventType.HeatGenerated &&
            event.actorId === 'player-1',
        )
        .map((event) => event.payload as IHeatPayload);
      expect(generated).toEqual([
        expect.objectContaining({ amount: heat + 10, source: 'firing' }),
      ]);
      // Both weapons are named PPC. A quirk on ppc-1 must not leak to ppc-2.
      expect(next.currentState.units['player-1'].heat).toBe(heat);
      expect(
        hydrateGameSessionFromEvents(next.id, next.events).currentState.units[
          'player-1'
        ].heat,
      ).toBe(heat);
    },
  );

  it.each(cases)(
    'runs the autonomous heat phase for %j as %s plus the other mount',
    (quirks, heat) => {
      const state = createRunnerHeatState(
        createRunnerUnit({
          weaponQuirks: { 'ppc-1': quirks },
          weaponsFiredThisTurn: ['ppc-1', 'ppc-2'],
        }),
      );
      const events: IGameEvent[] = [];
      const next = runHeatPhase({
        state,
        events,
        gameId: state.gameId,
        random: new SeededRandom(123),
        weaponsByUnit: new Map([
          ['player-1', [createRunnerPpc('ppc-1'), createRunnerPpc('ppc-2')]],
        ]),
      });
      const generated = events
        .filter((event) => event.type === GameEventType.HeatGenerated)
        .map((event) => event.payload as IHeatPayload);
      expect(generated).toEqual([
        expect.objectContaining({ amount: heat + 10, source: 'firing' }),
      ]);
      expect(next.units['player-1'].heat).toBe(heat);
    },
  );
});
