import type { IPendingPSR } from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';
import { prepareEventForSerialization } from '@/utils/gameplay/gameEvents/serialization';
import { createPSRResolvedEvent } from '@/utils/gameplay/gameEvents/statusChecksPsr';
import { DEFAULT_COMPONENT_DAMAGE } from '@/utils/gameplay/gameState/initialization';
import {
  createSwampBogDownPSR,
  resolvePSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import { projectPsrResolutionTarget } from '@/utils/gameplay/pilotingSkillRolls/eventTargets';

it('keeps the real deep-swamp roll through two resolver callbacks and preserves later callback results', () => {
  const current = createSwampBogDownPSR('mek', 0, { swampDepth: 2 });
  const legacy: IPendingPSR = {
    entityId: current.entityId,
    reason: current.reason,
    reasonCode: current.reasonCode,
    additionalModifier: current.additionalModifier,
    triggerSource: current.triggerSource,
    terrainLevel: current.terrainLevel,
    fixedTargetNumber: Infinity,
  };
  const stream = [4, 5, 6, 2, 1, 3, 5, 2, 6, 1, 4, 3];
  let beforeIndex = 0;
  let afterIndex = 0;
  const beforeRoller = jest.fn(() => stream[beforeIndex++]);
  const afterRoller = jest.fn(() => stream[afterIndex++]);
  const before = resolvePSR({
    pilotingSkill: 5,
    psr: legacy,
    diceRoller: beforeRoller,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    pilotWounds: 0,
  });
  const after = resolvePSR({
    pilotingSkill: 5,
    psr: current,
    diceRoller: afterRoller,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    pilotWounds: 0,
  });
  expect(beforeRoller).toHaveBeenCalledTimes(2);
  expect(afterRoller).toHaveBeenCalledTimes(2);
  expect(after.roll).toBe(9);
  expect(after.dice).toEqual(before.dice);
  expect(after.passed).toBe(false);
  const event = createPSRResolvedEvent({
    gameId: 'deep-swamp-dice',
    sequence: 1,
    turn: 1,
    phase: GamePhase.End,
    unitId: 'mek',
    reason: current.reason,
    reasonCode: current.reasonCode,
    modifiers: 0,
    roll: after.roll,
    ...projectPsrResolutionTarget(after),
  });
  expect(event.payload).toMatchObject({
    automaticFailure: true,
    roll: 9,
    passed: false,
  });
  expect(event.payload).not.toHaveProperty('targetNumber');
  expect(prepareEventForSerialization(event, 'match-broadcast')).toBe(event);
  const subsequentBefore = Array.from({ length: 10 }, () => beforeRoller());
  const subsequentAfter = Array.from({ length: 10 }, () => afterRoller());
  expect(subsequentAfter).toEqual(subsequentBefore);
  expect(afterRoller).toHaveBeenCalledTimes(beforeRoller.mock.calls.length);
});

it.each([0, 2, 9, 12])(
  'accepts an automatic-failure result carrying the actual roll %s',
  (roll) => {
    const event = createPSRResolvedEvent({
      gameId: 'automatic-roll',
      sequence: 1,
      turn: 1,
      phase: GamePhase.End,
      unitId: 'mek',
      reason: 'Avoid bogging down',
      modifiers: 0,
      automaticFailure: true,
      passed: false,
      roll,
    });
    expect(prepareEventForSerialization(event, 'match-broadcast')).toBe(event);
    expect(event.payload).toMatchObject({
      automaticFailure: true,
      passed: false,
      roll,
    });
  },
);
