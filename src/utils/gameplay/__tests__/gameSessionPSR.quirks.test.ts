import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameSession,
  type IGameUnit,
  type IPilotHitPayload,
  type IPSRResolvedPayload,
  PSRTrigger,
} from '@/types/gameplay';

import type { DiceRoller } from '../diceTypes';

import { createGameSession, startGame } from '../gameSession';
import { attemptStandUp, resolvePendingPSRs } from '../gameSessionPSR';
import { createDamagePSR, createSkiddingPSR } from '../pilotingSkillRolls';
import { UNIT_QUIRK_IDS } from '../quirkModifiers';

function config() {
  return {
    mapRadius: 4,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function units(overrides: Partial<IGameUnit> = {}): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'PSR Tester',
      side: GameSide.Player,
      unitRef: 'player-ref',
      pilotRef: 'player-pilot',
      gunnery: 4,
      piloting: 5,
      unitQuirks: [UNIT_QUIRK_IDS.HARD_TO_PILOT],
      ...overrides,
    },
  ];
}

function scriptedD6(values: readonly number[]): DiceRoller {
  let index = 0;
  return () => ({
    dice: [values[Math.min(index++, values.length - 1)], 1],
    total: 2,
    isSnakeEyes: false,
    isBoxcars: false,
  });
}

function withPendingPSR(
  session: IGameSession,
  pendingPSRs = [createDamagePSR('player-1')],
): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      phase: GamePhase.PhysicalAttack,
      units: {
        ...session.currentState.units,
        'player-1': {
          ...session.currentState.units['player-1'],
          pendingPSRs,
        },
      },
    },
  };
}

function withUnitState(
  session: IGameSession,
  overrides: Partial<IGameSession['currentState']['units'][string]>,
): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...session.currentState.units,
        'player-1': {
          ...session.currentState.units['player-1'],
          ...overrides,
        },
      },
    },
  };
}

describe('interactive PSR quirk application', () => {
  it('applies unit piloting quirks when resolving pending PSRs', () => {
    const session = withPendingPSR(
      startGame(createGameSession(config(), units()), GameSide.Player),
    );

    const next = resolvePendingPSRs(session, scriptedD6([3, 3]));

    const resolved = next.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 6,
      modifiers: 1,
      roll: 6,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(next.currentState.units['player-1'].pendingPSRs).toEqual([]);
  });

  it('applies consciousness SPAs after failed pending PSR fall damage', () => {
    const session = withPendingPSR(
      startGame(
        createGameSession(
          config(),
          units({ abilities: ['pain-resistance'], unitQuirks: [] }),
        ),
        GameSide.Player,
      ),
    );

    const next = resolvePendingPSRs(session, scriptedD6([1, 1, 1, 1, 1, 2, 1]));

    const pilotHit = next.events.find(
      (event) => event.type === GameEventType.PilotHit,
    )?.payload as IPilotHitPayload | undefined;
    expect(pilotHit).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'fall',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    });
    expect(next.currentState.units['player-1']).toMatchObject({
      prone: true,
      pilotWounds: 1,
      pilotConscious: true,
    });
  });

  it('applies explicit RPG Toughness state after failed pending PSR fall damage', () => {
    const session = withPendingPSR(
      startGame(
        createGameSession(
          config(),
          units({ unitQuirks: [], pilotToughness: 1 }),
        ),
        GameSide.Player,
      ),
    );

    const next = resolvePendingPSRs(session, scriptedD6([1, 1, 1, 1, 1, 2, 1]));

    const pilotHit = next.events.find(
      (event) => event.type === GameEventType.PilotHit,
    )?.payload as IPilotHitPayload | undefined;
    expect(pilotHit).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'fall',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    });
    expect(next.currentState.units['player-1']).toMatchObject({
      prone: true,
      pilotWounds: 1,
      pilotToughness: 1,
      pilotConscious: true,
    });
  });

  it('applies Maneuvering Ace while resolving interactive skidding PSRs', () => {
    const session = withPendingPSR(
      startGame(
        createGameSession(
          config(),
          units({
            abilities: ['maneuvering_ace'],
            unitQuirks: [],
          }),
        ),
        GameSide.Player,
      ),
      [createSkiddingPSR('player-1', undefined, 1)],
    );

    const next = resolvePendingPSRs(session, scriptedD6([2, 3]));

    const resolved = next.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 5,
      modifiers: 0,
      roll: 5,
      passed: true,
      reasonCode: PSRTrigger.Skidding,
    });
  });

  it('applies Animal Mimicry while resolving interactive quad Mek PSRs', () => {
    const session = withPendingPSR(
      startGame(
        createGameSession(
          config(),
          units({
            abilities: ['animal-mimicry'],
            isQuad: true,
            unitQuirks: [],
          }),
        ),
        GameSide.Player,
      ),
    );

    const next = resolvePendingPSRs(session, scriptedD6([2, 3]));

    const resolved = next.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 4,
      modifiers: -1,
      roll: 5,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
  });

  it('applies Animal Mimicry while resolving interactive quad Mek stand-up PSRs', () => {
    const session = withUnitState(
      startGame(
        createGameSession(
          config(),
          units({
            abilities: ['animal_mimic'],
            isQuad: true,
            unitQuirks: [],
          }),
        ),
        GameSide.Player,
      ),
      {
        prone: true,
      },
    );

    const next = attemptStandUp(session, 'player-1', () => ({
      dice: [2, 3],
      total: 5,
      isSnakeEyes: false,
      isBoxcars: false,
    }));

    const resolved = next.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 4,
      modifiers: -1,
      roll: 5,
      passed: true,
      reasonCode: PSRTrigger.StandingUp,
    });
  });

  it('applies No Arms to interactive stand-up PSRs', () => {
    const session = withUnitState(
      startGame(
        createGameSession(
          config(),
          units({ unitQuirks: [UNIT_QUIRK_IDS.NO_ARMS] }),
        ),
        GameSide.Player,
      ),
      {
        prone: true,
      },
    );

    const next = attemptStandUp(session, 'player-1', () => ({
      dice: [3, 4],
      total: 7,
      isSnakeEyes: false,
      isBoxcars: false,
    }));

    const resolved = next.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 7,
      modifiers: 2,
      roll: 7,
      passed: true,
      reasonCode: PSRTrigger.StandingUp,
    });
  });
});
